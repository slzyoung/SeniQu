import { ArrowRight, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { ParticleField } from './ParticleField';
import { Link } from 'react-router-dom';

export function CTASection() {
  return (
    <section className="py-20 md:py-32 relative overflow-hidden flex items-center justify-center bg-theme-bg transition-colors duration-300">
      <div className="absolute inset-0 bg-theme-bg z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold/10 via-theme-bg to-theme-bg" />
        <ParticleField />
      </div>

      {/* Floating Elements - hidden on mobile to reduce clutter */}
      <div className="hidden md:block absolute top-20 left-10 w-16 h-16 border border-gold/20 rounded-full animate-float-slow opacity-50" />
      <div
        className="hidden md:block absolute bottom-20 right-10 w-24 h-24 border border-gold/10 rounded-full animate-float-slow opacity-50"
        style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}>

          <h2 className="text-3xl sm:text-4xl md:text-6xl font-serif font-bold text-theme-text mb-4 md:mb-6 drop-shadow-lg">
            Begin Your <span className="text-gold italic">Journey</span>
          </h2>
          <p className="text-base md:text-xl text-theme-muted mb-8 md:mb-10 max-w-xl mx-auto">
            Experience the world's most diverse living civilization — one museum, one gallery, one heritage site at a time.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <Link
              to="/collections"
              className="w-full sm:w-auto px-6 md:px-8 py-3.5 md:py-4 bg-gold text-charcoal font-bold rounded-full hover:bg-gold-light transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(201,168,76,0.4)] animate-pulse-glow text-sm md:text-base"
            >
              <Compass className="w-4 h-4 md:w-5 md:h-5" />
              Start Exploring
            </Link>
            <Link
              to="/#about"
              className="w-full sm:w-auto px-6 md:px-8 py-3.5 md:py-4 text-theme-text hover:text-gold transition-colors flex items-center justify-center gap-2 font-medium backdrop-blur-sm border border-theme-border rounded-full hover:bg-theme-surface text-sm md:text-base"
            >
              Learn more
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>);
}