# AI Physio Investor Prototype Backend

FastAPI backend for demo APIs:
- assessment
- session lifecycle + frame metrics scoring
- progress summary
- outcomes demo analytics
- triage checks

## Run locally

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Run tests

```bash
cd backend
pytest -q
```