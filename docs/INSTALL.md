# Omni v2 — Installation Guide

## Prerequisites

- Node.js 20+
- OpenClaw CLI (`curl -fsSL https://openclaw.ai/install.sh | bash`)
- Supabase account (free tier works for Phase 0-1)
- OpenAI API key

## Quick Start

### 1. Clone & Setup

```bash
git clone <repo-url> omni
cd omni
cp .env.example .env
# Edit .env with your API keys
```

### 2. Supabase

Apply migrations in order:

```bash
# Via Supabase CLI
supabase db push

# Or via Supabase Dashboard SQL Editor:
# Run supabase/migrations/001_initial_schema.sql
# Run supabase/migrations/002_rpc_functions.sql
# Run supabase/migrations/003_cost_limits_and_security.sql
```

### 3. OpenClaw

```bash
# Setup (copies configs, registers agents)
bash scripts/setup.sh
```

### 4. Dashboard

```bash
cd dashboard
npm install
cp .env.local.example .env.local
# Edit .env.local with Supabase credentials
npm run dev
```

Open http://localhost:3000

### 5. Test

```bash
# Health check
openclaw health

# Test Division Builder
openclaw agent --agent division-builder -m "온라인 사업을 하고 싶어"
```

## Architecture

```
Omni OS
├── Meta Layer — Division Builder, Self-Awareness, Institutional Memory
├── Business Logic — Division Manager, Rules Engine, Strategy Layer
├── Agent Runtime — OpenClaw Gateway + Agents + ClawHub
├── Data — Supabase (PostgreSQL + Realtime + pgvector)
└── Interface — Next.js Dashboard
```

See `docs/ARCHITECTURE.md` for details.
