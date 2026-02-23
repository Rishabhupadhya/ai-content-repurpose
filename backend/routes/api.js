/**
 * ======================================
 * 🛣️  API ROUTES
 * ======================================
 */

const express = require('express');
const router = express.Router();

const { scrapeBlog } = require('../services/scraper');
const ai = require('../services/ai');
const { suggestPostTimes } = require('../services/scheduler');
const Content = require('../models/Content');

// Optional image services
let generateImage = null;
let composeInstagramSlide = null;

try { ({ generateImage } = require('../services/imagegenerator')); }
catch (e) { console.warn('⚠️  imagegenerator not found — Instagram uses fallback images'); }

try { ({ composeInstagramSlide } = require('../services/composeInstagramSlide')); }
catch (e) { console.warn('⚠️  composeInstagramSlide not found — using raw image URLs'); }

// ─── Normalizers ──────────────────────────────────────────────────────────────

const normalizeContent = (v) => !v && v !== 0 ? '' : Array.isArray(v) ? v.join('\n\n') : typeof v === 'string' ? v : JSON.stringify(v);
const normalizeScore = (s) => {
    if (typeof s === 'number' && !isNaN(s)) return Math.min(Math.max(Math.round(s), 0), 100);
    if (typeof s === 'object' && s !== null) {
        const vals = Object.values(s).filter(v => typeof v === 'number');
        return vals.length ? Math.min(Math.max(Math.round(vals.reduce((a, b) => a + b, 0) / vals.length), 0), 100) : 70;
    }
    if (typeof s === 'string') { const p = parseInt(s, 10); return isNaN(p) ? 70 : Math.min(Math.max(p, 0), 100); }
    return 70;
};
const normalizeFeedback = (f) => Array.isArray(f) ? f.map(String).filter(Boolean) : typeof f === 'string' && f ? [f] : [];

// ─── 1. INGEST ────────────────────────────────────────────────────────────────

router.post('/ingest', async (req, res) => {
    try {
        const { url, rawText, targetAudience } = req.body;

        if (!url && !rawText) {
            return res.status(400).json({ error: 'Provide either a url or rawText', code: 'MISSING_INPUT' });
        }

        let title = 'Raw Content';
        let content = rawText;

        if (url) {
            try {
                const scraped = await scrapeBlog(url);
                title = scraped.title || 'Scraped Content';
                content = scraped.content;
            } catch (e) {
                return res.status(422).json({ error: `Failed to scrape URL: ${e.message}`, code: 'SCRAPE_FAILED' });
            }
        }

        if (!content || content.trim().length < 10) {
            return res.status(400).json({ error: 'Content is empty or too short', code: 'INSUFFICIENT_CONTENT' });
        }

        const entry = await Content.create({
            originalUrl: url || null,
            originalText: rawText || null,
            cleanContent: content.trim(),
            title,
            targetAudience: targetAudience || 'General',
        });

        console.log(`✅ Ingested: ${entry._id} (${content.length} chars)`);
        res.json({ id: entry._id, title: entry.title, contentLength: content.length, targetAudience: entry.targetAudience });

    } catch (err) {
        console.error('❌ Ingest error:', err);
        res.status(500).json({ error: err.message || 'Failed to ingest content', code: 'INGEST_ERROR' });
    }
});

// ─── 2. GENERATE ──────────────────────────────────────────────────────────────

