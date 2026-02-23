
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, History, Sparkles, Zap, Shield, Rocket, ArrowRight, CheckCircle2 } from 'lucide-react';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ChangeItem = ({ date, title, version, tags, index }: any) => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 + 0.2 }}
        className="relative pl-8 pb-8 group"
    >
        {/* Timeline Line */}
        <div className="absolute left-[11px] top-2 bottom-0 w-[2px] bg-white/5 group-last:bg-transparent" />

        {/* Timeline Dot */}
        <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-indigo-500/50 flex items-center justify-center z-10 group-hover:border-indigo-400 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
        </div>

        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">{date}</span>
                <span className="text-[10px] font-bold text-white/30 px-2 py-0.5 rounded-md bg-white/5 border border-white/5 uppercase">v{version}</span>
            </div>
            <h4 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">{title}</h4>
            <div className="flex flex-wrap gap-2 mt-1">
                {tags.map((tag: string) => (
                    <span key={tag} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-ink-lighter bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
                        {tag}
                    </span>
                ))}
            </div>
        </div>
    </motion.div>
);

export const ChangelogModal = ({ isOpen, onClose }: ChangelogModalProps) => {
    const updates = [
        {
            date: "Today",
            version: "1.2.0",
            title: "Style Synthesis & Pipeline Maturity",
            tags: ["Stage 2 AI Synthesis", "Premium UI System", "Workflow Viz"]
        },
        {
            date: "Yesterday",
            version: "1.1.5",
            title: "Content Studio Enhancements",
            tags: ["Black Text forced visibility", "Twitter Thread Length", "Mobile Nav"]
        },
        {
            date: "22 Feb 2026",
            version: "1.1.0",
            title: "Multi-Media Expansion",
            tags: ["Instagram AI Imagery", "Newsletter Markdown", "Replicate API sync"]
        },
        {
            date: "15 Feb 2026",
            version: "1.0.0",
            title: "Initial Studio Launch",
            tags: ["LinkedIn Core Engine", "SEO Metadata", "Ollama Local Model"]
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 z-[101] bg-slate-950/80 backdrop-blur-md cursor-pointer"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        className="relative z-[102] w-full max-w-xl bg-[rgba(15,23,42,0.98)] border border-white/10 rounded-[2.5rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-indigo-500 to-cyan-500" />

                        <div className="p-10">
                            <div className="flex items-center justify-between mb-12">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                                        <History className="w-6 h-6 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-[0.2em]">Changelog</h2>
                                        <p className="text-xs text-ink-lighter font-medium">Evolution of the Repurpose engine</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                                    aria-label="Close changelog"
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10 cursor-pointer"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                {updates.map((update, i) => (
                                    <ChangeItem key={update.version} {...update} index={i} />
                                ))}
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">End of Log</span>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                                    className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-black text-white uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                                >
                                    Close Engine Log <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
