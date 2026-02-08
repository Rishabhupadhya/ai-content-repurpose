const { createCanvas, loadImage } = require("canvas");

async function composeInstagramSlide(imageUrl, text) {
    const bg = await loadImage(imageUrl);

    const canvas = createCanvas(1080, 1080);
    const ctx = canvas.getContext("2d");

    // Background
    ctx.drawImage(bg, 0, 0, 1080, 1080);

    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, 1080, 1080);

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
