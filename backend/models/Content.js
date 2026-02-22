const mongoose = require('mongoose');

/**
 * =========================
 * Instagram Slide Schema
 * =========================
 */
const InstagramSlideSchema = new mongoose.Schema(
  {
    text: { type: String, default: "" },
    imagePrompt: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
    finalImage: { type: String, default: "" } // base64 image
  },
  { _id: false }
);

/**
 * =========================
 * Main Content Schema
 * =========================
 */
const ContentSchema = new mongoose.Schema({
  originalUrl: String,
  originalText: String,
  cleanContent: {
    type: String,
    required: true
  },
  title: String,

  targetAudience: {
    type: String,
    enum: ['Developers', 'Founders', 'Students', 'Marketers', 'General'],
    default: 'General'
  },

  outputs: {
    linkedin: {
      content: String,
      explanation: String,
      score: Number,
      feedback: [String]
    },

    instagram: {
      slides: [InstagramSlideSchema], // ✅ FIXED
      explanation: String,
      score: Number,
      feedback: [String]
    },

    twitter: {
      thread: [String],
      explanation: String,
      score: Number,
      feedback: [String]
    },

    newsletter: {
      content: String,
      explanation: String,
      score: Number,
      feedback: [String]
    },

    seo: {
      title: String,
      metaDescription: String,
      keywords: [String],
      explanation: String
    }
  },

  scheduling: {
    linkedin: String,
    instagram: String,
    twitter: String,
    newsletter: String
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Content', ContentSchema);
