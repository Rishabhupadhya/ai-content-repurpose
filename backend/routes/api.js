const express = require('express');
const router = express.Router();

const { scrapeBlog } = require('../services/scraper');
const ai = require('../services/ai');
const { suggestPostTimes } = require('../services/scheduler');
const Content = require('../models/Content');

// 🔥 NEW IMPORTS
const { generateImage } = require('../services/imagegenerator');
const { composeInstagramSlide } = require('../services/composeInstagramSlide');

/**
 * ======================================
 * 🔒 AI OUTPUT NORMALIZATION (SAFE)
 * ======================================
 */

const normalizeContent = (value) => {
    if (Array.isArray(value)) return value.join('\n\n');
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
};

const normalizeScore = (score) => {
    if (typeof score === 'number') return Math.min(Math.max(score, 0), 100);

    if (typeof score === 'object' && score !== null) {
        const values = Object.values(score).filter(v => typeof v === 'number');
        return values.length
            ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
            : 70;
    }

    if (typeof score === 'string') {
        const parsed = parseInt(score, 10);
        return isNaN(parsed) ? 70 : parsed;
    }

    return 70;
};

const normalizeFeedback = (feedback) => {
    if (Array.isArray(feedback)) return feedback.map(String);
    if (typeof feedback === 'string') return [feedback];
    return [];
};

/**
 * ======================================
 * 1️⃣ INGEST CONTENT
 * ======================================
 */
router.post('/ingest', async (req, res) => {
    try {
        const { url, rawText, targetAudience } = req.body;

        let title = 'Raw Content';
        let content = rawText;

        if (url) {
            const scraped = await scrapeBlog(url);
            title = scraped.title;
            content = scraped.content;
        }

        if (!content || typeof content !== 'string') {
            return res.status(400).json({ error: 'No valid content provided' });
        }

        const entry = await Content.create({
            originalUrl: url || null,
            originalText: rawText || null,
            cleanContent: content,
            title,
            targetAudience: targetAudience || 'General'
        });

        res.json({ id: entry._id });
    } catch (err) {
        console.error('❌ Ingest error:', err);
        res.status(500).json({ error: 'Failed to ingest content' });
    }
});

/**
 * ======================================
 * 2️⃣ GENERATE (ONE PLATFORM)
 * ======================================
 */
