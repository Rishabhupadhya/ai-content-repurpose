const cleanJSON = (text) => {
    // 1. Locate the first '{' and last '}'
    const startIndex = text.indexOf('{');
    const endIndex = text.lastIndexOf('}');

    if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
        return text; // Return original if no JSON structure found
    }

    const jsonString = text.substring(startIndex, endIndex + 1);

    // 2. State machine to sanitize control characters within strings
    let cleaned = '';
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];

        if (isEscaped) {
            cleaned += char;
            isEscaped = false;
            continue;
        }

        if (char === '\\') {
            isEscaped = true;
            cleaned += char;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            cleaned += char;
            continue;
        }

        if (inString) {
            if (char === '\n') cleaned += '\\n';
            else if (char === '\r') cleaned += '\\r';
            else if (char === '\t') cleaned += '\\t';
            // Preserve other characters
            else cleaned += char;
        } else {
            cleaned += char;
        }
    }

    return cleaned;
};

// Failing payload from user report
const failingPayload = `{
"content": {
"type": "LinkedIn-Publication",
"title": "Title",
"body": "Story-driven approach: ⭐️⭐️⭐️
\n
\n**The Growing Relationship Between SpaceX and xAI**
\nElon Musk is often described as someone who 'builds companies.'
\n"
}
}`;

console.log("Original:");
console.log(failingPayload);

const cleaned = cleanJSON(failingPayload);
console.log("\nCleaned:");
console.log(cleaned);

try {
    JSON.parse(cleaned);
    console.log("\n✅ JSON Parsed Successfully!");
} catch (e) {
    console.error("\n❌ JSON Parse Failed:", e.message);
}
