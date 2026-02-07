
import { motion } from 'framer-motion';

export function LoadingFallback() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-theme-bg">
            <motion.div
                className="relative w-24 h-24"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* Outer Ring */}
                <motion.div
                    className="absolute inset-0 border-4 border-theme-border rounded-full"
                />

                {/* Spinning Ring */}
                <motion.div
                    className="absolute inset-0 border-4 border-t-seniqu-gold border-r-transparent border-b-transparent border-l-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />

                {/* Inner Pulse */}
                <motion.div
                    className="absolute inset-4 bg-seniqu-gold/20 rounded-full blur-xl"
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Logo or Icon Placeholder */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-serif font-bold text-seniqu-gold">S</span>
                </div>
            </motion.div>

            <motion.p
                className="mt-8 text-sm font-medium text-seniqu-gold tracking-widest uppercase"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
                Loading Experience
            </motion.p>
        </div>
    );
}
