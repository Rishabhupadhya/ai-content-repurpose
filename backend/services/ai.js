/**
 * ======================================
 * 🤖 AI SERVICE — Full Model Pool
 * ======================================
 *
 * Uses ALL available Gemini models with generateContent support
 * on the free tier, ordered by quality preference.
 * Automatically rotates when any model hits RPM or RPD limits.
 *
 * FREE TIER MODEL POOL (from your dashboard):
 * ┌─────────────────────────────┬─────┬───────┬──────┐
 * │ Model                       │ RPM │ TPM   │ RPD  │
 * ├─────────────────────────────┼─────┼───────┼──────┤
 * │ gemini-2.5-flash            │  5  │ 250K  │  20  │
 * │ gemini-2.5-flash-lite       │ 10  │ 250K  │  20  │
 * │ gemini-3-flash              │  5  │ 250K  │  20  │
 * │ gemini-3-pro                │  5  │ 250K  │  20  │ (likely 0 in practice)
 * │ gemini-flash-latest         │  5  │ 250K  │  20  │ (alias)
 * │ gemini-flash-lite-latest    │ 10  │ 250K  │  20  │ (alias)
 * │ gemini-pro-latest           │  5  │ 250K  │  20  │ (alias)
 * │ gemini-2.5-flash-lite-prev  │ 10  │ 250K  │  20  │
 * │ gemma-3-27b                 │ 30  │  15K  │ 14.4K│ (open weights, high RPD!)
 * │ gemma-3-12b                 │ 30  │  15K  │ 14.4K│
 * │ gemma-3-4b                  │ 30  │  15K  │ 14.4K│
 * │ gemma-3-1b                  │ 30  │  15K  │ 14.4K│
 * │ gemma-3-2b                  │ 30  │  15K  │ 14.4K│
 * └─────────────────────────────┴─────┴───────┴──────┘
 *
 * TOTAL FREE DAILY CAPACITY: ~200 RPD (Gemini) + ~72K RPD (Gemma)
 * That's 100+ content generations per day before any limit is hit.
 *
 * RATE LIMIT RENEWAL:
 *  - RPM: resets every 60 seconds (automatic)
 *  - RPD: resets at midnight Pacific Time (automatic, free)
 */

const path = require('path');
const axios = require('axios');
const dotenv = require('dotenv');
const crypto = require('crypto');
dotenv.config({ path: path.join(__dirname, '../.env') });

// ─── Config ───────────────────────────────────────────────────────────────────

const OPENAI_COMPAT_ENDPOINT =
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const AI_API_KEY = process.env.GEMINI_API_KEY || '';
const AI_MODEL_NAME = process.env.AI_MODEL_NAME || 'gemini-2.5-flash';

if (!AI_API_KEY) {
    console.error('❌ FATAL: GEMINI_API_KEY not set in .env');
}

/**
 * Full model pool ordered by output quality preference.
 *
 * Strategy:
 *  1. Best Gemini models first (highest quality output)
 *  2. Alias models as additional slots (same quota, different name)
 *  3. Gemma models last — lower quality but HUGE daily quota (14,400 RPD each!)
 *     Gemma is great as an emergency fallback since it virtually never runs out.
 *
 * rpmMax / rpdMax: conservative estimates from your dashboard.
 * The tracker will also respect 429 responses from the actual API.
 */
