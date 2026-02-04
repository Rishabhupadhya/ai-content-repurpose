const axios = require('axios');
const cheerio = require('cheerio');

const scrapeBlog = async (url) => {
    try {
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        const $ = cheerio.load(data);

        // Basic cleaning logic
        $('script, style, nav, footer, header, ads').remove();

        const title = $('h1').first().text() || $('title').text();
        let content = '';

        // Attempt to find main content
        const selectors = ['article', '.post-content', '.entry-content', 'main', '#content'];
        for (const selector of selectors) {
            if ($(selector).length) {
                content = $(selector).text();
                break;
            }
        }

        if (!content) {
            content = $('body').text();
        }

        return {
            title: title.trim(),
            content: content.replace(/\s\s+/g, ' ').trim()
        };
    } catch (error) {
        console.error('Scraping error:', error);
        throw new Error('Failed to scrape the provided URL');
    }
};

module.exports = { scrapeBlog };
