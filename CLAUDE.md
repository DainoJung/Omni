# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Omni** — AI-powered POP (Point of Purchase) promotional page generator for SSG e-commerce. Users input products, select a page type, and the system generates complete HTML section layouts with AI-generated copy and images via Google Gemini. The result is an editable WYSIWYG editor with export to PNG/JPG.

## Architecture

```
frontend/    Next.js 14 (App Router) + TypeScript + Tailwind CSS + Zustand
backend/     FastAPI (Python 3.11) + Google Gemini API + Supabase
supabase/    PostgreSQL migrations (31 files), RLS policies, Storage buckets
```

**Data flow**: Frontend REST calls → FastAPI backend → Gemini AI (text + image generation) → Supabase (DB + Storage) → Rendered HTML sections returned to frontend editor.

**Key integration points**:
- Backend uses `google-genai` SDK: `gemini-3-flash-preview` for text, `gemini-2.5-flash-image` for images
- AWS Bedrock (`amazon.nova-canvas-v1:0`) for background removal
- Supabase Storage buckets: `project-images`, `templates`
- Auth: SHA256 password hashing + HS256 JWT (72h expiry), stored in localStorage

## Development Commands

### Frontend (from `frontend/`)
```bash
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
```

### Backend (from `backend/`)
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Full Stack (from root)
```bash
docker-compose up    # Runs both frontend (3000) and backend (8000)
```

### Database
Migrations are in `supabase/migrations/` — applied via Supabase dashboard or CLI. No local migration runner script.

## Backend Architecture

**Entry point**: `backend/app/main.py` — FastAPI app with 8 routers under `/api/`.

**Router → Service pattern**:
- `routers/generate.py` → `services/generate_orchestrator.py` — Main content generation pipeline (5 stages: page type resolution → product image download → AI text gen → parallel image gen (max 2 concurrent) → HTML template rendering)
- `routers/projects.py` — CRUD + section data updates + image regeneration
- `routers/images.py` → `services/bg_remove_service.py` — Background removal via AWS Bedrock
- `routers/upload.py` → `services/storage_service.py` — File upload to Supabase Storage

**6 page types** defined in `app/constants/page_types.py`: `product_detail`, `promotion`, `brand_promotion`, `vip_special`, `vip_private`, `gourmet`. Each has accent colors, section mappings, background prompts, and copy keywords.

**Config**: `app/config.py` uses `pydantic-settings` to load from environment.

**Auth**: `app/dependencies/auth.py` provides `get_current_user` and `get_admin_user` FastAPI dependencies. Default admin: `admin/ssg2026!`.

## Frontend Architecture

**Pages** (App Router):
- `/` — Project list or new project form
- `/login` — Username/password auth
- `/result/[projectId]` — Main WYSIWYG editor (the core UI)

**State management**: Zustand store in `stores/editorStore.ts` — manages sections array with full undo/redo history (max 50 snapshots via `hooks/useHistory.ts`).

**API client**: `lib/api.ts` — Centralized REST client with Bearer token auth. Auto-redirects to `/login` on 401.

**Key lib modules**:
- `lib/export.ts` — Image export pipeline: font loading → image URL inlining (LRU cache, max 50) → background effect baking → `html-to-image` capture
- `lib/imageUrl.ts` — Supabase image optimization via `/render/image/` endpoint with WebP conversion
- `lib/fonts.ts` — Hybrid font system: 8 pre-loaded Google Fonts (Noto Sans/Serif KR, Playfair Display, Cormorant Garamond, etc.) + dynamic runtime loading

**Component structure**:
- `components/editor/` — SectionRenderer, SectionBlock, TextToolbar, BackgroundPanel, sidebars (SectionList, ImageGallery, Chat)
- `components/forms/` — ProjectInputForm (multi-step wizard), PageTypeSelector (with wireframe previews)
- `components/auth/` — AuthGuard (skips auth on localhost), ClientLayout
- `components/ui/` — Button (primary/secondary/ghost), Input, ProgressBar

## Database Schema (Supabase PostgreSQL)

**Core tables**:
- `projects` — User projects with `rendered_sections` (JSONB), `edit_history` (JSONB), FK to themes/templates
- `project_images` — Image assets with `storage_path`, `sort_order`, CASCADE delete with project
- `section_templates` — HTML/CSS templates with `{{placeholder}}` syntax, `placeholders` JSONB metadata (type, editable, source)
- `themes` — 5 visual themes with `background_prompt`, `copy_keywords`, `catalog_bg_color`
- `color_presets` — 5 color schemes (fashion, luxury, food, etc.)
- `users` — Multi-account with `is_admin` flag

**Template system**: Section templates use `{{variable}}` placeholders in HTML. Placeholders have metadata: `type` (text/image/html), `editable` (boolean), `source` (ai/theme/product/user). All rendered at 860px width, variable heights.

**RLS**: Currently public access (`USING (true)`) — PoC phase, not production-ready.

## CI/CD

Backend auto-deploys to EC2 on push to `main` (when `backend/**` changes) via `.github/workflows/deploy-backend.yml`. Uses SSH + SCP to EC2, restarts uvicorn. Frontend deployment is separate (not in CI).

## Environment Variables

Copy `.env.example` to `.env` (root), `frontend/.env.local.example` to `frontend/.env.local`, `backend/.env.example` to `backend/.env`.

Key variables: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GEMINI_API_KEY`, `AWS_BEARER_TOKEN_BEDROCK`, `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`).

## Conventions

- Korean UI text throughout (project is for Korean e-commerce market)
- Backend schemas use Pydantic v2 models in `app/schemas/`
- Frontend types centralized in `types/index.ts`
- Tailwind custom theme in `tailwind.config.ts` with admin UI color tokens and template-specific palettes (food, fashion)
- Image uploads validated: PNG/JPEG/WebP only, max 5MB
- Section HTML templates are self-contained with scoped CSS — no global style leakage
