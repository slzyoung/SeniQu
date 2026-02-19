import { useEffect, useState } from 'react';
import { User, LogOut, LayoutDashboard, Image, FolderHeart, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { QuickSearch } from './common/QuickSearch';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from './ThemeToggle';
import { useAuthStore } from '../stores/useAuthStore';
import { useAuthModalStore } from '../stores/useAuthModalStore';
import { useUIStore } from '../stores/useUIStore';
import { getDashboardRoute } from '../lib/utils';
import { ROUTES } from '../lib/constants';
import { useNavigate } from 'react-router-dom';
import { useLogout } from '../hooks/useLogout';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  // Use global UI store for mobile menu state
  const { mobileMenuOpen, toggleMobileMenu, setMobileMenuOpen } = useUIStore();
  const { openAuthModal } = useAuthModalStore();
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = useLogout();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = isAuthenticated ? [
    { label: 'Dashboard', icon: LayoutDashboard, path: getDashboardRoute(user?.role || 'user') },
    { label: 'Art Gallery', icon: Image, path: ROUTES.GALLERY },
    { label: 'My Collections', icon: FolderHeart, path: ROUTES.USER_COLLECTIONS },
    { label: 'Profile', icon: User, path: ROUTES.USER_PROFILE },
  ] : [
    { label: 'Collections', path: '#collections' },
    { label: 'Artists', path: '#artists' },
    { label: 'How It Works', path: '#how-it-works' },
    { label: 'About', path: '#about' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? 'bg-theme-glass backdrop-blur-xl border-b border-theme-glass-border py-4 shadow-sm' : 'bg-transparent py-6'}`}>

        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center relative group cursor-pointer" onClick={() => navigate(ROUTES.HOME)}>
            <span className="font-serif text-2xl md:text-3xl font-bold text-gold italic tracking-wide relative z-10">
              SeniQu
            </span>
            <motion.div
              className="absolute -bottom-1 left-0 right-0 h-[2px] bg-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              layoutId="logoUnderline" />

          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {!isAuthenticated && ['Collections', 'Artists', 'How It Works', 'About'].map((item) =>
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-theme-muted hover:text-gold transition-colors text-sm tracking-wide font-medium relative group">

                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold transition-all duration-300 group-hover:w-full" />
              </a>
            )}
            {/* Authenticated Desktop Links */}
            {isAuthenticated && (
              <>
                <a
                  href={ROUTES.GALLERY}
                  className="text-theme-muted hover:text-gold transition-colors text-sm tracking-wide font-medium relative group"
                >
                  Explore
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold transition-all duration-300 group-hover:w-full" />
                </a>
                <a
                  href={ROUTES.USER_COLLECTIONS}
                  className="text-theme-muted hover:text-gold transition-colors text-sm tracking-wide font-medium relative group"
                >
                  My Collections
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold transition-all duration-300 group-hover:w-full" />
                </a>
                <a
                  href={ROUTES.USER_PROFILE}
                  className="text-theme-muted hover:text-gold transition-colors text-sm tracking-wide font-medium relative group"
                >
                  Profile
                  <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-gold transition-all duration-300 group-hover:w-full" />
                </a>
              </>
            )}
            <QuickSearch />
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <ThemeToggle />

            {isAuthenticated && user ? (
              <a
                href={getDashboardRoute(user.role)}
                className="group flex items-center gap-2 px-5 py-2.5 border border-gold/50 rounded-full text-gold hover:bg-gold hover:text-charcoal hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gold/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="text-sm font-medium tracking-wide relative z-10">
                  Dashboard
                </span>
                <User className="w-4 h-4 transition-transform group-hover:scale-110 relative z-10" />
              </a>
            ) : (
              <button
                onClick={() => openAuthModal()}
                className="group flex items-center gap-2 px-5 py-2.5 border border-gold/50 rounded-full text-gold hover:bg-gold hover:text-charcoal hover:shadow-lg hover:shadow-gold/20 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gold/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                <span className="text-sm font-medium tracking-wide relative z-10">
                  Sign In
                </span>
                <User className="w-4 h-4 transition-transform group-hover:scale-110 relative z-10" />
              </button>
            )}
          </div>

          {/* Mobile Menu Toggle - Animated Hamburger */}
          <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={toggleMobileMenu}
              className="relative w-10 h-10 flex items-center justify-center text-theme-text hover:text-gold transition-colors focus:outline-none"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-10 h-10 rounded-full bg-theme-elevated flex items-center justify-center"
                  >
                    {isAuthenticated ? (
                      <ChevronLeft className="w-6 h-6" />
                    ) : (
                      <X className="w-6 h-6" />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="w-10 h-10 rounded-full bg-theme-elevated flex items-center justify-center"
                  >
                    {isAuthenticated ? (
                      <ChevronRight className="w-6 h-6" />
                    ) : (
                      <div className="relative w-6 h-5 flex flex-col justify-between">
                        <span className="w-full h-0.5 bg-current rounded-full" />
                        <span className="w-full h-0.5 bg-current rounded-full" />
                        <span className="w-full h-0.5 bg-current rounded-full" />
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen &&
          <motion.div
            initial={{
              opacity: 0,
              backdropFilter: 'blur(0px)'
            }}
            animate={{
              opacity: 1,
              backdropFilter: 'blur(16px)'
            }}
            exit={{
              opacity: 0,
              backdropFilter: 'blur(0px)'
            }}
            className="fixed inset-0 z-40 bg-theme-bg/90 pt-24 px-6 md:hidden">

            <div className="flex flex-col space-y-6">
              {menuItems.map(
                (item, index) =>
                  <motion.div
                    key={item.label}
                    initial={{
                      opacity: 0,
                      x: -20
                    }}
                    animate={{
                      opacity: 1,
                      x: 0
                    }}
                    transition={{
                      delay: index * 0.05 + 0.1
                    }}
                  >
                    {isAuthenticated ? (
                      <button
                        onClick={() => {
                          setMobileMenuOpen(false);
                          navigate(item.path);
                        }}
                        className="flex items-center gap-4 text-2xl font-serif text-theme-text hover:text-gold transition-colors w-full text-left"
                      >
                        {'icon' in item && <item.icon className="w-6 h-6" />}
                        {item.label}
                      </button>
                    ) : (
                      <a
                        href={item.path}
                        className="text-3xl font-serif text-theme-text hover:text-gold transition-colors block"
                        onClick={() => setMobileMenuOpen(false)}>
                        {item.label}
                      </a>
                    )}
                  </motion.div>
              )}

              <motion.div
                initial={{
                  opacity: 0,
                  y: 20
                }}
                animate={{
                  opacity: 1,
                  y: 0
                }}
                transition={{
                  delay: 0.3
                }}
                className="pt-8 border-t border-theme-border flex flex-col gap-4">

                {!isAuthenticated ? (
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gold text-charcoal rounded-full font-medium shadow-lg shadow-gold/20">
                    <span>Sign In</span>
                    <User className="w-5 h-5" />
                  </button>
                ) : (
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-red-500/30 text-red-500 hover:bg-red-500/10 rounded-full font-medium transition-colors">
                    <span>Sign Out</span>
                    <LogOut className="w-5 h-5" />
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </>
  );
}