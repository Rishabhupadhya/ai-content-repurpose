const { createCanvas, loadImage } = require("canvas");

async function composeInstagramSlide(imageUrl, text) {
    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext("2d");

    try {
        const bg = await loadImage(imageUrl);
        // Background
        ctx.drawImage(bg, 0, 0, 1080, 1080);
        // Dark overlay
        ctx.fillStyle = "rgba(0,0,0,0.65)";
        ctx.fillRect(0, 0, 1080, 1080);
    } catch (err) {
        console.warn("⚠️ Failed to load background image, using solid fallback:", err.message);
        // Gradient fallback
        const gradient = ctx.createLinearGradient(0, 0, 1080, 1080);
        gradient.addColorStop(0, '#0f172a');
        gradient.addColorStop(1, '#1e293b');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 1080);
    }

    // Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Sans";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    wrapText(ctx, text.toUpperCase(), 540, 540, 900, 90);

    return canvas.toDataURL("image/png");
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    const lines = [];

    for (const word of words) {
        const testLine = line + word + " ";
        if (ctx.measureText(testLine).width > maxWidth) {
            lines.push(line);
            line = word + " ";
        } else {
            line = testLine;
        }
    }
    lines.push(line);

    const offsetY = y - (lines.length * lineHeight) / 2;
    lines.forEach((l, i) => {
        ctx.fillText(l.trim(), x, offsetY + i * lineHeight);
    });
}

module.exports = { composeInstagramSlide };
