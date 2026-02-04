/**
 * Smart Scheduling Engine - HEURISTIC BASED (IST)
 * Suggests best posting time based on platform and IST peaks.
 */

const suggestPostTimes = (platform) => {
    const times = {
        linkedin: { time: "10:30 AM IST", confidence: "High", reason: "Professional morning synchronization peak." },
        instagram: { time: "08:15 PM IST", confidence: "High", reason: "Evening recreational scroll window." },
        twitter: { time: "09:00 PM IST", confidence: "Medium", reason: "Post-work news and discussion peak." },
        newsletter: { time: "09:00 AM IST (Sunday)", confidence: "High", reason: "Weekend depth-reading window." }
    };

    const suggestion = times[platform] || { time: "Business Hours", confidence: "Low", reason: "General engagement window." };
    return `${suggestion.time} (Confidence: ${suggestion.confidence}) - ${suggestion.reason}`;
};

module.exports = { suggestPostTimes };
