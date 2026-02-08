"use client";

import React, { useState } from "react";
import { Link2, FileText, Sparkles, Users, TrendingUp, Briefcase } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface InputSectionProps {
    url: string;
    setUrl: (url: string) => void;
    text: string;
    setText: (text: string) => void;
    audience: string;
    setAudience: (audience: string) => void;
    onIngest: () => void;
    loading: boolean;
}

const audienceOptions = [
    { value: 'Developers', icon: Sparkles, color: 'from-blue-500 to-cyan-500' },
    { value: 'Founders', icon: TrendingUp, color: 'from-purple-500 to-pink-500' },
    { value: 'Marketers', icon: Briefcase, color: 'from-orange-500 to-red-500' },
];

export const InputSection: React.FC<InputSectionProps> = ({
    url,
    setUrl,
    text,
    setText,
    audience,
    setAudience,
    onIngest,
    loading,
}) => {
    const [inputMode, setInputMode] = useState<'url' | 'text'>('url');
    const [isFocused, setIsFocused] = useState(false);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.33, 1, 0.68, 1] }}
            className="max-w-4xl mx-auto"
        >
            {/* Premium card container */}
            <div className="relative bg-surface border border-[hsl(var(--border))] rounded-3xl p-8 md:p-10 shadow-xl shadow-black/5">
                {/* Subtle gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.02] to-transparent rounded-3xl pointer-events-none" />

                <div className="relative space-y-8">
                    {/* Section header */}
                    <div className="space-y-2">
                        <h2 className="text-h2 text-ink">Input your content</h2>
                        <p className="text-body text-ink-light">
                            Start with a URL or paste your content directly
                        </p>
                    </div>

                    {/* Premium toggle */}
                    <div className="relative inline-flex p-1 bg-ink/5 rounded-xl border border-[hsl(var(--border))]">
                        <div className="absolute inset-1">
                            <motion.div
                                layoutId="inputModeIndicator"
                                className="h-full bg-surface rounded-lg shadow-sm border border-[hsl(var(--border))]"
                                style={{
                                    width: inputMode === 'url' ? '50%' : '50%',
                                    x: inputMode === 'url' ? '0%' : '100%',
                                }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            />
                        </div>

                        <button
                            onClick={() => setInputMode('url')}
                            className={`relative z-10 flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${inputMode === 'url' ? 'text-ink' : 'text-ink-lighter hover:text-ink'
                                }`}
                        >
                            <Link2 className="w-4 h-4" />
                            From URL
                        </button>
                        <button
                            onClick={() => setInputMode('text')}
                            className={`relative z-10 flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-colors ${inputMode === 'text' ? 'text-ink' : 'text-ink-lighter hover:text-ink'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            Paste text
                        </button>
                    </div>

                    {/* Input area with premium styling */}
                    <AnimatePresence mode="wait">
                        {inputMode === 'url' ? (
                            <motion.div
                                key="url"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                <label className="block text-label text-ink font-semibold">
                                    Content URL
                                </label>
                                <div className={`relative transition-all duration-200 ${isFocused ? 'ring-2 ring-accent/20' : ''
                                    } rounded-xl`}>
                                    <input
                                        type="url"
                                        placeholder="https://example.com/your-blog-post"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        className="w-full h-14 pl-12 pr-4 bg-surface border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))] focus:border-accent rounded-xl text-body text-ink placeholder:text-ink-lighter transition-all outline-none"
                                    />
                                    <Link2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-ink-lighter" />
                                </div>
                                <button
                                    onClick={() => setUrl("https://nextjs.org/blog/next-14")}
                                    className="text-caption text-accent hover:text-accent-hover font-medium transition-colors flex items-center gap-1"
                                >
                                    <Sparkles className="w-3 h-3" />
                                    Try with example post
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="text"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-3"
                            >
                                <label className="block text-label text-ink font-semibold">
                                    Your content
                                </label>
                                <div className={`relative transition-all duration-200 ${isFocused ? 'ring-2 ring-accent/20' : ''
                                    } rounded-xl`}>
                                    <textarea
                                        placeholder="Paste your blog post, article, or any content you want to repurpose..."
                                        value={text}
                                        onChange={(e) => setText(e.target.value)}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        rows={6}
                                        className="w-full px-4 py-4 bg-surface border-2 border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))] focus:border-accent rounded-xl text-body text-ink placeholder:text-ink-lighter transition-all outline-none resize-none"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Premium audience selector */}
                    <div className="space-y-4">
                        <label className="block text-label text-ink font-semibold">
                            Target audience
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {audienceOptions.map((option) => {
                                const Icon = option.icon;
                                const isSelected = audience === option.value;

                                return (
                                    <motion.button
                                        key={option.value}
                                        onClick={() => setAudience(option.value)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        className={`relative h-24 rounded-xl border-2 transition-all overflow-hidden ${isSelected
                                                ? 'border-accent bg-accent/5 shadow-lg shadow-accent/10'
                                                : 'border-[hsl(var(--border))] hover:border-[hsl(var(--border-strong))] bg-surface'
                                            }`}
                                    >
                                        {isSelected && (
                                            <motion.div
                                                layoutId="audienceIndicator"
                                                className={`absolute inset-0 bg-gradient-to-br ${option.color} opacity-5`}
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}

                                        <div className="relative h-full flex flex-col items-center justify-center gap-2">
                                            <Icon className={`w-5 h-5 ${isSelected ? 'text-accent' : 'text-ink-lighter'
                                                }`} />
                                            <span className={`text-sm font-medium ${isSelected ? 'text-accent' : 'text-ink'
                                                }`}>
                                                {option.value}
                                            </span>
                                        </div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Premium CTA */}
                    <div className="pt-4">
                        <motion.button
                            onClick={onIngest}
                            disabled={loading || (!url && !text)}
                            whileHover={{ scale: loading ? 1 : 1.01 }}
                            whileTap={{ scale: loading ? 1 : 0.99 }}
                            className="group relative w-full h-16 bg-accent hover:bg-accent-hover disabled:bg-ink-lighter disabled:cursor-not-allowed text-white rounded-xl font-semibold text-lg transition-all shadow-lg hover:shadow-xl hover:shadow-accent/20 disabled:shadow-none overflow-hidden"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                    />
                                    Processing your content...
                                </span>
                            ) : (
                                <>
                                    <span className="relative z-10 flex items-center justify-center gap-2">
                                        <Sparkles className="w-5 h-5" />
                                        Generate platform content
                                        <motion.svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                            animate={{ x: [0, 4, 0] }}
                                            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                        </motion.svg>
                                    </span>

                                    {/* Shimmer effect */}
                                    <motion.div
                                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    />
                                </>
                            )}
                        </motion.button>

                        <p className="text-caption text-ink-lighter text-center mt-4">
                            AI will create optimized versions for LinkedIn, Twitter, Instagram, and newsletters
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
