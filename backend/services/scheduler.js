const suggestPostTimes = (platform, geography = 'India') => {
    // Mock logic based on general best practices for IST
    const times = {
        linkedin: "Tuesday or Thursday, 10:30 AM IST (Professional engagement peak)",
        instagram: "Wednesday or Friday, 7:00 PM IST (Evening scroll window)",
        twitter: "Monday or Wednesday, 8:30 PM IST (News & discussion peak)",
        newsletter: "Sunday, 9:00 AM IST (Relaxed reading window)"
    };

    return times[platform] || "Anytime during business hours";
};

module.exports = { suggestPostTimes };
