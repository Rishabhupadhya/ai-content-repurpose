
const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config({ path: path.join(__dirname, '../.env') });

const AI_MODEL_ENDPOINT =
    process.env.AI_MODEL_ENDPOINT ||
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash';
const AI_API_KEY = process.env.GEMINI_API_KEY || '';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const isGeminiEndpoint = () =>
    AI_MODEL_ENDPOINT.includes('generativelanguage.googleapis.com');

/** Appends ?key= only for Gemini; other endpoints use the header */
const getRequestUrl = () => {
    const base = AI_MODEL_ENDPOINT;
    if (!AI_API_KEY || !isGeminiEndpoint()) return base;
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}key=${encodeURIComponent(AI_API_KEY)}`;
};

/**
 * Build request headers.
 * Gemini authenticates via ?key= query param — do NOT send Authorization header.
 * Other providers (OpenAI, Groq, Ollama) use Bearer token.
 */
const buildHeaders = () => {
    const headers = { 'Content-Type': 'application/json' };
    if (AI_API_KEY && !isGeminiEndpoint()) {
        headers['Authorization'] = `Bearer ${AI_API_KEY}`;
    }
    return headers;
};

/**
 * Build the request body.
 * Gemini's OpenAI-compat layer does NOT support `response_format` or `top_p`.
 */
const buildRequestBody = (model, messages, temperature, maxTokens = 4096) => {
    const body = { model, messages, temperature, max_tokens: maxTokens };
    if (!isGeminiEndpoint()) {
        body.response_format = { type: 'json_object' };
    }
    return body;
};

/** Safely extract text content from Gemini or OpenAI response shapes */
const getRawContent = (response) => {
    const data = response?.data;
    if (!data) return null;
    const msg = data.choices?.[0]?.message;
    const content = msg?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        const textPart = content.find((p) => p?.type === 'text' && p?.text);
        return textPart
            ? textPart.text
            : content.map((p) => p?.text).filter(Boolean).join('');
    }
    return (
        data.message?.content ||
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        null
    );
};

// ─── Caching ─────────────────────────────────────────────────────────────────

const FactCache = new Map();
const getHash = (content) =>
    crypto.createHash('sha256').update(content).digest('hex');

// ─── JSON Extraction & Repair ─────────────────────────────────────────────────

function extractFromMarkdown(text) {
    const open = text.indexOf('```');
    if (open === -1) return null;
    const afterOpen = text
        .slice(open + 3)
        .replace(/^json\s*/i, '')
        .trimStart();
    const close = afterOpen.lastIndexOf('```');
    const inner = close === -1 ? afterOpen : afterOpen.slice(0, close).trim();
    return inner || null;
}

function extractJSONBalanced(text) {
    if (!text || typeof text !== 'string') return null;
    const str = text.trim();
    const start = str.indexOf('{');
    if (start === -1) return null;

    let depth = 0,
        inString = false,
        escape = false,
        quote = null;

    for (let i = start; i < str.length; i++) {
        const c = str[i];
        if (escape) { escape = false; continue; }
        if (c === '\\' && inString) { escape = true; continue; }
        if ((c === '"' || c === "'") && !inString) { inString = true; quote = c; continue; }
        if (c === quote && inString) { inString = false; quote = null; continue; }
        if (inString) continue;
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return str.slice(start, i + 1); }
    }
    return null;
}

const extractJSON = (text) => {
    if (!text) return null;
    const raw = String(text).replace(/^\uFEFF/, '').trim();

    const fromMarkdown = extractFromMarkdown(raw);
    if (fromMarkdown && fromMarkdown.startsWith('{')) return fromMarkdown;

    const balanced = extractJSONBalanced(raw);
    if (balanced) return balanced;

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start !== -1 && end > start) return raw.slice(start, end + 1);

    return null;
};

const sanitizeJSONString = (json) => {
    if (!json) return '';
    let out = json.replace(/,(\s*[}\]])/g, '$1'); // trailing commas
    let inStr = false, escaped = false, result = '';
    for (let i = 0; i < out.length; i++) {
        const c = out[i];
        if (escaped) { result += c; escaped = false; continue; }
        if (c === '\\') { result += c; escaped = true; continue; }
        if (c === '"') { inStr = !inStr; result += c; continue; }
        if (inStr && (c === '\n' || c === '\r')) { result += '\\n'; continue; }
        result += c;
    }
    return result.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
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
    const cleaned = extractJSON(raw);
    if (!cleaned || !cleaned.trim()) throw new Error('No JSON object found in response');

    const attempts = [
        () => JSON.parse(cleaned),
        () => JSON.parse(repairJSON(cleaned)),
        () => JSON.parse(sanitizeJSONString(cleaned)),
        () => JSON.parse(sanitizeJSONString(repairJSON(cleaned))),
    ];

    for (let i = 0; i < attempts.length; i++) {
        try {
            return attempts[i]();
        } catch (e) {
            if (i === attempts.length - 1) {
                console.error(
                    `❌ Parse failed. Snippet: ${String(raw).substring(0, 300)}`
                );
                throw new Error('JSON parsing failed after all repair attempts');
            }
        }
    }
};

