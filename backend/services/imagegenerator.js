const Replicate = require("replicate");

const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
});

async function generateImage(prompt) {
    const output = await replicate.run(
        "stability-ai/sdxl",
        {
            input: {
                prompt,
                width: 1024,
                height: 1024,
                num_outputs: 1,
                guidance_scale: 7.5,
            },
        }
    );

    return output[0]; // image URL
}

module.exports = { generateImage };