router.post('/generate', async (req, res) => {
    try {
        const { id, platform } = req.body;

        if (!id || !platform) {
            return res.status(400).json({ error: 'Missing id or platform', code: 'MISSING_PARAMS' });
        }

        const validPlatforms = ['linkedin', 'instagram', 'twitter', 'newsletter', 'seo'];
        if (!validPlatforms.includes(platform)) {
            return res.status(400).json({ error: `Invalid platform. Must be: ${validPlatforms.join(', ')}`, code: 'INVALID_PLATFORM' });
        }

        const entry = await Content.findById(id);
        if (!entry) {
            return res.status(404).json({ error: 'Content not found. Please ingest first.', code: 'NOT_FOUND' });
        }

        console.log(`🚀 Generating [${platform}] for: ${id}`);

        let raw;
        switch (platform) {
            case 'linkedin': raw = await ai.generateLinkedIn(entry.cleanContent, entry.targetAudience); break;
            case 'instagram': raw = await ai.generateInstagram(entry.cleanContent, entry.targetAudience); break;
            case 'twitter': raw = await ai.generateTwitter(entry.cleanContent, entry.targetAudience); break;
            case 'newsletter': raw = await ai.generateNewsletter(entry.cleanContent, entry.targetAudience); break;
            case 'seo': raw = await ai.generateSEO(entry.cleanContent); break;
        }

        // If AI returned a rate-limit fallback, surface it clearly to the frontend
        if (raw?.error) {
            return res.status(429).json({
                error: raw.content || 'API rate limit reached',
                code: 'RATE_LIMIT_EXHAUSTED',
                feedback: raw.feedback || [],
                rateLimitInfo: ai.getRateLimitStatus(),
            });
        }

        entry.outputs = entry.outputs || {};
        entry.scheduling = entry.scheduling || {};

        // ── Platform handling ─────────────────────────────────────────────────

        if (platform === 'instagram') {
            const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];
            const finalSlides = [];

            for (const slide of rawSlides) {
                const text = typeof slide === 'string' ? slide : (slide?.text || '');
                const imagePrompt = typeof slide === 'object' ? (slide?.imagePrompt || '') : '';

                let imageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop';
                let finalImage = imageUrl;

                if (generateImage && imagePrompt) {
                    try {
                        imageUrl = await generateImage(imagePrompt);
                        finalImage = composeInstagramSlide
                            ? await composeInstagramSlide(imageUrl, text)
                            : imageUrl;
                    } catch (imgErr) {
                        console.warn('⚠️  Slide image failed:', imgErr.message);
                    }
                } else if (composeInstagramSlide) {
                    // No Replicate token — still compose a nice slide with SVG fallback
                    try { finalImage = await composeInstagramSlide(imageUrl, text); }
                    catch (_) { }
                }

                finalSlides.push({ text, imagePrompt, imageUrl, finalImage });
            }

            entry.outputs.instagram = {
                slides: finalSlides,
                explanation: normalizeContent(raw.explanation),
                score: normalizeScore(raw.score),
                feedback: normalizeFeedback(raw.feedback),
            };

        } else if (platform === 'seo') {
            entry.outputs.seo = {
                title: normalizeContent(raw.title || raw.Title || ''),
                metaDescription: normalizeContent(raw.metaDescription || raw.MetaDescription || ''),
                keywords: Array.isArray(raw.keywords || raw.Keywords) ? (raw.keywords || raw.Keywords).map(String) : [],
                explanation: normalizeContent(raw.explanation || raw.Explanation || ''),
                score: normalizeScore(raw.score ?? raw.Score),
                feedback: normalizeFeedback(raw.feedback || raw.Feedback),
            };

        } else if (platform === 'twitter') {
            entry.outputs.twitter = {
                thread: Array.isArray(raw.thread) ? raw.thread.map(String).filter(Boolean) : [],
                explanation: normalizeContent(raw.explanation),
                score: normalizeScore(raw.score),
                feedback: normalizeFeedback(raw.feedback),
            };

        } else {
            entry.outputs[platform] = {
                content: normalizeContent(raw.content || raw.Content || raw.post || raw.newsletter || ''),
                explanation: normalizeContent(raw.explanation || raw.Explanation || ''),
                score: normalizeScore(raw.score ?? raw.Score),
                feedback: normalizeFeedback(raw.feedback || raw.Feedback),
            };
        }

        if (platform !== 'seo') {
            entry.scheduling[platform] = suggestPostTimes(platform);
        }

        entry.markModified('outputs');
        entry.markModified('scheduling');
        await entry.save();

        console.log(`✅ [${platform}] generated and saved`);

        res.json({
            outputs: { [platform]: entry.outputs[platform] },
            scheduling: entry.scheduling,
        });

    } catch (err) {
        console.error('❌ Generation error:', err.message);
        res.status(500).json({ error: 'Failed to generate content', details: err.message, code: 'GENERATION_ERROR' });
    }
});

// ─── 3. FETCH CONTENT ────────────────────────────────────────────────────────

router.get('/content/:id', async (req, res) => {
    try {
        const content = await Content.findById(req.params.id).lean();
        if (!content) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch content', code: 'FETCH_ERROR' });
    }
});

// ─── 4. LIST RECENT ──────────────────────────────────────────────────────────

router.get('/contents', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const contents = await Content.find().sort({ createdAt: -1 }).limit(limit).select('_id title targetAudience createdAt').lean();
        res.json({ contents, count: contents.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list content', code: 'LIST_ERROR' });
    }
});

// ─── 5. DELETE ───────────────────────────────────────────────────────────────

router.delete('/content/:id', async (req, res) => {
    try {
        const deleted = await Content.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete', code: 'DELETE_ERROR' });
    }
});

// ─── 6. DEBUG / RATE LIMIT STATUS ────────────────────────────────────────────

router.get('/debug-config', (req, res) => {
    res.json({
        model: ai.AI_MODEL_NAME,
        endpoint: ai.AI_MODEL_ENDPOINT,
        hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
        hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
        hasMongoUri: !!process.env.MONGO_URI,
        imageServiceAvailable: !!generateImage,
        slideComposerAvailable: !!composeInstagramSlide,
        nodeEnv: process.env.NODE_ENV || 'development',
        rateLimits: ai.getRateLimitStatus(),
    });
});

module.exports = router;