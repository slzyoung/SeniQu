import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import { ParticleField } from './ParticleField';

const artworks = [
  {
    id: 1,
    image:
      'https://images.unsplash.com/photo-1555400038-63f5ba517a47?q=80&w=2070&auto=format&fit=crop',
    alt: 'Balinese Temple Gate'
  },
  {
    id: 2,
    image:
      'https://images.unsplash.com/photo-1628413993904-94ecb60f6153?q=80&w=1887&auto=format&fit=crop',
    alt: 'Traditional Batik Pattern'
  },
  {
    id: 3,
    image:
      'https://images.unsplash.com/photo-1599576838609-84d1c4e00b39?q=80&w=1887&auto=format&fit=crop',
    alt: 'Wayang Kulit Shadow Puppet'
  },
  {
    id: 4,
    image:
      'https://images.unsplash.com/photo-1604917621956-10dfa7cce2e7?q=80&w=2062&auto=format&fit=crop',
    alt: 'Borobudur Relief'
  }
];

export function HeroSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % artworks.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const { clientX, clientY, currentTarget } = e;
    const { width, height, left, top } = currentTarget.getBoundingClientRect();
    const x = (clientX - left) / width - 0.5;
    const y = (clientY - top) / height - 0.5;
    setMousePosition({ x, y });
  };

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-charcoal flex items-center justify-center">
      {/* Background Texture */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] pointer-events-none"></div>
      <ParticleField />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center pt-20 pb-10">

        {/* Left Column: Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: isLoaded ? 1 : 0, x: isLoaded ? 0 : -30 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="flex flex-col text-center lg:text-left order-2 lg:order-1"
        >
          <div className="mb-6">
            <div className="inline-flex items-center gap-2 py-1 px-3 border border-gold/30 rounded-full bg-gold/5 backdrop-blur-sm mb-4 mx-auto lg:mx-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-gold text-[10px] md:text-xs tracking-[0.15em] uppercase font-medium">
                Web 2.5 Digital Museum
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-7xl font-serif font-bold text-cream mb-4 tracking-tight leading-[1.15] drop-shadow-lg">
              Preserving <br />
              <span className="text-gold italic relative inline-block">
                Nusantara's Soul
                <span className="absolute -bottom-2 left-0 right-0 h-[4px] bg-gold/20 blur-sm rounded-full w-full" />
              </span>
              <br />
              <span className="text-3xl sm:text-4xl md:text-6xl text-cream">
                One Masterpiece at a Time
              </span>
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-cream-muted font-light mb-8 tracking-wide max-w-xl mx-auto lg:mx-0">
              A digital sanctuary for 12,000+ traditional artworks from across the Indonesian archipelago. Verified, digitized, and preserved on-chain.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 sm:gap-6">
            <button className="w-full sm:w-auto px-8 py-4 bg-gold text-charcoal font-bold rounded-sm hover:bg-gold-light transition-all duration-300 transform hover:scale-105 shadow-[0_0_20px_rgba(201,168,76,0.3)] flex items-center justify-center gap-2 group">
              Explore Collections
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <button className="w-full sm:w-auto px-8 py-4 bg-transparent border border-cream-muted text-cream-muted font-medium rounded-sm hover:bg-cream-muted/10 transition-all duration-300 flex items-center justify-center gap-2">
              <Play className="w-4 h-4 fill-current" />
              Watch Process
            </button>
          </div>
        </motion.div>

        {/* Right Column: The Grand Arch / Gate */}
        <motion.div
          className="relative w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto lg:mr-0 lg:ml-auto order-1 lg:order-2 perspective-1000"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setMousePosition({ x: 0, y: 0 })}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          style={{
            transform: `perspective(1000px) rotateY(${mousePosition.x * 5}deg) rotateX(${-mousePosition.y * 5}deg)`,
            transition: 'transform 0.1s ease-out'
          }}
        >
          <div className="relative aspect-[4/5] w-full">
            {/* Ornamental Gold Flourishes around Arch */}
            <div
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-48 h-16 bg-contain bg-no-repeat bg-center opacity-80 z-20 pointer-events-none"
              style={{
                backgroundImage:
                  "url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMjUiPjxwYXRoIGQ9Ik01MCwwIEMyNSwxMCAwLDI1IDAsMjUgTTEwMCwyNSBDMTAwLDI1IDc1LDEwIDUwLDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0M5QTg0QyIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+')"
              }}
            />

            {/* The Gate Doors (Opening Animation) */}
            <div className="absolute inset-0 z-30 pointer-events-none flex overflow-hidden rounded-t-[10rem] border-4 border-gold shadow-[0_0_50px_rgba(201,168,76,0.2)]">
              {/* Left Door */}
              <motion.div
                className="w-1/2 h-full bg-seniqu-burgundy border-r-2 border-gold relative"
                initial={{ x: 0 }}
                animate={{ x: isLoaded ? '-100%' : 0 }}
                transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.2 }}
              >
                <div className="absolute inset-0 opacity-60 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-gold/30 rounded-full"></div>
                </div>
              </motion.div>

              {/* Right Door */}
              <motion.div
                className="w-1/2 h-full bg-seniqu-burgundy border-l-2 border-gold relative"
                initial={{ x: 0 }}
                animate={{ x: isLoaded ? '100%' : 0 }}
                transition={{ duration: 2.5, ease: 'easeInOut', delay: 0.2 }}
              >
                <div className="absolute inset-0 opacity-60 bg-[url('https://www.transparenttextures.com/patterns/wood-pattern.png')]"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-gold/30 rounded-full"></div>
                </div>
              </motion.div>
            </div>

            {/* Arch Frame Container */}
            <div className="relative w-full h-full overflow-hidden rounded-t-[10rem] bg-charcoal">
              <AnimatePresence mode="wait">
                <motion.img
                  key={artworks[currentIndex].id}
                  src={artworks[currentIndex].image}
                  alt={artworks[currentIndex].alt}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5 }}
                />
              </AnimatePresence>

              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-transparent to-transparent opacity-90"></div>

              {/* Content inside Arch */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-center z-10">
                <motion.p
                  key={`caption-${currentIndex}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-cream/90 font-serif italic text-lg"
                >
                  {artworks[currentIndex].alt}
                </motion.p>
              </div>
            </div>

            {/* Ambient Glow behind Gate */}
            <div className="absolute inset-0 -z-10 bg-gold/10 blur-[80px] rounded-full scale-90"></div>
          </div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        animate={{ y: [0, 10, 0], opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 cursor-pointer z-20"
        onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
      >
        <span className="text-[10px] uppercase tracking-[0.2em] text-gold/60">Scroll</span>
        <div className="w-5 h-5 border-b-2 border-r-2 border-gold/50 transform rotate-45" />
      </motion.div>
    </section>
  );
}