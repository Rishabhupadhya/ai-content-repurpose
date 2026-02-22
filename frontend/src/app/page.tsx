"use client";

import React, { useState, useEffect } from "react";
import { ingestContent, generatePlatformContent } from "@/lib/api";
import { Hero } from "@/components/landing/Hero";
import { InputSection } from "@/components/dashboard/InputSection";
import { ResultsSection } from "@/components/dashboard/ResultsSection";
import { PlatformTabs, Platform } from "@/components/dashboard/PlatformTabs";
import { VisualShowcase } from "@/components/dashboard/VisualShowcase";
import { AnimatePresence, motion } from "framer-motion";
import { useStudioStore } from "@/lib/store";
import { SAMPLE_DATA } from "@/lib/sampleData";
import { Sparkles } from "lucide-react";

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

    const shouldReset = useStudioStore((state: any) => state.shouldReset);

    /* ---------------- EXAMPLES ---------------- */
    const handleViewExamples = () => {
        setStarted(true);
        setResults(SAMPLE_DATA);
        setContentId(SAMPLE_DATA.id);

        // Populate edited content
        const sampleEdited: any = {};
        PLATFORMS.forEach(p => {
            if (p === 'instagram') sampleEdited[p] = SAMPLE_DATA.outputs.instagram?.slides;
            else if (p === 'twitter') sampleEdited[p] = SAMPLE_DATA.outputs.twitter?.thread;
            else sampleEdited[p] = (SAMPLE_DATA.outputs as any)[p]?.content || (SAMPLE_DATA.outputs as any)[p];
        });
        setEditedContent(sampleEdited);

        // Set all to success
        setStatus({
            linkedin: "success",
            instagram: "success",
            twitter: "success",
            newsletter: "success",
            seo: "success",
        });

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Initial state reset listener
    useEffect(() => {
        if (shouldReset > 0) {
            setStarted(false); // Go back to landing page view
            setUrl("");
            setText("");
            setAudience("General");
            setLoading(false);
            setContentId(null);
            setResults(null);
            setEditedContent({});
            setGeneratingPlatform(null);
            setStatus({
                linkedin: "idle",
                instagram: "idle",
                twitter: "idle",
                newsletter: "idle",
                seo: "idle",
            });

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [shouldReset]);

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
        setActiveTab(platform); // Auto-switch to the tab being generated

        // Scroll to results section so user sees the generation happening
        const resultsEl = document.getElementById('results-section');
        if (resultsEl) {
            resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

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
                        <Hero onStart={() => setStarted(true)} onViewExamples={handleViewExamples} />
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
                                    onViewExamples={handleViewExamples}
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
                                onViewExamples={handleViewExamples}
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
                                    <div className="relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 rounded-3xl bg-white dark:bg-zinc-900 border border-[hsl(var(--border))] p-5 shadow-2xl shadow-indigo-500/10">
                                        {PLATFORMS.map((p) => (
                                            <motion.button
                                                key={p}
                                                onClick={() => generateOne(p)}
                                                disabled={status[p] === "loading"}
                                                whileHover={{ y: -3, scale: 1.02 }}
                                                whileTap={{ scale: 0.97 }}
                                                className={`flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-bold border transition-all duration-300 shadow-sm
                                                ${status[p] === "success"
                                                        ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-200/50"
                                                        : status[p] === "error"
                                                            ? "bg-red-50 border-red-200 text-red-700 shadow-red-200/50"
                                                            : status[p] === "loading"
                                                                ? "bg-indigo-50 border-indigo-200 text-indigo-700 animate-pulse"
                                                                : "bg-white border-zinc-200 text-zinc-900 hover:border-indigo-400 hover:shadow-indigo-200/50"
                                                    }`}
                                            >
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="capitalize tracking-wide">
                                                        {p}
                                                    </span>
                                                    {status[p] === 'success' && (
                                                        <span className="text-[9px] text-emerald-600 font-black uppercase flex items-center gap-1">
                                                            <Sparkles className="w-2 h-2" />
                                                            Pro Feedback Ready
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`text-[10px] uppercase font-black tracking-widest px-2.5 py-1 rounded-full ${status[p] === 'success' ? 'bg-emerald-500/10' :
                                                    status[p] === 'loading' ? 'bg-indigo-500/10' :
                                                        'bg-zinc-100'
                                                    }`}>
                                                    {status[p] === "loading"
                                                        ? "Analyzing…"
                                                        : status[p] === "success"
                                                            ? "View Results"
                                                            : "Generate"}
                                                </div>
                                            </motion.button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* PROGRESS */}
                        {generatingPlatform && (
                            <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                <svg className="animate-spin h-4 w-4 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                                Generating <b className="ml-1 capitalize">{generatingPlatform}</b>…
                            </div>
                        )}

                        {/* RESULTS */}
                        {results && (
                            <div id="results-section" className="space-y-12 pt-12 border-t border-border scroll-mt-24">
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
