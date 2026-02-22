const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config();

const AI_MODEL_ENDPOINT = process.env.AI_MODEL_ENDPOINT || 'http://localhost:11434/v1/chat/completions';
const AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'mistral';

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
    let inString = false, escaped = false, depth = 0, start = -1;
    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (escaped) { escaped = false; continue; }
        if (char === '\\') { escaped = true; continue; }
        if (char === '"') { inString = !inString; continue; }
        if (inString) continue;
        if (char === '{') { if (depth === 0) start = i; depth++; }
        else if (char === '}') { if (depth > 0) { depth--; if (depth === 0 && start !== -1) return text.slice(start, i + 1); } }
    }
    return null;
};

const sanitizeJSONString = (json) => {
    let result = '', inString = false, escaped = false;
    for (let i = 0; i < json.length; i++) {
        const char = json[i];
        if (char === '"' && !escaped) { inString = !inString; result += char; continue; }
        if (inString) {
            if (escaped) {
                if (!'btnfru"/\\'.includes(char)) result = result.slice(0, -1) + '\\\\' + char;
                else result += char;
                escaped = false;
            } else if (char === '\\') { escaped = true; result += char; }
            else if (char === '\n') result += '\\n';
            else result += char;
        } else result += char;
    }
    return result;
};

const safeParseJSON = (raw) => {
    let cleaned = extractJSON(raw);
    if (!cleaned) throw new Error('No JSON object found');
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
    const sanitized = sanitizeJSONString(cleaned);
    try {
        return JSON.parse(sanitized);
    } catch (e) {
        console.error('Parse failed, snippet:', raw.substring(0, 100));
        throw e;
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
    const hash = getHash(content);
    if (FactCache.has(hash)) return FactCache.get(hash);

    console.log("🏗️ Stage 1: Extracting deterministic facts...");
    const prompt = `Extract every standalone fact, statistic, claim, and core message from the blog below.
Do NOT summarize. Do NOT rephrase. Keep numbers with their context.

Return ONLY a JSON object:
{
  "facts": ["fact 1", "fact 2", ...],
  "statistics": ["stat 1", ...],
  "core_claims": ["claim 1", ...]
}`;

    const response = await axios.post(AI_MODEL_ENDPOINT, {
        model: AI_MODEL_NAME,
        messages: [
            { role: 'system', content: 'You are a precision data extraction engine. Output ONLY valid JSON.' },
            { role: 'user', content: `${prompt}\n\nCONTENT:\n${content}` }
        ],
        temperature: 0,
        response_format: { type: 'json_object' },
        options: {
            num_ctx: 16384, // High context for facts
            num_predict: 2048,
            top_p: 0.1
        }
    });

    const raw = response.data?.choices?.[0]?.message?.content || response.data?.message?.content;
    const parsed = safeParseJSON(raw);
    FactCache.set(hash, parsed);
    return parsed;
};

/**
 * ======================================
 * 🎨 STAGE 2: STYLISTIC GENERATION
 * ======================================
 */
const callSynthesizer = async (facts, platformPrompt) => {
    try {
        console.log("🎨 Stage 2: Generating stylistic variation...");
        const response = await axios.post(AI_MODEL_ENDPOINT, {
            model: AI_MODEL_NAME,
            messages: [
                { role: 'system', content: 'You are an expert social media strategist. Output MUST be valid JSON.' },
                { role: 'user', content: `${platformPrompt}\n\nIMPORTANT: Use ONLY the following facts. DO NOT invent numbers.\nSOURCE FACTS:\n${JSON.stringify(facts)}` }
            ],
            temperature: 0.7,
            top_p: 0.9,
            response_format: { type: 'json_object' },
            options: {
                num_ctx: 8192,
                num_predict: 2048
            }
        });

        const raw = response.data?.choices?.[0]?.message?.content || response.data?.message?.content;

        if (!raw || raw.trim() === '') {
            throw new Error('Empty response from LLM');
        }

        return safeParseJSON(raw);
    } catch (err) {
        console.error('❌ Stage 2 Failure:', err.message);

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
    generateSEO
};