const MODEL_POOL = [
    // ── Tier 1: Best quality Gemini models ───────────────────────────────────
    { id: 'gemini-2.5-flash', rpmMax: 5, rpdMax: 20 },
    { id: 'gemini-2.5-flash-lite', rpmMax: 10, rpdMax: 20 },
    { id: 'gemini-3-flash', rpmMax: 5, rpdMax: 20 },
    { id: 'gemini-3-pro', rpmMax: 5, rpdMax: 20 },
    { id: 'gemini-2.5-flash-lite-preview-09-2025', rpmMax: 10, rpdMax: 20 },

    // ── Tier 2: Alias models (separate quota slots, same underlying model) ───
    { id: 'gemini-flash-latest', rpmMax: 5, rpdMax: 20 },
    { id: 'gemini-flash-lite-latest', rpmMax: 10, rpdMax: 20 },
    { id: 'gemini-pro-latest', rpmMax: 5, rpdMax: 20 },

    // ── Tier 3: Gemma open-weight models (lower quality, massive daily quota) 
    // 14,400 RPD each = essentially unlimited for this use case
    // TPM is only 15K so we use smaller max_tokens for these
    { id: 'gemma-3-27b-it', rpmMax: 30, rpdMax: 14400, tpmMax: 15000, smallContext: true },
    { id: 'gemma-3-12b-it', rpmMax: 30, rpdMax: 14400, tpmMax: 15000, smallContext: true },
    { id: 'gemma-3-4b-it', rpmMax: 30, rpdMax: 14400, tpmMax: 15000, smallContext: true },
    { id: 'gemma-3-2b-it', rpmMax: 30, rpdMax: 14400, tpmMax: 15000, smallContext: true },
    { id: 'gemma-3-1b-it', rpmMax: 30, rpdMax: 14400, tpmMax: 15000, smallContext: true },
];

// ─── Rate Limit Tracker ───────────────────────────────────────────────────────

class RateLimitTracker {
    constructor() {
        this.state = {};
        MODEL_POOL.forEach(m => {
            this.state[m.id] = {
                rpmCount: 0,
                rpmWindowStart: Date.now(),
                rpdCount: 0,
                rpdWindowStart: this._midnightPT(),
                blockedUntil: null,
            };
        });
    }

    _midnightPT() {
        // Pacific Time is UTC-7 (PDT) / UTC-8 (PST). We use -7 (conservative).
        const ptOffsetMs = -7 * 60 * 60 * 1000;
        const nowPT = new Date(Date.now() + ptOffsetMs);
        nowPT.setUTCHours(0, 0, 0, 0);
        return nowPT.getTime() - ptOffsetMs;
    }

    _tick(modelId) {
        const s = this.state[modelId];
        const now = Date.now();

        // RPM: 60-second rolling window
        if (now - s.rpmWindowStart >= 60000) {
            s.rpmCount = 0;
            s.rpmWindowStart = now;
        }

        // RPD: midnight PT reset
        if (now >= s.rpdWindowStart + 24 * 60 * 60 * 1000) {
            s.rpdCount = 0;
            s.rpdWindowStart = this._midnightPT();
            console.log(`🌅 RPD reset for ${modelId}`);
        }

        // Clear expired backoff
        if (s.blockedUntil && now >= s.blockedUntil) {
            s.blockedUntil = null;
        }
    }

    check(modelId) {
        this._tick(modelId);
        const s = this.state[modelId];
        const config = MODEL_POOL.find(m => m.id === modelId);
        const now = Date.now();

        if (s.blockedUntil && now < s.blockedUntil) {
            return {
                available: false,
                reason: `API backoff active until ${new Date(s.blockedUntil).toLocaleTimeString()}`,
                retryAfterMs: s.blockedUntil - now,
            };
        }
        if (s.rpmCount >= config.rpmMax) {
            const retryAfterMs = Math.max(60000 - (now - s.rpmWindowStart), 1000);
            return { available: false, reason: `RPM ${s.rpmCount}/${config.rpmMax}`, retryAfterMs };
        }
        if (s.rpdCount >= config.rpdMax) {
            const retryAfterMs = (s.rpdWindowStart + 86400000) - now;
            return { available: false, reason: `RPD ${s.rpdCount}/${config.rpdMax} (resets midnight PT)`, retryAfterMs };
        }
        return { available: true };
    }

    record(modelId) {
        this._tick(modelId);
        this.state[modelId].rpmCount++;
        this.state[modelId].rpdCount++;
    }

    recordRateLimit(modelId, retryAfterSeconds = 60) {
        this.state[modelId].blockedUntil = Date.now() + retryAfterSeconds * 1000;
        console.warn(`⛔ ${modelId} rate-limited — blocked ${retryAfterSeconds}s`);
    }

