import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LegalLayout = ({ title, children }: { title: string; children: React.ReactNode }) => {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-theme-bg text-theme-text font-sans selection:bg-gold/20">
            <div className="container mx-auto px-4 py-8 max-w-3xl">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-theme-muted hover:text-gold transition-colors mb-6 group"
                >
                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                </button>
                <h1 className="text-4xl font-serif font-bold mb-8 text-gold">{title}</h1>
                <div className="prose prose-invert prose-gold max-w-none bg-theme-elevated/30 p-8 rounded-2xl border border-theme-border">
                    {children}
                </div>
            </div>
        </div>
    );
};

export const TermsOfService = () => (
    <LegalLayout title="Terms of Service">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h3>1. Acceptance of Terms</h3>
        <p>By accessing and using Seniqu, you accept and agree to be bound by the terms and provision of this agreement.</p>

        <h3>2. Description of Service</h3>
        <p>Seniqu provides a platform for digital art collection, preservation, and education using blockchain technology.</p>

        <h3>3. User Conduct</h3>
        <p>Users agree to use the platform for lawful purposes only and not to violate any intellectual property rights.</p>

        <h3>4. Blockchain Transactions</h3>
        <p>Transactions on the Solana blockchain are irreversible. You acknowledge that you are responsible for maintaining the security of your wallet.</p>
    </LegalLayout>
);

export const PrivacyPolicy = () => (
    <LegalLayout title="Privacy Policy">
        <p>Last updated: {new Date().toLocaleDateString()}</p>
        <h3>1. Information Collection</h3>
        <p>We collect information necessary to provide our services, including wallet addresses and profile information you voluntarily provide.</p>

        <h3>2. Blockchain Data</h3>
        <p>Please note that transactions and wallet addresses are publicly visible on the Solana blockchain.</p>

        <h3>3. Data Security</h3>
        <p>We implement industry-standard security measures to protect your personal information.</p>
    </LegalLayout>
);
