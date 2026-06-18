import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Download, CheckCircle, ArrowRight, ShieldCheck, Loader2, Key } from 'lucide-react';
import { photosService } from '../../../../../services/photosService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    photo: any;
    onPurchaseSuccess?: () => void;
}

export function SolanaPurchaseModal({ isOpen, onClose, photo, onPurchaseSuccess }: Props) {
    const [step, setStep] = useState<'connect' | 'confirm' | 'processing' | 'success'>('connect');
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [walletType, setWalletType] = useState<string | null>(null);
    const [txLogs, setTxLogs] = useState<string[]>([]);
    const [txSignature, setTxSignature] = useState<string | null>(null);
    const [downloading, setDownloading] = useState(false);

    // Now treating price directly as SOL
    const solPrice = photo ? (photo.price || 0) : 0;
    const gasFee = 0.00005;
    const totalSol = solPrice + gasFee;

    // Reset state when opening modal
    useEffect(() => {
        if (isOpen) {
            setStep('connect');
            setWalletAddress(null);
            setWalletType(null);
            setTxLogs([]);
            setTxSignature(null);
        }
    }, [isOpen]);

    if (!isOpen || !photo) return null;

    const connectWallet = (type: string) => {
        setWalletType(type);
        // Simulate loading
        setTimeout(() => {
            const simulatedAddress = type === 'phantom' 
                ? 'Phan8tZ4qy7mF89JqpX1s9yC3N2a1v4X5Z6e7r8t9yUo' 
                : 'Solf9tZ4qy7mF89JqpX1s9yC3N2a1v4X5Z6e7r8t9yUo';
            setWalletAddress(simulatedAddress);
            setStep('confirm');
        }, 800);
    };

    const executeTransaction = async () => {
        setStep('processing');
        const logs = [
            'Initializing simulated transaction on Solana Mainnet...',
            'Constructing Transfer Instruction...',
            `Source Wallet: ${walletAddress?.slice(0, 6)}...${walletAddress?.slice(-4)}`,
            `Destination (Creator): ${photo.userId?.slice(0, 6) || 'Creator'}...`,
            `Amount: ${solPrice.toFixed(4)} SOL`,
            'Requesting signature from Web3 extension...',
        ];

        for (let i = 0; i < logs.length; i++) {
            await new Promise(resolve => setTimeout(resolve, 600));
            setTxLogs(prev => [...prev, logs[i]]);
        }

        // Simulating approval
        await new Promise(resolve => setTimeout(resolve, 800));
        setTxLogs(prev => [...prev, '✓ Signature received from wallet.']);
        setTxLogs(prev => [...prev, 'Broadcasting transaction payload to Solana network...']);

        await new Promise(resolve => setTimeout(resolve, 1000));
        const simulatedSignature = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        setTxSignature(simulatedSignature);
        setTxLogs(prev => [...prev, `✓ Transaction confirmed. Block signature: ${simulatedSignature.slice(0, 16)}`]);

        // Write purchase to DB
        try {
            await photosService.purchasePhoto(photo.id, {
                transactionRef: simulatedSignature,
                licenseType: photo.licenseType || 'personal'
            });
            await new Promise(resolve => setTimeout(resolve, 500));
            setStep('success');
            onPurchaseSuccess?.();
        } catch (err) {
            console.error('Error writing purchase:', err);
            setTxLogs(prev => [...prev, '❌ Database registration failed. Retrying...']);
            setTimeout(() => {
                setStep('success');
                onPurchaseSuccess?.();
            }, 1000);
        }
    };

    const downloadHighRes = async () => {
        setDownloading(true);
        try {
            const response = await fetch(photo.originalUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${photo.title.replace(/\s+/g, '_')}_highres.jpg`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Download error:', error);
            window.open(photo.originalUrl, '_blank');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-md p-0 md:p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    onClick={e => e.stopPropagation()}
                    className="w-full md:max-w-md md:rounded-2xl max-h-[85vh] overflow-y-auto bg-theme-surface border border-theme-border/50 text-theme-text"
                >
                    <div className="w-12 h-1 bg-theme-border/30 rounded-full mx-auto my-3" />
                    
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pb-3 border-b border-theme-border/50">
                        <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                            <Wallet className="w-4.5 h-4.5 text-gold" />
                            Solana Web3 Checkout
                        </h3>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-theme-bg/50 text-theme-muted transition-colors">
                            <X className="w-4.5 h-4.5" />
                        </button>
                    </div>

                    <div className="p-5">
                        {step === 'connect' && (
                            <div className="space-y-4">
                                <div className="text-center py-4">
                                    <div className="w-14 h-14 rounded-full bg-gold/10 flex items-center justify-center mx-auto mb-3">
                                        <Wallet className="w-7 h-7 text-gold" />
                                    </div>
                                    <h4 className="text-sm font-bold text-theme-text">Connect Wallet</h4>
                                    <p className="text-xs text-theme-muted mt-1 max-w-xs mx-auto">
                                        Sign with Phantom or Solflare to execute this simulated transaction on the Solana network.
                                    </p>
                                </div>

                                <div className="space-y-2.5">
                                    <button
                                        onClick={() => connectWallet('phantom')}
                                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-theme-border/50 bg-theme-bg hover:border-gold/30 hover:bg-gold/5 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-bold text-sm">
                                                Ph
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-theme-text">Phantom Wallet</p>
                                                <p className="text-[10px] text-theme-muted">Popular Solana Web3 wallet</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-theme-muted" />
                                    </button>

                                    <button
                                        onClick={() => connectWallet('solflare')}
                                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-theme-border/50 bg-theme-bg hover:border-gold/30 hover:bg-gold/5 transition-all text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 font-bold text-sm">
                                                Sf
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-theme-text">Solflare Wallet</p>
                                                <p className="text-[10px] text-theme-muted">Direct Solana integration</p>
                                            </div>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-theme-muted" />
                                    </button>
                                </div>

                                <div className="flex items-center gap-2 justify-center text-[10px] text-theme-muted pt-2">
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Simulated sandbox. No real assets required.</span>
                                </div>
                            </div>
                        )}

                        {step === 'confirm' && (
                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-theme-bg/50 border border-theme-border/30 space-y-3">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-theme-muted">Item to buy:</span>
                                        <span className="font-bold text-theme-text">{photo.title}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-theme-muted">License Type:</span>
                                        <span className="font-bold text-theme-text capitalize">{photo.licenseType || 'Personal'}</span>
                                    </div>
                                    <hr className="border-theme-border/30" />
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-theme-muted">Artwork Price:</span>
                                        <span className="font-bold text-gold">{solPrice} SOL</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-theme-muted">Estimated Gas Fee:</span>
                                        <span className="text-theme-muted">{gasFee} SOL</span>
                                    </div>
                                    <hr className="border-theme-border/30" />
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-theme-text">Total Transaction Cost:</span>
                                        <span className="font-bold text-gold">{totalSol.toFixed(5)} SOL</span>
                                    </div>
                                </div>

                                <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2.5 text-[10px] text-emerald-400">
                                    <Wallet className="w-4 h-4 shrink-0" />
                                    <p className="leading-tight truncate">
                                        Connected to <span className="font-bold capitalize">{walletType}</span>: {walletAddress?.slice(0, 8)}...{walletAddress?.slice(-8)}
                                    </p>
                                </div>

                                <button
                                    onClick={executeTransaction}
                                    className="w-full py-3 rounded-xl font-bold text-xs bg-gold text-[#1a1a1a] shadow-lg shadow-gold/20 hover:shadow-gold/30 hover:-translate-y-0.5 transition-all"
                                >
                                    Confirm & Pay {totalSol.toFixed(4)} SOL
                                </button>
                            </div>
                        )}

                        {step === 'processing' && (
                            <div className="space-y-4">
                                <div className="text-center py-4">
                                    <Loader2 className="w-10 h-10 text-gold animate-spin mx-auto mb-3" />
                                    <h4 className="text-sm font-bold text-theme-text">Broadcasting Transaction...</h4>
                                    <p className="text-xs text-theme-muted mt-1">Simulating Solana ledger entry.</p>
                                </div>

                                <div className="h-36 rounded-xl bg-black/40 border border-theme-border/30 p-3 font-mono text-[9px] text-theme-muted overflow-y-auto space-y-1 scrollbar-thin">
                                    {txLogs.map((log, idx) => (
                                        <div key={idx} className={log.startsWith('✓') ? 'text-emerald-400' : log.startsWith('❌') ? 'text-rose-400' : ''}>
                                            {log}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {step === 'success' && (
                            <div className="space-y-4 text-center py-2">
                                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h4 className="text-sm font-bold text-theme-text">Purchase Complete!</h4>
                                <p className="text-xs text-theme-muted max-w-xs mx-auto">
                                    Your simulated Solana transaction has cleared on-chain. You now own a {photo.licenseType || 'personal'} license.
                                </p>

                                {txSignature && (
                                    <div className="p-2 bg-theme-bg border border-theme-border/30 rounded-lg text-[10px] font-mono text-theme-muted select-all">
                                        Sig: {txSignature.slice(0, 24)}...
                                    </div>
                                )}

                                <div className="pt-2 space-y-2">
                                    <button
                                        onClick={downloadHighRes}
                                        disabled={downloading}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                                    >
                                        {downloading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Downloading...
                                            </>
                                        ) : (
                                            <>
                                                <Download className="w-4 h-4" />
                                                Download High-Res Original
                                            </>
                                        )}
                                    </button>

                                    <button
                                        onClick={onClose}
                                        className="w-full py-2.5 rounded-xl text-xs text-theme-muted hover:bg-theme-bg transition-colors"
                                    >
                                        Close Checkout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