    status() {
        return MODEL_POOL.map(cfg => {
            this._tick(cfg.id);
            const s = this.state[cfg.id];
            const rpmCheck = this.check(cfg.id);
            return {
                model: cfg.id,
                rpm: `${s.rpmCount}/${cfg.rpmMax}`,
                rpd: `${s.rpdCount}/${cfg.rpdMax}`,
                available: rpmCheck.available,
                blocked: s.blockedUntil ? new Date(s.blockedUntil).toISOString() : null,
                tier: cfg.smallContext ? 'gemma' : 'gemini',
            };
        });
    }

    /** Find the model with the shortest wait time across all models */
    shortestWait() {
        let shortest = Infinity;
        MODEL_POOL.forEach(cfg => {
            const check = this.check(cfg.id);
            if (!check.available && check.retryAfterMs < shortest) {
                shortest = check.retryAfterMs;
            }
        });
        return shortest;
    }
}

const tracker = new RateLimitTracker();

// ─── Model Picker ─────────────────────────────────────────────────────────────

function pickModel() {
    for (const config of MODEL_POOL) {
        const check = tracker.check(config.id);
        if (check.available) return config;
        console.warn(`  ⏭️  Skip ${config.id}: ${check.reason}`);
    }

    // All models unavailable — find shortest wait
    const waitMs = tracker.shortestWait();

    if (waitMs <= 65000) {
        // RPM reset incoming — worth waiting
        throw { type: 'WAIT', retryAfterMs: waitMs, message: `All models at RPM limit. Waiting ${Math.ceil(waitMs / 1000)}s...` };
    }

    // Everything is RPD-exhausted — this almost never happens with Gemma in the pool
    throw {
        type: 'EXHAUSTED',
        message: 'All models have hit their daily limit. Resets at midnight Pacific Time.',
        status: tracker.status(),
    };
}

// ─── Core API Caller ──────────────────────────────────────────────────────────

