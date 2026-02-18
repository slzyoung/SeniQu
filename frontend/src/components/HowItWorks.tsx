import { Upload, ShieldCheck, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { GlowCard } from './GlowCard';
export function HowItWorks() {
  const { ref, isVisible } = useScrollAnimation();
  const steps = [
    {
      icon: Upload,
      title: 'Upload Your Artwork',
      description:
        'Capture high-resolution images of traditional artworks with our guided digitization tools.',
      delay: 0
    },
    {
      icon: ShieldCheck,
      title: 'Verify Authenticity',
      description:
        'Our network of cultural experts and AI verification ensures provenance and authenticity.',
      delay: 0.2
    },
    {
      icon: Lock,
      title: 'Preserve Forever',
      description:
        'Artworks are permanently preserved on-chain, ensuring cultural heritage endures for generations.',
      delay: 0.4
    }];

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
            Digitization Process
          </h2>
          <p className="text-theme-muted text-sm md:text-base max-w-2xl mx-auto">
            We combine traditional expertise with blockchain technology.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-16 left-[16%] right-[16%] h-[2px] bg-theme-border overflow-hidden">
            <motion.div
              initial={{
                width: '0%'
              }}
              whileInView={{
                width: '100%'
              }}
              viewport={{
                once: true
              }}
              transition={{
                duration: 1.5,
                delay: 0.5
              }}
              className="h-full bg-gradient-to-r from-transparent via-gold to-transparent" />

          </div>

          {/* Mobile Connecting Line */}
          <div className="md:hidden absolute top-0 bottom-0 left-8 w-[2px] bg-theme-border">
            <motion.div
              initial={{
                height: '0%'
              }}
              whileInView={{
                height: '100%'
              }}
              viewport={{
                once: true
              }}
              transition={{
                duration: 1.5,
                delay: 0.3
              }}
              className="w-full bg-gradient-to-b from-gold via-gold/50 to-transparent" />

          </div>

          {steps.map((step, index) =>
            <motion.div
              key={index}
              initial={{
                opacity: 0,
                y: 30
              }}
              whileInView={{
                opacity: 1,
                y: 0
              }}
              viewport={{
                once: true
              }}
              transition={{
                duration: 0.6,
                delay: step.delay
              }}
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
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-serif font-bold text-theme-text mb-1">
                        {step.title}
                      </h3>
                      <p className="text-theme-muted leading-relaxed text-xs">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </GlowCard>
              </div>

              {/* Desktop: vertical card layout */}
              <div className="hidden md:block">
                <GlowCard
                  className="h-full rounded-2xl p-8 text-center"
                  hover={true}>

                  <div className="relative flex flex-col items-center">
                    <span className="absolute -top-4 -right-4 text-8xl font-serif font-bold text-theme-text opacity-[0.03] select-none">
                      {index + 1}
                    </span>
                    <div className="w-20 h-20 rounded-2xl bg-theme-bg border border-gold/30 flex items-center justify-center mb-6 shadow-lg shadow-gold/5 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gold/10 animate-pulse-glow" />
                      <step.icon className="w-8 h-8 text-gold relative z-10" />
                    </div>
                    <h3 className="text-xl font-serif font-bold text-theme-text mb-3">
                      {step.title}
                    </h3>
                    <p className="text-theme-muted leading-relaxed text-sm">
                      {step.description}
                    </p>
                  </div>
                </GlowCard>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </section>);

}