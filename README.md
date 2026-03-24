# AI Physio Investor Prototype

React + FastAPI prototype with live MediaPipe pose tracking and investor-focused outcome storytelling.

## Structure

- `frontend/` React + Vite web app (5 screens, no-login demo)
- `backend/` FastAPI APIs for assessment, sessions, scoring, progress, triage, outcomes

## Local run

### Backend

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set `frontend/.env`:

```bash
VITE_API_BASE=http://localhost:8000
```

## Deploy

- Frontend: Vercel (`frontend/` project root)
- Backend: Render Web Service
  - Build: `pip install -r requirements.txt`
  - Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

## Demo flow

1. Landing
2. Onboarding (choose squat or shoulder abduction)
3. Live camera session with pose overlay and feedback
4. Progress dashboard
5. Stakeholder outcomes view