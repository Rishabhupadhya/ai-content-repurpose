"use client";

import React, { useState, useEffect } from "react";
import {
    BarChart3,
    BookOpen,
    Calendar,
    Copy,
    Instagram,
    Linkedin,
    Mail,
    Maximize2,
    Rocket,
    Search,
    Twitter,
    ChevronRight,
    Sparkles,
    Edit3,
    Check
} from "lucide-react";
import { ingestContent, generateContent } from "@/lib/api";

type Platform = "linkedin" | "instagram" | "twitter" | "newsletter" | "seo";

export default function Home() {
    const [url, setUrl] = useState("");
    const [text, setText] = useState("");
    const [audience, setAudience] = useState("General");
    const [loading, setLoading] = useState(false);
    const [currentStep, setCurrentStep] = useState(1); // 1: Input, 2: Review
    const [contentId, setContentId] = useState<string | null>(null);
    const [results, setResults] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<Platform>("linkedin");
    const [editedContent, setEditedContent] = useState<any>({});
    const [isCopying, setIsCopying] = useState(false);

    const handleIngest = async () => {
        setLoading(true);
        try {
            const data = url ? { url, targetAudience: audience } : { rawText: text, targetAudience: audience };
            const res = await ingestContent(data);
            setContentId(res.id);
            setCurrentStep(2);

            const genRes = await generateContent(res.id);
            setResults(genRes);
            // Initialize edited content with generated content
            setEditedContent({
                linkedin: genRes.outputs.linkedin.content,
                instagram: genRes.outputs.instagram.slides,
                twitter: genRes.outputs.twitter.thread,
                newsletter: genRes.outputs.newsletter.content,
                seo: genRes.outputs.seo
            });
        } catch (error) {
            console.error(error);
            alert("Error: Check if your backend and OpenAI key are configured correctly.");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (content: any) => {
        const textToCopy = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        navigator.clipboard.writeText(textToCopy);
        setIsCopying(true);
        setTimeout(() => setIsCopying(false), 2000);
    };

    const updateEditedContent = (platform: Platform, value: any) => {
        setEditedContent((prev: any) => ({
            ...prev,
            [platform]: value
        }));
    };

    const renderOutputEditor = () => {
        if (!results) return (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="w-12 h-12 border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-800 dark:border-t-white rounded-full animate-spin"></div>
                <p className="text-sm font-medium animate-pulse">Engaging AI strategist agents...</p>
            </div>
        );

        const originalOutput = results.outputs[activeTab];
        const schedule = results.scheduling[activeTab];
        const currentEdit = editedContent[activeTab];

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-zinc-200/50 dark:shadow-none">
                    <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30 backdrop-blur-xl">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${activeTab === 'linkedin' ? 'bg-blue-100 text-blue-600' :
                                activeTab === 'instagram' ? 'bg-pink-100 text-pink-600' :
                                    activeTab === 'twitter' ? 'bg-sky-100 text-sky-500' :
                                        activeTab === 'newsletter' ? 'bg-emerald-100 text-emerald-500' :
                                            'bg-violet-100 text-violet-500'
                                }`}>
                                {activeTab === 'linkedin' && <Linkedin className="w-5 h-5" />}
                                {activeTab === 'instagram' && <Instagram className="w-5 h-5" />}
                                {activeTab === 'twitter' && <Twitter className="w-5 h-5" />}
                                {activeTab === 'newsletter' && <Mail className="w-5 h-5" />}
                                {activeTab === 'seo' && <Search className="w-5 h-5" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 capitalize">
                                    {activeTab} Post
                                </h3>
                                <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Production Output</p>
                            </div>
                        </div>
                        <button
                            onClick={() => copyToClipboard(currentEdit)}
                            className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-xs font-bold transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            {isCopying ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {isCopying ? "Copied!" : "Copy All"}
                        </button>
                    </div>
                    <div className="p-8">
                        {activeTab === 'instagram' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {currentEdit.map((slide: string, i: number) => (
                                    <div key={i} className="group relative bg-zinc-50 dark:bg-zinc-800/50 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-700 transition-all hover:border-zinc-900 dark:hover:border-zinc-400">
                                        <span className="absolute top-4 right-4 text-[10px] font-black text-zinc-300 dark:text-zinc-600">#{i + 1}</span>
                                        <textarea
                                            className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium resize-none min-h-[120px]"
                                            value={slide}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                                const newSlides = [...currentEdit];
                                                newSlides[i] = e.target.value;
                                                updateEditedContent('instagram', newSlides);
                                            }}
                                        />
                                        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Edit3 className="w-3 h-3 text-zinc-400" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activeTab === 'twitter' ? (
                            <div className="max-w-xl mx-auto space-y-4">
                                {currentEdit.map((tweet: string, i: number) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500">
                                                {i + 1}
                                            </div>
                                            {i !== currentEdit.length - 1 && <div className="w-0.5 flex-1 bg-zinc-200 dark:bg-zinc-800" />}
                                        </div>
                                        <div className="flex-1 bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700">
                                            <textarea
                                                className="w-full bg-transparent border-none focus:ring-0 text-sm leading-relaxed resize-none"
                                                rows={3}
                                                value={tweet}
                                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                                    const newThread = [...currentEdit];
                                                    newThread[i] = e.target.value;
                                                    updateEditedContent('twitter', newThread);
                                                }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : activeTab === 'seo' ? (
                            <div className="max-w-2xl mx-auto space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Page Title</label>
                                    <input
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl p-4 text-sm font-bold"
                                        value={currentEdit.title}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateEditedContent('seo', { ...currentEdit, title: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Meta Description</label>
                                    <textarea
                                        className="w-full bg-zinc-50 dark:bg-zinc-800 border-none rounded-xl p-4 text-sm leading-relaxed"
                                        rows={3}
                                        value={currentEdit.metaDescription}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateEditedContent('seo', { ...currentEdit, metaDescription: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Keywords</label>
                                    <div className="flex flex-wrap gap-2">
                                        {currentEdit.keywords.map((kw: string, i: number) => (
                                            <span key={i} className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold rounded-full border border-zinc-200 dark:border-zinc-700">
                                                {kw}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <textarea
                                className="w-full h-[400px] bg-transparent border-none focus:ring-0 text-lg leading-relaxed font-serif p-0"
                                value={currentEdit}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateEditedContent(activeTab, e.target.value)}
                            />
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
                        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-4 text-zinc-400">
                            <Maximize2 className="w-4 h-4 text-blue-500" />
                            Intelligence Node
                        </h4>
                        <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed italic">
                            "{originalOutput.explanation}"
                        </p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xl shadow-emerald-500/5">
                        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-4 text-zinc-400">
                            <Calendar className="w-4 h-4 text-emerald-500" />
                            Smart Window
                        </h4>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl">
                            <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                {schedule}
                            </p>
                        </div>
                        <p className="text-[10px] text-zinc-500 mt-4 leading-tight font-medium uppercase tracking-tighter">Verified against IST timezone peaks.</p>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
                        <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-4 text-zinc-400">
                            <BarChart3 className="w-4 h-4 text-orange-500" />
                            Engagement Score
                        </h4>
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-4xl font-black text-zinc-900 dark:text-white leading-none">{originalOutput.score}</span>
                            <span className="text-sm font-bold text-zinc-400 pb-1">/ 100</span>
                        </div>
                        <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-6 overflow-hidden">
                            <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${originalOutput.score}%` }}></div>
                        </div>
                        <ul className="space-y-3">
                            {originalOutput.feedback.map((f: string, idx: number) => (
                                <li key={idx} className="flex gap-3 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                                    <Sparkles className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-[#F8F9FA] dark:bg-black text-zinc-900 dark:text-zinc-300 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-white dark:selection:text-black">
            {/* Premium Navbar */}
            <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-black/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-2xl flex items-center justify-center transform rotate-3">
                            <Rocket className="w-6 h-6 text-white dark:text-black" />
                        </div>
                        <div>
                            <span className="font-black text-xl tracking-tight text-zinc-900 dark:text-white">Repurpose.ai</span>
                            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest leading-none">V1.0 Production</p>
                        </div>
                    </div>
                    <div className="hidden md:flex items-center gap-10 text-xs font-black uppercase tracking-widest text-zinc-400">
                        <a href="#" className="hover:text-black dark:hover:text-white transition-all underline-offset-8 hover:underline">Insights</a>
                        <a href="#" className="hover:text-black dark:hover:text-white transition-all underline-offset-8 hover:underline">Vault</a>
                        <a href="#" className="hover:text-black dark:hover:text-white transition-all underline-offset-8 hover:underline">API</a>
                        <button className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-full hover:scale-105 active:scale-95 transition-all">
                            Enterprise
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-7xl mx-auto px-6 py-16">
                {currentStep === 1 ? (
                    <div className="max-w-4xl mx-auto space-y-20">
                        <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-12 duration-1000">
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 scale-90 md:scale-100">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Next-Gen AI Strategy Active</span>
                            </div>
                            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-zinc-900 dark:text-white leading-[0.9] text-balance">
                                One Article.<br />
                                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                                    Every Channel.
                                </span>
                            </h1>
                            <p className="text-xl text-zinc-500 max-w-2xl mx-auto font-medium">
                                The content distribution engine used by elite product teams to scale their presence across the social graph in seconds.
                            </p>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 p-1 md:p-12 rounded-[3rem] shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-zinc-200 dark:border-zinc-800 relative z-10 transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                                <div className="lg:col-span-12 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Blog Source</label>
                                                <button
                                                    onClick={() => {
                                                        setUrl("https://nextjs.org/blog/next-14");
                                                        setAudience("Developers");
                                                    }}
                                                    className="text-[10px] font-bold text-blue-500 hover:underline"
                                                >
                                                    Load Demo Blog
                                                </button>
                                            </div>
                                            <div className="group relative">
                                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-10 group-focus-within:opacity-30 transition duration-500"></div>
                                                <div className="relative">
                                                    <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                                                    <input
                                                        type="text"
                                                        placeholder="https://acme.inc/blog/building-in-public"
                                                        className="w-full pl-12 pr-4 py-5 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-2xl focus:ring-0 transition-all outline-none text-sm font-semibold"
                                                        value={url}
                                                        onChange={(e) => setUrl(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Target Segment</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {['Developers', 'Founders', 'Marketers'].map((type) => (
                                                    <button
                                                        key={type}
                                                        onClick={() => setAudience(type)}
                                                        className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${audience === type
                                                            ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-white dark:text-black'
                                                            : 'bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-zinc-400 hover:border-zinc-400'
                                                            }`}
                                                    >
                                                        {type}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="text-xs font-black uppercase tracking-widest text-zinc-400">Direct Workspace (Alternative)</label>
                                        <textarea
                                            placeholder="Paste draft content here for immediate processing..."
                                            className="w-full h-40 px-6 py-5 bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 rounded-[2rem] focus:ring-0 transition-all outline-none resize-none text-sm font-medium leading-relaxed"
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                        />
                                    </div>

                                    <button
                                        disabled={loading || (!url && !text)}
                                        onClick={handleIngest}
                                        className="w-full h-20 bg-zinc-900 dark:bg-white text-white dark:text-black font-black uppercase tracking-[0.2em] text-lg rounded-[2.5rem] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-4 disabled:opacity-50 group overflow-hidden relative shadow-2xl shadow-zinc-900/20 dark:shadow-white/10"
                                    >
                                        <span className="relative z-10">{loading ? "Synchronizing..." : "Initiate Pulse"}</span>
                                        {!loading && <ChevronRight className="relative z-10 w-6 h-6 group-hover:translate-x-1 transition-transform" />}
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Social Proof/Capabilities */}
                        <div className="flex justify-center gap-12 pt-4 flex-wrap opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
                            {[
                                { icon: <Linkedin className="w-6 h-6" />, label: "LinkedIn" },
                                { icon: <Instagram className="w-6 h-6 text-pink-500" />, label: "Instagram" },
                                { icon: <Twitter className="w-6 h-6 text-sky-500" />, label: "Twitter/X" },
                                { icon: <Mail className="w-6 h-6 text-emerald-500" />, label: "Newsletter" },
                                { icon: <Search className="w-6 h-6 text-blue-500" />, label: "SEO Hub" }
                            ].map((item, i) => (
                                <div key={i} className="flex flex-col items-center gap-3">
                                    {item.icon}
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-12">
                            <div className="space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                                    <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Analysis Complete</span>
                                </div>
                                <h2 className="text-5xl font-black text-zinc-900 dark:text-white tracking-tighter">Your Platform Matrix</h2>
                                <p className="text-lg text-zinc-500 font-medium max-w-xl">5 platform-optimized formats generated from your source. Review, edit, and distribute.</p>
                            </div>
                            <button
                                onClick={() => setCurrentStep(1)}
                                className="px-8 py-4 border-2 border-zinc-200 dark:border-zinc-800 rounded-full text-xs font-black uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-95"
                            >
                                ← Reset Engine
                            </button>
                        </div>

                        {/* Platform Selection Tabs */}
                        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-12 overflow-x-auto pb-px">
                            {(["linkedin", "instagram", "twitter", "newsletter", "seo"] as Platform[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`pb-8 text-[11px] font-black uppercase tracking-[0.3em] relative transition-all ${activeTab === tab
                                        ? "text-zinc-900 dark:text-white"
                                        : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                                        }`}
                                >
                                    {tab}
                                    {activeTab === tab && (
                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900 dark:bg-white rounded-t-full shadow-lg shadow-zinc-900/50" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {renderOutputEditor()}
                    </div>
                )}
            </div>
        </main>
    );
}
