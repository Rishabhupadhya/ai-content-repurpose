const { OpenAI } = require('openai');
const dotenv = require('dotenv');
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `You are an expert social media strategist and content repurposer. 
Your goal is to transform a blog post into highly engaging, platform-specific content. 
You understand the nuances of LinkedIn, Instagram, Twitter/X, and Newsletters.`;

const generateLinkedIn = async (content, audience) => {
    const prompt = `Repurpose this blog for LinkedIn. 
  Target Audience: ${audience}
  Requirements:
  - Story-driven approach
  - Strong hook in the first 2 lines
  - Professional but conversational tone
  - Ends with a discussion-starting question
  - Internal explanation of why this format works for LinkedIn
  
  Content: ${content}
  
  Return as JSON with "content", "explanation", "score", and "feedback".`;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    // Expected JSON: { "content": "...", "explanation": "...", "score": 85, "feedback": ["..."] }
    return JSON.parse(response.choices[0].message.content);
};

const generateInstagram = async (content, audience) => {
    const prompt = `Repurpose this blog for an Instagram Carousel (6-8 slides).
  Target Audience: ${audience}
  Requirements:
  - Slide 1: Bold hook
  - Slides 2-7: One specific insight or tip per slide
  - Final Slide: CTA to read the full blog
  - High visual focus in descriptions
  - Internal explanation of why this format works for Instagram

  Content: ${content}
  
  Return as JSON with "slides" array, "explanation", "score", and "feedback".`;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
};

const generateTwitter = async (content, audience) => {
    const prompt = `Repurpose this blog for a Twitter/X Thread.
  Target Audience: ${audience}
  Requirements:
  - 1 hook tweet
  - 5-7 short, punchy, value-packed tweets
  - Thread-style formatting
  - Internal explanation of why this format works for Twitter/X

  Content: ${content}
  
  Return as JSON with "thread" array, "explanation", "score", and "feedback".`;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
};

const generateNewsletter = async (content, audience) => {
    const prompt = `Repurpose this blog for a Newsletter.
  Target Audience: ${audience}
  Requirements:
  - Short-form, friendly, and conversational
  - TL;DR at the top
  - Key takeaways summarized
  - Internal explanation of why this format works for Newsletters

  Content: ${content}
  
  Return as JSON with "content", "explanation", "score", and "feedback".`;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
};

const generateSEO = async (content) => {
    const prompt = `Generate SEO metadata for this content.
  Requirements:
  - SEO-optimized title
  - Meta description (max 160 chars)
  - 5-7 keyword suggestions
  - Internal explanation of SEO strategy

  Content: ${content}
  
  Return as JSON with "title", "metaDescription", "keywords" array, and "explanation".`;

    const response = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
};

module.exports = {
    generateLinkedIn,
    generateInstagram,
    generateTwitter,
    generateNewsletter,
    generateSEO
};
