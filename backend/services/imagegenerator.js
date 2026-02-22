const Replicate = require("replicate");

async function generateImage(prompt) {
    const token = process.env.REPLICATE_API_TOKEN?.trim();

    if (!token || token === 'your_replicate_token_here') {
        console.warn("⚠️ No valid REPLICATE_API_TOKEN found. Using placeholder image.");
        return `https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1024&q=80`;
    }

    const replicate = new Replicate({ auth: token });

    try {
        console.log(`🎨 Generating image (FLUX). Token starts with: ${token.substring(0, 5)}...`);

        // Add a small delay to respect free-tier limits
        await new Promise(resolve => setTimeout(resolve, 1500));

        const output = await replicate.run(
            "black-forest-labs/flux-schnell",
            {
                input: {
                    prompt: `Professional cinematic social media graphic: ${prompt}, high resolution, clean, modern aesthetic`,
                    num_inference_steps: 4,
                    aspect_ratio: "1:1",
                    guidance_scale: 7.5,
                    format: "webp"
                },
            }
        );

        // FLUX usually returns an array of readable streams or URLs
        const imageUrl = Array.isArray(output) ? output[0] : output;

        // Ensure we handle stream objects if necessary (though replicate-js usually gives URLs for run)
        return typeof imageUrl === 'string' ? imageUrl : String(imageUrl);

    } catch (error) {
        console.error("❌ Replicate Image Generation Failed:", error.message);

        // Detect rate limit and log it specifically
        if (error.message.includes('429')) {
            console.warn("⚠️ Rate limited by Replicate. Check billing or slow down.");
        }

        // Fallback to a high-quality abstract tech image
        return `https://images.unsplash.com/photo-1614850523296-e81109931557?auto=format&fit=crop&w=1024&q=80`;
    }
}

module.exports = { generateImage };
