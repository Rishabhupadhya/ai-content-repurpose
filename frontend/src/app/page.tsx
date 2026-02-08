"use client";

import React, { useState } from "react";
import { ingestContent, generatePlatformContent } from "@/lib/api";
import { Hero } from "@/components/landing/Hero";
import { InputSection } from "@/components/dashboard/InputSection";
import { ResultsSection } from "@/components/dashboard/ResultsSection";
import { PlatformTabs, Platform } from "@/components/dashboard/PlatformTabs";
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

                        {/* BUTTONS */}
                        {contentId && (
                            <div className="max-w-5xl mx-auto px-6 space-y-6">
                                {/* Generate All */}
                                <button
                                    onClick={generateAll}
                                    className="w-full bg-black text-white py-3 rounded-xl font-semibold hover:bg-gray-900"
                                >
                                    Generate All Platforms
                                </button>

                                {/* INDIVIDUAL PLATFORM BUTTONS */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                    {PLATFORMS.map((p) => (
                                        <button
                                            key={p}
                                            onClick={() => generateOne(p)}
                                            disabled={status[p] === "loading"}
                                            className={`flex items-center justify-between px-4 py-3 rounded-xl border transition
                        ${status[p] === "success"
                                                    ? "bg-green-50 border-green-200 text-green-700"
                                                    : status[p] === "error"
                                                        ? "bg-red-50 border-red-200 text-red-700"
                                                        : "bg-white hover:bg-gray-50"
                                                }`}
                                        >
                                            <span className="capitalize font-medium">{p}</span>
                                            <span className="text-xs opacity-70">
                                                {status[p] === "loading"
                                                    ? "Generating…"
                                                    : status[p] === "success"
                                                        ? "Done"
                                                        : "Generate"}
                                            </span>
                                        </button>
                                    ))}
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
                            <div className="space-y-8 pt-12 border-t border-border">
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
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
