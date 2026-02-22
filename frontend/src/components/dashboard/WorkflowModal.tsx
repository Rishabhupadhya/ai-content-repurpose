
"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, Zap, Sparkles, Layers, ArrowRight, Share2, Search } from 'lucide-react';

interface WorkflowModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WorkflowStep = ({ icon: Icon, title, desc, color, index }: any) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.1 + 0.2 }}
        className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group"
    >
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${color} shadow-lg shadow-black/20 shrink-0`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex flex-col justify-center">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-1 group-hover:text-[hsl(var(--accent))] transition-colors">{title}</h4>
            <p className="text-xs text-ink-lighter leading-relaxed">{desc}</p>
        </div>
    </motion.div>
);

export const WorkflowModal = ({ isOpen, onClose }: WorkflowModalProps) => {
    const steps = [
        {
            icon: Search,
            title: "1. Content Ingestion",
            desc: "The system scrapes URLs or cleans raw text inputs into a structured format for the AI to analyze.",
            color: "from-blue-500 to-cyan-500"
        },
        {
            icon: Brain,
            title: "2. Deterministic Fact Extraction",
            desc: "Stage 1 of our AI pipeline. We use Gemma 2B to extract raw, unstylized facts (numbers, claims, core messages) with zero temperature to ensure 100% accuracy.",
            color: "from-indigo-500 to-purple-500"
        },
        {
            icon: Sparkles,
            title: "3. Stylistic Synthesis",
            desc: "Stage 2 of the pipeline. The extracted facts are fed into creative prompts for specific platforms, generating high-engagement posts while strictly adhering to the facts.",
            color: "from-purple-500 to-pink-500"
        },
        {
            icon: Layers,
            title: "4. Multi-Platform Adaptation",
            desc: "The content is formatted for LinkedIn, Twitter (Threads), Newsletter, and Instagram (Carousels with AI imagery).",
            color: "from-pink-500 to-orange-500"
        },
        {
            icon: Zap,
            title: "5. Visual Polish",
            desc: "Automatic creation of high-contrast social media cards and Replicate-powered AI background generation for Instagram.",
            color: "from-orange-500 to-yellow-500"
        }
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative w-full max-w-2xl bg-[rgba(15,23,42,0.95)] border border-white/10 rounded-[2rem] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {/* Decorative background */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500" />
                        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-[80px]" />
                        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px]" />

                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-widest">Project Workflow</h2>
                                        <p className="text-xs text-ink-lighter font-medium">Inside our AI content studio pipeline</p>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors border border-white/10"
                                >
                                    <X className="w-5 h-5 text-white" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {steps.map((step, i) => (
                                    <WorkflowStep key={step.title} {...step} index={i} />
                                ))}
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.8 }}
                                className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between"
                            >
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-ink-lighter uppercase tracking-widest">Stage 1: Facts</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                        <span className="text-[10px] font-bold text-ink-lighter uppercase tracking-widest">Stage 2: Style</span>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onClose();
                                    }}
                                    className="relative z-[110] px-6 py-2.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-[11px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-2 group transition-all pointer-events-auto"
                                >
                                    Got it <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
