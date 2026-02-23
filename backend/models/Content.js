const mongoose = require('mongoose');

// ─── Instagram Slide Sub-Schema ───────────────────────────────────────────────
const InstagramSlideSchema = new mongoose.Schema(
  {
    text: { type: String, default: '' },
    imagePrompt: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    finalImage: { type: String, default: '' }, // base64 or URL of composed slide
  },
  { _id: false }
);

// ─── Main Content Schema ──────────────────────────────────────────────────────
const ContentSchema = new mongoose.Schema(
  {
    originalUrl: { type: String, default: null },
    originalText: { type: String, default: null },
    cleanContent: {
      type: String,
      required: [true, 'cleanContent is required'],
    },
    title: { type: String, default: 'Untitled' },

    // Flexible — no enum so unexpected values don't throw a validation error
    targetAudience: {
      type: String,
      default: 'General',
    },

    outputs: {
      linkedin: {
        content: { type: String, default: '' },
        explanation: { type: String, default: '' },
        score: { type: Number, default: 0 },
        feedback: { type: [String], default: [] },
      },

      instagram: {
        slides: { type: [InstagramSlideSchema], default: [] },
        explanation: { type: String, default: '' },
        score: { type: Number, default: 0 },
        feedback: { type: [String], default: [] },
      },

      twitter: {
        thread: { type: [String], default: [] },
        explanation: { type: String, default: '' },
        score: { type: Number, default: 0 },
        feedback: { type: [String], default: [] },
      },

      newsletter: {
        content: { type: String, default: '' },
        explanation: { type: String, default: '' },
        score: { type: Number, default: 0 },
        feedback: { type: [String], default: [] },
      },

      seo: {
        title: { type: String, default: '' },
        metaDescription: { type: String, default: '' },
        keywords: { type: [String], default: [] },
        explanation: { type: String, default: '' },
        score: { type: Number, default: 0 },
        feedback: { type: [String], default: [] },
      },
    },

    scheduling: {
      linkedin: { type: String, default: null },
      instagram: { type: String, default: null },
      twitter: { type: String, default: null },
      newsletter: { type: String, default: null },
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// Index for faster recent-content queries
ContentSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Content', ContentSchema);