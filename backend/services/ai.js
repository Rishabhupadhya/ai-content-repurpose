const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config({ path: path.join(__dirname, '../.env') });

const AI_MODEL_ENDPOINT = process.env.AI_MODEL_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'gemini-2.5-flash';
const AI_API_KEY = process.env.GEMINI_API_KEY || '';

const getRequestUrl = () => {
    const base = AI_MODEL_ENDPOINT;
    if (!AI_API_KEY) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}key=${encodeURIComponent(AI_API_KEY)}`;
};

/**
 * ======================================
 * 🧠 THE ARCHITECT'S FACT BUFFER (CACHING)
 * ======================================
 */
const FactCache = new Map();

const getHash = (content) => crypto.createHash('sha256').update(content).digest('hex');

/**
 * ======================================
 * 🔒 ROBUST JSON EXTRACTION + PARSING
 * ======================================
 */

// Extract JSON using balanced braces (respects strings so } inside content doesn't break)
function extractJSONBalanced(text) {
    if (!text || typeof text !== 'string') return null;
    const str = text.trim();
    const start = str.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escape = false;
    let quote = null;

    for (let i = start; i < str.length; i++) {
        const c = str[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (c === '\\' && inString) {
            escape = true;
            continue;
        }
        if ((c === '"' || c === "'") && !inString) {
            inString = true;
            quote = c;
            continue;
        }
        if (c === quote && inString) {
            inString = false;
            quote = null;
            continue;
        }
        if (inString) continue;

        if (c === '{') {
            depth++;
        } else if (c === '}') {
            depth--;
            if (depth === 0) return str.slice(start, i + 1);
        }
    }
    return null;
}

// Extract from markdown code block (handles ``` inside JSON by finding last ```)
function extractFromMarkdown(text) {
    const open = text.indexOf('```');
    if (open === -1) return null;
    const afterOpen = text.slice(open + 3).replace(/^json\s*/i, '').trimStart();
    const close = afterOpen.lastIndexOf('```');
    const inner = close === -1 ? afterOpen : afterOpen.slice(0, close).trim();
    return inner || null;
}

const extractJSON = (text) => {
    if (!text) return null;
    const raw = String(text)
        .replace(/^\uFEFF/, '')  // BOM
        .trim();

    // 1. Try markdown block first
    const fromMarkdown = extractFromMarkdown(raw);
    if (fromMarkdown && fromMarkdown.startsWith('{')) return fromMarkdown;

    // 2. Balanced-brace extraction (handles } inside string values)
    const balanced = extractJSONBalanced(raw);
    if (balanced) return balanced;

    // 3. Fallback: first { to last } (legacy, can fail on nested })
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) return raw.slice(start, end + 1);

    return null;
};

// Safe repairs: control chars, trailing commas. Avoid aggressive regex that can corrupt strings.
const sanitizeJSONString = (json) => {
    if (!json) return '';
    return json
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '')  // Keep \t, \n, \r
        .replace(/,(\s*[}\]])/g, '$1');  // Trailing commas only
};

const repairJSON = (json) => {
    if (!json) return '';
    let cleaned = json.trim();

    let openBraces = 0, openBrackets = 0, inString = false, escaped = false, quote = null;

    for (let i = 0; i < cleaned.length; i++) {
        const c = cleaned[i];
        if (escaped) { escaped = false; continue; }
        if ((c === '"' || c === "'") && !inString) { inString = true; quote = c; continue; }
        if (c === quote && inString) { inString = false; quote = null; continue; }
        if (c === '\\' && inString) { escaped = true; continue; }
        if (inString) continue;
        if (c === '{') openBraces++;
        else if (c === '}') openBraces--;
        else if (c === '[') openBrackets++;
        else if (c === ']') openBrackets--;
    }

    if (inString) cleaned += quote || '"';
    while (openBrackets > 0) { cleaned += ']'; openBrackets--; }
    while (openBraces > 0) { cleaned += '}'; openBraces--; }

    return cleaned;
};

const safeParseJSON = (raw) => {
    let cleaned = extractJSON(raw);
    if (!cleaned || !cleaned.trim()) throw new Error('No JSON object found');

    const attempts = [
        () => JSON.parse(cleaned),
        () => JSON.parse(repairJSON(cleaned)),
        () => JSON.parse(sanitizeJSONString(repairJSON(cleaned))),
    ];

    for (let i = 0; i < attempts.length; i++) {
        try {
            return attempts[i]();
        } catch (e) {
            if (i === attempts.length - 1) {
                console.error(`❌ Parse failed. Raw length: ${raw?.length}. Snippet: ${String(raw).substring(0, 200)}...`);
                throw new Error('JSON parsing failed after all repair attempts');
            }
        }
    }
    throw new Error('JSON parsing failed');
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

    const headers = { 'Content-Type': 'application/json' };

    const body = {
        model: AI_MODEL_NAME,
        messages: [
            { role: 'system', content: 'You are a precision data extraction engine. Respond with ONLY valid JSON. No markdown, no explanations, no code fences.' },
            { role: 'user', content: `${prompt}\n\nCONTENT:\n${truncatedContent}` }
        ],
        temperature: 0.05,
        response_format: { type: 'json_object' },
        max_tokens: 2048
    };

    try {
        const response = await axios.post(getRequestUrl(), body, { headers, timeout: 60000 });
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
 * 🎨 STAGE 2: STYLISTIC GENERATION (with retry on parse failure)
 * ======================================
 */
const FALLBACK_OUTPUT = {
    error: true,
    content: "The AI was unable to structure the output. Please try again.",
    thread: ["The AI was unable to structure the output. Please try again."],
    slides: [{ text: "Error generating content", imagePrompt: "" }],
    score: 0,
    feedback: ["Generation or parsing failed. Try again or use shorter input."]
};

const callSynthesizer = async (facts, platformPrompt, retryCount = 0) => {
    const maxRetries = 1;
    try {
        console.log(`🎨 Stage 2: Generating stylistic variation${retryCount ? ` (retry ${retryCount})` : ''}...`);
        const headers = { 'Content-Type': 'application/json' };

        const body = {
            model: AI_MODEL_NAME,
            messages: [
                { role: 'system', content: 'You are an expert social media strategist. Output ONLY valid JSON. No markdown, no explanations, no code fences. Use double quotes for strings. Escape newlines as \\n.' },
                { role: 'user', content: `${platformPrompt}\n\nIMPORTANT: Use ONLY the following facts. DO NOT invent numbers.\nSOURCE FACTS:\n${JSON.stringify(facts)}` }
            ],
            temperature: 0.6,
            top_p: 0.9,
            response_format: { type: 'json_object' },
            max_tokens: 4096
        };

        const response = await axios.post(getRequestUrl(), body, { headers, timeout: 90000 });
        const raw = response.data?.choices?.[0]?.message?.content || response.data?.message?.content;

        if (!raw || String(raw).trim() === '') {
            throw new Error('Empty response from LLM');
        }

        return safeParseJSON(raw);
    } catch (err) {
        const isParseError = err.message && (
            err.message.includes('JSON') ||
            err.message.includes('parsing') ||
            err.message.includes('parse')
        );

        if (isParseError && retryCount < maxRetries) {
            console.warn(`⚠️ Parse failed, retrying (${retryCount + 1}/${maxRetries})...`);
            return callSynthesizer(facts, platformPrompt, retryCount + 1);
        }

        console.error('❌ Stage 2 Failure:', err.message);
        if (err.response) {
            console.error('❌ Stage 2 Response Data:', JSON.stringify(err.response.data, null, 2));
        }

        return FALLBACK_OUTPUT;
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
