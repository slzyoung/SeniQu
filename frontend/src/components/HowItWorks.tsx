import { Landmark, Wifi, Brain } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { GlowCard } from './GlowCard';
import { useLanguage } from '../hooks/useLanguage';

export function HowItWorks() {
  const { ref, isVisible } = useScrollAnimation();
  const { t } = useLanguage();

  const steps = [
    {
      icon: Landmark,
      number: '01',
      title: t('howItWorks.stepTitle0'),
      description: t('howItWorks.stepDesc0'),
      delay: 0
    },
    {
      icon: Brain,
      number: '02',
      title: t('howItWorks.stepTitle1'),
      description: t('howItWorks.stepDesc1'),
      delay: 0.15
    },
    {
      icon: Wifi,
      number: '03',
      title: t('howItWorks.stepTitle2'),
      description: t('howItWorks.stepDesc2'),
      delay: 0.3
    }
  ];

  return (
    <section
      id="how-it-works"
      className="py-16 md:py-24 bg-theme-surface relative overflow-hidden transition-colors duration-300">

      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(#C9A84C 1px, transparent 1px)',
          backgroundSize: '30px 30px'
        }} />

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        <div
          ref={ref}
          className={`text-center mb-12 md:mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>

          <h2 className="text-3xl md:text-5xl font-serif text-theme-text mb-3 md:mb-4">
            {t('howItWorks.title').split(' ').map((word, i, arr) => {
              if (i === arr.length - 1) {
                return <span key={i} className="text-gold italic">{word}</span>;
              }
              return word + ' ';
            })}
          </h2>
          <p className="text-theme-muted text-sm md:text-base max-w-lg mx-auto">
            {t('howItWorks.subtitle')}
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-[2px] bg-theme-border overflow-hidden">
            <motion.div
              initial={{ width: '0%' }}
              whileInView={{ width: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.5 }}
              className="h-full bg-gradient-to-r from-transparent via-gold to-transparent" />
          </div>

          {/* Mobile Connecting Line */}
          <div className="md:hidden absolute top-0 bottom-0 left-8 w-[2px] bg-theme-border">
            <motion.div
              initial={{ height: '0%' }}
              whileInView={{ height: '100%' }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, delay: 0.3 }}
              className="w-full bg-gradient-to-b from-gold via-gold/50 to-transparent" />
          </div>

          {steps.map((step, index) =>
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: step.delay }}
              className="relative z-10">

              {/* Mobile: horizontal card layout */}
              <div className="md:hidden flex gap-4 items-start pl-14">
                {/* Step number on the timeline */}
                <div className="absolute left-4 w-8 h-8 rounded-full bg-gold text-charcoal font-bold flex items-center justify-center text-sm z-10">
                  {index + 1}
                </div>
                <GlowCard className="flex-1 rounded-xl" hover={false}>
                  <div className="p-5 flex gap-4 items-start">
                    <div className="w-12 h-12 rounded-xl bg-theme-bg border border-gold/30 flex items-center justify-center flex-shrink-0">
                      <step.icon className="w-6 h-6 text-gold" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-theme-text text-lg mb-1 leading-tight">
                        {step.title}
                      </h3>
                      <p className="text-theme-muted text-xs leading-relaxed font-light">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </GlowCard>
              </div>

              {/* Desktop: vertical card layout */}
              <div className="hidden md:flex flex-col items-center text-center">
                {/* Decorative Step Circle */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-16 h-16 rounded-2xl bg-theme-surface border border-theme-border flex items-center justify-center relative group hover:border-gold/30 hover:shadow-xl transition-all duration-300">
                  <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-theme-bg border border-gold/30 text-gold text-xs font-serif font-bold flex items-center justify-center">
                    {step.number}
                  </div>
                  <step.icon className="w-7 h-7 text-theme-muted group-hover:text-gold transition-colors duration-300" />
                </motion.div>

                {/* Text Content */}
                <div className="mt-8 px-4">
                  <h3 className="text-xl font-serif font-bold text-theme-text mb-3 leading-snug">
                    {step.title}
                  </h3>
                  <p className="text-theme-muted text-sm leading-relaxed font-light">
                    {step.description}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>);
}