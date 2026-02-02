
import React, { useMemo } from 'react';
import { JourneyStep } from '../types';

interface SpaceBackgroundProps {
  step: JourneyStep;
}

const SpaceBackground: React.FC<SpaceBackgroundProps> = ({ step }) => {
  const isManifested = step === JourneyStep.MANIFESTATION;
  
  // Memoize essence particles - "Drifting thoughts"
  const essenceParticles = useMemo(() => {
    return [...Array(40)].map((_, i) => ({
      cx: `${Math.random() * 100}%`,
      cy: `${Math.random() * 100}%`,
      r: Math.random() * 1.5,
      delay: `${Math.random() * 15}s`,
      duration: `${10 + Math.random() * 15}s`,
      opacity: 0.1 + Math.random() * 0.5
    }));
  }, []);

  // Memoize the moving starfield - Many stars moving
  const starfield = useMemo(() => {
    return [...Array(250)].map((_, i) => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 1.2,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 40, // Different speeds for depth
      opacity: 0.2 + Math.random() * 0.8,
      twinkleDelay: Math.random() * 5
    }));
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-0 overflow-hidden pointer-events-none transition-all duration-[6000ms] ease-in-out bg-[#020202] ${
        isManifested ? 'opacity-30 scale-110' : 'opacity-100 scale-100'
      }`}
    >
      {/* Layer 1: The Deep Abyss - Shifting Gradients */}
      <div className="absolute inset-0 opacity-60">
        <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(15,15,35,0.4)_0%,transparent_70%)] animate-nebula-pulse" />
      </div>

      {/* Layer 2: Moving Nebula Orbs */}
      <div className="absolute inset-0 filter blur-[120px] opacity-30 mix-blend-screen">
        <div className="absolute w-[80vw] h-[80vw] bg-white/[0.02] rounded-full animate-drift-1" style={{ top: '10%', left: '10%' }} />
        <div className="absolute w-[60vw] h-[60vw] bg-blue-500/[0.02] rounded-full animate-drift-2" style={{ bottom: '20%', right: '10%' }} />
      </div>

      {/* Layer 3: Moving Starfield - The "Many Stars" request */}
      <div className="absolute inset-0">
        {starfield.map((star, i) => (
          <div
            key={`star-${i}`}
            className="absolute rounded-full bg-white animate-star-move"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              opacity: star.opacity,
              animationDelay: `-${star.delay}s`,
              animationDuration: `${star.duration}s`,
              boxShadow: star.size > 1 ? '0 0 5px rgba(255,255,255,0.3)' : 'none'
            }}
          />
        ))}
      </div>

      {/* Layer 4: Essence Particles (Rising Essence) */}
      <div className="absolute inset-0">
        <svg width="100%" height="100%" className="opacity-30">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          {essenceParticles.map((p, i) => (
            <circle
              key={`essence-${i}`}
              cx={p.cx}
              cy={p.cy}
              r={p.r}
              fill="white"
              filter="url(#glow)"
              className="animate-float"
              style={{ 
                animationDelay: p.delay, 
                animationDuration: p.duration,
                opacity: p.opacity
              }}
            />
          ))}
        </svg>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes star-move {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-20vh) translateX(-10vw); opacity: 0; }
        }
        @keyframes drift-1 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(5%, 5%) scale(1.1); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes drift-2 {
          0% { transform: translate(0, 0) scale(1.1); }
          50% { transform: translate(-5%, -5%) scale(1); }
          100% { transform: translate(0, 0) scale(1.1); }
        }
        @keyframes nebula-pulse {
          0% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.03); }
          100% { opacity: 0.3; transform: scale(1); }
        }
        @keyframes float {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          10% { opacity: 0.6; }
          90% { opacity: 0.6; }
          100% { transform: translateY(-200px) translateX(30px); opacity: 0; }
        }
        .animate-star-move { animation: star-move linear infinite; }
        .animate-drift-1 { animation: drift-1 30s ease-in-out infinite; }
        .animate-drift-2 { animation: drift-2 40s ease-in-out infinite; }
        .animate-nebula-pulse { animation: nebula-pulse 15s ease-in-out infinite; }
        .animate-float { animation: float linear infinite; }
      `}} />
    </div>
  );
};

export default SpaceBackground;
