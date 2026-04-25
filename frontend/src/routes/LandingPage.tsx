/**
 * Landing Page Component — Dashboard-Style Public Explorer
 * Adopts the National Heritage dashboard aesthetic for a premium
 * public-facing experience. Uses landing-* CSS classes to avoid
 * collision with the authenticated dashboard's heritage-* classes.
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { HeroSection } from '../components/HeroSection';
import { LandingSearchBar } from '../components/LandingSearchBar';
import { ExploreCities } from '../components/ExploreCities';
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

    const location = useLocation();

    // Handle hash fragment scrolling for SPA routing
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.substring(1);
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 100); // Slight delay to ensure DOM layout is complete
        }
    }, [location]);

    return (
        <div className="min-h-screen bg-theme-bg text-theme-text selection:bg-gold selection:text-charcoal font-sans transition-colors duration-300 scroll-smooth">
            <Navbar />
            <main className="pt-20 md:pt-24 pb-20 md:pb-0">
                <HeroSection />
                <LandingSearchBar />
                <ExploreCities />
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
