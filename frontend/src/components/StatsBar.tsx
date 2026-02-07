import React, { useEffect, useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Palette, MapPin, Users } from 'lucide-react';
import { GlowCard } from './GlowCard';
interface StatItemProps {
  value: string;
  label: string;
  icon: React.ElementType;
  delay: number;
}
function StatItem({ value, label, icon: Icon, delay }: StatItemProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    margin: '-50px'
  });
  const numericValue = parseInt(value.replace(/[^0-9]/g, ''));
  const suffix = value.replace(/[0-9,]/g, '');
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const stepValue = numericValue / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += stepValue;
        if (current >= numericValue) {
          setCount(numericValue);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, numericValue]);
  return (
    <GlowCard className="flex-1 min-w-0 rounded-xl md:rounded-2xl" hover={true}>
      <div
        ref={ref}
        className="flex flex-col items-center justify-center p-5 md:p-8 text-center h-full relative overflow-hidden">

        <Icon className="absolute -right-4 -bottom-4 w-20 md:w-24 h-20 md:h-24 text-theme-text opacity-[0.03] rotate-[-15deg]" />

        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gold/10 flex items-center justify-center mb-3 md:mb-4 text-gold">
          <Icon className="w-5 h-5 md:w-6 md:h-6" />
        </div>

        <motion.div
          initial={{
            opacity: 0,
            y: 20
          }}
          animate={
          isInView ?
          {
            opacity: 1,
            y: 0
          } :
          {}
          }
          transition={{
            duration: 0.6,
            delay
          }}
          className="font-serif text-3xl md:text-5xl text-theme-text font-bold mb-1 md:mb-2 drop-shadow-[0_0_10px_rgba(201,168,76,0.2)]">

          {count.toLocaleString()}
          <span className="text-gold">{suffix}</span>
        </motion.div>

        <motion.div
          initial={{
            opacity: 0
          }}
          animate={
          isInView ?
          {
            opacity: 1
          } :
          {}
          }
          transition={{
            duration: 0.6,
            delay: delay + 0.2
          }}
          className="text-[10px] md:text-sm text-theme-muted uppercase tracking-widest font-medium">

          {label}
        </motion.div>

        <motion.div
          initial={{
            width: 0
          }}
          animate={
          isInView ?
          {
            width: '32px'
          } :
          {}
          }
          transition={{
            duration: 1,
            delay: delay + 0.4
          }}
          className="h-0.5 md:h-1 bg-gold/50 mt-4 md:mt-6 rounded-full" />

      </div>
    </GlowCard>);

}
export function StatsBar() {
  return (
    <section className="w-full bg-theme-bg relative z-20 -mt-6 md:-mt-10 px-4 md:px-6 pb-8 md:pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-3 md:flex md:flex-row gap-3 md:gap-6">
          <StatItem value="12,000+" label="Artworks" icon={Palette} delay={0} />
          <StatItem value="34" label="Provinces" icon={MapPin} delay={0.2} />
          <StatItem value="500+" label="Artists" icon={Users} delay={0.4} />
        </div>
      </div>
    </section>);

}