const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config();

const AI_MODEL_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const AI_MODEL_NAME = 'gemini-2.5-flash';
const AI_API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * ======================================
 * 🧠 THE ARCHITECT'S FACT BUFFER (CACHING)
 * ======================================
 */
const FactCache = new Map();

const getHash = (content) => crypto.createHash('sha256').update(content).digest('hex');

/**
 * ======================================
 * 🔒 SAFE JSON EXTRACTION + CLEANING
 * ======================================
 */
const extractJSON = (text) => {
    if (!text) return null;

    // First, try to find a JSON block wrapped in triple backticks
    const markdownMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
        return markdownMatch[1];
    }

    // Otherwise, find the first '{' and last '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');

    if (start !== -1 && end !== -1 && end > start) {
        return text.slice(start, end + 1);
    }

    return text;
};

const sanitizeJSONString = (json) => {
    if (!json) return "";
    // Remove potential control characters and fix common malformations
    return json
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
        .replace(/,\s*([\]}])/g, '$1'); // Remove trailing commas
};

const repairJSON = (json) => {
    if (!json) return "";
    let cleaned = json.trim();

    // Count brackets and quotes
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escaped = false;

    for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') inString = !inString;
        if (inString) continue;
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
    }

    // Fix truncated strings
    if (inString) cleaned += '"';

    // Fix truncated arrays and objects
    while (openBrackets > 0) { cleaned += ']'; openBrackets--; }
    while (openBraces > 0) { cleaned += '}'; openBraces--; }

    return cleaned;
};

const safeParseJSON = (raw) => {
    let cleaned = extractJSON(raw);
    if (!cleaned) throw new Error('No JSON object found');

    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // Try repairing the JSON (e.g. if truncated)
        const repaired = repairJSON(cleaned);
        try {
            return JSON.parse(repaired);
        } catch (inner) {
            // Try sanitization + repair
            const sanitized = sanitizeJSONString(repaired);
            try {
                return JSON.parse(sanitized);
            } catch (finalError) {
                console.error(`❌ Parse failed. Length: ${raw.length}. Snippet: ${raw.substring(0, 100)}...`);
                throw new Error('JSON parsing failed even after repair and sanitization');
            }
        }
    }
};

/**
 * ======================================
 * 🔧 NORMALIZATION
 * ======================================
 */
const normalizeText = (v) => Array.isArray(v) ? v.join('\n\n') : (typeof v === 'string' ? v : JSON.stringify(v || ''));

/**
 * ======================================
 * 🏗️ STAGE 1: FACT EXTRACTION (DETERMINISTIC)
 * ======================================
 */
