"use client";

import React, { useState } from "react";
import { ingestContent, generatePlatformContent } from "@/lib/api";
import { Hero } from "@/components/landing/Hero";
import { InputSection } from "@/components/dashboard/InputSection";
import { ResultsSection } from "@/components/dashboard/ResultsSection";
import { PlatformTabs, Platform } from "@/components/dashboard/PlatformTabs";
import { VisualShowcase } from "@/components/dashboard/VisualShowcase";
import { AnimatePresence, motion } from "framer-motion";

/* ---------------- TYPES ---------------- */
type Status = "idle" | "loading" | "success" | "error";

const PLATFORMS: Platform[] = [
    "linkedin",
    "instagram",
    "twitter",
    "newsletter",
    "seo",
];

/* ---------------- PAGE ---------------- */
export default function Home() {
    const [started, setStarted] = useState(false);
    const [url, setUrl] = useState("");
    const [text, setText] = useState("");
    const [audience, setAudience] = useState("General");
    const [loading, setLoading] = useState(false);

    const [contentId, setContentId] = useState<string | null>(null);
    const [results, setResults] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Platform>("linkedin");

    const [editedContent, setEditedContent] = useState<any>({});
    const [generatingPlatform, setGeneratingPlatform] =
        useState<Platform | null>(null);

    const [status, setStatus] = useState<Record<Platform, Status>>({
        linkedin: "idle",
        instagram: "idle",
        twitter: "idle",
        newsletter: "idle",
        seo: "idle",
    });

    /* ---------------- INGEST ---------------- */
    const handleIngest = async () => {
        setLoading(true);
        try {
            const payload = url
                ? { url, targetAudience: audience }
                : { rawText: text, targetAudience: audience };

            const res = await ingestContent(payload);

            setContentId(res.id);
            setResults({
                _id: res.id,
                outputs: {},
                scheduling: {},
            });
        } catch (err) {
            alert("Failed to ingest content");
        } finally {
            setLoading(false);
        }
    };

    /* ---------------- GENERATE ONE ---------------- */
    const generateOne = async (platform: Platform) => {
        if (!contentId) return;

        setGeneratingPlatform(platform);
        setStatus((s) => ({ ...s, [platform]: "loading" }));

        try {
            const genRes = await generatePlatformContent(contentId, platform);

            setResults((prev: any) => ({
                ...prev,
                outputs: { ...prev.outputs, ...genRes.outputs },
                scheduling: { ...prev.scheduling, ...genRes.scheduling },
            }));

            setEditedContent((prev: any) => ({
                ...prev,
                [platform]:
                    platform === "instagram"
                        ? genRes.outputs.instagram?.slides
                        : platform === "twitter"
                            ? genRes.outputs.twitter?.thread
                            : genRes.outputs[platform]?.content ||
                            genRes.outputs[platform],
            }));

            setStatus((s) => ({ ...s, [platform]: "success" }));
        } catch (err) {
            console.error(err);
            setStatus((s) => ({ ...s, [platform]: "error" }));
        } finally {
            setGeneratingPlatform(null);
        }
    };

    /* ---------------- GENERATE ALL (SEQUENTIAL) ---------------- */
    const generateAll = async () => {
        for (const platform of PLATFORMS) {
            await generateOne(platform);
        }
    };

    const updateEditedContent = (platform: Platform, value: any) => {
        setEditedContent((prev: any) => ({
            ...prev,
            [platform]: value,
        }));
    };

    const shouldCenterInput = !contentId && !results;

    /* ---------------- UI ---------------- */
    return (
        <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
            <AnimatePresence mode="wait">
                {!started ? (
                    <motion.div key="hero" exit={{ opacity: 0, y: -50 }}>
                        <Hero onStart={() => setStarted(true)} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="dashboard"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-16"
                    >
                        {/* INPUT */}
                        {shouldCenterInput ? (
                            <div className="min-h-[calc(100vh-6rem)] flex items-center">
                                <InputSection
                                    url={url}
                                    setUrl={setUrl}
                                    text={text}
                                    setText={setText}
                                    audience={audience}
                                    setAudience={setAudience}
                                    onIngest={handleIngest}
                                    loading={loading}
                                />
                            </div>
                        ) : (
                            <InputSection
                                url={url}
                                setUrl={setUrl}
                                text={text}
                                setText={setText}
                                audience={audience}
                                setAudience={setAudience}
                                onIngest={handleIngest}
                                loading={loading}
                            />
                        )}

                        {/* BUTTONS - Premium glass dock style */}
                        {contentId && (
                            <div className="max-w-5xl mx-auto px-6 space-y-5">
                                {/* Generate All */}
                                <motion.button
                                    onClick={generateAll}
                                    whileHover={{ scale: 1.01, y: -1 }}
                                    whileTap={{ scale: 0.99 }}
                                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-[hsl(var(--accent))] via-cyan-400 to-emerald-400 text-white font-semibold shadow-[0_18px_70px_rgba(34,211,238,0.45)] hover:shadow-[0_22px_80px_rgba(34,211,238,0.7)] transition-shadow relative overflow-hidden"
                                >
                                    <span className="relative z-10">
                                        Generate All Platforms
                                    </span>
                                    <motion.div
                                        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/10"
                                        initial={{ x: "-100%" }}
                                        animate={{ x: "100%" }}
                                        transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                                    />
                                </motion.button>

                                {/* INDIVIDUAL PLATFORM BUTTONS */}
                                <div className="relative">
                                    <div className="absolute inset-0 blur-xl bg-gradient-to-r from-[hsl(var(--accent))/0.18] via-transparent to-emerald-400/20 pointer-events-none" />
                                    <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 rounded-3xl bg-white/70 dark:bg-zinc-900/60 border border-white/40 backdrop-blur-2xl p-4">
                                        {PLATFORMS.map((p) => (
                                            <motion.button
                                                key={p}
                                                onClick={() => generateOne(p)}
                                                disabled={status[p] === "loading"}
                                                whileHover={{ y: -3, scale: 1.02 }}
                                                whileTap={{ scale: 0.97 }}
                                                className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-medium border transition-colors
                                                ${status[p] === "success"
                                                        ? "bg-emerald-50/80 border-emerald-200 text-emerald-700"
                                                        : status[p] === "error"
                                                            ? "bg-red-50/80 border-red-200 text-red-700"
                                                            : "bg-white/60 dark:bg-zinc-900/70 border-white/40 hover:border-indigo-400/70"
                                                    }`}
                                            >
                                                <span className="capitalize">
                                                    {p}
                                                </span>
                                                <span className="text-[11px] opacity-80">
                                                    {status[p] === "loading"
                                                        ? "Generating…"
                                                        : status[p] === "success"
                                                            ? "Ready"
                                                            : "Generate"}
                                                </span>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PROGRESS */}
                        {generatingPlatform && (
                            <div className="text-center text-sm text-muted-foreground">
                                Generating <b>{generatingPlatform}</b> (one at a time for M1
                                safety)
                            </div>
                        )}

                        {/* RESULTS */}
                        {results && (
                            <div className="space-y-12 pt-12 border-t border-border">
                                <PlatformTabs
                                    activeTab={activeTab}
                                    setActiveTab={setActiveTab}
                                />
                                <ResultsSection
                                    results={results}
                                    activeTab={activeTab}
                                    editedContent={editedContent}
                                    onUpdateContent={updateEditedContent}
                                    loading={false}
                                />
                                {/* Animated visual showcase: flip text, masked avatars, glass dock, perspective grid, 3D text */}
                                <VisualShowcase />
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
