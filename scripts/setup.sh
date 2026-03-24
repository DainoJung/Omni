#!/usr/bin/env bash
set -euo pipefail

echo "=== Omni v2 — Phase 0 Setup ==="
echo ""

# 1. Check prerequisites
echo "[1/6] Checking prerequisites..."

if ! command -v openclaw &> /dev/null; then
  echo "  ❌ OpenClaw CLI not found. Install: curl -fsSL https://openclaw.ai/install.sh | bash"
  exit 1
fi
echo "  ✅ OpenClaw CLI found"

if ! command -v supabase &> /dev/null; then
  echo "  ⚠️  Supabase CLI not found. Install: brew install supabase/tap/supabase"
  echo "     (Optional — can use Supabase dashboard instead)"
fi

# 2. Check .env
echo ""
echo "[2/6] Checking environment variables..."

if [ ! -f .env ]; then
  echo "  ❌ .env file not found. Copy .env.example and fill in your keys:"
  echo "     cp .env.example .env"
  exit 1
fi

source .env

required_vars=("OPENAI_API_KEY" "SUPABASE_URL" "SUPABASE_SERVICE_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var:-}" ]; then
    echo "  ❌ $var is not set in .env"
    exit 1
  fi
  echo "  ✅ $var is set"
done

# 3. OpenClaw Gateway setup
echo ""
echo "[3/6] Setting up OpenClaw Gateway..."

OPENCLAW_DIR="$HOME/.openclaw"
mkdir -p "$OPENCLAW_DIR"

if [ ! -f "$OPENCLAW_DIR/openclaw.json" ]; then
  cp openclaw.json "$OPENCLAW_DIR/openclaw.json"
  echo "  ✅ openclaw.json copied to $OPENCLAW_DIR/"
else
  echo "  ⚠️  openclaw.json already exists. Skipping. (Compare with ./openclaw.json manually)"
fi

# 4. Register agents
echo ""
echo "[4/6] Registering agents..."
bash scripts/register-agents.sh

# 5. Cron jobs
echo ""
echo "[5/6] Setting up cron jobs..."

mkdir -p "$OPENCLAW_DIR/cron"
cp cron/jobs.json "$OPENCLAW_DIR/cron/jobs.json"
echo "  ✅ Cron jobs configured"

# 6. Summary
echo ""
echo "[6/6] Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Run Supabase migrations: supabase db push (or apply via dashboard)"
echo "  2. Connect Discord: openclaw channels login --channel discord --account omni-bot"
echo "  3. Start Gateway: openclaw gateway restart"
echo "  4. Test: Send 'health check' via WebChat (http://localhost:18789)"
echo ""
echo "Phase 0 Go 조건:"
echo "  '블로그 사업 하고 싶어'라고 입력 → 시스템이 에이전트 구성안을 제안하는가?"
