
"use client";

import React from 'react';
import { Linkedin, Instagram, Twitter, Mail, Search } from 'lucide-react';
import { motion } from 'framer-motion';

export type Platform = "linkedin" | "instagram" | "twitter" | "newsletter" | "seo";

interface PlatformTabsProps {
    activeTab: Platform;
    setActiveTab: (tab: Platform) => void;
}

export const PlatformTabs: React.FC<PlatformTabsProps> = ({ activeTab, setActiveTab }) => {
    const tabs: { id: Platform; icon: React.ReactNode; label: string; color: string }[] = [
        { id: 'linkedin', icon: <Linkedin className="w-5 h-5" />, label: 'LinkedIn', color: 'text-blue-600' },
        { id: 'instagram', icon: <Instagram className="w-5 h-5" />, label: 'Instagram', color: 'text-pink-600' },
        { id: 'twitter', icon: <Twitter className="w-5 h-5" />, label: 'Twitter', color: 'text-sky-500' },
        { id: 'newsletter', icon: <Mail className="w-5 h-5" />, label: 'Newsletter', color: 'text-emerald-500' },
        { id: 'seo', icon: <Search className="w-5 h-5" />, label: 'SEO', color: 'text-orange-500' },
    ];

    return (
        <div className="flex justify-center border-b border-white/10 overflow-x-auto pb-px gap-8">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        relative flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-widest transition-all
                        ${activeTab === tab.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}
                    `}
                >
                    <span className={activeTab === tab.id ? tab.color : ''}>
                        {tab.icon}
                    </span>
                    {tab.label}
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-t-full"
                        />
                    )}
                </button>
            ))}
        </div>
    );
};
