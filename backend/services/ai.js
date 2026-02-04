const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

/**
 * AI Content Generation Service - OPEN SOURCE EDITION
 * Uses Llama-3-8B-Instruct via Ollama or Open-Source Inference APIs.
 */

// Default to local Ollama endpoint, but allow override via ENV
const AI_MODEL_ENDPOINT = process.env.AI_MODEL_ENDPOINT || 'http://localhost:11434/v1/chat/completions';
const AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'llama3';

const SYSTEM_PROMPT = `You are an expert social media strategist and content repurposer. 
Your goal is to transform a blog post into highly engaging, platform-specific content. 
You understand the nuances of LinkedIn, Instagram, Twitter/X, and Newsletters.
RESPONSE FORMAT: You MUST return valid JSON. No other text.`;

const cleanJSON = (text) => {
    // 1. Locate the first '{' and last '}'
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        return text; // Return original if no JSON structure found
    }

    const jsonString = text.substring(startIndex, endIndex + 1);

    // 2. State machine to sanitize control characters within strings
    let cleaned = '';
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];

        if (isEscaped) {
            cleaned += char;
            isEscaped = false;
            continue;
        }

        if (char === '\\') {
            isEscaped = true;
            cleaned += char;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            cleaned += char;
            continue;
        }

        if (inString) {
            if (char === '\n') cleaned += '\\n';
            else if (char === '\r') cleaned += '\\r';
            else if (char === '\t') cleaned += '\\t';
            // Preserve other characters
            else cleaned += char;
        } else {
            cleaned += char;
        }
    }

    return cleaned;
};

const callLLM = async (prompt) => {
    try {
        const response = await axios.post(AI_MODEL_ENDPOINT, {
            model: AI_MODEL_NAME,
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: prompt }
            ],
            stream: false,
            format: "json", // Ollama specific JSON mode
            temperature: 0.7
        });

        // Handle both OpenAI-compatible and Ollama-native responses
        const rawContent = response.data.choices
            ? response.data.choices[0].message.content
            : response.data.message.content;

        const cleanContent = cleanJSON(rawContent);

        try {
            return JSON.parse(cleanContent);
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError.message);
            console.error('Raw Content that failed:', rawContent);
            console.error('Cleaned Content that failed:', cleanContent);
            throw parseError; // Re-throw to hit the outer catch or be handled
        }
    } catch (error) {
        console.error('LLM Call Error:', error.message);
        // Fallback logic for demo purposes if LLM is unavailable
        return {
            content: "Error: AI engine unreachable or returned invalid JSON. ensure Ollama is running and model is loaded.",
            error: true,
            details: error.message
        };
    }
};

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

  Return as JSON with keys: "content", "explanation", "score", "feedback" (array of strings).`;

    return await callLLM(prompt);
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
  
  Return as JSON with keys: "slides" (array), "explanation", "score", "feedback" (array).`;

    return await callLLM(prompt);
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
  
  Return as JSON with keys: "thread" (array), "explanation", "score", "feedback" (array).`;

    return await callLLM(prompt);
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
  
  Return as JSON with keys: "content", "explanation", "score", "feedback" (array).`;

    return await callLLM(prompt);
};

const generateSEO = async (content) => {
    const prompt = `Generate SEO metadata for this content.
  Requirements:
  - SEO-optimized title
  - Meta description (max 160 chars)
  - 5-7 keyword suggestions
  - Internal explanation of SEO strategy

  Content: ${content}
  
  Return as JSON with keys: "title", "metaDescription", "keywords" (array), "explanation".`;

    return await callLLM(prompt);
};

module.exports = {
    generateLinkedIn,
    generateInstagram,
    generateTwitter,
    generateNewsletter,
    generateSEO
};
