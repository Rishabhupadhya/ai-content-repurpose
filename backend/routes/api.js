const express = require('express');
const router = express.Router();
const { scrapeBlog } = require('../services/scraper');
const ai = require('../services/ai');
const { suggestPostTimes } = require('../services/scheduler');
const Content = require('../models/Content');

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

// 2. Generate: Create all outputs
router.post('/generate', async (req, res) => {
    try {
        const { id } = req.body;
        const contentEntry = await Content.findById(id);
        if (!contentEntry) return res.status(404).json({ error: 'Content not found' });

        const content = contentEntry.cleanContent;
        const audience = contentEntry.targetAudience;

        // Run generations in parallel
        const [linkedin, instagram, twitter, newsletter, seo] = await Promise.all([
            ai.generateLinkedIn(content, audience),
            ai.generateInstagram(content, audience),
            ai.generateTwitter(content, audience),
            ai.generateNewsletter(content, audience),
            ai.generateSEO(content)
        ]);

        contentEntry.outputs = { linkedin, instagram, twitter, newsletter, seo };

        // 3. Suggest times
        contentEntry.scheduling = {
            linkedin: suggestPostTimes('linkedin'),
            instagram: suggestPostTimes('instagram'),
            twitter: suggestPostTimes('twitter'),
            newsletter: suggestPostTimes('newsletter')
        };

        await contentEntry.save();
        res.json(contentEntry);
    } catch (error) {
        console.error('Generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get content by ID
router.get('/content/:id', async (req, res) => {
    try {
        const content = await Content.findById(req.params.id);
        res.json(content);
    } catch (error) {
        res.status(404).json({ error: 'Not found' });
    }
});

module.exports = router;
