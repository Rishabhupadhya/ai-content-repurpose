const express = require('express');
const router = express.Router();

const { scrapeBlog } = require('../services/scraper');
const ai = require('../services/ai');
const { suggestPostTimes } = require('../services/scheduler');
const Content = require('../models/Content');

// ─── Optional image services (won't crash if not configured) ──────────────────
let generateImage = null;
let composeInstagramSlide = null;

try {
    ({ generateImage } = require('../services/imagegenerator'));
} catch (e) {
    console.warn('⚠️  imagegenerator service not found — Instagram images will use fallback');
}

try {
    ({ composeInstagramSlide } = require('../services/composeInstagramSlide'));
} catch (e) {
    console.warn('⚠️  composeInstagramSlide service not found — using raw image URLs');
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

const normalizeContent = (value) => {
    if (!value && value !== 0) return '';
    if (Array.isArray(value)) return value.join('\n\n');
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
};

const normalizeScore = (score) => {
    if (typeof score === 'number' && !isNaN(score)) {
        return Math.min(Math.max(Math.round(score), 0), 100);
    }
    if (typeof score === 'object' && score !== null) {
        const values = Object.values(score).filter((v) => typeof v === 'number');
        return values.length
            ? Math.min(Math.max(Math.round(values.reduce((a, b) => a + b, 0) / values.length), 0), 100)
            : 70;
    }
    if (typeof score === 'string') {
        const parsed = parseInt(score, 10);
        return isNaN(parsed) ? 70 : Math.min(Math.max(parsed, 0), 100);
    }
    return 70;
};

const normalizeFeedback = (feedback) => {
    if (Array.isArray(feedback)) return feedback.map(String).filter(Boolean);
    if (typeof feedback === 'string' && feedback) return [feedback];
    return [];
};

// ─── 1. INGEST ────────────────────────────────────────────────────────────────

router.post('/ingest', async (req, res) => {
    try {
        const { url, rawText, targetAudience } = req.body;

        if (!url && !rawText) {
            return res.status(400).json({
                error: 'Provide either a url or rawText',
                code: 'MISSING_INPUT',
            });
        }

        let title = 'Raw Content';
        let content = rawText;

        if (url) {
            try {
                const scraped = await scrapeBlog(url);
                title = scraped.title || 'Scraped Content';
                content = scraped.content;
            } catch (scrapeErr) {
                return res.status(422).json({
                    error: `Failed to scrape URL: ${scrapeErr.message}`,
                    code: 'SCRAPE_FAILED',
                });
            }
        }

        if (!content || typeof content !== 'string' || content.trim().length < 10) {
            return res.status(400).json({
                error: 'Content is empty or too short',
                code: 'INSUFFICIENT_CONTENT',
            });
        }

        const entry = await Content.create({
            originalUrl: url || null,
            originalText: rawText || null,
            cleanContent: content.trim(),
            title,
            targetAudience: targetAudience || 'General',
        });

        console.log(`✅ Ingested content ID: ${entry._id} (${content.length} chars)`);

        res.json({
            id: entry._id,
            title: entry.title,
            contentLength: content.length,
            targetAudience: entry.targetAudience,
        });
    } catch (err) {
        console.error('❌ Ingest error:', err);
        res.status(500).json({
            error: err.message || 'Failed to ingest content',
            code: 'INGEST_ERROR',
        });
    }
});

// ─── 2. GENERATE ──────────────────────────────────────────────────────────────

router.post('/generate', async (req, res) => {
    try {
        const { id, platform } = req.body;

        if (!id || !platform) {
            return res.status(400).json({
                error: 'Missing required fields: id and platform',
                code: 'MISSING_PARAMS',
            });
        }

        const validPlatforms = ['linkedin', 'instagram', 'twitter', 'newsletter', 'seo'];
        if (!validPlatforms.includes(platform)) {
            return res.status(400).json({
                error: `Invalid platform. Must be one of: ${validPlatforms.join(', ')}`,
                code: 'INVALID_PLATFORM',
            });
        }

        const entry = await Content.findById(id);
        if (!entry) {
            return res.status(404).json({
                error: 'Content not found. Please ingest first.',
                code: 'NOT_FOUND',
            });
        }

        console.log(`🚀 Generating [${platform}] for ID: ${id}`);

        // ── Call AI ──────────────────────────────────────────────────────────
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
        }

        if (!raw || raw.error) {
            console.error('❌ AI returned error/fallback output');
        }

        entry.outputs = entry.outputs || {};
        entry.scheduling = entry.scheduling || {};

        // ── Platform-specific handling ────────────────────────────────────────

        if (platform === 'instagram') {
            const rawSlides = Array.isArray(raw.slides) ? raw.slides : [];
            const finalSlides = [];

            for (const slide of rawSlides) {
                const text =
                    typeof slide === 'string'
                        ? slide
                        : typeof slide?.text === 'string'
                            ? slide.text
                            : '';
                const imagePrompt =
                    typeof slide === 'object' && slide !== null
                        ? slide.imagePrompt || ''
                        : '';

                let imageUrl = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop';
                let finalImage = imageUrl;

                if (generateImage && imagePrompt) {
                    try {
                        imageUrl = await generateImage(imagePrompt);
                        finalImage = composeInstagramSlide
                            ? await composeInstagramSlide(imageUrl, text)
                            : imageUrl;
                    } catch (imgErr) {
                        console.warn('⚠️  Slide image generation failed:', imgErr.message);
                        // finalImage stays as fallback
                    }
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
                metaDescription: normalizeContent(
                    raw.metaDescription || raw.MetaDescription || raw.meta_description || ''
                ),
                keywords: Array.isArray(raw.keywords || raw.Keywords)
                    ? (raw.keywords || raw.Keywords).map(String)
                    : [],
                explanation: normalizeContent(raw.explanation || raw.Explanation || ''),
                score: normalizeScore(raw.score ?? raw.Score),
                feedback: normalizeFeedback(raw.feedback || raw.Feedback),
            };

        } else if (platform === 'twitter') {
            const thread = Array.isArray(raw.thread)
                ? raw.thread.map(String).filter(Boolean)
                : [];
            entry.outputs.twitter = {
                thread,
                explanation: normalizeContent(raw.explanation),
                score: normalizeScore(raw.score),
                feedback: normalizeFeedback(raw.feedback),
            };

        } else {
            // linkedin + newsletter
            entry.outputs[platform] = {
                content: normalizeContent(
                    raw.content || raw.Content || raw.post || raw.newsletter || ''
                ),
                explanation: normalizeContent(raw.explanation || raw.Explanation || ''),
                score: normalizeScore(raw.score ?? raw.Score),
                feedback: normalizeFeedback(raw.feedback || raw.Feedback),
            };
        }

        // Scheduling (not for SEO)
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
        console.error('❌ Generation error:', {
            message: err.message,
            stack: err.stack?.split('\n').slice(0, 5).join('\n'),
            apiResponse: err.response?.data,
        });
        res.status(500).json({
            error: 'Failed to generate content',
            details: err.message,
            code: 'GENERATION_ERROR',
        });
    }
});

// ─── 3. FETCH SINGLE CONTENT ─────────────────────────────────────────────────

router.get('/content/:id', async (req, res) => {
    try {
        const content = await Content.findById(req.params.id).lean();
        if (!content) {
            return res.status(404).json({ error: 'Content not found', code: 'NOT_FOUND' });
        }
        res.json(content);
    } catch (err) {
        console.error('❌ Fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch content', code: 'FETCH_ERROR' });
    }
});

// ─── 4. LIST RECENT CONTENT ───────────────────────────────────────────────────

router.get('/contents', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const contents = await Content.find()
            .sort({ createdAt: -1 })
            .limit(limit)
            .select('_id title targetAudience createdAt')
            .lean();
        res.json({ contents, count: contents.length });
    } catch (err) {
        console.error('❌ List error:', err);
        res.status(500).json({ error: 'Failed to list content', code: 'LIST_ERROR' });
    }
});

// ─── 5. DELETE CONTENT ────────────────────────────────────────────────────────

router.delete('/content/:id', async (req, res) => {
    try {
        const deleted = await Content.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Content not found', code: 'NOT_FOUND' });
        }
        res.json({ success: true, id: req.params.id });
    } catch (err) {
        console.error('❌ Delete error:', err);
        res.status(500).json({ error: 'Failed to delete content', code: 'DELETE_ERROR' });
    }
});

// ─── 6. DEBUG CONFIG ──────────────────────────────────────────────────────────

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
    });
});

module.exports = router;