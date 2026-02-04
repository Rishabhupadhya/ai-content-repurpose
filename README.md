# 🚀 AI Content Repurposing & Distribution Platform

An elite, production-ready AI engine that transforms a single blog post into optimized, platform-specific content for LinkedIn, Instagram, Twitter/X, Newsletters, and SEO.

## 🌟 Overview
This platform takes the cognitive load out of content distribution. Instead of manually rewriting your blog for every social network, our AI understands the **platform nuances** (LinkedIn storytelling vs. Twitter punchiness) and generates ready-to-use assets.

### 🏗️ Architecture
```ascii
[ User Input ] -> [ URL Scraper / Raw Text ] 
      |
      v
[ Backend (Node/Express) ] <-> [ MongoDB ]
      |
      v
[ AI Engine (OpenAI Prompt Chaining) ]
      | (Parallel execution)
      +--> [ LinkedIn Storytelling Agent ]
      +--> [ IG Carousel Designer Agent ]
      +--> [ Twitter Thread Specialist ]
      +--> [ Newsletter Copywriter ]
      +--> [ SEO Strategist ]
      |
      v
[ Intelligence Layer ] -> [ Smart Scheduling IST ] -> [ Engagement Prediction ]
      |
      v
[ Frontend (Next.js 14) ] -> [ Premium Review Dashboard ]
```

## 🧩 Features
- **Smart Scraper:** Automatically cleans and extracts main content from any blog URL.
- **Platform Intelligence:** Adjusts tone, hook style, and formatting per platform.
- **Engagement Loop:** Predicts "AI Engagement Scores" and provides actionable feedback.
- **Scheduling Engine:** Suggests peak posting times based on India (IST) geography.
- **Interactive UI:** Review, edit, and copy content in a sleek, dark-mode dashboard.

## 🛠️ Tech Stack
- **Frontend:** Next.js 14, Tailwind CSS, Lucide Icons, Axios.
- **Backend:** Node.js, Express, Mongoose.
- **AI:** OpenAI GPT-4 Turbo (Prompt Chaining).
- **Database:** MongoDB.
- **DevOps:** Docker, Docker Compose.

## 🚀 Getting Started

### 1. Prerequisites
- Docker & Docker Compose installed.
- OpenAI API Key.

### 2. Setup
1. Create a `.env` file in the root directory (or update `backend/.env`):
   ```
   OPENAI_API_KEY=your_key_here
   ```
2. Run the platform:
   ```bash
   docker-compose up --build
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 Sample Demo Flow
1. **Input:** Paste a blog URL (e.g., a Medium post or tech blog).
2. **Generate:** Click "Generate Magic". The AI initiates parallel chains.
3. **Review:** 
   - Check **LinkedIn** for professional storytelling.
   - Check **Instagram** for a slide-by-slide carousel breakdown.
   - Check **Twitter** for a viral-style thread.
4. **Optimize:** Look at the "Smart Schedule" and "Engagement Score" to see why the content was generated that way.

## 🧠 Assumptions & Design Decisions
- **Geography:** Defaulted to IST (India Standard Time) as requested for the smart scheduler.
- **LLM:** Used GPT-4 Turbo for high-quality reasoning and JSON consistency.
- **Simulated Feedback:** Engagement scores are generated via LLM evaluation relative to platform best practices.
- **Explainability:** Each output includes a "Strategy Detail" section to explain the AI's internal reasoning.

---
*Built with ❤️ for the AI Content Repurposing Hackathon.*
