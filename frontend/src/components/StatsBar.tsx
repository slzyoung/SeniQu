import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { X } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

interface StatItem {
  id: string;
  value: string;
  label: string;
  image: string;
  fact: string;
}

const CDN = 'https://cdn.seniqu.art/assets/landing/stats';

const stats: StatItem[] = [
  {
    id: 'cultural',
    value: '4,859+',
    label: 'Cultural Sites',
    image: `${CDN}/cultural_sites.jpg`,
    fact: 'From ancient temples of Borobudur to royal palaces of Yogyakarta — Indonesia holds one of the richest cultural tapestries in Southeast Asia.',
  },
  {
    id: 'museums',
    value: '450',
    label: 'Museums',
    image: `${CDN}/museums.jpeg`,
    fact: 'Spanning art, history, science, and heritage — Indonesian museums safeguard stories from over 17,000 islands.',
  },
  {
    id: 'heritage',
    value: '1,941',
    label: 'Heritage Items',
    image: `${CDN}/heritage_items.jpeg`,
    fact: 'UNESCO-listed and nationally registered artifacts, dances, textiles, and intangible heritage preserved for future generations.',
  },
  {
    id: 'islands',
    value: '17,000+',
    label: 'Islands',
    image: `${CDN}/islands.jpeg`,
    fact: 'The world\'s largest archipelago — each island carries unique traditions, languages, and artistic expressions.',
  },
];

/* ═══════════════════════════════════════════════════════
   Animated Counter
   ═══════════════════════════════════════════════════════ */
function AnimatedCount({ value, isInView }: { value: string; isInView: boolean }) {
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
    <>
      {count.toLocaleString()}
      <span className="text-gold">{suffix}</span>
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   Stat Card (compact grid item)
   ═══════════════════════════════════════════════════════ */
function StatCard({ stat, delay, onOpen }: { stat: StatItem; delay: number; onOpen: () => void }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  return (
    <motion.div
      ref={ref}
      layoutId={`stat-card-${stat.id}`}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      onClick={onOpen}
      className="group relative rounded-2xl md:rounded-3xl overflow-hidden aspect-[4/5] md:aspect-[3/4] shadow-lg hover:shadow-2xl transition-shadow duration-500 cursor-pointer active:scale-[0.97] touch-manipulation"
      style={{ WebkitTapHighlightColor: 'transparent' }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Background Image */}
      <motion.img
        layoutId={`stat-img-${stat.id}`}
        src={stat.image}
        alt={stat.label}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
      />

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Content overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 p-4 md:p-6 text-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: delay + 0.1 }}
          className="font-serif text-3xl md:text-5xl font-bold mb-0.5 md:mb-1 drop-shadow-lg"
        >
          <AnimatedCount value={stat.value} isInView={isInView} />
        </motion.div>

        <motion.div
          layoutId={`stat-label-${stat.id}`}
          className="text-[10px] md:text-sm text-white/80 uppercase tracking-widest font-medium"
        >
          {stat.label}
        </motion.div>

        <motion.div
          initial={{ width: 0 }}
          animate={isInView ? { width: '32px' } : {}}
          transition={{ duration: 1, delay: delay + 0.5 }}
          className="h-[2px] bg-gold/70 mt-2.5 md:mt-4 rounded-full"
        />
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Expanded Stat Overlay
   ═══════════════════════════════════════════════════════ */
function ExpandedStat({ stat, onClose }: { stat: StatItem; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Expanded Card */}
      <motion.div
        layoutId={`stat-card-${stat.id}`}
        className="relative w-full md:w-[520px] md:max-h-[85vh] max-h-[92vh] rounded-t-3xl md:rounded-3xl overflow-hidden bg-black shadow-2xl z-10"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Image — hero */}
        <motion.div className="relative aspect-[16/10] overflow-hidden">
          <motion.img
            layoutId={`stat-img-${stat.id}`}
            src={stat.image}
            alt={stat.label}
            className="w-full h-full object-cover"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Close button */}
          <motion.button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-black/70 transition-all duration-200 z-20"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ delay: 0.15 }}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </motion.button>

          {/* Large stat overlay on image */}
          <div className="absolute bottom-4 left-5 text-white">
            <div className="font-serif text-5xl md:text-6xl font-bold drop-shadow-lg">
              {stat.value}
            </div>
            <motion.div
              layoutId={`stat-label-${stat.id}`}
              className="text-xs md:text-sm text-white/70 uppercase tracking-widest font-medium mt-1"
            >
              {stat.label}
            </motion.div>
          </div>
        </motion.div>

        {/* Detail Content */}
        <motion.div
          className="p-5 md:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
        >
          <p className="text-white/60 text-sm md:text-base leading-relaxed">
            {stat.fact}
          </p>
          <div className="mt-4 h-[2px] w-10 bg-gold/50 rounded-full" />
        </motion.div>

        {/* Bottom safe area */}
        <div className="h-[env(safe-area-inset-bottom,0px)]" />
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════
   Main StatsBar Section
   ═══════════════════════════════════════════════════════ */
export function StatsBar() {
  const [selected, setSelected] = useState<StatItem | null>(null);
  const { t } = useLanguage();

  const localizedStats = stats.map((stat) => ({
    ...stat,
    label: t(`stats.${stat.id}Label`),
    fact: t(`stats.${stat.id}Fact`),
  }));

  const handleOpen = useCallback((stat: StatItem) => setSelected(stat), []);
  const handleClose = useCallback(() => setSelected(null), []);

  return (
    <section className="w-full bg-theme-bg relative z-20 pt-16 md:pt-24 px-4 md:px-6 pb-8 md:pb-12">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
          {localizedStats.map((stat, i) => (
            <StatCard key={stat.id} stat={stat} delay={i * 0.15} onOpen={() => handleOpen(stat)} />
          ))}
        </div>
      </div>

      {/* Expanded overlay */}
      <AnimatePresence>
        {selected && (
          <ExpandedStat 
            stat={localizedStats.find(s => s.id === selected.id) || selected} 
            onClose={handleClose} 
          />
        )}
      </AnimatePresence>
    </section>
  );
}