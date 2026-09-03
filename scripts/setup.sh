#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# AI Finance Copilot — Project Setup Script
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC}  $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Check prerequisites ─────────────────────────────────────────────────────

info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || error "Node.js is not installed. Install Node 22+: https://nodejs.org"
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  error "Node.js 20+ is required (found v$(node -v))"
fi
info "Node.js $(node -v) ✓"

command -v python >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1 || error "Python is not installed."
PYTHON_CMD=$(command -v python3 || command -v python)
PYTHON_VERSION=$($PYTHON_CMD --version 2>&1 | grep -oP '\d+\.\d+')
info "Python $PYTHON_VERSION ✓"

command -v docker >/dev/null 2>&1 || warn "Docker is not installed. You can still run without containers."

# ── Copy .env.example to .env ───────────────────────────────────────────────

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [ ! -f "$PROJECT_ROOT/backend/.env" ]; then
  cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/backend/.env"
  info "Created backend/.env from .env.example"
else
  warn "backend/.env already exists — skipping"
fi

if [ ! -f "$PROJECT_ROOT/frontend/.env" ]; then
  cat > "$PROJECT_ROOT/frontend/.env" <<'EOF'
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
EOF
  info "Created frontend/.env"
else
  warn "frontend/.env already exists — skipping"
fi

# ── Install frontend dependencies ───────────────────────────────────────────

info "Installing frontend dependencies..."
cd "$PROJECT_ROOT/frontend"
npm install
info "Frontend dependencies installed ✓"

# ── Install backend dependencies ────────────────────────────────────────────

info "Installing backend dependencies..."
cd "$PROJECT_ROOT/backend"
if [ -d "venv" ] || [ -d ".venv" ]; then
  warn "Virtual environment detected — activating"
  source venv/bin/activate 2>/dev/null || source .venv/bin/activate 2>/dev/null || true
fi
pip install -r requirements.txt
info "Backend dependencies installed ✓"

# ── Run database migrations ─────────────────────────────────────────────────

info "Running Alembic migrations..."
cd "$PROJECT_ROOT/backend"
alembic upgrade head 2>/dev/null && info "Migrations applied ✓" || warn "Migration failed — check DATABASE_URL in .env"

# ── Done ────────────────────────────────────────────────────────────────────

echo ""
info "Setup complete! To start the application:"
echo ""
echo "  Docker:    docker compose up"
echo "  Manual:"
echo "    Backend:  cd backend && uvicorn backend.main:app --reload --port 8000"
echo "    Frontend: cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser."
