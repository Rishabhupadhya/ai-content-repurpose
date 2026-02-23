/**
 * ======================================
 * 🤖 AI SERVICE — Gemini Compatible
 * ======================================
 * KEY FINDINGS FROM DIAGNOSTIC:
 *  - OpenAI-compat endpoint requires: Authorization: Bearer <key>  (NOT ?key=)
 *  - Native endpoint requires: ?key=  (NOT Authorization header)
 *  - Only gemini-2.5-flash and gemini-2.0-flash exist on this account
 *  - We use OpenAI-compat endpoint because it returns structured chat responses
 */

const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── Config ───────────────────────────────────────────────────────────────────

const OPENAI_COMPAT_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const NATIVE_ENDPOINT_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const AI_API_KEY = process.env.GEMINI_API_KEY || '';
const AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'gemini-2.5-flash';

// Fallback chain — only models confirmed on this account
const MODEL_FALLBACK_CHAIN = [
    AI_MODEL_NAME,
    'gemini-2.5-flash',
    'gemini-2.0-flash',  // may hit quota but worth trying
].filter((v, i, arr) => arr.indexOf(v) === i);

// Cache the first model that succeeds so we don't retry failed ones
let workingModel = null;

if (!AI_API_KEY) {
    console.error('❌ FATAL: GEMINI_API_KEY is not set in .env');
}

// ─── API Call (OpenAI-compat) ─────────────────────────────────────────────────
//
// The OpenAI-compat endpoint at googleapis.com requires:
//   Authorization: Bearer <API_KEY>
// It does NOT support ?key= query params (that's for the native endpoint only).
// It also does NOT support response_format, top_p, or other OpenAI-specific params.

const callOpenAICompat = async (model, messages, temperature, maxTokens) => {
    const response = await axios.post(
        OPENAI_COMPAT_ENDPOINT,
        {
            model,
            messages,
            temperature,
            max_tokens: maxTokens,
            // DO NOT add response_format — not supported by Gemini compat layer
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`,  // ← THIS is what was missing
            },
            timeout: 90000,
        }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
        return content.map(p => p?.text || '').filter(Boolean).join('');
    }
    return null;
};

// ─── Model Fallback Wrapper ───────────────────────────────────────────────────

const callWithFallback = async (messages, temperature, maxTokens) => {
    const chain = workingModel
        ? [workingModel, ...MODEL_FALLBACK_CHAIN.filter(m => m !== workingModel)]
        : MODEL_FALLBACK_CHAIN;

    let lastError = null;

    for (const model of chain) {
        try {
            console.log(`  🔄 Trying: ${model}`);
            const raw = await callOpenAICompat(model, messages, temperature, maxTokens);

            if (!raw || !raw.trim()) {
                console.warn(`  ⚠️  ${model} returned empty content`);
                continue;
            }

            if (workingModel !== model) {
                workingModel = model;
                console.log(`  ✅ Using model: ${model}`);
            }
            return raw;

        } catch (err) {
            const status = err.response?.status;
            const msg = err.response?.data?.[0]?.error?.message
                || err.response?.data?.error?.message
                || err.message;

            console.warn(`  ❌ ${model} failed (HTTP ${status || 'ERR'}): ${msg}`);

            // Auth errors will affect all models — stop immediately
            if (status === 401 || status === 403) {
                throw new Error(`Auth error (${status}): ${msg} — check GEMINI_API_KEY`);
            }

            lastError = err;
        }
    }

    throw lastError || new Error('All models in fallback chain failed');
};

// ─── Caching ──────────────────────────────────────────────────────────────────

const FactCache = new Map();
const getHash = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ─── JSON Extraction & Repair ─────────────────────────────────────────────────

function extractFromMarkdown(text) {
    const open = text.indexOf('```');
    if (open === -1) return null;
    const afterOpen = text.slice(open + 3).replace(/^json\s*/i, '').trimStart();
    const close = afterOpen.lastIndexOf('```');
    return (close === -1 ? afterOpen : afterOpen.slice(0, close)).trim() || null;
}

function extractJSONBalanced(text) {
    const str = (text || '').trim();
    const start = str.indexOf('{');
    if (start === -1) return null;
    let depth = 0, inStr = false, esc = false, q = null;
    for (let i = start; i < str.length; i++) {
        const c = str[i];
        if (esc) { esc = false; continue; }
        if (c === '\\' && inStr) { esc = true; continue; }
        if ((c === '"' || c === "'") && !inStr) { inStr = true; q = c; continue; }
        if (c === q && inStr) { inStr = false; q = null; continue; }
        if (inStr) continue;
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return str.slice(start, i + 1); }
    }
    return null;
}

const extractJSON = (text) => {
    if (!text) return null;
    const raw = String(text).replace(/^\uFEFF/, '').trim();
    const md = extractFromMarkdown(raw);
    if (md && md.startsWith('{')) return md;
    const bal = extractJSONBalanced(raw);
    if (bal) return bal;
    const s = raw.indexOf('{'), e = raw.lastIndexOf('}');
    return (s !== -1 && e > s) ? raw.slice(s, e + 1) : null;
};

const sanitizeJSON = (json) => {
    if (!json) return '';
    let out = json.replace(/,(\s*[}\]])/g, '$1');
    let inStr = false, esc = false, result = '';
    for (const c of out) {
        if (esc) { result += c; esc = false; continue; }
        if (c === '\\') { result += c; esc = true; continue; }
        if (c === '"') { inStr = !inStr; result += c; continue; }
        if (inStr && (c === '\n' || c === '\r')) { result += '\\n'; continue; }
        result += c;
    }
    return result.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
};

