import React from 'react';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function GlowCard({
  children,
  className = '',
  glowColor = 'var(--text-gold)',
  hover = true,
  onClick
}: GlowCardProps) {
  return (
    <div
      className={`relative group ${className}`}
      onClick={onClick}
    >
      {/* Animated Glow Border */}
      <div
        className={`absolute -inset-[1px] rounded-xl bg-gradient-to-r from-transparent via-${hover ? 'gold/50' : 'transparent'} to-transparent opacity-0 ${hover ? 'group-hover:opacity-100' : ''} transition-opacity duration-500 blur-sm`}
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${glowColor} 90deg, transparent 180deg)`
        }} />


      {/* Rotating Border Animation Layer */}
      {hover &&
        <div className="absolute -inset-[1px] rounded-xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
          <div className="absolute inset-[-50%] bg-[conic-gradient(from_0deg,transparent_0_340deg,var(--text-gold)_360deg)] animate-spin-slow opacity-30" />
        </div>
      }

      {/* Glass Card Content */}
      <div className="relative h-full bg-theme-glass backdrop-blur-xl border border-theme-glass-border rounded-xl shadow-lg overflow-hidden">
        {children}
      </div>
    </div>);

}