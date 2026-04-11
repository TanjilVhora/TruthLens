# TruthLens — Real-Time AI Fact-Checker

> Paste a news article or upload a WhatsApp screenshot. TruthLens returns an AI-powered verdict with confidence score, reason breakdown, and credibility meter.


## Overview

TruthLens is an AI-powered fake news detection web application built as a Micro-SaaS product. It targets general users in India who encounter misinformation via WhatsApp, Facebook, and news sites. Users paste an article or upload a screenshot and receive an instant verdict backed by live web evidence.

---

## How It Works

TruthLens uses a multi-model hybrid pipeline combining Groq, Gemini, and Tavily to fact-check claims against real-time web evidence — not just model memory.

```
User Input (Text or Image)
          |
     Input Type?
     |                        |
   Image                    Text
     |                        |
Gemini 1.5 Pro           Groq LLaMA 3.3
Vision OCR               Claim Extraction
extracts text            (3 key claims)
     |                        |
     +----------+-------------+
                |
        Tavily: Real-Time
        Web Research
        (fetches live news
        & evidence snippets)
                |
        Groq LLaMA 3.3
        Cross-Verification
        (verifies claims against
        live evidence)
                |
        Final JSON Verdict:
        {
          verdict,          (Real / Fake / Uncertain)
          confidence_score,
          reasons,
          red_flags
        }
```

---

## Features

1. **Verdict + Confidence Score** — Real / Fake / Uncertain label with a percentage score
2. **Reason Breakdown** — Bullet points explaining why: sensational language, missing sources, logical fallacies
3. **Credibility Meter** — Visual color-coded bar (green / yellow / red) based on confidence score
4. **Analysis History** — Users can view all past analyses with article snippet, verdict, and date
5. **Share Result** — html2canvas converts the result card to a downloadable image for WhatsApp sharing
6. **Global Stats Banner** — Live counter showing total articles analyzed and percentage fake
7. **Text Input** — Paste or type any article text for analysis
8. **Image Upload** — Upload a WhatsApp screenshot; Gemini Vision OCR reads and extracts the text automatically

---

## Tech Stack

| Layer | Technology | Purpose | Hosting |
|---|---|---|---|
| Frontend | HTML + CSS + JavaScript | UI, input forms, result display | Vercel (static) |
| Backend | Node.js Serverless Functions | API routes, AI calls, DB writes | Vercel (api/ folder) |
| Database | Supabase (PostgreSQL) | Store analyses, stats, history | Supabase Cloud |
| AI — Image OCR | Gemini 1.5 Pro (Google) | Extract text from uploaded screenshots | Google Cloud |
| AI — Claim Extraction & Verification | Groq API (LLaMA 3.3) | Extract 3 key claims, cross-verify against evidence | Groq Cloud |
| Web Research | Tavily Search API | Fetch live news and evidence snippets for verification | Tavily Cloud |
| Hosting | Vercel | Auto-deploy from GitHub | vercel.com |
| Share Feature | html2canvas | Convert result div to downloadable image | CDN (script tag) |

---

## Project Structure

```
truthlens/
├── public/
│   ├── index.html          # Landing page
│   ├── analyze.html        # Analysis input page
│   ├── result.html         # Result display page
│   ├── history.html        # User analysis history page
│   ├── css/
│   │   └── style.css       # Global styles
│   └── js/
│       ├── analyze.js      # Handles input, API call, result display
│       ├── history.js      # Fetches and displays history
│       ├── stats.js        # Fetches and displays global stats
│       └── share.js        # html2canvas share feature
├── api/
│   ├── analyze.js          # POST: claim extraction, Tavily research, cross-verification, saves to Supabase
│   ├── history.js          # GET: fetches user analysis history from Supabase
│   └── stats.js            # GET: fetches global stats from Supabase
├── .env                    # Environment variables — never push to GitHub
├── .gitignore              # node_modules, .env
├── package.json            # Node.js project config
└── vercel.json             # Vercel routing config
```

---

## API Routes

| Route | Method | Input | Output |
|---|---|---|---|
| /api/analyze | POST | `{ articleText, imageBase64 }` | `{ verdict, confidenceScore, reasons, redFlags }` |
| /api/history | GET | query: `userId` | Array of past analyses |
| /api/stats | GET | none | `{ total, fakeCount, realCount, uncertainCount }` |

---

## Database Schema (Supabase / PostgreSQL)

**Table 1: analyses** — stores every article analysis result

```sql
CREATE TABLE analyses (
  id               BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  created_at       TIMESTAMPTZ DEFAULT now(),
  user_id          TEXT,
  article_text     TEXT NOT NULL,
  verdict          TEXT NOT NULL,
  confidence_score INT4 NOT NULL,
  reasons          TEXT[] NOT NULL,
  red_flags        TEXT[],
  input_type       TEXT NOT NULL
);
```

**Table 2: stats** — single row global stats counter (always id = 1)

```sql
CREATE TABLE stats (
  id               INT4 PRIMARY KEY,
  total_analyses   INT4 DEFAULT 0,
  fake_count       INT4 DEFAULT 0,
  real_count       INT4 DEFAULT 0,
  uncertain_count  INT4 DEFAULT 0
);

-- Insert the single row
INSERT INTO stats (id) VALUES (1);
```

> No foreign keys between tables. `analyses.user_id` is a plain text identifier, not a foreign key to any users table. No auth table — kept simple for hackathon.

---

## Data Flow

**Text Input:**
```
User pastes article text
  → analyze.js (frontend) sets inputType = 'text'
  → POST /api/analyze with { articleText, inputType }
  → api/analyze.js sends text to Groq LLaMA 3.3
  → Groq extracts 3 key claims from the article
  → api/analyze.js sends claims to Tavily
  → Tavily fetches live web evidence & news snippets
  → api/analyze.js sends claims + evidence to Groq for cross-verification
  → Groq returns { verdict, confidenceScore, reasons, redFlags }
  → api/analyze.js saves result to Supabase analyses table
  → api/analyze.js increments stats in Supabase stats table
  → Returns result to frontend
  → result.html displays verdict, meter, reasons, share button
```

**Image Upload:**
```
User uploads WhatsApp screenshot
  → analyze.js (frontend) converts image to base64
  → sets inputType = 'image'
  → POST /api/analyze with { imageBase64, inputType }
  → api/analyze.js sends image to Gemini 1.5 Pro Vision API
  → Gemini performs OCR and extracts text from image
  → Same pipeline as text input from here onwards
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Vercel account
- A Supabase project
- API keys for Groq, Gemini, and Tavily

### 1. Clone the repository

```bash
git clone https://github.com/TanjilVhora/TruthLens
cd truthlens
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
TAVILY_API_KEY=your_tavily_api_key
```

Where to find each value:

| Variable | Location |

| `SUPABASE_URL` | Supabase Dashboard > Project Settings > API > Project URL |
| `SUPABASE_ANON_KEY` | Supabase Dashboard > Project Settings > API > anon public key |
| `GEMINI_API_KEY` | aistudio.google.com > Get API Key |
| `GROQ_API_KEY` | console.groq.com > API Keys |
| `TAVILY_API_KEY` | app.tavily.com > API Keys |

### 4. Set up the database

Run both SQL blocks from the Database Schema section above in your Supabase SQL editor.

### 5. Deploy to Vercel

```bash
vercel deploy
```

Add all environment variables in your Vercel project settings under **Environment Variables**.

---

## Team

| Name | Role |

| Tanjil | Backend, AI Pipeline, API Integration |
| Asmita | Frontend, UI/UX |

---

## License

MIT License — free to use, modify, and distribute.