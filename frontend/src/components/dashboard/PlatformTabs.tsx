
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
        { id: 'linkedin', icon: <Linkedin className="w-5 h-5" />, label: 'LinkedIn', color: 'text-[hsl(var(--accent))]' },
        { id: 'instagram', icon: <Instagram className="w-5 h-5" />, label: 'Instagram', color: 'text-[hsl(var(--accent))]' },
        { id: 'twitter', icon: <Twitter className="w-5 h-5" />, label: 'Twitter', color: 'text-[hsl(var(--accent))]' },
        { id: 'newsletter', icon: <Mail className="w-5 h-5" />, label: 'Newsletter', color: 'text-[hsl(var(--accent))]' },
        { id: 'seo', icon: <Search className="w-5 h-5" />, label: 'SEO', color: 'text-[hsl(var(--accent))]' },
    ];

    return (
        <div className="flex justify-center border-b border-white/10 overflow-x-auto pb-px gap-8">
            {tabs.map((tab) => (
                <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    whileHover={{ y: -2, opacity: 1 }}
                    whileTap={{ scale: 0.96 }}
                    className={`
                        relative flex items-center gap-2 pb-4 text-sm font-bold uppercase tracking-widest transition-all
                        ${activeTab === tab.id
                            ? 'text-foreground'
                            : 'text-muted-foreground hover:text-foreground'}
                    `}
                >
                    <span
                        className={`
                            inline-flex items-center justify-center rounded-full px-2 py-1 text-xs font-semibold transition-colors
                            ${activeTab === tab.id
                                ? `${tab.color} bg-white/10`
                                : 'text-muted-foreground/80'}
                        `}
                    >
                        {tab.icon}
                    </span>
                    <span className="relative">
                        {tab.label}
                        {activeTab === tab.id && (
                            <motion.span
                                layoutId="activeTabLabel"
                                className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-[hsl(var(--accent))/0.7] to-emerald-400/70"
                            />
                        )}
                    </span>
                    {activeTab === tab.id && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--accent))] to-emerald-400 rounded-t-full"
                        />
                    )}
                </motion.button>
            ))}
        </div>
    );
};