router.post('/generate', async (req, res) => {
    try {
        const { id, platform } = req.body;
        console.log(`🚀 Generation started for ID: ${id}, Platform: ${platform}`);

        if (!id || !platform) {
            return res.status(400).json({ error: 'Missing id or platform' });
        }

        const entry = await Content.findById(id);
        if (!entry) {
            return res.status(404).json({ error: 'Content not found' });
        }

        let raw;

        switch (platform) {
            case 'linkedin':
                raw = await ai.generateLinkedIn(entry.cleanContent, entry.targetAudience);
                break;
            case 'instagram':
                raw = await ai.generateInstagram(entry.cleanContent, entry.targetAudience);
                break;
            case 'twitter':
                raw = await ai.generateTwitter(entry.cleanContent, entry.targetAudience);
                break;
            case 'newsletter':
                raw = await ai.generateNewsletter(entry.cleanContent, entry.targetAudience);
                break;
            case 'seo':
                raw = await ai.generateSEO(entry.cleanContent);
                break;
            default:
                return res.status(400).json({ error: 'Invalid platform' });
        }

        if (raw && raw.error === true) {
            return res.status(502).json({
                error: 'AI generation failed',
                details: raw.content || raw.feedback?.[0] || 'Please try again.'
            });
        }

        entry.outputs = entry.outputs || {};
        entry.scheduling = entry.scheduling || {};

        if (platform === 'instagram') {
            /**
             * ======================================
             * 🔥 INSTAGRAM SPECIAL HANDLING
             * ======================================
             */
            const finalSlides = [];

            for (const slide of raw.slides || []) {
                const text = typeof slide === 'string' ? slide : slide.text;
                const imagePrompt =
                    typeof slide === 'object' && slide !== null
                        ? slide.imagePrompt || ''
                        : '';

                let imageUrl = null;
                let finalImage = null;

                try {
                    imageUrl = await generateImage(imagePrompt);
                    finalImage = await composeInstagramSlide(
                        imageUrl,
                        text
                    );
                } catch (imgErr) {
                    console.error('⚠️ Slide generation failed:', imgErr.message);
                    // Fallback: Use a generic high-quality gradient/abstract image from Unsplash
                    imageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop';
                    finalImage = imageUrl; // Fallback to raw image if composition fails
                }

                finalSlides.push({
                    text,
                    imagePrompt,
                    imageUrl,
                    finalImage
                });
            }

            entry.outputs.instagram = {
                slides: finalSlides,
                explanation: normalizeContent(raw.explanation),
                score: normalizeScore(raw.score),
                feedback: normalizeFeedback(raw.feedback)
            };
        } else if (platform === 'seo') {
            /**
             * ======================================
             * 🟠 SEO SPECIAL HANDLING
             * ======================================
             */
            entry.outputs.seo = {
                title: normalizeContent(raw.title || raw.Title || ''),
                metaDescription: normalizeContent(raw.metaDescription || raw.MetaDescription || ''),
                keywords: Array.isArray(raw.keywords || raw.Keywords)
                    ? (raw.keywords || raw.Keywords).map(String)
                    : [],
                explanation: normalizeContent(raw.explanation || raw.Explanation || ''),
                score: normalizeScore(raw.score ?? raw.Score),
                feedback: normalizeFeedback(raw.feedback || raw.Feedback)
            };
        } else if (platform === 'twitter') {
            /**
             * ======================================
             * 🐦 TWITTER SPECIAL HANDLING
             * ======================================
             */
            entry.outputs.twitter = {
                thread: Array.isArray(raw.thread) ? raw.thread : [],
                explanation: normalizeContent(raw.explanation),
                score: normalizeScore(raw.score),
                feedback: normalizeFeedback(raw.feedback)
            };
        } else {
            /**
             * ======================================
             * 🔵 ALL OTHER PLATFORMS (Newsletter, LinkedIn)
             * ======================================
             */
            entry.outputs[platform] = {
                content: normalizeContent(raw.content || raw.Content || ''),
                explanation: normalizeContent(raw.explanation || raw.Explanation || ''),
                score: normalizeScore(raw.score ?? raw.Score),
                feedback: normalizeFeedback(raw.feedback || raw.Feedback)
            };
        }

        if (platform !== 'seo') {
            entry.scheduling[platform] = suggestPostTimes(platform);
        }

        await entry.save();

        res.json({
            outputs: { [platform]: entry.outputs[platform] },
            scheduling: entry.scheduling
        });

    } catch (err) {
        console.error('❌ Generation error details:', {
            message: err.message,
            stack: err.stack,
            response: err.response?.data
        });
        res.status(500).json({
            error: 'Failed to generate content',
            details: err.message
        });
    }
});

/**
 * ======================================
 * 🛠️ DEBUG ENDPOINT (Safe)
 * ======================================
 */
router.get('/debug-config', (req, res) => {
    res.json({
        model: ai.AI_MODEL_NAME,
        endpoint: ai.AI_MODEL_ENDPOINT,
        hasGeminiApiKey: !!process.env.GEMINI_API_KEY,
        hasReplicateToken: !!process.env.REPLICATE_API_TOKEN,
        hasMongoUri: !!process.env.MONGO_URI,
        nodeEnv: process.env.NODE_ENV
    });
});

/**
 * ======================================
 * 3️⃣ FETCH CONTENT
 * ======================================
 */
router.get('/content/:id', async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);
        if (!content) return res.status(404).json({ error: 'Not found' });
        res.json(content);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch content' });
    }
});

module.exports = router;
