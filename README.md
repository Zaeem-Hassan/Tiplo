# AI Physio Investor Prototype

React + FastAPI prototype with live MediaPipe pose tracking and investor-focused rehab metrics.

## Structure

- `frontend/` React + Vite web app 
- `backend/` FastAPI APIs for assessment, sessions, scoring, progress, triage, outcomes

## Local run

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
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
VITE_API_BASE_URL=http://localhost:8000
```

## Railway deployment (both frontend + backend)

Create one Railway project with two services from this same repo.

### 1. Backend service

- Root directory: `backend`
- Builder: Dockerfile (auto-detected)
- Exposed port: use Railway `PORT` env (already handled)
- Start command: handled by `backend/Dockerfile`

Backend env vars:

```bash
CORS_ORIGINS=https://<your-frontend-domain>.up.railway.app
```

For multiple frontend domains, comma-separate values.

### 2. Frontend service

- Root directory: `frontend`
- Builder: Dockerfile (auto-detected)
- Start command: handled by `frontend/Dockerfile`

Frontend env vars:

```bash
VITE_API_BASE_URL=https://<your-backend-domain>.up.railway.app
```

### 3. Redeploy frontend after backend URL is available

After backend is live and you set `VITE_API_BASE_URL`, trigger a frontend redeploy so Vite rebuilds with the correct API URL.

## API health check

- `GET /health` should return `{ "status": "ok" }`
