/**
 * ======================================
 * 🖼️  INSTAGRAM SLIDE COMPOSER
 * ======================================
 * Uses the `canvas` npm package if available (local/Docker with build tools).
 * Falls back to a pure SVG-based base64 image — works on ALL hosting platforms
 * (Render, Railway, Fly.io, Vercel, etc.) without native dependencies.
 */

let canvasLib = null;
try {
    canvasLib = require('canvas');
} catch (_) {
    console.warn('⚠️  canvas package not available — using SVG fallback for Instagram slides.');
}

// ─── Colour palette for fallback slides ──────────────────────────────────────
const GRADIENTS = [
    ['#0f172a', '#1e3a5f'],
    ['#1a1a2e', '#16213e'],
    ['#0d1117', '#161b22'],
    ['#1e0533', '#3b0764'],
    ['#022c22', '#064e3b'],
    ['#1c0e07', '#3d1a08'],
    ['#0c1445', '#1e2f6b'],
    ['#1a0533', '#2d0a5e'],
];

let gradientIndex = 0;

// ─── SVG Fallback (no native deps required) ───────────────────────────────────

function makeSlideViaSVG(text) {
    const [c1, c2] = GRADIENTS[gradientIndex % GRADIENTS.length];
    gradientIndex++;

    // Break text into lines (~22 chars each) for the SVG
    const words = (text || '').toUpperCase().split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
        if ((current + ' ' + word).trim().length > 22 && current) {
            lines.push(current.trim());
            current = word;
        } else {
            current = (current + ' ' + word).trim();
        }
    }
    if (current) lines.push(current);

    // Cap to 6 lines so it fits
    const displayLines = lines.slice(0, 6);
    const lineHeight = 90;
    const totalHeight = displayLines.length * lineHeight;
    const startY = (1080 - totalHeight) / 2 + 55;

    const textElements = displayLines.map((line, i) =>
        `<text
            x="540"
            y="${startY + i * lineHeight}"
            font-family="Arial Black, Arial, sans-serif"
            font-size="72"
            font-weight="bold"
            fill="white"
            text-anchor="middle"
            dominant-baseline="middle"
            filter="url(#shadow)"
        >${escapeXml(line)}</text>`
    ).join('\n        ');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1080" viewBox="0 0 1080 1080">
    <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${c1};stop-opacity:1"/>
            <stop offset="100%" style="stop-color:${c2};stop-opacity:1"/>
        </linearGradient>
        <filter id="shadow">
            <feDropShadow dx="2" dy="4" stdDeviation="6" flood-color="rgba(0,0,0,0.8)"/>
        </filter>
    </defs>
    <rect width="1080" height="1080" fill="url(#bg)"/>
    <!-- Decorative elements -->
    <circle cx="100"  cy="100"  r="200" fill="rgba(255,255,255,0.03)"/>
    <circle cx="980"  cy="980"  r="250" fill="rgba(255,255,255,0.03)"/>
    <rect x="40" y="40" width="1000" height="1000" rx="20"
          fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>
    <!-- Text -->
    ${textElements}
</svg>`;

    const b64 = Buffer.from(svg).toString('base64');
    return `data:image/svg+xml;base64,${b64}`;
}

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

// ─── Canvas Implementation (when package is available) ───────────────────────

async function makeSlideViaCanvas(imageUrl, text) {
    const { createCanvas, loadImage } = canvasLib;
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext('2d');

    // Background
    try {
        const bg = await loadImage(imageUrl);
        ctx.drawImage(bg, 0, 0, 1080, 1080);
        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(0, 0, 1080, 1080);
    } catch (err) {
        console.warn('⚠️  Background image load failed, using gradient:', err.message);
        const [c1, c2] = GRADIENTS[gradientIndex++ % GRADIENTS.length];
        const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
        grad.addColorStop(0, c1);
        grad.addColorStop(1, c2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 1080, 1080);
    }

    // Text shadow
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    wrapText(ctx, (text || '').toUpperCase(), 540, 540, 900, 90);

    return canvas.toDataURL('image/png');
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    const lines = [];

    for (const word of words) {
        const testLine = line + word + ' ';
        if (ctx.measureText(testLine).width > maxWidth && line) {
            lines.push(line.trim());
            line = word + ' ';
        } else {
            line = testLine;
        }
    }
    if (line.trim()) lines.push(line.trim());

    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compose an Instagram slide image.
 * @param {string} imageUrl  - Background image URL (used only when canvas is available)
 * @param {string} text      - Slide text to overlay
 * @returns {Promise<string>} - base64 data URI (PNG or SVG)
 */
async function composeInstagramSlide(imageUrl, text) {
    if (canvasLib) {
        try {
            return await makeSlideViaCanvas(imageUrl, text);
        } catch (err) {
            console.warn('⚠️  Canvas compose failed, using SVG fallback:', err.message);
        }
    }
    return makeSlideViaSVG(text);
}

module.exports = { composeInstagramSlide };