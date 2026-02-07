import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Grid, MapPin, Compass } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthModalStore } from '../stores/useAuthModalStore';
import { ROUTES } from '../lib/constants';

export function MobileNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { openAuthModal } = useAuthModalStore();

  const getActiveTab = (pathname: string) => {
    if (pathname === '/') return 'Home';
    if (pathname.startsWith('/collections')) return 'Collections';
    if (pathname.startsWith('/gallery/nearby')) return 'Nearby';
    if (pathname === '/gallery') return 'Explore';
    return 'Home'; // Default or handle other cases
  };

  const activeTab = getActiveTab(location.pathname);

  const handleNavClick = (label: string) => {
    switch (label) {
      case 'Home':
        navigate(ROUTES.HOME);
        break;
      case 'Collections':
        navigate('/collections');
        break;
      case 'Nearby':
        navigate(ROUTES.NEARBY);
        break;
      case 'Explore':
        openAuthModal();
        break;
    }
  };

  const navItems = [
    { icon: Home, label: 'Home' },
    { icon: Grid, label: 'Collections' },
    { icon: MapPin, label: 'Nearby' },
    { icon: Compass, label: 'Explore' }
  ];

  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-3 pb-safe pointer-events-none"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 12px), 12px)' }}>

      <div className="bg-theme-glass backdrop-blur-xl border border-theme-glass-border rounded-2xl shadow-2xl pointer-events-auto">
        <div className="flex justify-around items-center h-[60px] px-1 relative">
          <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

          {navItems.map((item) => {
            const isActive = activeTab === item.label;
            return (
              <motion.button
                key={item.label}
                onClick={() => handleNavClick(item.label)}
                whileTap={{ scale: 0.9 }}
                className={`relative flex flex-col items-center justify-center min-w-[56px] h-[48px] space-y-0.5 z-10 ${isActive ? 'text-gold' : 'text-theme-muted'}`}>

                {isActive && (
                  <motion.div
                    layoutId="mobileNavActive"
                    className="absolute inset-0 bg-gold/10 rounded-xl -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }} />
                )}
                <item.icon className={`w-5 h-5 transition-all duration-300 ${isActive ? 'scale-110' : ''}`} />
                <span className="text-[9px] font-medium leading-none">
                  {item.label}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}