
"use client";

import React, { useState } from 'react';
import { Copy, Check, Edit3, BarChart3, Calendar, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Platform } from './PlatformTabs';

interface ResultsSectionProps {
    results: any;
    activeTab: Platform;
    editedContent: any;
    onUpdateContent: (platform: Platform, value: any) => void;
    loading: boolean;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
    results,
    activeTab,
    editedContent,
    onUpdateContent,
    loading
}) => {
    const [isCopying, setIsCopying] = useState(false);

    const copyToClipboard = (content: any) => {
        const textToCopy = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
        navigator.clipboard.writeText(textToCopy);
        setIsCopying(true);
        setTimeout(() => setIsCopying(false), 2000);
    };

    if (!results && loading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-6">
                <div className="relative w-24 h-24">
                    <div className="absolute inset-0 bg-[hsl(var(--accent))/0.2] rounded-full animate-ping" />
                    <div className="relative bg-background rounded-full p-4 border-4 border-[hsl(var(--accent))] border-t-transparent animate-spin w-full h-full" />
                </div>
                <h3 className="text-xl font-bold animate-pulse text-transparent bg-clip-text bg-gradient-to-r from-[hsl(var(--accent))] to-emerald-400">
                    Neural Engine Processing...
                </h3>
            </div>
        );
    }

    if (!results) return null;

    const originalOutput = results.outputs?.[activeTab];
    const schedule = results.scheduling?.[activeTab];
    const currentEdit = editedContent[activeTab];

    // If this platform hasn't been generated yet, show a message
    if (!originalOutput) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <div className="text-h3 text-ink-lighter">No content generated yet</div>
                <p className="text-body text-ink-lighter">
                    Generate content for {activeTab} to see results here
                </p>
            </div>
        );
    }

    const renderEditor = () => {
        if (activeTab === 'instagram') {
            const slides = Array.isArray(currentEdit) ? currentEdit : [];

            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {slides.map((rawSlide: any, i: number) => {
                        const text = typeof rawSlide === 'string' ? rawSlide : rawSlide?.text || '';
                        const imageUrl = typeof rawSlide === 'object' ? (rawSlide.finalImage || rawSlide.imageUrl) : null;

                        return (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="group relative bg-muted/30 p-4 rounded-3xl border border-white/10 hover:border-indigo-500 transition-all flex flex-col gap-3"
                            >
                                <span className="absolute top-3 right-4 text-xs font-black text-muted-foreground/30">
                                    SLIDE {i + 1}
                                </span>

                                {/* Image preview (if available) */}
                                {imageUrl && (
                                    <div className="aspect-[4/5] w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(var(--accent))/0.15] to-emerald-400/15 border border-white/10">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={imageUrl}
                                            alt={`Slide ${i + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                )}

                                {/* Text editor */}
                                <textarea
                                    className="w-full bg-transparent border-none focus:ring-0 text-sm font-medium resize-none min-h-[120px] leading-relaxed"
                                    value={text}
                                    onChange={(e) => {
                                        const updated = slides.map((s: any, idx: number) => {
                                            if (idx !== i) return s;
                                            if (typeof s === 'string') {
                                                return e.target.value;
                                            }
                                            return {
                                                ...s,
                                                text: e.target.value,
                                            };
                                        });
                                        onUpdateContent('instagram', updated);
                                    }}
                                />
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                                    <span>Tap to edit copy</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Edit3 className="w-3 h-3 text-[hsl(var(--accent))]" />
                                        <span className="font-medium">Refine slide</span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            );
        }

        if (activeTab === 'twitter') {
            return (
                <div className="space-y-6 max-w-2xl mx-auto">
                    {Array.isArray(currentEdit) && currentEdit.map((tweet: string, i: number) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex gap-4 relative"
                        >
                            <div className="flex flex-col items-center">
                                <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-black text-white border border-zinc-900 shadow-md">
                                    {i + 1}
                                </div>
                                {i !== currentEdit.length - 1 && <div className="w-0.5 flex-1 bg-zinc-300 my-2" />}
                            </div>
                            <div className="flex-1 bg-white p-6 rounded-2xl border-2 border-zinc-300 shadow-xl" style={{ backgroundColor: 'white' }}>
                                <textarea
                                    className="w-full bg-transparent border-none focus:ring-0 text-base resize-none p-0 leading-relaxed font-bold"
                                    style={{ color: 'black', opacity: 1, WebkitTextFillColor: 'black' }}
                                    rows={3}
                                    value={tweet}
                                    onChange={(e) => {
                                        const newThread = [...currentEdit];
                                        newThread[i] = e.target.value;
                                        onUpdateContent('twitter', newThread);
                                    }}
                                />
                            </div>
                        </motion.div>
                    ))}
                </div>
            )
        }

        if (activeTab === 'seo') {
            return (
                <div className="max-w-2xl mx-auto space-y-8">
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Meta Title</label>
                        <input
                            className="w-full h-14 px-4 bg-white border-2 border-zinc-200 focus:border-indigo-500 transition-colors rounded-xl font-bold shadow-sm"
                            style={{ color: 'black', backgroundColor: 'white' }}
                            value={currentEdit.title || ''}
                            onChange={(e) => onUpdateContent('seo', { ...currentEdit, title: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Meta Description</label>
                        <textarea
                            className="w-full bg-white border-2 border-zinc-200 focus:border-indigo-500 transition-colors rounded-xl p-4 text-base leading-relaxed h-32 resize-none font-bold shadow-sm"
                            style={{ color: 'black', backgroundColor: 'white' }}
                            value={currentEdit.metaDescription || ''}
                            onChange={(e) => onUpdateContent('seo', { ...currentEdit, metaDescription: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Keywords (Comma separated)</label>
                        <input
                            className="w-full h-12 px-4 bg-white border-2 border-zinc-200 focus:border-indigo-500 transition-colors rounded-xl font-bold shadow-sm"
                            style={{ color: 'black', backgroundColor: 'white' }}
                            value={Array.isArray(currentEdit.keywords) ? currentEdit.keywords.join(', ') : ''}
                            onChange={(e) => {
                                const kws = e.target.value.split(',').map(s => s.trim());
                                onUpdateContent('seo', { ...currentEdit, keywords: kws });
                            }}
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                            {(currentEdit.keywords || []).map((kw: string, i: number) => (
                                <motion.span
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-100"
                                >
                                    {kw}
                                </motion.span>
                            ))}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="relative group">
                <textarea
                    className="w-full h-[500px] bg-white border-2 border-zinc-200 group-hover:border-indigo-300 focus:border-indigo-500 transition-all rounded-3xl focus:ring-4 focus:ring-indigo-500/5 text-lg leading-relaxed font-serif p-8 resize-none shadow-sm"
                    style={{ color: 'black', backgroundColor: 'white' }}
                    value={currentEdit}
                    onChange={(e) => onUpdateContent(activeTab, e.target.value)}
                />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-indigo-400">
                    <Edit3 className="w-4 h-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Editing content</span>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
            >
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Main Editor */}
                    <motion.div
                        layout
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                        className="flex-1"
                    >
                        <Card className="relative border border-white/10 shadow-2xl shadow-[rgba(34,211,238,0.25)] bg-gradient-to-br from-white/70 via-white/40 to-cyan-50/40 dark:from-zinc-900/70 dark:via-zinc-900/40 dark:to-cyan-950/40 backdrop-blur-xl overflow-hidden">
                            {/* Animated border glow */}
                            <motion.div
                                className="pointer-events-none absolute -inset-px rounded-3xl border border-[hsl(var(--accent))/0.6]"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.6 }}
                                transition={{ duration: 1.2, repeat: Infinity, repeatType: "reverse" }}
                            />
                            <div className="relative flex items-center justify-between p-4 border-b border-white/10">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                    <Edit3 className="w-4 h-4" /> Editor
                                </h3>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => copyToClipboard(currentEdit)}
                                    className="h-8 text-xs font-bold uppercase tracking-wider"
                                >
                                    {isCopying ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
                                    {isCopying ? "Copied" : "Copy"}
                                </Button>
                            </div>
                            <CardContent className="relative p-8">
                                {renderEditor()}
                            </CardContent>
                        </Card>
                    </motion.div>

                    {/* Sidebar Stats */}
                    <motion.div
                        className="lg:w-80 space-y-6"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                    >
                        <Card className="border-none bg-[hsl(var(--accent))/0.08] backdrop-blur-sm overflow-hidden relative">
                            <motion.div
                                className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--accent))/0.25] via-transparent to-emerald-400/20"
                                initial={{ opacity: 0.4 }}
                                animate={{ opacity: 0.7 }}
                                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                            />
                            <CardContent className="relative p-6">
                                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-4 text-[hsl(var(--accent))]">
                                    <BarChart3 className="w-4 h-4" /> Engagement
                                </h4>
                                <div className="flex items-end gap-2 mb-2">
                                    <span className="text-5xl font-black">{originalOutput.score || 0}</span>
                                    <span className="text-sm font-bold text-muted-foreground pb-2">/ 100</span>
                                </div>
                                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${originalOutput.score || 0}%` }}
                                        transition={{ duration: 1, ease: "circOut" }}
                                        className="h-full bg-gradient-to-r from-[hsl(var(--accent))] via-cyan-400 to-emerald-400"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-none bg-emerald-500/5 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-4 text-emerald-500">
                                    <Calendar className="w-4 h-4" /> Schedule
                                </h4>
                                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                                    {schedule}
                                </p>
                            </CardContent>
                        </Card>

                        <Card className="border-none bg-orange-500/5 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-4 text-orange-500">
                                    <Sparkles className="w-4 h-4" /> Feedback
                                </h4>
                                <ul className="space-y-3">
                                    {(originalOutput.feedback || []).map((f: string, i: number) => (
                                        <li key={i} className="text-xs font-medium text-muted-foreground flex gap-2">
                                            <span className="text-orange-500 shrink-0">•</span>
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