const extractFacts = async (content) => {
    // Gemini can handle 1M+ tokens, so we only truncate for Groq/Llama or if explicitly requested
    const isGemini = AI_MODEL_NAME.toLowerCase().includes('gemini');
    const truncatedContent = isGemini ? content.slice(0, 100000) : content.slice(0, 15000);
    const hash = getHash(truncatedContent);
    if (FactCache.has(hash)) return FactCache.get(hash);

    console.log("🏗️ Stage 1: Extracting deterministic facts (length:", truncatedContent.length, ")...");
    const prompt = `Extract every standalone fact, statistic, claim, and core message from the content below.
Return ONLY valid JSON. No conversational text.

{
  "facts": ["list of strings"],
  "statistics": ["list of strings"],
  "core_claims": ["list of strings"]
}`;

    const headers = AI_API_KEY ? { 'Authorization': `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' } : {};

    const body = {
        model: AI_MODEL_NAME,
        messages: [
            { role: 'system', content: 'You are a precision data extraction engine. You MUST respond with ONLY valid JSON and nothing else.' },
            { role: 'user', content: `${prompt}\n\nCONTENT:\n${truncatedContent}` }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
    };

    // Use Ollama options ONLY if no API key is present
    if (!AI_API_KEY) {
        body.options = { num_ctx: 16384, num_predict: 2048 };
    } else {
        body.max_tokens = 2048;
    }

    try {
        const response = await axios.post(AI_MODEL_ENDPOINT, body, { headers, timeout: 60000 });
        const raw = response.data?.choices?.[0]?.message?.content || response.data?.message?.content;

        if (!raw) throw new Error('Empty response from Stage 1');

        const parsed = safeParseJSON(raw);

        const pruned = {
            facts: (parsed.facts || []).slice(0, 25),
            statistics: (parsed.statistics || []).slice(0, 25),
            core_claims: (parsed.core_claims || []).slice(0, 25)
        };

        FactCache.set(hash, pruned);
        return pruned;
    } catch (err) {
        console.error('❌ Stage 1 Fact Extraction Failure:', err.response?.data || err.message);
        // Fallback: Return empty but valid facts so Stage 2 can at least try to proceed
        return {
            facts: ["Content was provided but precise fact extraction failed."],
            statistics: [],
            core_claims: ["AI reprocessing required"]
        };
    }
};

/**
 * ======================================
 * 🎨 STAGE 2: STYLISTIC GENERATION
 * ======================================
 */
const callSynthesizer = async (facts, platformPrompt) => {
    try {
        console.log("🎨 Stage 2: Generating stylistic variation...");
        const headers = AI_API_KEY ? { 'Authorization': `Bearer ${AI_API_KEY}`, 'Content-Type': 'application/json' } : {};

        const body = {
            model: AI_MODEL_NAME,
            messages: [
                { role: 'system', content: 'You are an expert social media strategist. Output MUST be valid JSON.' },
                { role: 'user', content: `${platformPrompt}\n\nIMPORTANT: Use ONLY the following facts. DO NOT invent numbers.\nSOURCE FACTS:\n${JSON.stringify(facts)}` }
            ],
            temperature: 0.7,
            top_p: 0.9,
            response_format: { type: 'json_object' }
        };

        // Use Ollama options ONLY if no API key is present
        if (!AI_API_KEY) {
            body.options = { num_ctx: 10240, num_predict: 4096 };
        } else {
            body.max_tokens = 4096;
        }

        const response = await axios.post(AI_MODEL_ENDPOINT, body, { headers, timeout: 90000 });
        const raw = response.data?.choices?.[0]?.message?.content || response.data?.message?.content;

        if (!raw || raw.trim() === '') {
            throw new Error('Empty response from LLM');
        }

        return safeParseJSON(raw);
    } catch (err) {
        console.error('❌ Stage 2 Failure:', err.message);
        if (err.response) {
            console.error('❌ Stage 2 Response Data:', JSON.stringify(err.response.data, null, 2));
        }

        // Final fallback if parsing fails - return a safe object
        return {
            error: true,
            content: "The AI was unable to structure the output. Please try again with a shorter input.",
            thread: ["The AI was unable to structure the output. Please try again."],
            slides: [{ text: "Error generating content", imagePrompt: "" }],
            score: 0,
            feedback: ["Generation or Parsing failed"]
        };
    }
};

/**
 * ======================================
 * 🚀 PLATFORM EXPORTS
 * ======================================
 */
const generateLinkedIn = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts, `Create a professional LinkedIn post for ${audience}. 
Length: ~400 words. Strong hook. Story-driven.

Return JSON EXACTLY: 
{ 
  "content": "Full post text with markdown", 
  "explanation": "Why this works", 
  "score": 90, 
  "feedback": [
    "Strictly 3-5 specific, actionable tips to improve this specific post's performance on LinkedIn",
    "Analyze why the hook works or how to make it sharper",
    "Suggest a specific media/image strategy for this content"
  ] 
}`);
};

const generateTwitter = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts, `Create a high-value Twitter thread for ${audience}. 
RULES:
- Split content into 6-10 VERY SHORT tweets.
- Each tweet MUST be under 180 characters for maximum engagement.
- NO internal double quotes.
- Start with a hook, end with a question.

Return JSON EXACTLY: 
{ 
  "thread": ["tweet 1", "tweet 2", ...], 
  "explanation": "Strategy description", 
  "score": 85, 
  "feedback": [
    "Strictly 3-5 specific, actionable tips to make this thread go viral",
    "Analyze the conversion potential of the final tweet",
    "Best posting time and hashtag strategy for this specific topic"
  ] 
}`);
};

const generateInstagram = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts, `Create an Instagram carousel (6-8 slides) for ${audience}.

Return JSON EXACTLY: 
{ 
  "slides": [
    { "text": "Slide text", "imagePrompt": "Image description" }
  ], 
  "explanation": "Visual strategy", 
  "score": 80, 
  "feedback": [
    "Strictly 3-5 specific design tips for these slides",
    "Recommended trending audio style or Reel transition strategy",
    "Bio/Caption engagement tactic for this specific topic"
  ] 
}`);
};

const generateNewsletter = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts, `Create a comprehensive, professional newsletter for ${audience}.
REQUIREMENTS:
- AIM FOR ~400 WORDS of high-quality content.
- Structure: Catchy Subject Line, Hook introduction, Detailed body, Key Takeaways, CTA.

Return JSON EXACTLY: 
{ 
  "content": "Full detailed newsletter markdown", 
  "explanation": "Brief strategy summary", 
  "score": 85, 
  "feedback": [
    "Strictly 3-5 specific tips to improve open rates and click-through specifically for this newsletter",
    "Subject line A/B testing suggestion",
    "CTA placement and wording analysis"
  ] 
}`);
};

const generateSEO = async (content) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts, `Generate high-performing SEO metadata.
REQUIREMENTS:
- Title, Meta Description, Keywords (10-15).

Return JSON EXACTLY: 
{ 
  "title": "Optimized Title", 
  "metaDescription": "Detailed meta description", 
  "keywords": ["keyword1", "keyword2", ...], 
  "explanation": "Brief strategy summary", 
  "score": 95, 
  "feedback": [
    "Strictly 3-5 specific technical and content-based SEO improvements",
    "Analyze keyword competition for this specific set",
    "Internal linking and authority building strategy for this topic"
  ] 
}`);
};

module.exports = {
    generateLinkedIn,
    generateInstagram,
    generateTwitter,
    generateNewsletter,
    generateSEO,
    AI_MODEL_NAME,
    AI_MODEL_ENDPOINT
};
