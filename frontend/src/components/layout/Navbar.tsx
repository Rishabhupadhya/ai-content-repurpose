
"use client";

import React from 'react';
import { Rocket, Github, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

export const Navbar = () => {
    return (
        <nav className="fixed top-0 inset-x-0 z-50 h-20 border-b border-white/10 bg-white/50 dark:bg-black/50 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5 }}
                        className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20"
                    >
                        <Rocket className="w-5 h-5 text-white" />
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="font-bold text-lg tracking-tight">Repurpose.ai</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Enterprise</span>
                    </div>
                </div>

                <div className="hidden md:flex items-center gap-8">
                    {['Features', 'Pricing', 'Docs', 'Blog'].map((item) => (
                        <a
                            key={item}
                            href="#"
                            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                        >
                            {item}
                        </a>
                    ))}
                </div>

                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon">
                        <Github className="w-5 h-5" />
                    </Button>
                    <Button variant="premium" className="rounded-full">
                        <Zap className="w-4 h-4 mr-2" />
                        Get Started
                    </Button>
                </div>
            </div>
        </nav>
    );
};