const repairJSON = (json) => {
    if (!json) return '';
    let s = json.trim();
    let ob = 0, ob2 = 0, inStr = false, esc = false, q = null;
    for (const c of s) {
        if (esc) { esc = false; continue; }
        if ((c === '"' || c === "'") && !inStr) { inStr = true; q = c; continue; }
        if (c === q && inStr) { inStr = false; q = null; continue; }
        if (c === '\\' && inStr) { esc = true; continue; }
        if (inStr) continue;
        if (c === '{') ob++; else if (c === '}') ob--;
        if (c === '[') ob2++; else if (c === ']') ob2--;
    }
    if (inStr) s += q || '"';
    while (ob2 > 0) { s += ']'; ob2--; }
    while (ob > 0) { s += '}'; ob--; }
    return s;
};

const safeParseJSON = (raw) => {
    const cleaned = extractJSON(raw);
    if (!cleaned) throw new Error('No JSON object found in response');

    for (const attempt of [
        () => JSON.parse(cleaned),
        () => JSON.parse(repairJSON(cleaned)),
        () => JSON.parse(sanitizeJSON(cleaned)),
        () => JSON.parse(sanitizeJSON(repairJSON(cleaned))),
    ]) {
        try { return attempt(); } catch (_) { }
    }

    console.error('❌ All parse attempts failed. Raw snippet:\n', raw.substring(0, 400));
    throw new Error('JSON parsing failed after all repair attempts');
};

// ─── Stage 1: Fact Extraction ─────────────────────────────────────────────────

const extractFacts = async (content) => {
    const truncated = content.slice(0, 80000);
    const hash = getHash(truncated);
    if (FactCache.has(hash)) { console.log('⚡ Stage 1: cached'); return FactCache.get(hash); }

    console.log(`🏗️  Stage 1: Extracting facts (${truncated.length} chars)...`);

    const messages = [
        {
            role: 'system',
            content:
                'You are a data extraction engine. ' +
                'Respond with ONLY a raw JSON object — no markdown, no code fences, no explanation. ' +
                'Your response must start with { and end with }.',
        },
        {
            role: 'user',
            content:
                'Extract facts, statistics, and core claims from the content below.\n' +
                'Return ONLY this JSON (nothing else):\n' +
                '{"facts":["..."],"statistics":["..."],"core_claims":["..."]}\n\n' +
                `CONTENT:\n${truncated}`,
        },
    ];

    try {
        const raw = await callWithFallback(messages, 0.05, 2048);
        console.log('📥 Stage 1:', raw.substring(0, 120).replace(/\n/g, ' '));
        const parsed = safeParseJSON(raw);
        const result = {
            facts: (parsed.facts || []).slice(0, 25),
            statistics: (parsed.statistics || []).slice(0, 25),
            core_claims: (parsed.core_claims || []).slice(0, 25),
        };
        FactCache.set(hash, result);
        return result;
    } catch (err) {
        console.error('❌ Stage 1 failed:', err.message);
        return { facts: ['Fact extraction failed — proceeding with raw content.'], statistics: [], core_claims: [] };
    }
};

