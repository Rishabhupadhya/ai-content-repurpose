const mongoose = require('mongoose');

const ContentSchema = new mongoose.Schema({
  originalUrl: String,
  originalText: String,
  cleanContent: String,
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
      slides: [String],
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
