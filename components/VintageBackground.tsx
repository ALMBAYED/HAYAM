
import React from 'react';
import { JourneyStep } from '../types';

interface VintageBackgroundProps {
  step: JourneyStep;
}

const VintageBackground: React.FC<VintageBackgroundProps> = ({ step }) => {
  const isManifested = step === JourneyStep.MANIFESTATION;
  
  return (
    <div className={`fixed inset-0 z-0 overflow-hidden pointer-events-none transition-all duration-[4000ms] ease-in-out`}>
      {/* Base Layer: Aged Paper Texture */}
      <div 
        className="absolute inset-0 opacity-20 contrast-125 grayscale"
        style={{
          backgroundImage: `url('https://www.transparenttextures.com/patterns/old-mathematics.png'), url('https://www.transparenttextures.com/patterns/p6.png')`,
          backgroundColor: '#1a140a'
        }}
      />
      
      {/* Background Overlay: Newspaper Ink Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />

      {/* Warm Gold/Orange Lighting - Lighting 1 */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Main Warm Glow */}
        <div 
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full blur-[120px] opacity-20 transition-all duration-[6000ms]"
          style={{
            background: 'radial-gradient(circle, #ff8c00 0%, transparent 70%)',
            transform: isManifested ? 'scale(1.2)' : 'scale(1)'
          }}
        />
        
        {/* Subtle Gold Accent */}
        <div 
          className="absolute bottom-[-10%] right-[5%] w-[50vw] h-[50vw] rounded-full blur-[100px] opacity-15"
          style={{
            background: 'radial-gradient(circle, #d4af37 0%, transparent 70%)'
          }}
        />
        
        {/* Moving Light Shafts */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay animate-pulse">
           <div className="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-[#d4af37] to-transparent rotate-12" />
           <div className="absolute top-0 right-1/3 w-[1px] h-full bg-gradient-to-b from-transparent via-[#ff8c00] to-transparent -rotate-6" />
        </div>
      </div>

      {/* Manifestation Bloom Effect */}
      <div className={`absolute inset-0 bg-[#ffaa00] transition-opacity duration-[8000ms] ease-in-out mix-blend-overlay ${isManifested ? 'opacity-5' : 'opacity-0'}`} />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 0.05; }
          50% { opacity: 0.15; }
        }
      `}} />
    </div>
  );
};

export default VintageBackground;
