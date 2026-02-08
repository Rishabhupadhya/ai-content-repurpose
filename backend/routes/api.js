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

        entry.outputs = entry.outputs || {};
        entry.scheduling = entry.scheduling || {};

        /**
         * ======================================
         * 🔥 INSTAGRAM SPECIAL HANDLING
         * ======================================
         */
        if (platform === 'instagram') {
            const finalSlides = [];

            for (const slide of raw.slides || []) {
                const imageUrl = await generateImage(slide.imagePrompt);
                const finalImage = await composeInstagramSlide(
                    imageUrl,
                    slide.text
                );

                finalSlides.push({
                    text: slide.text,
                    imagePrompt: slide.imagePrompt,
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
        }

        /**
         * ======================================
         * 🔵 ALL OTHER PLATFORMS
         * ======================================
         */
        else {
            entry.outputs[platform] = {
                content: normalizeContent(raw.content),
                explanation: normalizeContent(raw.explanation),
                score: normalizeScore(raw.score),
                feedback: normalizeFeedback(raw.feedback)
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
        console.error('❌ Generation error:', err);
        res.status(500).json({ error: 'Failed to generate content' });
    }
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
