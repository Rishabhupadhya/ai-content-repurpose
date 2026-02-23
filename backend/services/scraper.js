/**
 * ======================================
 * 🕷️  BLOG SCRAPER
 * ======================================
 * Fixes applied:
 *  1. Better content extraction with length scoring (picks longest match)
 *  2. Cleans up excessive whitespace and encoding artifacts
 *  3. More specific error messages for common failure modes
 *  4. Added max content length cap (100k chars) to prevent oversized payloads
 */

const axios = require('axios');
const cheerio = require('cheerio');

// How much content to return (Gemini handles up to 100k chars easily)
const MAX_CONTENT_LENGTH = 100000;

const scrapeBlog = async (url) => {
    try {
        const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;

        const { data } = await axios.get(normalizedUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
            },
            timeout: 20000,
            maxRedirects: 5,
            validateStatus: (s) => s >= 200 && s < 400,
            maxContentLength: 10 * 1024 * 1024, // 10MB max page size
        });

        const $ = cheerio.load(data);

        // ── Remove noise ─────────────────────────────────────────────────────
        $(
            'script, style, noscript, iframe, ' +
            '[role="navigation"], nav, footer, header, aside, ' +
            '.nav, .navbar, .navigation, ' +
            '.footer, .site-footer, ' +
            '.header, .site-header, ' +
            '.sidebar, .side-bar, ' +
            '.ads, .advertisement, .ad-unit, .adsbygoogle, ' +
            '.cookie-notice, .popup, .modal, ' +
            '.social-share, .share-buttons, ' +
            '.related-posts, .recommended, ' +
            '.comments, .comment-section, #comments'
        ).remove();

        // ── Extract title ─────────────────────────────────────────────────────
        const title = (
            $('h1').first().text().trim() ||
            $('article h1').first().text().trim() ||
            $('meta[property="og:title"]').attr('content') ||
            $('title').text().trim() ||
            'Untitled'
        ).replace(/\s+/g, ' ').trim();

        // ── Extract content — pick the selector with the most text ────────────
        const selectors = [
            'article',
            '[role="article"]',
            '.post-content', '.post-body', '.post_content', '.post__content',
            '.entry-content', '.entry-body', '.entry__content',
            '.article-content', '.article-body', '.article__body', '.article__content',
            '.blog-post', '.blog-post__content', '.blog-content',
            '.content-body', '.page-content',
            '.markdown-body', '.prose', '.rich-text',
            'main[role="main"]', 'main',
            '.main-content', '#main-content',
            '.content', '#content',
            '#main', '#article',
        ];

        let bestContent = '';
        let bestLength = 0;

        for (const sel of selectors) {
            const el = $(sel).first();
            const text = el.text().trim();
            if (el.length && text.length > bestLength) {
                bestContent = text;
                bestLength = text.length;
            }
        }

        // Fallback to full body if nothing useful found
        if (bestLength < 100) {
            bestContent = $('body').text();
        }

        // ── Clean the text ────────────────────────────────────────────────────
        const cleaned = bestContent
            .replace(/\t/g, ' ')                    // tabs → spaces
            .replace(/[ \t]{2,}/g, ' ')             // collapse inline whitespace
            .replace(/\n{3,}/g, '\n\n')             // max 2 consecutive newlines
            .replace(/^\s+|\s+$/gm, '')             // trim each line
            .replace(/[^\S\n]+/g, ' ')              // collapse non-newline whitespace
            .trim()
            .slice(0, MAX_CONTENT_LENGTH);

        if (cleaned.length < 50) {
            throw new Error(
                'Could not extract enough content from this URL. ' +
                'The page may be JavaScript-rendered or behind a login. ' +
                'Try pasting the text directly instead.'
            );
        }

        console.log(`✅ Scraped: "${title}" (${cleaned.length} chars)`);

        return { title, content: cleaned };

    } catch (error) {
        // Surface clean error messages to the frontend
        if (error.response?.status === 404) throw new Error('Page not found (404). Check the URL.');
        if (error.response?.status === 403) throw new Error('Access denied (403). The site blocks scrapers.');
        if (error.response?.status === 401) throw new Error('Authentication required (401). The page is behind a login.');
        if (error.response?.status >= 500) throw new Error(`Server error on target site (${error.response.status}). Try again later.`);
        if (error.code === 'ENOTFOUND') throw new Error('Could not resolve the URL. Check that the link is correct.');
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') throw new Error('Request timed out. The site may be slow — try again.');
        if (error.code === 'ECONNREFUSED') throw new Error('Connection refused. The site may be down.');

        console.error('❌ Scraping error:', error.message);
        throw new Error(error.message || 'Failed to scrape the provided URL');
    }
};

module.exports = { scrapeBlog };