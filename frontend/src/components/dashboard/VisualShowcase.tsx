"use client";

import React from "react";
import { motion } from "framer-motion";
import { Linkedin, Instagram, Twitter, Mail, Search } from "lucide-react";

export const VisualShowcase: React.FC = () => {
    return (
        <div className="relative max-w-5xl mx-auto px-6 pb-20">
            {/* Perspective grid background */}
            <div className="pointer-events-none absolute inset-0 -z-10">
                <div
                    className="absolute inset-x-[-40%] top-10 h-72 opacity-40"
                    style={{
                        transform: "perspective(900px) rotateX(60deg)",
                        transformOrigin: "top center",
                        backgroundImage: `
              linear-gradient(to right, rgba(148, 163, 184,0.35) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148, 163, 184,0.35) 1px, transparent 1px)
            `,
                        backgroundSize: "40px 40px",
                    }}
                />
            </div>

            <div className="grid gap-6 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center">
                {/* Left column: Flip text + 3D text */}
                <div className="space-y-6">
                    {/* Flip text headline */}
                    <div className="inline-flex flex-col text-4xl sm:text-5xl font-black tracking-tight text-ink">
                        <span className="text-ink/60">Turn content into</span>
                        <div className="relative h-[1.2em] mt-1">
                            <motion.span
                                key="gold"
                                initial={{ rotateX: -90, opacity: 0, y: 20 }}
                                animate={{ rotateX: 0, opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
                                className="absolute inset-0 origin-bottom bg-gradient-to-r from-[hsl(var(--accent))] via-cyan-400 to-emerald-400 bg-clip-text text-transparent"
                            >
                                premium output.
                            </motion.span>
                        </div>
                    </div>

                    {/* 3D displacement text */}
                    <motion.div
                        whileHover={{ x: -2, y: -2 }}
                        className="relative inline-block mt-4"
                    >
                        <span className="relative z-10 text-sm font-semibold uppercase tracking-[0.25em] text-ink">
                            3d crafted copy
                        </span>
                        <span className="absolute inset-0 translate-x-1 translate-y-1 blur-[1px] bg-gradient-to-r from-[hsl(var(--accent))/0.7] to-emerald-400/70 rounded-md opacity-80" />
                    </motion.div>

                    {/* Masked avatars */}
                    <div className="flex items-center gap-4 pt-4">
                        <div className="flex -space-x-3">
                            {["AM", "RS", "KP", "JL"].map((initials, i) => (
                                <motion.div
                                    key={initials}
                                    whileHover={{ y: -2 }}
                                    className="relative w-10 h-10 rounded-full bg-gradient-to-tr from-[hsl(var(--accent))] to-emerald-400 p-[2px]"
                                >
                                    <div className="w-full h-full rounded-full bg-background overflow-hidden flex items-center justify-center text-xs font-semibold text-ink">
                                        <span className="mix-blend-luminosity">
                                            {initials}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <p className="text-xs text-ink-light">
                            Masked avatars represent your audiences across platforms.
                        </p>
                    </div>
                </div>

                {/* Right column: Glass dock of platforms */}
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="rounded-3xl bg-white/10 dark:bg-zinc-900/40 border border-white/20 backdrop-blur-2xl shadow-[0_18px_70px_rgba(15,23,42,0.45)] p-4 flex flex-col gap-4"
                    >
                        <div className="flex items-center justify-between px-1">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-ink-light">
                                glass dock
                            </span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        </div>

                        <div className="relative">
                            <motion.div
                                className="flex items-center justify-between gap-3 rounded-2xl bg-white/60 dark:bg-zinc-900/60 px-4 py-3 backdrop-blur-xl border border-white/40"
                                initial={{ y: 10, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.4, delay: 0.18 }}
                            >
                                {[
                                    { icon: Linkedin, label: "LinkedIn" },
                                    { icon: Instagram, label: "Instagram" },
                                    { icon: Twitter, label: "Twitter" },
                                    { icon: Mail, label: "Email" },
                                    { icon: Search, label: "SEO" },
                                ].map(({ icon: Icon, label }) => (
                                    <motion.button
                                        key={label}
                                        whileHover={{ y: -4, scale: 1.05 }}
                                        whileTap={{ scale: 0.96 }}
                                        className="flex flex-col items-center gap-1 text-[10px] font-medium text-ink-light"
                                    >
                                        <div className="w-8 h-8 rounded-2xl bg-gradient-to-br from-[hsl(var(--accent))/0.15] to-emerald-400/15 flex items-center justify-center border border-white/50 shadow-sm">
                                            <Icon className="w-4 h-4 text-ink" />
                                        </div>
                                        <span>{label}</span>
                                    </motion.button>
                                ))}
                            </motion.div>
                        </div>

                        <p className="text-[11px] text-ink-light mt-1">
                            Docked previews of every channel keep your repurposed content feeling
                            cohesive and premium.
                        </p>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

