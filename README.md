# Aurion

> **Your personal finance intelligence companion.** Understand your money, build healthier financial habits, and plan ahead with an AI-powered financial workspace.

Aurion combines transaction tracking, financial analysis, goal and debt planning, forecasting, and a conversational AI assistant in one modern dashboard. It is designed to turn financial records into understandable insights—not just charts and numbers.

## ✨ Highlights

- **Personalized financial dashboard** — View key financial indicators, spending patterns, income and expense summaries, and recent activity.
- **Transaction management** — Add transactions manually or import records from supported files; edit categories and transaction details.
- **Statement import & review** — Parse CSV and Excel spreadsheets, review extracted transaction drafts, and detect likely duplicates before importing.
- **PDF statement extraction** — Use Gemini to extract transaction rows from bank statement PDFs for review and import.
- **Smart categorization** — Categorize transactions using merchant and description keywords, with confidence levels for uncertain matches.
- **Financial health insights** — Analyze cash flow, spending categories, recurring payments, subscriptions, and unusually large expenses.
- **Cash-flow forecasting** — Estimate month-end cash flow using transaction history, recurring expenses, profile inputs, and available balances.
- **Debt planning** — Track debts, interest rates, monthly EMIs, and repayment-related information.
- **Savings goals** — Create goals, track progress, set target dates, and plan monthly contributions.
- **AI finance assistant** — Ask contextual questions about your financial data and receive concise answers, follow-up prompts, and a data-coverage notice.
- **Reports** — Explore financial summaries and visualizations.
- **Voice assistant support** — Voice interaction settings and speech controls are included.
- **Demo experience** — Explore Aurion with sample financial data without needing to start with your own records.
- **3D visual experience** — Three.js / React Three Fiber scenes, a custom lion character, and an animated loading experience bring personality to the interface.

## 🧠 How Aurion works

1. **Create a profile or enter demo mode.** Configure your preferences, currency, income, and financial experience.
2. **Add financial data.** Enter transactions manually or import statement data from CSV, Excel, or PDF.
3. **Review imports.** Check parsed transaction drafts, categories, and duplicate warnings before confirming.
4. **Explore your financial overview.** Review cash flow, spending categories, recurring charges, anomalies, and forecasts.
5. **Plan ahead.** Set savings goals and manage debt details.
6. **Ask Aurion.** Chat with the AI assistant using the financial context and analysis available in your account.

## 🛠️ Tech stack

### Frontend
- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- Motion
- Recharts
- Three.js
- React Three Fiber
- Drei
- Lucide React

### Backend
- Node.js
- Express
- TypeScript / TSX
- SQLite via `better-sqlite3`
- Google Gemini API via `@google/genai`

### Supporting libraries
- SheetJS (`xlsx`) — spreadsheet parsing
- jsPDF — PDF/report-related functionality
- dotenv — environment configuration

## 🗂️ Project structure

```
Aurion/
├── public/                 # Public assets
├── src/
│   ├── components/
│   │   ├── 3d/             # 3D scenes, lion character, loading experience
│   │   ├── AppShell.tsx    # Main application layout
│   │   └── ...             # Shared UI and transaction components
│   ├── data/               # Demo data
│   ├── hooks/               # React hooks, including voice assistant
│   ├── pages/               # Welcome, onboarding, dashboard, planning, reports, etc.
│   ├── types/               # Finance and application types
│   ├── utils/               # Finance engine, parsing, currency, utilities
│   ├── App.tsx
│   └── main.tsx
├── server.ts                # Express API + Vite development middleware
├── package.json
├── bun.lock
├── vite.config.ts
└── .env.example
```

## 🚀 Getting started

### Prerequisites

- [Bun](https://bun.sh/) (recommended, as the repository includes a Bun lockfile)
- A Google Gemini API key for AI chat and PDF statement extraction

### 1. Clone the repository

```bash
git clone https://github.com/trulyayush/Aurion-.git
cd Aurion-
```

### 2. Install dependencies

```bash
bun install
```

### 3. Configure environment variables

Copy the example environment file and add your Gemini API key:

```bash
cp .env.example .env
```

Update `.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
APP_URL=http://localhost:3000
```

> Keep your API key private. Never commit your real `.env` file or secrets to version control.

### 4. Run the application

```bash
bun run dev
```

Open **http://localhost:3000** in your browser.

The development server runs Express and Vite together. The server initializes the local SQLite database automatically.

### 5. Production build

```bash
bun run build
```

To preview the Vite production build:

```bash
bun run preview
```

The server supports serving the built frontend when `NODE_ENV=production` and the `dist` directory exists.

## 📊 Financial intelligence

Aurion's finance engine provides logic for:

- Transaction categorization and merchant-name cleanup
- Duplicate transaction checks
- Recurring-payment and subscription detection
- Spending anomaly detection
- Monthly income and expense summaries
- Cash-flow forecasting
- Financial health scoring and factor breakdowns
- Financial goal and debt-related planning

Insights depend on the amount, quality, and time span of data available. Forecasts and AI-generated guidance are estimates and should not be treated as guaranteed outcomes or professional financial advice.

## 🔐 Privacy & data

- Financial records are stored in a local SQLite database for the running application.
- Authentication and session handling are implemented by the application server.
- AI features send relevant financial context to the Gemini API to generate responses or parse statement data.
- Use synthetic/demo records when presenting or testing the application.
- Review the application's data handling and deployment configuration before using it with real sensitive financial records.

**Repository hygiene:** Avoid committing generated database files (including SQLite WAL files), real financial data, API keys, or other secrets. Ensure these are excluded by `.gitignore`.

## 🧪 Available scripts

| Command | Description |
|---|---|
| `bun run dev` | Start the app server in development mode |
| `bun run start` | Start the server |
| `bun run build` | Build the frontend for production |
| `bun run preview` | Preview the Vite production build |
| `bun run lint` | Run TypeScript type-checking (`tsc --noEmit`) |
| `bun run clean` | Remove build output and generated server bundle |

## ⚠️ Disclaimer

Aurion is an educational and personal-finance productivity project. Its analytics and AI outputs are informational and are not a substitute for professional financial, tax, legal, or investment advice. Verify important decisions independently.

## 🌱 Future improvements

Potential areas for future development include secure bank integrations, expanded budgeting workflows, richer forecasting models, improved import support for bank-specific formats, accessibility improvements, and more comprehensive automated tests.

## 👤 Author

**Ayush Kumar Nayak**

- GitHub: [@trulyayush](https://github.com/trulyayush)

## ⭐ Support

If Aurion is useful or interesting, consider giving the repository a star or sharing feedback through GitHub issues.

---

<p align="center">Built to make personal finance clearer, more actionable, and easier to understand.</p>
