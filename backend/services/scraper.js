const axios = require('axios');
const cheerio = require('cheerio');

const scrapeBlog = async (url) => {
    try {
        const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
        const { data } = await axios.get(normalizedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9'
            },
            timeout: 15000,
            maxRedirects: 5,
            validateStatus: (s) => s >= 200 && s < 400
        });
        const $ = cheerio.load(data);

        // Remove non-content
        $('script, style, noscript, iframe, [role="navigation"], nav, footer, header, aside, .nav, .footer, .header, .sidebar, .ads, .advertisement').remove();

        const title = ($('h1').first().text() || $('article h1').first().text() || $('title').text() || 'Untitled').trim();

        // Broad selectors for blog/article content (order matters)
        const selectors = [
            'article',
            '[role="article"]',
            '.post-content', '.post-body', '.post_content',
            '.entry-content', '.entry-body',
            '.article-content', '.article-body', '.article__body',
            'main',
            '.content', '.main-content', '#content',
            '.blog-post', '.blog-post__content',
            '.markdown-body', '.prose',
            '#main', '#article'
        ];

        let content = '';
        for (const sel of selectors) {
            const el = $(sel).first();
            if (el.length && el.text().trim().length > 100) {
                content = el.text();
                break;
            }
        }

        if (!content || content.trim().length < 50) {
            content = $('body').text();
        }

        const cleaned = content
            .replace(/\s+/g, ' ')
            .replace(/\n\s*\n/g, '\n\n')
            .trim();

        if (cleaned.length < 30) {
            throw new Error('Could not extract enough content from this URL. Try pasting the text directly.');
        }

        return {
            title: title || 'Scraped Content',
            content: cleaned
        };
    } catch (error) {
        if (error.response?.status === 404) throw new Error('URL not found (404)');
        if (error.code === 'ENOTFOUND') throw new Error('Could not resolve URL. Check the link.');
        if (error.code === 'ECONNABORTED') throw new Error('Request timed out. Try again.');
        console.error('Scraping error:', error.message);
        throw new Error(error.message || 'Failed to scrape the provided URL');
    }
};

module.exports = { scrapeBlog };
