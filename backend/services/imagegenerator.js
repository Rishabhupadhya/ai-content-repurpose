/**
 * ======================================
 * 🎨 IMAGE GENERATOR — Replicate (FLUX)
 * ======================================
 * Fixes applied:
 *  1. FLUX schnell returns a ReadableStream, not a URL string — now handled correctly
 *  2. Added stream-to-buffer conversion for ReadableStream responses
 *  3. Fallback to Unsplash placeholder if token missing or generation fails
 *  4. Rate limit detection and clear logging
 */

const Replicate = require('replicate');

// A pool of high-quality fallback images (varied so slides don't all look the same)
const FALLBACK_IMAGES = [
    'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1024&q=80',
    'https://images.unsplash.com/photo-1614850523296-e81109931557?auto=format&fit=crop&w=1024&q=80',
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1024&q=80',
    'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?auto=format&fit=crop&w=1024&q=80',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1024&q=80',
];
let fallbackIndex = 0;
const nextFallback = () => FALLBACK_IMAGES[fallbackIndex++ % FALLBACK_IMAGES.length];

/**
 * Convert a ReadableStream (returned by Replicate) to a base64 data URI.
 * This is necessary because FLUX schnell returns raw image bytes as a stream,
 * not a URL string.
 */
async function streamToBase64(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        stream.on('end', () => {
            const buf = Buffer.concat(chunks);
            const b64 = buf.toString('base64');
            // Detect format from first bytes
            const isWebP = buf[0] === 0x52 && buf[1] === 0x49; // "RI" (RIFF header)
            const isPNG = buf[0] === 0x89 && buf[1] === 0x50; // PNG magic
            const mime = isWebP ? 'image/webp' : isPNG ? 'image/png' : 'image/jpeg';
            resolve(`data:${mime};base64,${b64}`);
        });
        stream.on('error', reject);
    });
}

/**
 * Generate an image using Replicate's FLUX schnell model.
 * Returns a base64 data URI or a fallback Unsplash URL.
 *
 * @param {string} prompt - Image description
 * @returns {Promise<string>} - Image URL or base64 data URI
 */
async function generateImage(prompt) {
    const token = (process.env.REPLICATE_API_TOKEN || '').trim();

    if (!token || token === 'your_replicate_token_here') {
        console.warn('⚠️  No valid REPLICATE_API_TOKEN — using placeholder image.');
        return nextFallback();
    }

    const replicate = new Replicate({ auth: token });

    try {
        console.log(`🎨 Generating image via FLUX. Prompt: "${prompt.substring(0, 60)}..."`);

        // Small delay to respect free-tier rate limits
        await new Promise(r => setTimeout(r, 1500));

        const output = await replicate.run(
            'black-forest-labs/flux-schnell',
            {
                input: {
                    prompt: `Professional cinematic social media graphic: ${prompt}, high resolution, clean, modern aesthetic`,
                    num_inference_steps: 4,
                    aspect_ratio: '1:1',
                    output_format: 'webp',     // use output_format not format
                    output_quality: 80,
                },
            }
        );

        // ── Handle all possible output shapes from Replicate ──────────────────
        //
        // Replicate can return:
        //   1. Array of ReadableStream objects  → [ReadableStream]
        //   2. A single ReadableStream          → ReadableStream
        //   3. Array of URL strings             → ["https://..."]
        //   4. A single URL string              → "https://..."
        //   5. An object with a url() method    → output.url()
        //   6. A FileOutput object              → call .blob() or iterate

        const raw = Array.isArray(output) ? output[0] : output;

        // Case: string URL
        if (typeof raw === 'string') {
            console.log('✅ Image generated (URL string)');
            return raw;
        }

        // Case: object with url() method (newer Replicate SDK)
        if (raw && typeof raw.url === 'function') {
            const url = raw.url();
            console.log('✅ Image generated (url() method)');
            return typeof url === 'string' ? url : await streamToBase64(raw);
        }

        // Case: object with blob() method
        if (raw && typeof raw.blob === 'function') {
            const blob = await raw.blob();
            const arrayBuf = await blob.arrayBuffer();
            const buf = Buffer.from(arrayBuf);
            const b64 = buf.toString('base64');
            console.log('✅ Image generated (blob)');
            return `data:image/webp;base64,${b64}`;
        }

        // Case: ReadableStream (Node.js stream with .on())
        if (raw && typeof raw.on === 'function') {
            console.log('✅ Image generated (ReadableStream → base64)');
            return await streamToBase64(raw);
        }

        // Case: ReadableStream (Web API style with .getReader())
        if (raw && typeof raw.getReader === 'function') {
            const reader = raw.getReader();
            const chunks = [];
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            const buf = Buffer.concat(chunks.map(c => Buffer.from(c)));
            const b64 = buf.toString('base64');
            console.log('✅ Image generated (Web ReadableStream → base64)');
            return `data:image/webp;base64,${b64}`;
        }

        // Unknown shape — log and fallback
        console.warn('⚠️  Unknown Replicate output shape:', typeof raw, Object.keys(raw || {}));
        return nextFallback();

    } catch (error) {
        if (error.message?.includes('429') || error.status === 429) {
            console.warn('⚠️  Replicate rate limit hit — using fallback image.');
        } else if (error.message?.includes('401') || error.status === 401) {
            console.error('❌ Replicate auth failed — check REPLICATE_API_TOKEN.');
        } else {
            console.error('❌ Replicate generation failed:', error.message);
        }
        return nextFallback();
    }
}

module.exports = { generateImage };