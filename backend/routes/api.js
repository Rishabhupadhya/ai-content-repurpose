const express = require('express');
const router = express.Router();
const { scrapeBlog } = require('../services/scraper');
const ai = require('../services/ai');
const { suggestPostTimes } = require('../services/scheduler');
const Content = require('../models/Content');

/**
 * AI Content Repurposer API - Open-Source Workflow
 */

// 1. Ingest: Scrape blog or accept text
router.post('/ingest', async (req, res) => {
    try {
        const { url, rawText, targetAudience } = req.body;
        let title, content;

        if (url) {
            const scraped = await scrapeBlog(url);
            title = scraped.title;
            content = scraped.content;
        } else {
            title = "Raw Content Input";
            content = rawText;
        }

        const newEntry = new Content({
            originalUrl: url,
            originalText: rawText,
            cleanContent: content,
            title: title,
            targetAudience: targetAudience || 'General'
        });

        await newEntry.save();
        res.json({ id: newEntry._id, title, content });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Generate: Create all platform-specific outputs
router.post('/generate', async (req, res) => {
    try {
        const { id } = req.body;
        const contentEntry = await Content.findById(id);
        if (!contentEntry) return res.status(404).json({ error: 'Content not found' });

        const content = contentEntry.cleanContent;
        const audience = contentEntry.targetAudience;

        // Parallel Generation using Open-Source Models
        const [linkedin, instagram, twitter, newsletter, seo] = await Promise.all([
            ai.generateLinkedIn(content, audience),
            ai.generateInstagram(content, audience),
            ai.generateTwitter(content, audience),
            ai.generateNewsletter(content, audience),
            ai.generateSEO(content)
        ]);

        // Heuristic Scoring & Optimization Logic
        const applyHeuristics = (output, platform) => {
            let score = output.score || 70;
            let feedback = output.feedback || [];

            // Transparent scoring rules
            if (output.content?.includes('?') || output.thread?.[output.thread.length - 1]?.includes('?')) {
                score += 15;
                feedback.push("+15: Discussion question detected (High engagement trigger)");
            }
            if (platform === 'instagram') {
                score += 10;
                feedback.push("+10: Carousel format optimized for saves");
            }

            return { ...output, score: Math.min(score, 100), feedback };
        };

        contentEntry.outputs = {
            linkedin: applyHeuristics(linkedin, 'linkedin'),
            instagram: applyHeuristics(instagram, 'instagram'),
            twitter: applyHeuristics(twitter, 'twitter'),
            newsletter: applyHeuristics(newsletter, 'newsletter'),
            seo
        };

        // Suggest times based on IST heuristics
        contentEntry.scheduling = {
            linkedin: suggestPostTimes('linkedin'),
            instagram: suggestPostTimes('instagram'),
            twitter: suggestPostTimes('twitter'),
            newsletter: suggestPostTimes('newsletter')
        };

        await contentEntry.save();
        res.json(contentEntry);
    } catch (error) {
        console.error('Generation failure:', error);
        res.status(500).json({ error: "Failed to generate content. Ensure AI model is connected." });
    }
});

router.get('/content/:id', async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);
        res.json(content);
    } catch (error) {
        res.status(404).json({ error: 'Data not found' });
    }
});

module.exports = router;