async function callAPI(modelId, messages, temperature, maxTokens) {
    const config = MODEL_POOL.find(m => m.id === modelId);

    // Gemma has 15K TPM limit — cap tokens to stay safe
    const safeMaxTokens = config?.smallContext
        ? Math.min(maxTokens, 1500)
        : maxTokens;

    // Gemma also needs shorter prompts — truncate facts if needed
    const safeMessages = config?.smallContext
        ? messages.map(msg => ({
            ...msg,
            content: typeof msg.content === 'string'
                ? msg.content.slice(0, 3000)  // ~750 tokens per message
                : msg.content
        }))
        : messages;

    const response = await axios.post(
        OPENAI_COMPAT_ENDPOINT,
        {
            model: modelId,
            messages: safeMessages,
            temperature,
            max_tokens: safeMaxTokens,
        },
        {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AI_API_KEY}`,
            },
            timeout: 90000,
        }
    );

    const content = response.data?.choices?.[0]?.message?.content;
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) return content.map(p => p?.text || '').filter(Boolean).join('');
    return null;
}

async function callWithRateLimitHandling(messages, temperature, maxTokens, attempt = 0) {
    if (attempt > MODEL_POOL.length + 3) {
        throw new Error('Too many retries — all models exhausted');
    }

    let modelConfig;
    try {
        modelConfig = pickModel();
    } catch (err) {
        if (err.type === 'WAIT') {
            console.warn(`  ⏳ ${err.message}`);
            await new Promise(r => setTimeout(r, err.retryAfterMs + 500));
            return callWithRateLimitHandling(messages, temperature, maxTokens, attempt + 1);
        }
        throw new Error(err.message || 'All models exhausted');
    }

    try {
        console.log(`  🔄 Using: ${modelConfig.id}${modelConfig.smallContext ? ' [gemma-lite]' : ''}`);
        tracker.record(modelConfig.id);

        const raw = await callAPI(modelConfig.id, messages, temperature, maxTokens);

        if (!raw || !raw.trim()) {
            console.warn(`  ⚠️  ${modelConfig.id} returned empty — trying next`);
            tracker.recordRateLimit(modelConfig.id, 5);
            return callWithRateLimitHandling(messages, temperature, maxTokens, attempt + 1);
        }

        return raw;

    } catch (err) {
        const status = err.response?.status;

        if (status === 429) {
            // Parse retry-after from response if available
            let retryAfter = 60;
            try {
                const details = err.response?.data?.[0]?.error?.details || err.response?.data?.error?.details || [];
                const retryInfo = details.find(d => d.retryDelay);
                if (retryInfo?.retryDelay) {
                    retryAfter = parseInt(retryInfo.retryDelay) || 60;
                }
                const headerRetry = err.response?.headers?.['retry-after'];
                if (headerRetry) retryAfter = parseInt(headerRetry) || 60;
            } catch (_) { }

            tracker.recordRateLimit(modelConfig.id, retryAfter);
            console.warn(`  🔁 429 on ${modelConfig.id} — rotating to next model`);
            return callWithRateLimitHandling(messages, temperature, maxTokens, attempt + 1);
        }

        if (status === 401 || status === 403) {
            throw new Error(`Auth error (HTTP ${status}): Check GEMINI_API_KEY in .env`);
        }

        if (status === 404) {
            // Model doesn't exist on this key — permanently skip it
            console.warn(`  ❌ ${modelConfig.id} not available on this API key — skipping permanently`);
            tracker.recordRateLimit(modelConfig.id, 86400); // block for 24h
            return callWithRateLimitHandling(messages, temperature, maxTokens, attempt + 1);
        }

        if (status === 503 || status === 500) {
            console.warn(`  ⚠️  Server error (${status}) on ${modelConfig.id} — retrying...`);
            await new Promise(r => setTimeout(r, 2000));
            return callWithRateLimitHandling(messages, temperature, maxTokens, attempt + 1);
        }

        throw err;
    }
}

// ─── Caching ──────────────────────────────────────────────────────────────────

const FactCache = new Map();
const getHash = (s) => crypto.createHash('sha256').update(s).digest('hex');

// ─── JSON Extraction & Repair ─────────────────────────────────────────────────

function extractFromMarkdown(text) {
    const open = text.indexOf('```');
    if (open === -1) return null;
    const after = text.slice(open + 3).replace(/^json\s*/i, '').trimStart();
    const close = after.lastIndexOf('```');
    return (close === -1 ? after : after.slice(0, close)).trim() || null;
}

function extractJSONBalanced(text) {
    const str = (text || '').trim();
    const s = str.indexOf('{');
    if (s === -1) return null;
    let depth = 0, inStr = false, esc = false, q = null;
    for (let i = s; i < str.length; i++) {
        const c = str[i];
        if (esc) { esc = false; continue; }
        if (c === '\\' && inStr) { esc = true; continue; }
        if ((c === '"' || c === "'") && !inStr) { inStr = true; q = c; continue; }
        if (c === q && inStr) { inStr = false; q = null; continue; }
        if (inStr) continue;
        if (c === '{') depth++;
        else if (c === '}') { depth--; if (depth === 0) return str.slice(s, i + 1); }
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
    let s = json.trim(), ob = 0, ob2 = 0, inStr = false, esc = false, q = null;
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
    for (const fn of [
        () => JSON.parse(cleaned),
        () => JSON.parse(repairJSON(cleaned)),
        () => JSON.parse(sanitizeJSON(cleaned)),
        () => JSON.parse(sanitizeJSON(repairJSON(cleaned))),
    ]) {
        try { return fn(); } catch (_) { }
    }
    console.error('❌ All parse attempts failed. Snippet:', raw.substring(0, 300));
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
            content: 'You are a data extraction engine. Respond with ONLY a raw JSON object. No markdown. No code fences. Start with { and end with }.',
        },
        {
            role: 'user',
            content:
                'Extract facts, statistics, and core claims from the content below.\n' +
                'Return ONLY: {"facts":["..."],"statistics":["..."],"core_claims":["..."]}\n\n' +
                `CONTENT:\n${truncated}`,
        },
    ];

    try {
        const raw = await callWithRateLimitHandling(messages, 0.05, 2048);
        console.log('📥 Stage 1:', raw.substring(0, 100).replace(/\n/g, ' '));
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
        return { facts: ['Fact extraction failed.'], statistics: [], core_claims: [] };
    }
};

// ─── Stage 2: Content Generation ─────────────────────────────────────────────