// ─── Stage 1: Fact Extraction ─────────────────────────────────────────────────

const extractFacts = async (content) => {
    const truncated = content.slice(0, 80000); // safe for Gemini
    const hash = getHash(truncated);
    if (FactCache.has(hash)) {
        console.log('⚡ Stage 1: Returning cached facts');
        return FactCache.get(hash);
    }

    console.log('🏗️  Stage 1: Extracting facts (chars:', truncated.length, ')...');

    const systemMsg =
        'You are a precision data extraction engine. ' +
        'Your entire response must be a single valid JSON object — nothing else. ' +
        'Do NOT wrap it in markdown. Do NOT add any explanation. ' +
        'Start your response with { and end with }.';

    const userMsg =
        `Extract every standalone fact, statistic, claim, and core message.\n` +
        `Respond with ONLY this JSON (no other text):\n\n` +
        `{\n  "facts": ["..."],\n  "statistics": ["..."],\n  "core_claims": ["..."]\n}\n\n` +
        `CONTENT:\n${truncated}`;

    const body = buildRequestBody(
        AI_MODEL_NAME,
        [
            { role: 'system', content: systemMsg },
            { role: 'user', content: userMsg },
        ],
        0.05,
        2048
    );

    try {
        const response = await axios.post(getRequestUrl(), body, {
            headers: buildHeaders(),
            timeout: 60000,
        });
        const raw = getRawContent(response);
        if (!raw || !raw.trim()) throw new Error('Empty Stage 1 response');

        console.log('📥 Stage 1 snippet:', raw.substring(0, 120));

        const parsed = safeParseJSON(raw);
        const pruned = {
            facts: (parsed.facts || []).slice(0, 25),
            statistics: (parsed.statistics || []).slice(0, 25),
            core_claims: (parsed.core_claims || []).slice(0, 25),
        };

        FactCache.set(hash, pruned);
        return pruned;
    } catch (err) {
        console.error('❌ Stage 1 failure:', err.response?.data || err.message);
        // Return a minimal fallback so Stage 2 can still attempt generation
        return {
            facts: ['Content provided but fact extraction failed — using raw content.'],
            statistics: [],
            core_claims: [],
        };
    }
};

// ─── Stage 2: Stylistic Generation ───────────────────────────────────────────

const FALLBACK_OUTPUT = {
    error: true,
    content: 'The AI was unable to structure the output. Please try again.',
    thread: ['The AI was unable to structure the output. Please try again.'],
    slides: [{ text: 'Error generating content', imagePrompt: '' }],
    score: 0,
    feedback: ['Generation or parsing failed. Try again or use shorter input.'],
};

const callSynthesizer = async (
    facts,
    platformPrompt,
    retryCount = 0,
    useFallbackModel = false
) => {
    const MAX_RETRIES = 1;
    const model = useFallbackModel ? FALLBACK_MODEL : AI_MODEL_NAME;

    try {
        console.log(
            `🎨 Stage 2 [${model}]${retryCount ? ` retry ${retryCount}` : ''}...`
        );

        const systemMsg =
            'You are an expert social media strategist. ' +
            'Your entire response must be a single valid JSON object — nothing else. ' +
            'Do NOT use markdown fences. Do NOT add any explanation before or after the JSON. ' +
            'Start your response with { and end with }. ' +
            'Use double quotes for all strings. Escape newlines inside string values as \\n.';

        const userMsg =
            `${platformPrompt}\n\n` +
            `CRITICAL: Your response must start with { and contain ONLY valid JSON. ` +
            `No text before or after. No markdown.\n\n` +
            `Use ONLY these source facts (do NOT invent numbers):\n` +
            `${JSON.stringify(facts, null, 2)}`;

        const body = buildRequestBody(
            model,
            [
                { role: 'system', content: systemMsg },
                { role: 'user', content: userMsg },
            ],
            0.65,
            4096
        );

        const response = await axios.post(getRequestUrl(), body, {
            headers: buildHeaders(),
            timeout: 90000,
        });

        const raw = getRawContent(response);
        if (!raw || !raw.trim()) throw new Error('Empty Stage 2 response');

        console.log('📥 Stage 2 snippet:', raw.substring(0, 150));

        return safeParseJSON(raw);
    } catch (err) {
        const isParseErr =
            err.message &&
            (err.message.includes('JSON') ||
                err.message.includes('parsing') ||
                err.message.includes('parse'));

        if (isParseErr && retryCount < MAX_RETRIES) {
            console.warn(`⚠️  Parse error — retrying (${retryCount + 1}/${MAX_RETRIES})`);
            return callSynthesizer(facts, platformPrompt, retryCount + 1, useFallbackModel);
        }

        if (!useFallbackModel && err.response?.status >= 400) {
            console.warn(`⚠️  API error ${err.response.status} — trying ${FALLBACK_MODEL}`);
            return callSynthesizer(facts, platformPrompt, 0, true);
        }

        console.error('❌ Stage 2 failure:', err.message);
        if (err.response) {
            console.error('❌ API response:', JSON.stringify(err.response.data, null, 2));
        }

        return FALLBACK_OUTPUT;
    }
};

