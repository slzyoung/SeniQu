import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../hooks/useTheme';
import { useLocation } from 'react-router-dom';

export function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const isReelsPage = location.pathname === '/reels';

  return (
    <button
      onClick={toggleTheme}
      className={`relative w-10 h-10 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all focus:outline-none group ${
        isReelsPage
          ? 'text-white bg-white/10 hover:bg-white/20'
          : 'text-theme-text hover:bg-theme-surface'
      }`}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>

      {/* Hover Glow Ring */}
      <div className={`absolute inset-0 rounded-full border border-gold/0 group-hover:border-gold/30 transition-colors duration-300 ${isReelsPage ? 'hidden' : ''}`} />
      <div className={`absolute inset-0 rounded-full bg-gold/0 group-hover:bg-gold/5 transition-colors duration-300 ${isReelsPage ? 'hidden' : ''}`} />

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={isDark ? 'dark' : 'light'}
          initial={{
            y: -20,
            opacity: 0,
            rotate: -90
          }}
          animate={{
            y: 0,
            opacity: 1,
            rotate: 0
          }}
          exit={{
            y: 20,
            opacity: 0,
            rotate: 90
          }}
          transition={{
            duration: 0.2
          }}>

          {isDark ?
          <Sun className="w-5 h-5 text-gold drop-shadow-[0_0_8px_rgba(201,168,76,0.5)]" /> :

          <Moon className={`w-5 h-5 ${isReelsPage ? 'text-white' : 'text-theme-text'}`} />
          }
        </motion.div>
      </AnimatePresence>
    </button>);

}