const FALLBACK_OUTPUT = {
    error: true,
    content: 'All AI models have hit their daily limit. Resets at midnight Pacific Time (12:30 PM IST next day).',
    thread: ['All AI models have hit their daily limit. Resets at midnight Pacific Time.'],
    slides: [{ text: 'Daily limit reached', imagePrompt: '' }],
    score: 0,
    feedback: [
        'You have exhausted the free tier daily quota across all available models.',
        'Limits reset automatically at midnight Pacific Time (no action needed).',
        'For unlimited use: add billing at aistudio.google.com (~$0.15 per million tokens).',
    ],
};

const callSynthesizer = async (facts, platformPrompt, retryCount = 0) => {
    try {
        console.log(`🎨 Stage 2${retryCount ? ` (retry ${retryCount})` : ''}...`);

        const messages = [
            {
                role: 'system',
                content: 'You are an expert social media strategist. Respond with ONLY a raw JSON object. No markdown. No code fences. Start with { and end with }. Use double quotes. Escape newlines as \\n.',
            },
            {
                role: 'user',
                content:
                    `${platformPrompt}\n\n` +
                    'Return ONLY valid JSON starting with {. No text before or after.\n\n' +
                    'Source facts (do not invent numbers):\n' +
                    JSON.stringify(facts),
            },
        ];

        const raw = await callWithRateLimitHandling(messages, 0.65, 4096);
        console.log('📥 Stage 2:', raw.substring(0, 120).replace(/\n/g, ' '));
        return safeParseJSON(raw);

    } catch (err) {
        if (err.message?.includes('daily limit') || err.message?.includes('midnight')) {
            return FALLBACK_OUTPUT;
        }
        const isParseErr = err.message?.includes('JSON') || err.message?.includes('pars');
        if (isParseErr && retryCount < 1) {
            console.warn('⚠️  Parse error — retrying...');
            return callSynthesizer(facts, platformPrompt, retryCount + 1);
        }
        console.error('❌ Stage 2 failed:', err.message);
        return { ...FALLBACK_OUTPUT, content: `Generation failed: ${err.message}` };
    }
};

// ─── Platform Generators ──────────────────────────────────────────────────────

const generateLinkedIn = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Create a professional LinkedIn post for: ${audience}.
~400 words. Strong hook. Story-driven. Use \\n for line breaks.
Return ONLY: {"content":"post text","explanation":"why it works","score":90,"feedback":["tip1","tip2","tip3"]}`
    );
};

const generateTwitter = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Create a Twitter/X thread for: ${audience}.
6-10 tweets. Each under 180 chars. Hook first, CTA last. No internal double quotes.
Return ONLY: {"thread":["t1","t2","t3"],"explanation":"strategy","score":85,"feedback":["tip1","tip2","tip3"]}`
    );
};

const generateInstagram = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Create an Instagram carousel (6-8 slides) for: ${audience}.
Short punchy text per slide. Vivid image descriptions.
Return ONLY: {"slides":[{"text":"slide text","imagePrompt":"image desc"}],"explanation":"strategy","score":80,"feedback":["tip1","tip2","tip3"]}`
    );
};

const generateNewsletter = async (content, audience) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Create a professional newsletter for: ${audience}.
~400 words. Subject Line, Hook, Body, Key Takeaways, CTA. Use \\n for line breaks.
Return ONLY: {"content":"newsletter text","explanation":"strategy","score":85,"feedback":["tip1","tip2","tip3"]}`
    );
};

const generateSEO = async (content) => {
    const facts = await extractFacts(content);
    return callSynthesizer(facts,
        `Generate SEO metadata. Title 50-60 chars. Meta description 150-160 chars. 10-15 keywords.
Return ONLY: {"title":"title","metaDescription":"desc","keywords":["k1","k2"],"explanation":"strategy","score":95,"feedback":["tip1","tip2","tip3"]}`
    );
};

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
    generateLinkedIn,
    generateInstagram,
    generateTwitter,
    generateNewsletter,
    generateSEO,
    getRateLimitStatus: () => tracker.status(),
    AI_MODEL_NAME,
    AI_MODEL_ENDPOINT: OPENAI_COMPAT_ENDPOINT,
};