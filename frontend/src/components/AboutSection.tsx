
import { motion } from 'framer-motion';
import { useScrollAnimation } from '../hooks/useScrollAnimation';
import { GlowCard } from './GlowCard';
import { Landmark, Smartphone, Brain, Globe2 } from 'lucide-react';

export function AboutSection() {
    const { ref, isVisible } = useScrollAnimation();

    const features = [
        {
            icon: Landmark,
            title: 'Centralized Platform',
            description: 'Unified ecosystem for heritage sites.'
        },
        {
            icon: Smartphone,
            title: 'Immersive Experience',
            description: 'Smart navigation & interactive tools.'
        },
        {
            icon: Brain,
            title: 'AI-Enhanced',
            description: 'Automated insights & multilingual guides.'
        },
        {
            icon: Globe2,
            title: 'Tourism Optimized',
            description: 'Personalized routes & recommendations.'
        }
    ];

    return (
        <section id="about" className="py-20 md:py-32 bg-theme-bg relative overflow-hidden">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-900/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

            <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
                {/* Section Header — centered */}
                <motion.div
                    ref={ref}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isVisible ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-12 md:mb-16 max-w-3xl mx-auto"
                >
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <span className="h-px w-8 bg-gold/50" />
                        <span className="text-gold text-xs uppercase tracking-[0.2em] font-medium">Why SeniQu</span>
                        <span className="h-px w-8 bg-gold/50" />
                    </div>

                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-theme-text mb-4 leading-tight">
                        Bridging <span className="text-gold italic">Culture</span> & <span className="text-gold italic">Technology</span>
                    </h2>

                    <p className="text-theme-muted text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                        Only 54–68% of Indonesia's cultural assets are digitally structured.
                        SeniQu transforms that gap into opportunity.
                    </p>
                </motion.div>

                {/* Features Grid — 4 cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                        >
                            <GlowCard className="h-full rounded-2xl p-4 md:p-8 text-center flex flex-col items-center justify-start bg-theme-bg/40 backdrop-blur-sm border border-gold/10 hover:border-gold/30 transition-all duration-300 group" hover={true}>
                                <div className="mt-2 md:mt-0 w-10 h-10 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-gold/10 to-transparent border border-gold/20 flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
                                    <feature.icon className="w-4 h-4 md:w-6 md:h-6 text-gold drop-shadow-sm" />
                                </div>
                                <h4 className="font-serif font-semibold text-theme-text mb-1.5 md:mb-3 text-[13px] md:text-lg tracking-wide">{feature.title}</h4>
                                <p className="text-[11px] md:text-[14px] text-theme-muted/80 leading-relaxed font-light">{feature.description}</p>
                            </GlowCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

export default AboutSection;
