---
description: Deployment Guide for AI Content Repurposing
---

# Deployment Guide

Due to the long-running nature of AI generation (often exceeding 60 seconds), a standard Vercel Hobby deployment for the backend is not recommended (10s timeout).

## Architecture for Production
1. **Frontend**: Vercel (Next.js)
2. **Backend**: Railway.app, Render.com, or Fly.io (Standard Node.js server)
3. **Database**: MongoDB Atlas (Free Tier)
4. **AI Models**: 
   - **Gemma/Mistral**: Hosted on Groq, Together AI, or a dedicated VPS with Ollama.
   - **Images**: Replicate API.

---

## Step 1: MongoDB Atlas Setup
1. Create a free account at [mongodb.com](https://www.mongodb.com/cloud/atlas).
2. Create a "Shared" cluster (Free tier).
3. Under **Network Access**, allow access from anywhere (`0.0.0.0/0`) or specific IP of your backend host.
4. Under **Database Access**, create a user and password.
5. Click **Connect** -> **Drivers** -> Copy the connection string.
   - Example: `mongodb+srv://<user>:<password>@cluster.mongodb.net/ai-repurpose?retryWrites=true&w=majority`

## Step 2: Backend Deployment (Railway Recommendation)
1. Go to [Railway.app](https://railway.app/).
2. Create a new project -> **Deploy from GitHub repo**.
3. Select your repository.
4. **Root Directory**: Set to `backend`.
5. **Environment Variables**:
   - `PORT`: `5001` (or whatever Railway assigns)
   - `MONGO_URI`: Your MongoDB Atlas string.
   - `REPLICATE_API_TOKEN`: Your Replicate token.
   - `AI_MODEL_ENDPOINT`: 
     - If using Groq: `https://api.groq.com/openai/v1/chat/completions`
     - If using Together: `https://api.together.xyz/v1/chat/completions`
   - `AI_MODEL_NAME`: e.g., `llama-3.1-70b-versatile` or `mistral-7b-instruct`.
6. Deploy. Copy the provided URL (e.g., `https://backend-production.up.railway.app`).

## Step 3: Frontend Deployment (Vercel)
1. Go to [Vercel](https://vercel.com).
2. Create a new project -> **Import GitHub repo**.
3. **Root Directory**: Set to `frontend`.
4. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Your backend URL + `/api` (e.g., `https://backend-production.up.railway.app/api`).
5. Click **Deploy**.

---

## Important: Production AI Endpoint
Since the local `localhost:11434` (Ollama) won't work in the cloud, you must update your `AI_MODEL_ENDPOINT` in the backend environment variables to a cloud-based provider like **Groq** (best for speed) or **OpenAI**.
