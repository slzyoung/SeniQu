import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Tag, Users, CheckCircle, Clock } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';

// Mock Data for Gallery
const MOCK_STATS = [
    { label: 'Gallery Revenue', value: '185.4 SOL', change: '+22.5%', isPositive: true, icon: DollarSign },
    { label: 'Total Bids', value: '43', change: '+12', isPositive: true, icon: TrendingUp },
    { label: 'Artworks Sold', value: '82', change: '+15%', isPositive: true, icon: ShoppingBag },
    { label: 'Avg. Commission', value: '15%', change: '0%', isPositive: true, icon: Tag },
];

const MOCK_SALES = [
    { id: 'GTX-9942', artwork: 'Renaissance Echo', artist: 'Elena Rostova', buyer: '0x1A2...4B9', amount: '125.5 SOL', status: 'Completed', time: '1 hour ago', image: 'https://images.unsplash.com/photo-1577083552431-6e5fd01988ec?auto=format&fit=crop&q=80&w=200' },
    { id: 'GTX-9941', artwork: 'Monolithic Structure', artist: 'David Chen', buyer: '0x88C...2F1', amount: '80.0 SOL', status: 'Processing', time: '3 hours ago', image: 'https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&q=80&w=200' },
    { id: 'GTX-9940', artwork: 'Velvet Noir', artist: 'Sarah Jenkins', buyer: '0x33D...9E4', amount: '152.2 SOL', status: 'Completed', time: '5 hours ago', image: 'https://images.unsplash.com/photo-1580136608260-4eb11f4b24fe?auto=format&fit=crop&q=80&w=200' },
    { id: 'GTX-9939', artwork: 'Prismatic Flow', artist: 'Elena Rostova', buyer: '0x77F...1A2', amount: '64.4 SOL', status: 'Completed', time: '1 day ago', image: 'https://images.unsplash.com/photo-1573521193826-58c7dc2e13e3?auto=format&fit=crop&q=80&w=200' },
];

const MOCK_OFFERS = [
    { id: 'BID-881', artwork: 'Silent Observer', artist: 'Marcus V.', offer: '250.0 SOL', from: '0x99B...1C4', type: 'Private Bid' },
    { id: 'BID-880', artwork: 'Crimson Tide', artist: 'Sarah Jenkins', offer: '185.5 SOL', from: '0x44A...8E2', type: 'Auction Bid' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

export default function GalleryMarketplace() {
    return (
        <PageContainer className="bg-[#FAFAFA] min-h-screen pb-12 overflow-x-hidden">
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="max-w-[1400px] mx-auto space-y-8"
            >
                {/* Hero Banner */}
                <motion.div 
                    variants={itemVariants}
                    className="relative overflow-hidden rounded-[32px] bg-white border border-gray-100 shadow-sm p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8"
                >
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-purple-100/50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    
                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 text-purple-600 font-medium text-sm mb-6 border border-purple-100">
                            <TrendingUp className="w-4 h-4" />
                            <span>Gallery Revenue up 22.5% this month</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight mb-4">
                            Gallery Marketplace
                        </h1>
                        <p className="text-lg text-gray-500">
                            Supervise high-value gallery sales, manage collector bids, and oversee artist commissions seamlessly.
                        </p>
                    </div>
                    
                    <div className="relative z-10 hidden md:block">
                        <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-[32px] shadow-xl shadow-purple-500/20 flex items-center justify-center rotate-12 hover:rotate-0 transition-transform duration-500">
                            <ShoppingBag className="w-16 h-16 text-white" />
                        </div>
                    </div>
                </motion.div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {MOCK_STATS.map((stat, idx) => (
                        <motion.div 
                            key={idx} 
                            variants={itemVariants}
                            className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
                        >
                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-gray-50 to-transparent rounded-bl-full -z-0 group-hover:scale-110 transition-transform" />
                            <div className="relative z-10 flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 mb-1">{stat.label}</p>
                                    <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                                </div>
                                <div className={`p-3 rounded-2xl ${stat.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-1.5 text-sm">
                                {stat.isPositive ? (
                                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <ArrowDownRight className="w-4 h-4 text-gray-500" />
                                )}
                                <span className={stat.isPositive ? 'text-emerald-600 font-medium' : 'text-gray-600 font-medium'}>
                                    {stat.change}
                                </span>
                                <span className="text-gray-400 ml-1">vs last month</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left: Global Gallery Sales */}
                    <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-xl font-bold font-serif text-gray-900">Recent Transactions</h2>
                            <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">Export CSV</button>
                        </div>
                        <div className="p-6 flex-1">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-sm text-gray-400 border-b border-gray-100">
                                            <th className="pb-3 font-medium">Artwork & Artist</th>
                                            <th className="pb-3 font-medium">Amount</th>
                                            <th className="pb-3 font-medium">Collector</th>
                                            <th className="pb-3 font-medium">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {MOCK_SALES.map((sale, idx) => (
                                            <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                                <td className="py-4 flex items-center gap-4">
                                                    <img src={sale.image} alt={sale.artwork} className="w-12 h-12 rounded-xl object-cover border border-gray-100 shadow-sm" />
                                                    <div>
                                                        <p className="font-bold text-gray-900">{sale.artwork}</p>
                                                        <p className="text-xs text-purple-600 font-medium">{sale.artist}</p>
                                                    </div>
                                                </td>
                                                <td className="py-4 font-bold text-gray-900">{sale.amount}</td>
                                                <td className="py-4">
                                                    <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-mono">{sale.buyer}</span>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                                                        sale.status === 'Completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                                    }`}>
                                                        {sale.status === 'Completed' && <CheckCircle className="w-3 h-3" />}
                                                        {sale.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>

                    {/* Right: High-Value Bids / Offers */}
                    <motion.div variants={itemVariants} className="bg-white rounded-[24px] border border-gray-100 shadow-sm flex flex-col">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-xl font-bold font-serif text-gray-900">VIP Bids & Offers</h2>
                            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                                <Users className="w-4 h-4" />
                            </span>
                        </div>
                        <div className="p-6 flex-1 flex flex-col gap-4">
                            {MOCK_OFFERS.map((offer, idx) => (
                                <div key={idx} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-purple-100 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-gray-900">{offer.artwork}</p>
                                            <p className="text-xs text-gray-500 mt-0.5">By {offer.artist}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-purple-600">{offer.offer}</p>
                                            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-200 text-gray-700 text-[10px] uppercase font-bold rounded">
                                                {offer.type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="pt-3 mt-3 border-t border-gray-200 flex justify-between items-center">
                                        <p className="text-xs text-gray-500 font-mono">From: {offer.from}</p>
                                        <button className="text-xs font-bold text-purple-600 hover:text-purple-700">Review</button>
                                    </div>
                                </div>
                            ))}
                            
                            <button className="mt-auto w-full py-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-2xl font-semibold text-sm transition-colors">
                                View Active Auctions
                            </button>
                        </div>
                    </motion.div>

                </div>
            </motion.div>
        </PageContainer>
    );
}
