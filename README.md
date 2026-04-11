# TruthLens — Real-Time AI Fact-Checker

> Paste a news claim or forward a WhatsApp message. TruthLens tells you if it is Real, Fake, or Uncertain — backed by live web evidence.


---

## How It Works

TruthLens uses a multi-model hybrid pipeline to fact-check any claim with real-time web evidence.

```
User Input (Text or Image)
        |
   Input Type?
   |                          |
   Image                    Text
   Gemini 1.5 Pro (OCR)     Groq LLaMA 3.3
   extracts text             extracts 3 key claims
        |                          |
        +----------+---------------+
                   |
        Tavily — Real-Time Web Research
        (fetches live news & evidence)
                   |
        Groq LLaMA 3.3 — Cross-Verification
                   |
        Final JSON Verdict:
        { verdict, confidence_score, reasons, red_flags }
```

---

## Features

- **Text Input** — paste any news claim or WhatsApp forward directly
- **Image Input** — upload a screenshot, OCR extracts the text automatically
- **Live Web Research** — Tavily fetches real-time news to verify claims
- **Hybrid AI** — Groq for speed, Gemini for vision-based OCR
- **Anti-Hallucination** — verdicts are grounded in live evidence, not model memory
- **Claim Sniping** — targets specific false claims, not just surface-level keywords
- **Confidence Score** — indicates how certain the verdict is
- **Red Flags** — highlights exactly what is suspicious about a claim
- **Analysis Logging** — every check is stored in Supabase for stats and history

---

## Tech Stack

| Layer                                  | Technology 
| Frontend                               | HTML, CSS, JavaScript 
|Backend                                 | Node.js
| Hosting                                | Vercel 
| AI — Claim Extraction and Verification | Groq API (LLaMA 3.3) 
| AI — Image OCR                         | Gemini 1.5 Pro 
| Web Research                           | Tavily Search API 
| Database                               | Supabase (PostgreSQL) 

---

## Database Schema

```sql
CREATE TABLE analyses (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  input_type  TEXT CHECK (input_type IN ('text', 'image')),
  input_text  TEXT,
  verdict     TEXT CHECK (verdict IN ('Real', 'Fake', 'Uncertain')),
  confidence  INT,
  reasons     TEXT[],
  red_flags   TEXT[],
  created_at  TIMESTAMP DEFAULT now()
);
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- A Vercel account
- API keys for: Groq, Gemini, Tavily
- A Supabase project

### 1. Clone the repository

```bash
git clone https://github.com/TanjilVhora/TruthLens
cd truthlens
```

### 2. Configure environment variables

Create a `.env` file in the root directory:

```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
SUPABASE_URL=//your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run locally

```bash
npm install
npm run dev
```

### 4. Deploy to Vercel

```bash
vercel deploy
```

Add all environment variables in your Vercel project settings under **Environment Variables** before deploying.

---

## Project Structure

```
truthlens/
├── public/
│   ├── index.html          (Landing page)
│   ├── analyze.html        (Analysis input page)
│   ├── result.html         (Result display page)
│   ├── history.html        (User analysis history page)
│   ├── css/
│   │   └── style.css       (Global styles)
│   └── js/
│       ├── analyze.js      (Handles input, API call, result display)
│       ├── history.js      (Fetches and displays history)
│       ├── stats.js        (Fetches and displays global stats)
│       └── share.js        (html2canvas share feature)
├── api/
│   ├── analyze.js          (POST: sends article to Gemini, saves to Supabase)
│   ├── history.js          (GET: fetches user analysis history from Supabase)
│   └── stats.js            (GET: fetches global stats from Supabase)

```

---

## Sample Verdict Response

```json
{
  "verdict": "Fake",
  "confidence_score": 91,
  "reasons": [
    "No credible source confirms this claim",
    "Official statement directly contradicts it",
    "Same claim was debunked by AFP Fact Check in March 2024"
  ],
  "red_flags": [
    "Emotionally charged language",
    "No author or date mentioned",
    "Originated from unverified Telegram channel"
  ]
}
```

---

## Team



| Name    | Role |
__________________________________________________
| Tanjil  | Backend, AI Pipeline, API Integration |
| Asmita  | Frontend, UI/UX |

---

## License

MIT License — free to use, modify, and distribute.