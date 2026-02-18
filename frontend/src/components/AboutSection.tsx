
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { GlowCard } from './GlowCard';
import { Sparkles, Fingerprint, History, Globe2 } from 'lucide-react';

export function AboutSection() {
    const { ref, isVisible } = useScrollAnimation();

    const features = [
        {
            icon: Fingerprint,
            title: 'Proof of Art (PoA)',
            description: 'Every artwork is verified and minted on the Solana blockchain, ensuring indisputable provenance and ownership.'
        },
        {
            icon: History,
            title: 'Cultural Preservation',
            description: 'We digitize and preserve Indonesia\'s rich cultural heritage, ensuring it endures for future generations.'
        },
        {
            icon: Sparkles,
            title: 'Artist Empowerment',
            description: 'Directly supporting local artisans and institutions by providing a global platform for their masterpieces.'
        },
        {
            icon: Globe2,
            title: 'Global Access',
            description: 'Connecting collectors worldwide with verified, high-quality traditional Indonesian art.'
        }
    ];

    return (
        <section id="about" className="py-20 md:py-32 bg-theme-bg relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-900/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                    {/* Content */}
                    <motion.div
                        ref={ref}
                        initial={{ opacity: 0, x: -30 }}
                        animate={isVisible ? { opacity: 1, x: 0 } : {}}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <span className="h-px w-8 bg-gold/50" />
                            <span className="text-gold text-xs uppercase tracking-widest font-medium">Our Mission</span>
                        </div>

                        <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-theme-text mb-6 leading-tight">
                            Preserving Culture through <span className="text-gold italic">Innovation</span>
                        </h2>

                        <p className="text-theme-muted text-lg leading-relaxed mb-8">
                            SeniQu is the premier Arts Marketplace dedicated to bridging the gap between traditional heritage and the digital future.
                            We introduce the concept of <strong className="text-theme-text font-medium">Proof of Art (PoA)</strong>,
                            creating a secure and transparent ecosystem for verified cultural assets.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {features.map((feature, index) => (
                                <div key={index} className="flex gap-4">
                                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-theme-elevated flex items-center justify-center text-gold border border-gold/10">
                                        <feature.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-serif font-bold text-theme-text mb-1">{feature.title}</h4>
                                        <p className="text-sm text-theme-muted leading-relaxed">{feature.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Visual */}
                    <div className="relative">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={isVisible ? { opacity: 1, scale: 1 } : {}}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="relative aspect-[4/5] rounded-2xl overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10" />
                            {/* Placeholder image - using a clean div for now or an abstract pattern */}
                            <div className="absolute inset-0 bg-theme-elevated border border-theme-border flex items-center justify-center">
                                <div className="absolute inset-0 opacity-20" style={{
                                    backgroundImage: 'url("https://images.unsplash.com/photo-1599582103473-b31c618c6422?q=80&w=1000&auto=format&fit=crop")',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    filter: 'grayscale(100%)'
                                }} />
                                <div className="absolute inset-0 bg-gradient-to-br from-gold/10 to-purple-900/10 mix-blend-overlay" />

                                <GlowCard className="bg-theme-glass/95 backdrop-blur-xl p-6 max-w-xs mx-auto text-center border-gold/30 relative z-20 m-6" hover={true}>
                                    <Fingerprint className="w-12 h-12 text-gold mx-auto mb-4" />
                                    <h3 className="text-2xl font-serif text-theme-text mb-2">Proof of Art</h3>
                                    <p className="text-theme-muted text-sm">
                                        Authenticity verified on Solana blockchain. Immutable, transparent, and secure.
                                    </p>
                                </GlowCard>
                            </div>
                        </motion.div>

                        {/* Floating elements */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute -top-10 -right-10 w-24 h-24 bg-gold/20 rounded-full blur-2xl"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

export default AboutSection;
