
"use client";

import React, { useState } from 'react';
import { Rocket, Github, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { WorkflowModal } from '@/components/dashboard/WorkflowModal';
import { ChangelogModal } from '@/components/dashboard/ChangelogModal';
import { useStudioStore } from '@/lib/store';

export const Navbar = () => {
    const [isWorkflowOpen, setIsWorkflowOpen] = useState(false);
    const [isChangelogOpen, setIsChangelogOpen] = useState(false);
    const triggerReset = useStudioStore((state: any) => state.triggerReset);
    const navItems = ['Dashboard', 'Workflows', 'Changelog', 'Support'];

    const handleNavClick = (item: string) => {
        if (item === 'Workflows') {
            setIsWorkflowOpen(true);
        } else if (item === 'Support' || item === 'Contact') {
            const subject = encodeURIComponent("Inquiry about Repurpose.ai");
            const body = encodeURIComponent("Hi Rishabh,\n\nI would like to know more about Repurpose.ai.\n\nThanks,");
            window.open(`mailto:rishabh.292002@gmail.com?subject=${subject}&body=${body}`, '_default');
        } else if (item === 'Changelog') {
            setIsChangelogOpen(true);
        } else {
            // Dashboard or other
            triggerReset();
        }
    };

    return (
        <>
            <nav className="fixed top-0 inset-x-0 z-50 h-20 border-b border-[hsl(var(--border))]/70 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.28),_transparent_55%),_rgba(15,23,42,0.94)] backdrop-blur-2xl">
                <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
                    {/* Brand */}
                    <button
                        onClick={() => {
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            triggerReset();
                        }}
                        className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity"
                    >
                        <motion.div
                            whileHover={{ rotate: 10, scale: 1.05 }}
                            transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
                            className="relative w-10 h-10 rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(var(--accent))] via-cyan-400 to-emerald-400 shadow-[0_18px_45px_rgba(34,211,238,0.5)]"
                        >
                            <div className="absolute inset-[1px] rounded-[15px] bg-[radial-gradient(circle_at_10%_20%,rgba(15,23,42,0.75),rgba(15,23,42,0.95))]" />
                            <motion.div
                                className="relative w-full h-full flex items-center justify-center"
                                animate={{ rotate: [0, -8, 0] }}
                                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            >
                                <Rocket className="w-5 h-5 text-indigo-100" />
                            </motion.div>
                        </motion.div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-sm uppercase tracking-[0.28em] text-ink-lighter">
                                REPURPOSE
                            </span>
                            <span className="text-[13px] font-medium text-ink-light">
                                Multi‑platform content studio
                            </span>
                        </div>
                    </button>

                    {/* Center nav */}
                    <div className="flex items-center gap-4 md:gap-6 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-xl">
                        {navItems.map((item) => (
                            <button
                                key={item}
                                onClick={() => handleNavClick(item)}
                                className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/70 hover:text-white transition-colors"
                            >
                                {item}
                            </button>
                        ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3">
                        <a
                            href="https://github.com/Rishabhupadhya"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full border border-white/10 bg-white/5 hover:bg-white/10"
                            >
                                <Github className="w-4 h-4" />
                            </Button>
                        </a>
                        <Button
                            onClick={triggerReset}
                            variant="premium"
                            size="lg"
                            className="rounded-full h-10 px-5 text-xs tracking-[0.18em] uppercase"
                        >
                            <Zap className="w-3 h-3 mr-2" />
                            Launch Studio
                        </Button>
                    </div>
                </div>
            </nav>

            <WorkflowModal
                isOpen={isWorkflowOpen}
                onClose={() => setIsWorkflowOpen(false)}
            />

            <ChangelogModal
                isOpen={isChangelogOpen}
                onClose={() => setIsChangelogOpen(false)}
            />
        </>
    );
};