// ─── Stage 2: Content Generation ─────────────────────────────────────────────

const FALLBACK_OUTPUT = {
    error: true,
    content: 'The AI was unable to structure the output. Please try again.',
    thread: ['The AI was unable to structure the output. Please try again.'],
    slides: [{ text: 'Error generating content', imagePrompt: '' }],
    score: 0,
    feedback: ['Generation failed. Check server logs for details.'],
};

const callSynthesizer = async (facts, platformPrompt, retryCount = 0) => {
    try {
        console.log(`🎨 Stage 2${retryCount ? ` (retry ${retryCount})` : ''}...`);

        const messages = [
            {
                role: 'system',
                content:
                    'You are an expert social media strategist. ' +
                    'Respond with ONLY a raw JSON object — no markdown, no code fences, no explanation. ' +
                    'Your response must start with { and end with }. ' +
                    'Use double quotes for strings. Escape newlines as \\n.',
            },
            {
                role: 'user',
                content:
                    `${platformPrompt}\n\n` +
                    'IMPORTANT: Return ONLY valid JSON starting with {. No markdown. No text before or after.\n\n' +
                    'Base your response on these facts only (do not invent statistics):\n' +
                    JSON.stringify(facts),
            },
        ];

        const raw = await callWithFallback(messages, 0.65, 4096);
        console.log('📥 Stage 2:', raw.substring(0, 150).replace(/\n/g, ' '));
        return safeParseJSON(raw);

    } catch (err) {
        const isParseErr = err.message.includes('JSON') || err.message.includes('pars');
        if (isParseErr && retryCount < 1) {
            console.warn('⚠️  Parse error — retrying once...');
            return callSynthesizer(facts, platformPrompt, retryCount + 1);
        }
        console.error('❌ Stage 2 failed:', err.message);
        return FALLBACK_OUTPUT;
    }
};

// ─── Platform Generators ──────────────────────────────────────────────────────

const generateLinkedIn = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Create a professional LinkedIn post for: ${audience}.
~400 words. Strong opening hook. Story-driven. Use \\n for line breaks.

Return ONLY this JSON (start with {):
{"content":"full post text","explanation":"why it works","score":90,"feedback":["tip 1","tip 2","tip 3"]}`
    );
};

const generateTwitter = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Create a Twitter/X thread for: ${audience}.
6-10 tweets. Each under 180 chars. Hook first, question/CTA last. No internal double quotes.

Return ONLY this JSON (start with {):
{"thread":["tweet1","tweet2","tweet3"],"explanation":"strategy","score":85,"feedback":["tip 1","tip 2","tip 3"]}`
    );
};

const generateInstagram = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Create an Instagram carousel (6-8 slides) for: ${audience}.
Short punchy slide text. Vivid image descriptions.

Return ONLY this JSON (start with {):
{"slides":[{"text":"slide text","imagePrompt":"image description"}],"explanation":"strategy","score":80,"feedback":["tip 1","tip 2","tip 3"]}`
    );
};

const generateNewsletter = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Create a professional newsletter for: ${audience}.
~400 words. Structure: Subject Line, Hook, Body, Key Takeaways, CTA. Use \\n for line breaks.

Return ONLY this JSON (start with {):
{"content":"full newsletter text","explanation":"strategy","score":85,"feedback":["tip 1","tip 2","tip 3"]}`
    );
};

const generateSEO = async (content) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Generate SEO metadata. Title 50-60 chars. Meta description 150-160 chars. 10-15 keywords.

Return ONLY this JSON (start with {):
{"title":"seo title","metaDescription":"meta desc","keywords":["kw1","kw2"],"explanation":"strategy","score":95,"feedback":["tip 1","tip 2","tip 3"]}`
    );
};

module.exports = {
    generateLinkedIn,
    generateInstagram,
    generateTwitter,
    generateNewsletter,
    generateSEO,
    AI_MODEL_NAME,
    AI_MODEL_ENDPOINT: OPENAI_COMPAT_ENDPOINT,
};