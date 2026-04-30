import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, TrendingUp, DollarSign, ArrowUpRight, ArrowDownRight, Tag, Clock, CheckCircle } from 'lucide-react';
import { PageContainer } from '../../../components/common/DashboardLayout';

// Mock Data
const MOCK_STATS = [
    { label: 'Total Volume', value: '45.2 SOL', change: '+12.5%', isPositive: true, icon: DollarSign },
    { label: 'Active Auctions', value: '12', change: '+3', isPositive: true, icon: Clock },
    { label: 'Direct Sales', value: '148', change: '+18%', isPositive: true, icon: ShoppingBag },
    { label: 'Avg. Sale Price', value: '18.5 SOL', change: '-2.1%', isPositive: false, icon: Tag },
];

const MOCK_SALES = [
    { id: 'TRX-1092', artwork: 'Ethereal Dreams #04', buyer: '0x71C...9B2', amount: '24.5 SOL', status: 'Completed', time: '2 hours ago', image: 'https://images.unsplash.com/photo-1547826039-bfc35e0f1ea8?auto=format&fit=crop&q=80&w=200' },
    { id: 'TRX-1091', artwork: 'Neon Nights', buyer: '0x44F...1A9', amount: '12.0 SOL', status: 'Processing', time: '5 hours ago', image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=200' },
    { id: 'TRX-1090', artwork: 'Abstract Horizon', buyer: '0x99A...3C4', amount: '40.0 SOL', status: 'Completed', time: '1 day ago', image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=200' },
    { id: 'TRX-1089', artwork: 'Golden Ratio', buyer: '0x22B...8D1', amount: '9.0 SOL', status: 'Completed', time: '2 days ago', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=200' },
];

const MOCK_OFFERS = [
    { id: 'OFF-551', artwork: 'Silent Symphony', offer: '15.0 SOL', from: '0x11E...4F2', expires: 'In 12 hours' },
    { id: 'OFF-550', artwork: 'Urban Chaos', offer: '8.0 SOL', from: '0x88D...9C3', expires: 'In 2 days' },
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
};

export default function ArtistMarketplace() {
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
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-100/50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
                    
                    <div className="relative z-10 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-medium text-sm mb-6 border border-blue-100">
                            <TrendingUp className="w-4 h-4" />
                            <span>Your Sales are up 12% this week</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight mb-4">
                            Artist Marketplace
                        </h1>
                        <p className="text-lg text-gray-500">
                            Manage your artwork sales, review incoming offers, and track your commercial success in real-time.
                        </p>
                    </div>
                    
                    <div className="relative z-10 hidden md:block">
                        <div className="w-32 h-32 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[32px] shadow-xl shadow-blue-500/20 flex items-center justify-center rotate-12 hover:rotate-0 transition-transform duration-500">
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
                                <div className={`p-3 rounded-2xl ${stat.isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    <stat.icon className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="mt-4 flex items-center gap-1.5 text-sm">
                                {stat.isPositive ? (
                                    <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                                ) : (
                                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                                )}
                                <span className={stat.isPositive ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                                    {stat.change}
                                </span>
                                <span className="text-gray-400 ml-1">vs last month</span>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* Left: Recent Sales */}
                    <motion.div variants={itemVariants} className="lg:col-span-2 bg-white rounded-[24px] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-xl font-bold font-serif text-gray-900">Recent Sales</h2>
                            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">View All</button>
                        </div>
                        <div className="p-6 flex-1">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-sm text-gray-400 border-b border-gray-100">
                                            <th className="pb-3 font-medium">Artwork</th>
                                            <th className="pb-3 font-medium">Amount</th>
                                            <th className="pb-3 font-medium">Buyer</th>
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
                                                        <p className="text-xs text-gray-500">{sale.time}</p>
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

                    {/* Right: Pending Offers */}
                    <motion.div variants={itemVariants} className="bg-white rounded-[24px] border border-gray-100 shadow-sm flex flex-col">
                        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-xl font-bold font-serif text-gray-900">Pending Offers</h2>
                            <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">2 New</span>
                        </div>
                        <div className="p-6 flex-1 flex flex-col gap-4">
                            {MOCK_OFFERS.map((offer, idx) => (
                                <div key={idx} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-blue-100 hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="font-bold text-gray-900">{offer.artwork}</p>
                                            <p className="text-xs text-gray-500 font-mono mt-0.5">From: {offer.from}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-blue-600">{offer.offer}</p>
                                            <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                                <Clock className="w-3 h-3" /> {offer.expires}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <button className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors">
                                            Accept
                                        </button>
                                        <button className="flex-1 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-semibold transition-colors">
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                            
                            <button className="mt-auto w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700 rounded-2xl font-medium text-sm transition-colors">
                                View Offer History
                            </button>
                        </div>
                    </motion.div>

                </div>
            </motion.div>
        </PageContainer>
    );
}
