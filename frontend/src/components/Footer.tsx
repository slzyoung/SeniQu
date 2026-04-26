import { Twitter, Instagram, Disc, Mail, Send, ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';

export function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-theme-bg border-t border-theme-border pt-12 md:pt-20 pb-28 md:pb-10 relative overflow-hidden transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        {/* Newsletter Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 md:gap-8 mb-12 md:mb-16 pb-10 md:pb-16 border-b border-theme-border">
          <div className="text-center md:text-left w-full md:w-auto">
            <h3 className="text-xl md:text-2xl font-serif font-bold text-theme-text mb-1 md:mb-2">
              Stay Updated
            </h3>
            <p className="text-theme-muted text-xs md:text-sm">
              Get the latest updates on new collections and drops.
            </p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input
              type="email"
              placeholder="Enter your email"
              className="bg-theme-surface border border-theme-border rounded-full px-4 md:px-6 py-3 w-full md:w-80 text-theme-text text-sm focus:outline-none focus:border-gold/50 transition-colors" />

            <button className="bg-gold text-charcoal rounded-full w-11 h-11 md:w-12 md:h-12 flex-shrink-0 flex items-center justify-center hover:bg-gold-light transition-colors">
              <Send className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Footer Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12 md:mb-16">
          {/* Brand Column - Full width on mobile */}
          <div className="col-span-2 md:col-span-1 text-center md:text-left">
            <div className="mb-4 md:mb-6 flex flex-col items-center md:items-start">
              <span className="font-serif text-2xl md:text-3xl font-bold text-gold italic block">
                SeniQu
              </span>
              <motion.div
                className="hidden md:block relative mt-1.5 cursor-pointer overflow-hidden rounded-md p-[1px] group"
                initial={{ opacity: 0.85 }}
                whileHover={{ 
                  opacity: 1, 
                  y: -2,
                  scale: 1.05,
                  filter: "drop-shadow(0 4px 12px rgba(20, 241, 149, 0.3))"
                }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                onClick={(e) => { 
                  e.stopPropagation(); 
                  window.open('https://solana.com', '_blank'); 
                }}
              >
                {/* Spinning silver line */}
                <div className="absolute inset-[-150%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_85%,rgba(229,231,235,1)_100%)] opacity-70 group-hover:opacity-100 transition-opacity duration-300" />
                
                {/* Inner container */}
                <div className="relative z-10 flex h-full w-full items-center justify-center rounded-[5px] bg-theme-bg overflow-hidden">
                  <img 
                    src="/images/logo/poweredbysol.svg" 
                    alt="Powered by Solana" 
                    className="h-3.5 rounded-[5px]"
                  />
                </div>
              </motion.div>
            </div>
            <p className="text-theme-muted text-xs md:text-sm leading-relaxed mb-4 md:mb-6 max-w-xs mx-auto md:mx-0">
              Indonesia's leading digital cultural heritage infrastructure — bridging museums, galleries, and heritage sites with AI-powered technology.
            </p>
            <div className="flex gap-3 justify-center md:justify-start">
              {[Twitter, Instagram, Disc, Mail].map((Icon, i) =>
                <a
                  key={i}
                  href="#"
                  className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-theme-surface flex items-center justify-center text-theme-text hover:bg-gold hover:text-charcoal hover:shadow-[0_0_15px_rgba(201,168,76,0.4)] transition-all">

                  <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-theme-text font-serif font-bold mb-4 md:mb-6 text-sm md:text-base">
              Platform
            </h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm text-theme-muted">
              {['Collections', 'Artists', 'Marketplace', 'Roadmap'].map(
                (item) =>
                  <li key={item}>
                    <a href="#" className="hover:text-gold transition-colors">
                      {item}
                    </a>
                  </li>

              )}
            </ul>
          </div>

          <div className="hidden md:block">
            <h4 className="text-theme-text font-serif font-bold mb-6 text-base">
              Community
            </h4>
            <ul className="space-y-4 text-sm text-theme-muted">
              {[
                'Discord Server',
                'Twitter Updates',
                'Instagram Gallery',
                'Blog'].
                map((item) =>
                  <li key={item}>
                    <a href="#" className="hover:text-gold transition-colors">
                      {item}
                    </a>
                  </li>
                )}
            </ul>
          </div>

          <div>
            <h4 className="text-theme-text font-serif font-bold mb-4 md:mb-6 text-sm md:text-base">
              Legal
            </h4>
            <ul className="space-y-3 md:space-y-4 text-xs md:text-sm text-theme-muted">
              {[
                'Terms of Service',
                'Privacy Policy',
                'Cookie Policy',
                'Support'].
                map((item) =>
                  <li key={item}>
                    <a href="#" className="hover:text-gold transition-colors">
                      {item}
                    </a>
                  </li>
                )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 md:pt-8 border-t border-theme-border flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-[10px] md:text-xs text-theme-muted/60">
          <p>© 2026 SeniQu. Preserving Nusantara's Heritage, Digitally.</p>
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={scrollToTop}
              className="group flex items-center gap-2 text-theme-text hover:text-gold transition-colors"
            >
              Back to Top <ArrowUp className="w-3 h-3 group-hover:-translate-y-0.5 transition-transform" />
            </button>
            <a href="#" className="hover:text-theme-text hidden md:block">
              Privacy
            </a>
            <a href="#" className="hover:text-theme-text hidden md:block">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>);
}
