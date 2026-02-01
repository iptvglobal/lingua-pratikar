import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isActive: boolean;
  barColor?: string; // Hex or CSS color
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ analyser, isActive, barColor = '#4f46e5' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    if (!analyser || !isActive) {
      // Draw idle line
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.beginPath();
      ctx.moveTo(0, rect.height / 2);
      ctx.lineTo(rect.width, rect.height / 2);
      ctx.strokeStyle = '#e2e8f0'; // slate-200
      ctx.lineWidth = 2;
      ctx.stroke();
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, rect.width, rect.height);

      const barWidth = (rect.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      // Draw mirrored bars from center
      const centerX = rect.width / 2;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * (rect.height * 0.8);
        
        // Simple smoothing for visuals
        if (barHeight < 4) barHeight = 4;

        ctx.fillStyle = barColor;

        // Draw left side
        ctx.fillRect(centerX - x - barWidth/2, (rect.height - barHeight) / 2, barWidth, barHeight);
        // Draw right side
        ctx.fillRect(centerX + x - barWidth/2, (rect.height - barHeight) / 2, barWidth, barHeight);

        x += barWidth + 2;
        if (x > centerX) break;
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [analyser, isActive, barColor]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full"
    />
  );
};

export default AudioVisualizer;