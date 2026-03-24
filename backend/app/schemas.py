from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

ExerciseId = Literal["squat", "shoulder_abduction"]


class AssessmentRequest(BaseModel):
    patient_id: str = Field(default="demo-patient")
    body_region: str
    pain_baseline: int = Field(ge=0, le=10)
    mobility_self_score: int = Field(ge=1, le=5)
    contraindications: List[str] = Field(default_factory=list)


class AssessmentResponse(BaseModel):
    assessment_id: str
    program_name: str
    recommended_sessions_per_week: int


class SessionStartRequest(BaseModel):
    patient_id: str = Field(default="demo-patient")
    exercise_id: ExerciseId


class SessionStartResponse(BaseModel):
    session_id: str
    started_at: str


class Landmark(BaseModel):
    x: float
    y: float
    z: float = 0.0
    visibility: float = Field(ge=0.0, le=1.0)


class FrameMetricsRequest(BaseModel):
    session_id: str
    timestamp: float
    exercise_id: ExerciseId
    pain_level: int = Field(ge=0, le=10)
    landmarks: Dict[str, Landmark]


class FrameMetricsResponse(BaseModel):
    rep_count: int
    rom_score: int = Field(ge=0, le=100)
    form_score: int = Field(ge=0, le=100)
    cue_text: str
    risk_flag: bool


class SessionCompleteRequest(BaseModel):
    session_id: str


class SessionCompleteResponse(BaseModel):
    session_id: str
    total_reps: int
    average_rom_score: int
    average_form_score: int
    completed_at: str


class ProgressSummaryResponse(BaseModel):
    adherence_pct: int
    pain_reduction_pct: int
    recovery_score: int
    weekly_streak_days: int
    milestones: List[str]


class OutcomesDemoResponse(BaseModel):
    covered_lives: int
    adherence_improvement_pct: int
    pain_reduction_avg_pct: int
    productivity_proxy_gain_pct: int
    estimated_claim_savings_pct: int


class TriageRequest(BaseModel):
    pain_level: int = Field(ge=0, le=10)
    red_flags: List[str] = Field(default_factory=list)


class TriageResponse(BaseModel):
    risk_level: Literal["low", "moderate", "high"]
    recommendation: str
    telept_referral: bool