from __future__ import annotations

from statistics import mean

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    AssessmentRequest,
    AssessmentResponse,
    FrameMetricsRequest,
    FrameMetricsResponse,
    OutcomesDemoResponse,
    ProgressSummaryResponse,
    SessionCompleteRequest,
    SessionCompleteResponse,
    SessionStartRequest,
    SessionStartResponse,
    TriageRequest,
    TriageResponse,
)
from .scoring import SessionState, score_frame
from .store import store

app = FastAPI(title="AI Physio Prototype API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/assessment", response_model=AssessmentResponse)
def create_assessment(payload: AssessmentRequest) -> AssessmentResponse:
    assessment_id = store.new_id("asmt")
    return AssessmentResponse(
        assessment_id=assessment_id,
        program_name=f"{payload.body_region.title()} Mobility Accelerator",
        recommended_sessions_per_week=4 if payload.pain_baseline >= 6 else 3,
    )


@app.post("/api/session/start", response_model=SessionStartResponse)
def start_session(payload: SessionStartRequest) -> SessionStartResponse:
    session_id = store.new_id("sess")
    state = SessionState(session_id=session_id, exercise_id=payload.exercise_id)
    store.sessions[session_id] = state
    return SessionStartResponse(session_id=session_id, started_at=store.utc_now())


@app.post("/api/session/frame-metrics", response_model=FrameMetricsResponse)
def frame_metrics(payload: FrameMetricsRequest) -> FrameMetricsResponse:
    state = store.sessions.get(payload.session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if payload.exercise_id != state.exercise_id:
        raise HTTPException(status_code=400, detail="exercise_id mismatch for session")

    result = score_frame(state, payload.landmarks, payload.pain_level)
    return FrameMetricsResponse(**result)


@app.post("/api/session/complete", response_model=SessionCompleteResponse)
def complete_session(payload: SessionCompleteRequest) -> SessionCompleteResponse:
    state = store.sessions.get(payload.session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    avg_rom = int(mean(state.rom_scores)) if state.rom_scores else 0
    avg_form = int(mean(state.form_scores)) if state.form_scores else 0

    return SessionCompleteResponse(
        session_id=payload.session_id,
        total_reps=state.reps,
        average_rom_score=avg_rom,
        average_form_score=avg_form,
        completed_at=store.utc_now(),
    )


@app.get("/api/progress/summary", response_model=ProgressSummaryResponse)
def progress_summary() -> ProgressSummaryResponse:
    return ProgressSummaryResponse(
        adherence_pct=84,
        pain_reduction_pct=38,
        recovery_score=79,
        weekly_streak_days=5,
        milestones=["Pain below 4/10", "Shoulder ROM +22%", "Completed 12 sessions"],
    )


@app.get("/api/outcomes/demo", response_model=OutcomesDemoResponse)
def outcomes_demo() -> OutcomesDemoResponse:
    return OutcomesDemoResponse(
        covered_lives=2500,
        adherence_improvement_pct=31,
        pain_reduction_avg_pct=36,
        productivity_proxy_gain_pct=14,
        estimated_claim_savings_pct=18,
    )


@app.post("/api/triage/check", response_model=TriageResponse)
def triage_check(payload: TriageRequest) -> TriageResponse:
    red_flag_hit = len(payload.red_flags) > 0

    if payload.pain_level >= 8 or red_flag_hit:
        return TriageResponse(
            risk_level="high",
            recommendation="Stop exercise and connect with tele-PT within 24 hours.",
            telept_referral=True,
        )

    if payload.pain_level >= 5:
        return TriageResponse(
            risk_level="moderate",
            recommendation="Reduce intensity and monitor symptoms. Consider tele-PT if persistent.",
            telept_referral=True,
        )

    return TriageResponse(
        risk_level="low",
        recommendation="Continue program with normal progression.",
        telept_referral=False,
    )