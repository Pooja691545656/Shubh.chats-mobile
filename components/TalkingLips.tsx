import React, { useEffect, useRef } from 'react';

interface TalkingLipsProps {
  analyser: AnalyserNode | null;
  isPlaying: boolean;
  color?: string;
}

const TalkingLips: React.FC<TalkingLipsProps> = ({ analyser, isPlaying, color = '#00d4ff' }) => {
  const mouthRef = useRef<SVGGElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!analyser || !isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const updateMouth = () => {
      if (!isPlaying || !mouthRef.current) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average volume from frequency data
      let sum = 0;
      for (let i = 0; i < 32; i++) { // Focus on lower/mid frequencies for speech
        sum += dataArray[i];
      }
      const average = sum / 32;
      
      // Map volume to mouth opening (scale between 0.1 and 1.5)
      const scaleY = 0.2 + (average / 128) * 1.3;
      const scaleX = 1 + (average / 256) * 0.2;

      // Apply transform to the lower lip or mouth group
      mouthRef.current.style.transform = `scale(${scaleX}, ${scaleY})`;
      
      animationRef.current = requestAnimationFrame(updateMouth);
    };

    updateMouth();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isPlaying]);

  return (
    <div className={`transition-all duration-700 flex flex-col items-center justify-center ${isPlaying ? 'opacity-100 scale-100' : 'opacity-0 scale-50 pointer-events-none'}`}>
      <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-[0_0_15px_rgba(0,212,255,0.6)]">
        {/* Upper Lip */}
        <path 
          d="M20 40C20 40 40 30 60 35C80 30 100 40 100 40C100 40 85 45 60 45C35 45 20 40 20 40Z" 
          fill={color} 
          fillOpacity="0.9"
        />
        
        {/* Mouth Opening / Lower Lip Group */}
        <g ref={mouthRef} style={{ transformOrigin: 'center 40px', transition: 'transform 0.05s ease-out' }}>
           {/* Lower Lip */}
           <path 
             d="M20 41C20 41 40 55 60 55C80 55 100 41 100 41C100 41 85 48 60 48C35 48 20 41 20 41Z" 
             fill={color}
             fillOpacity="0.8"
           />
           {/* Inner Mouth Dark Shade */}
           <path 
             d="M30 42C30 42 45 48 60 48C75 48 90 42 90 42C90 42 75 44 60 44C45 44 30 42 30 42Z" 
             fill="black" 
             fillOpacity="0.4"
           />
        </g>
        
        {/* Lip Glow Lines */}
        <path 
          d="M60 38C50 38 45 37 40 38" 
          stroke="white" 
          strokeOpacity="0.3" 
          strokeWidth="1" 
          strokeLinecap="round" 
        />
      </svg>
      <div className="mt-1 text-[8px] font-cyber text-cyan-400/50 tracking-[0.3em] uppercase animate-pulse">
        Neural Synthesis
      </div>
    </div>
  );
};

export default TalkingLips;