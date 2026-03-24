#!/usr/bin/env bash
set -euo pipefail

OPENCLAW_DIR="$HOME/.openclaw"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "  Registering OpenClaw agents..."

# Create workspace directories
mkdir -p "$OPENCLAW_DIR/workspace-omni/skills"
mkdir -p "$OPENCLAW_DIR/workspace-omni/agents/division-builder/skills"

# Create agent directories
agents=("orchestrator" "division-builder")

for agent in "${agents[@]}"; do
  agent_dir="$OPENCLAW_DIR/agents/$agent/agent"
  session_dir="$OPENCLAW_DIR/agents/$agent/sessions"

  mkdir -p "$agent_dir"
  mkdir -p "$session_dir"

  echo "  ✅ Agent directory created: $agent"
done

# Copy agent configs (AGENTS.md, SOUL.md)
echo "  Copying agent configurations..."

# Orchestrator
cp "$PROJECT_DIR/agents/orchestrator/AGENTS.md" "$OPENCLAW_DIR/workspace-omni/AGENTS.md"
cp "$PROJECT_DIR/agents/orchestrator/SOUL.md" "$OPENCLAW_DIR/workspace-omni/SOUL.md"

# Orchestrator skills
cp -r "$PROJECT_DIR/agents/orchestrator/skills/"* "$OPENCLAW_DIR/workspace-omni/skills/" 2>/dev/null || true

# Division Builder
cp "$PROJECT_DIR/agents/division-builder/AGENTS.md" "$OPENCLAW_DIR/workspace-omni/agents/division-builder/AGENTS.md"
cp "$PROJECT_DIR/agents/division-builder/SOUL.md" "$OPENCLAW_DIR/workspace-omni/agents/division-builder/SOUL.md"

# Division Builder skills
cp -r "$PROJECT_DIR/agents/division-builder/skills/"* "$OPENCLAW_DIR/workspace-omni/agents/division-builder/skills/" 2>/dev/null || true

# Shared skills
cp -r "$PROJECT_DIR/skills/"* "$OPENCLAW_DIR/workspace-omni/skills/" 2>/dev/null || true

echo "  ✅ All agent configurations copied"

# Register via CLI (if gateway is running)
if openclaw agents list &>/dev/null; then
  for agent in "${agents[@]}"; do
    openclaw agents add "$agent" 2>/dev/null || echo "  ⚠️  Agent '$agent' may already be registered"
  done
  echo "  ✅ Agents registered with Gateway"
else
  echo "  ⚠️  Gateway not running. Agents will be registered on next gateway start."
fi