// ─── Platform Generators ──────────────────────────────────────────────────────

const generateLinkedIn = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(
        facts,
        `Create a professional LinkedIn post for the target audience: ${audience}.
Length: ~400 words. Use a strong hook in the first line. Make it story-driven and insightful.

Return this JSON structure EXACTLY:
{
  "content": "Full post text here (use \\n for line breaks)",
  "explanation": "Why this post works for LinkedIn",
  "score": 90,
  "feedback": [
    "Specific tip 1 to improve LinkedIn performance",
    "Specific tip 2 about the hook",
    "Specific tip 3 about media/image strategy"
  ]
}`
    );
};

const generateTwitter = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(
        facts,
        `Create a high-engagement Twitter/X thread for the target audience: ${audience}.

Rules:
- 6 to 10 tweets total
- Each tweet must be under 180 characters
- No internal double quotes inside tweet text
- First tweet is a strong hook
- Last tweet ends with a question or CTA

Return this JSON structure EXACTLY:
{
  "thread": ["Tweet 1 text", "Tweet 2 text", "Tweet 3 text"],
  "explanation": "Thread strategy explanation",
  "score": 85,
  "feedback": [
    "Specific tip 1 to increase virality",
    "Specific tip 2 about the final tweet CTA",
    "Specific tip 3 about hashtags and timing"
  ]
}`
    );
};

const generateInstagram = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(
        facts,
        `Create an Instagram carousel with 6 to 8 slides for the target audience: ${audience}.
Each slide should have short punchy text and a vivid image description.

Return this JSON structure EXACTLY:
{
  "slides": [
    { "text": "Slide text here", "imagePrompt": "Detailed image description for AI generation" }
  ],
  "explanation": "Visual and content strategy",
  "score": 80,
  "feedback": [
    "Specific design tip 1",
    "Specific tip 2 about audio or Reel strategy",
    "Specific tip 3 about caption and bio engagement"
  ]
}`
    );
};

const generateNewsletter = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(
        facts,
        `Create a comprehensive professional newsletter for the target audience: ${audience}.

Requirements:
- Aim for ~400 words
- Structure: Subject Line → Hook intro → Detailed body → Key Takeaways → CTA
- Use \\n for line breaks inside the content string

Return this JSON structure EXACTLY:
{
  "content": "Full newsletter content here (use \\n for line breaks)",
  "explanation": "Brief strategy summary",
  "score": 85,
  "feedback": [
    "Specific tip 1 to improve open rates",
    "Specific tip 2 about subject line A/B testing",
    "Specific tip 3 about CTA placement"
  ]
}`
    );
};

const generateSEO = async (content) => {
    const facts = await extractFacts(content);
    return callSynthesizer(
        facts,
        `Generate high-performing SEO metadata for this content.

Requirements:
- SEO-optimized title (50-60 chars)
- Compelling meta description (150-160 chars)
- 10 to 15 target keywords

Return this JSON structure EXACTLY:
{
  "title": "SEO optimized title here",
  "metaDescription": "Compelling meta description here",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "explanation": "Brief SEO strategy summary",
  "score": 95,
  "feedback": [
    "Specific technical SEO improvement 1",
    "Specific keyword competition analysis tip",
    "Specific internal linking strategy"
  ]
}`
    );
};

module.exports = {
    generateLinkedIn,
    generateInstagram,
    generateTwitter,
    generateNewsletter,
    generateSEO,
    AI_MODEL_NAME,
    AI_MODEL_ENDPOINT,
};