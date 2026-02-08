const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

/**
 * ======================================
 * AI Content Generation Service
 * Robust against malformed LLM JSON
 * ======================================
 */

const AI_MODEL_ENDPOINT =
    process.env.AI_MODEL_ENDPOINT || 'http://localhost:11434/v1/chat/completions';

const AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'mistral';

const SYSTEM_PROMPT = `
You are an expert social media strategist and content repurposer.

CRITICAL RULES:
- Output ONLY valid JSON
- Do NOT include markdown
- Do NOT include explanations outside JSON
- Escape all newlines as \\n
- Strings ONLY inside quotes
`;

/**
 * ======================================
 * 🔒 SAFE JSON EXTRACTION + CLEANING
 * ======================================
 */

// Extract first valid JSON object from text
const extractJSON = (text) => {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    return text.slice(start, end + 1);
};

// Escape illegal characters inside JSON strings
const sanitizeJSONString = (json) => {
    let result = '';
    let inString = false;
    let escaped = false;

    for (let i = 0; i < json.length; i++) {
        const char = json[i];

        if (escaped) {
            result += char;
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            result += char;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            result += char;
            continue;
        }

        if (inString) {
            if (char === '\n') result += '\\n';
            else if (char === '\r') result += '\\r';
            else if (char === '\t') result += '\\t';
            else result += char;
        } else {
            result += char;
        }
    }

    return result;
};

// Final safe JSON parse
const safeParseJSON = (raw) => {
    const extracted = extractJSON(raw);
    if (!extracted) throw new Error('No JSON object found in LLM output');

    const sanitized = sanitizeJSONString(extracted);
    return JSON.parse(sanitized);
};

/**
 * ======================================
 * 🔧 DEEP NORMALIZATION (CRITICAL)
 * ======================================
 */

const normalizeText = (v) => {
    if (Array.isArray(v)) return v.join('\n\n');
    if (typeof v === 'string') return v;
    if (v === null || v === undefined) return '';
    return JSON.stringify(v);
};

const normalizeScore = (score) => {
    if (typeof score === 'number') return Math.min(Math.max(score, 0), 100);

    if (Array.isArray(score)) {
        const n = score.find((v) => typeof v === 'number');
        return n ?? 70;
    }

    if (typeof score === 'object' && score !== null) {
        const nums = Object.values(score).filter((v) => typeof v === 'number');
        if (!nums.length) return 70;
        return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    }

    if (typeof score === 'string') {
        const parsed = parseInt(score, 10);
        return isNaN(parsed) ? 70 : parsed;
    }

    return 70;
};

const normalizeFeedback = (f) => {
    if (Array.isArray(f)) {
        return f.flat().map((x) => normalizeText(x));
    }
    if (typeof f === 'string') return [f];
    return [];
};

/**
 * ======================================
 * 🤖 CORE LLM CALL
 * ======================================
 */

const callLLM = async (prompt) => {
    try {
        const response = await axios.post(AI_MODEL_ENDPOINT, {
            model: AI_MODEL_NAME,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ],
            temperature: 0.7,
            stream: false
        });

        const raw =
            response.data?.choices?.[0]?.message?.content ||
            response.data?.message?.content;

        const parsed = safeParseJSON(raw);

        // 🔥 NORMALIZE ONLY EXISTING FIELDS
        const output = {};

        if (parsed.content !== undefined)
            output.content = normalizeText(parsed.content);

        if (parsed.slides !== undefined)
            output.slides = Array.isArray(parsed.slides)
                ? parsed.slides.map(normalizeText)
                : [];

        if (parsed.thread !== undefined)
            output.thread = Array.isArray(parsed.thread)
                ? parsed.thread.map(normalizeText)
                : [];

        if (parsed.explanation !== undefined)
            output.explanation = normalizeText(parsed.explanation);

        if (parsed.score !== undefined)
            output.score = normalizeScore(parsed.score);

        if (parsed.feedback !== undefined)
            output.feedback = normalizeFeedback(parsed.feedback);

        if (parsed.title !== undefined)
            output.title = normalizeText(parsed.title);

        if (parsed.metaDescription !== undefined)
            output.metaDescription = normalizeText(parsed.metaDescription);

        if (parsed.keywords !== undefined)
            output.keywords = Array.isArray(parsed.keywords)
                ? parsed.keywords.map(normalizeText)
                : [];

        return output;

    } catch (err) {
        console.error('❌ LLM JSON FAILURE');
        console.error(err.message);

        return {
            error: true,
            explanation: 'LLM returned invalid JSON',
            score: 0,
            feedback: ['Parsing failed']
        };
    }
};


/**
 * ======================================
 * PLATFORM GENERATORS
 * ======================================
 */

const generateLinkedIn = async (content, audience) =>
    callLLM(`
Repurpose this blog for LinkedIn.

Audience: ${audience}

Requirements:
- Strong hook
- Story-driven
- Ends with a question

Return JSON:
{
  "content": string | array,
  "explanation": string | array,
  "score": number | object,
  "feedback": array
}

Content:
${content}
`);

const generateInstagram = async (content, audience) =>
    callLLM(`
Repurpose this blog for an Instagram carousel (6–8 slides).

Audience: ${audience}

Return JSON:
{
  "slides": array,
  "explanation": string | array,
  "score": number | object,
  "feedback": array
}

Content:
${content}
`);

const generateTwitter = async (content, audience) =>
    callLLM(`
Repurpose this blog for a Twitter/X thread.

Audience: ${audience}

Return JSON:
{
  "thread": array,
  "explanation": string | array,
  "score": number | object,
  "feedback": array
}

Content:
${content}
`);

const generateNewsletter = async (content, audience) =>
    callLLM(`
Repurpose this blog for a newsletter.

Audience: ${audience}

Return JSON:
{
  "content": string | array,
  "explanation": string | array,
  "score": number | object,
  "feedback": array
}

Content:
${content}
`);

const generateSEO = async (content) =>
    callLLM(`
Generate SEO metadata.

Return JSON:
{
  "title": string,
  "metaDescription": string,
  "keywords": array,
  "explanation": string
}

Content:
${content}
`);

module.exports = {
    generateLinkedIn,
    generateInstagram,
    generateTwitter,
    generateNewsletter,
    generateSEO
};
