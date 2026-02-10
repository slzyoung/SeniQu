/**
 * Landing Page Component - Wrapper for existing landing page
 */

import { useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/HeroSection';
import { StatsBar } from '../components/StatsBar';
import { TrustedBy } from '../components/TrustedBy';
import { FeaturedCollections } from '../components/FeaturedCollections';
import { HowItWorks } from '../components/HowItWorks';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';
import { MobileNav } from '../components/MobileNav';
import { useAuthModalStore } from '../stores/useAuthModalStore';

import { AboutSection } from '../components/AboutSection';
import { ArtistsSection } from '../components/ArtistsSection';

interface LandingPageProps {
    openAuthModal?: boolean;
}

export function LandingPage({ openAuthModal: shouldOpenModal }: LandingPageProps) {
    const { openAuthModal } = useAuthModalStore();

    // Open auth modal if redirected from /auth/login or /auth/register
    useEffect(() => {
        if (shouldOpenModal) {
            openAuthModal();
        }
    }, [shouldOpenModal, openAuthModal]);

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text selection:bg-gold selection:text-charcoal font-sans transition-colors duration-300 scroll-smooth">
            <Navbar />
            <main>
                <HeroSection />
                <StatsBar />
                <TrustedBy />
                <AboutSection />
                <FeaturedCollections />
                <ArtistsSection />
                <HowItWorks />
                <CTASection />
            </main>
            <div className="hidden md:block">
                <Footer />
            </div>
            <MobileNav />
        </div>
    );
}

export default LandingPage;
