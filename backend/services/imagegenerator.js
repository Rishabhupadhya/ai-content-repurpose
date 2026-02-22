const Replicate = require("replicate");

async function generateImage(prompt) {
    const token = process.env.REPLICATE_API_TOKEN?.trim();

    if (!token || token === 'your_replicate_token_here') {
        console.warn("⚠️ No valid REPLICATE_API_TOKEN found. Using placeholder image.");
        return `https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?auto=format&fit=crop&w=1024&q=80`;
    }

    const replicate = new Replicate({ auth: token });

    try {
        console.log(`🎨 Generating image. Token starts with: ${token.substring(0, 5)}...`);

        // Add a small delay to respect free-tier burst limits (1 request at a time)
        await new Promise(resolve => setTimeout(resolve, 2000));

        const output = await replicate.run(
            "stability-ai/sdxl:39ed52f2a78e934b3ba6e246915696c0334a2539d0f93010b98663273e93a61f",
            {
                input: {
                    prompt,
                    width: 1024,
                    height: 1024,
                    num_outputs: 1,
                    scheduler: "K_EULER",
                    guidance_scale: 7.5,
                    apply_watermark: false
                },
            }
        );

        return Array.isArray(output) ? output[0] : output;
    } catch (error) {
        console.error("❌ Replicate Image Generation Failed:", error.message);
        // Fallback to a nice abstract AI image on error
        return `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1024&q=80`;
    }
}

module.exports = { generateImage };
