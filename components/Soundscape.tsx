
import React, { useEffect, useRef } from 'react';
import { JourneyStep } from '../types';

interface SoundscapeProps {
  active: boolean;
  progress: number; // 0 to 1
  step: JourneyStep;
}

const Soundscape: React.FC<SoundscapeProps> = ({ active, progress, step }) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const ambientGainRef = useRef<GainNode | null>(null);
  const hopefulGainRef = useRef<GainNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    if (!active) return;

    const initAudio = () => {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        const ctx = audioContextRef.current;

        // Master Chain
        masterGainRef.current = ctx.createGain();
        masterGainRef.current.gain.setValueAtTime(0, ctx.currentTime);
        masterGainRef.current.gain.linearRampToValueAtTime(1, ctx.currentTime + 2);
        masterGainRef.current.connect(ctx.destination);

        filterRef.current = ctx.createBiquadFilter();
        filterRef.current.type = 'lowpass';
        filterRef.current.frequency.setValueAtTime(600, ctx.currentTime);
        filterRef.current.connect(masterGainRef.current);

        // 1. AMBIENT SECTION (Ocean + Deep Pads)
        ambientGainRef.current = ctx.createGain();
        ambientGainRef.current.gain.setValueAtTime(0.6, ctx.currentTime);
        ambientGainRef.current.connect(filterRef.current);

        // Ocean Soundscape (Noise + slow modulation)
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const oceanFilter = ctx.createBiquadFilter();
        oceanFilter.type = 'lowpass';
        oceanFilter.frequency.setValueAtTime(400, ctx.currentTime);

        const oceanGain = ctx.createGain();
        const oceanMod = ctx.createOscillator();
        oceanMod.frequency.setValueAtTime(0.12, ctx.currentTime); // Wave frequency
        const oceanModGain = ctx.createGain();
        oceanModGain.gain.setValueAtTime(0.2, ctx.currentTime);
        
        oceanMod.connect(oceanModGain);
        oceanModGain.connect(oceanGain.gain);
        oceanGain.gain.setValueAtTime(0.3, ctx.currentTime);

        whiteNoise.connect(oceanFilter);
        oceanFilter.connect(oceanGain);
        oceanGain.connect(ambientGainRef.current);
        whiteNoise.start();
        oceanMod.start();

        // Initial Ethereal Pads
        [110, 164.81, 220].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.05, ctx.currentTime);
          osc.connect(g);
          g.connect(ambientGainRef.current!);
          osc.start();
        });

        // 2. HOPEFUL SECTION (Brighter Melodies)
        hopefulGainRef.current = ctx.createGain();
        hopefulGainRef.current.gain.setValueAtTime(0, ctx.currentTime);
        hopefulGainRef.current.connect(masterGainRef.current);

        // Brighter orchestral-like pads
        [329.63, 440.00, 523.25, 659.25].forEach((freq) => {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, ctx.currentTime);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.02, ctx.currentTime);
          
          const lfo = ctx.createOscillator();
          lfo.frequency.setValueAtTime(0.2, ctx.currentTime);
          const lg = ctx.createGain();
          lg.gain.setValueAtTime(0.01, ctx.currentTime);
          lfo.connect(lg);
          lg.connect(g.gain);
          
          osc.connect(g);
          g.connect(hopefulGainRef.current!);
          osc.start();
          lfo.start();
        });
      }
    };

    initAudio();
  }, [active]);

  // Handle cross-fade on Manifestation
  useEffect(() => {
    if (!audioContextRef.current || !ambientGainRef.current || !hopefulGainRef.current || !filterRef.current) return;
    const ctx = audioContextRef.current;

    if (step === JourneyStep.MANIFESTATION) {
      // Transition from Depths to Light
      const transitionTime = 6;
      ambientGainRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + transitionTime);
      hopefulGainRef.current.gain.linearRampToValueAtTime(0.8, ctx.currentTime + transitionTime);
      filterRef.current.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + transitionTime);
    } else {
      // Standard progress adjustment for ambient phase
      const baseFreq = 600 + (progress * 800);
      filterRef.current.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 2);
    }
  }, [step, progress]);

  return null;
};

export default Soundscape;
