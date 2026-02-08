"use client";

import React from 'react';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, Zap, Globe } from 'lucide-react';

export const Hero = ({ onStart }: { onStart: () => void }) => {
    return (
        <div className="relative min-h-screen flex items-center justify-center px-6 overflow-hidden bg-gradient-to-b from-paper via-paper to-[hsl(var(--accent)/0.02)]">
            {/* Sophisticated grid background */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0" style={{
                    backgroundImage: `
                        linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
                        linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
                    `,
                    backgroundSize: '80px 80px',
                    opacity: 0.3
                }} />

                {/* Animated gradient orb */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.03, 0.05, 0.03],
                    }}
                    transition={{
                        duration: 8,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-accent rounded-full blur-[120px]"
                />
            </div>

            <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
                {/* Left: Content */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                    className="space-y-8"
                >
                    {/* Premium badge */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-accent/5 border border-accent/10 rounded-full backdrop-blur-sm"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-accent" />
                        <span className="text-caption text-accent font-medium">
                            Powered by open-source AI
                        </span>
                    </motion.div>

                    {/* Hero headline - more dramatic */}
                    <div className="space-y-4">
                        <h1 className="text-[56px] md:text-[72px] leading-[0.95] font-bold tracking-tight text-ink">
                            One post.
                            <br />
                            <span className="text-ink-light">Every platform.</span>
                        </h1>
                        <p className="text-body-lg text-ink-light max-w-[520px] leading-relaxed">
                            Transform your content into platform-optimized posts for LinkedIn, Twitter, and Instagram.
                            <span className="text-ink font-medium"> AI handles the heavy lifting.</span>
                        </p>
                    </div>

                    {/* CTA with more visual weight */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                        <Button
                            onClick={onStart}
                            className="group relative h-14 px-8 bg-accent hover:bg-accent-hover text-white rounded-xl font-semibold transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-accent/20 overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                Start creating
                                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                            </span>
                            {/* Shimmer effect */}
                            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        </Button>

                        <button className="h-14 px-6 text-ink hover:text-accent border border-[hsl(var(--border))] hover:border-accent/30 rounded-xl font-medium transition-all duration-200 hover:bg-accent/5 flex items-center gap-2">
                            <Globe className="w-4 h-4" />
                            View examples
                        </button>
                    </div>

                    {/* Social proof / features */}
                    <div className="pt-8 grid grid-cols-3 gap-6 border-t border-[hsl(var(--border))]">
                        {[
                            { icon: Zap, label: 'No API costs', desc: 'Run locally' },
                            { icon: Sparkles, label: 'Fully editable', desc: 'You control output' },
                            { icon: Globe, label: '5 platforms', desc: 'One workflow' },
                        ].map((item, i) => (
                            <motion.div
                                key={item.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.1 }}
                                className="space-y-1"
                            >
                                <item.icon className="w-5 h-5 text-accent mb-2" />
                                <div className="text-label text-ink font-medium">{item.label}</div>
                                <div className="text-caption text-ink-lighter">{item.desc}</div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Right: Visual showcase */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.2, ease: [0.33, 1, 0.68, 1] }}
                    className="relative hidden lg:block"
                >
                    {/* Bento-style preview cards */}
                    <div className="relative h-[600px]">
                        {/* Card 1 - LinkedIn */}
                        <motion.div
                            animate={{ y: [0, -10, 0] }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-0 right-0 w-72 bg-surface border border-[hsl(var(--border))] rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-[#0A66C2]/10 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-[#0A66C2]" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-label font-semibold text-ink">LinkedIn</div>
                                    <div className="text-caption text-ink-lighter">Professional</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 bg-ink/5 rounded-full w-full" />
                                <div className="h-2 bg-ink/5 rounded-full w-5/6" />
                                <div className="h-2 bg-ink/5 rounded-full w-4/6" />
                            </div>
                        </motion.div>

                        {/* Card 2 - Twitter */}
                        <motion.div
                            animate={{ y: [0, 10, 0] }}
                            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                            className="absolute top-32 left-0 w-64 bg-surface border border-[hsl(var(--border))] rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-lg bg-black/5 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-label font-semibold text-ink">Twitter</div>
                                    <div className="text-caption text-ink-lighter">Concise</div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="h-2 bg-ink/5 rounded-full w-full" />
                                <div className="h-2 bg-ink/5 rounded-full w-3/4" />
                            </div>
                        </motion.div>

                        {/* Card 3 - Instagram */}
                        <motion.div
                            animate={{ y: [0, -8, 0] }}
                            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                            className="absolute bottom-0 right-12 w-56 bg-surface border border-[hsl(var(--border))] rounded-2xl p-5 shadow-lg hover:shadow-xl transition-shadow"
                        >
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center">
                                    <svg className="w-4 h-4 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-label font-semibold text-ink">Instagram</div>
                                    <div className="text-caption text-ink-lighter">Visual</div>
                                </div>
                            </div>
                            <div className="aspect-square bg-gradient-to-br from-accent/5 to-accent/10 rounded-lg" />
                        </motion.div>

                        {/* Connecting lines */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20" style={{ zIndex: -1 }}>
                            <motion.path
                                d="M 150 100 Q 250 200 350 150"
                                stroke="hsl(var(--accent))"
                                strokeWidth="2"
                                fill="none"
                                strokeDasharray="5,5"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                        </svg>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};
