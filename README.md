# 🚀 Open-Source AI Content Repurposing Platform

**"This platform intentionally avoids paid APIs and runs on open-source AI models, making it cost-free, privacy-friendly, and deployable by independent creators."**

## 🌟 Overview
An elite distribution engine designed to solve the "Content Reuse Problem" without vendor lock-in. It converts a single blog post into specialized formats for LinkedIn, Instagram, Twitter, and more—optimized using local Open-Source LLMs (like Llama-3).

## 🏗️ Architecture (Privacy-First)
```ascii
[ User Input ] -> [ Local Scraper ] 
      |
      v
[ Backend Agent (Node.js) ] <-> [ Local MongoDB ]
      |
      v
[ Open-Source AI Engine ]
      | (Parallel Prompt Chaining)
      +--> [ Llama-3: LinkedIn Agent ]
      +--> [ Llama-3: IG Design Agent ]
      +--> [ Llama-3: Twitter Specialist ]
      |
      v
[ Intelligence Layer ] -> [ Rule-Based IST Scoring ] -> [ Heuristic Scheduling ]
      |
      v
[ Premium Frontend (Next.js 14) ]
```

## 🧩 Features
- **Zero API Costs:** Designed to run with Ollama (Llama-3-8B) or Hugging Face.
- **Rule-Based Strategy:** Engagement scores are calculated transparently (+15 for questions, +10 for carousels).
- **Smart Scheduling:** Pre-calculated IST (India) peak windows integrated into the workflow.
- **Universal Ingest:** Scrape any URL or paste raw drafts directly.

## 🛠️ Tech Stack
- **AI Engine:** Llama-3 (Ollama) / Hugging Face.
- **Web App:** Next.js 14, Tailwind CSS, Lucide.
- **State:** Node.js, Express, MongoDB.
- **DevOps:** Fully Dockerized with `docker-compose`.

## 🚀 Setup Instructions

### 1. Requirements
- Docker & Docker Compose.
- **Ollama** (Optional but Recommended): [Install Ollama](https://ollama.com/) and run `ollama pull llama3`.

### 2. Local Startup
1. Clone the repository and navigate to the directory.
2. Initialize the platform:
   ```bash
   docker-compose up --build
   ```
3. Ensure your local AI endpoint is accessible. By default, it looks for `http://localhost:11434/v1`.

## 🧠 AI Strategy Explanation
Unlike generic LLM wrappers, this system uses **Platform-Specific Constraints**. For example:
- **LinkedIn Agent** is forced into a storytelling narrative with hook-first constraints.
- **IG Carousel Agent** breaks content into atomic slide-sized insights.
- **Twitter Agent** enforces short, punchy sentence structures.

## 🏁 Sample Demo Blog
Ready to test? Try this URL in the source input:
`https://nextjs.org/blog/next-14`

---
*Built for the Open-Source Intelligence Community. Privacy is a Feature.*
