from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Dict

from .schemas import ExerciseId, Landmark


@dataclass
class SessionState:
    session_id: str
    exercise_id: ExerciseId
    reps: int = 0
    in_rep_bottom: bool = False
    rom_scores: list[int] = field(default_factory=list)
    form_scores: list[int] = field(default_factory=list)


def _angle(a: Landmark, b: Landmark, c: Landmark) -> float:
    ab = (a.x - b.x, a.y - b.y)
    cb = (c.x - b.x, c.y - b.y)
    dot = ab[0] * cb[0] + ab[1] * cb[1]
    mag1 = math.hypot(*ab)
    mag2 = math.hypot(*cb)
    if mag1 == 0 or mag2 == 0:
        return 180.0
    cos_value = max(-1.0, min(1.0, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_value))


def _avg_visibility(landmarks: Dict[str, Landmark], keys: list[str]) -> float:
    present = [landmarks[k].visibility for k in keys if k in landmarks]
    if not present:
        return 0.0
    return sum(present) / len(present)


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _squat_metrics(state: SessionState, landmarks: Dict[str, Landmark]):
    required = ["left_hip", "left_knee", "left_ankle", "right_hip", "right_knee", "right_ankle"]
    vis = _avg_visibility(landmarks, required)
    if vis < 0.45:
        return 0, 0, "Adjust camera so hips, knees, and ankles are clearly visible", True

    left = _angle(landmarks["left_hip"], landmarks["left_knee"], landmarks["left_ankle"])
    right = _angle(landmarks["right_hip"], landmarks["right_knee"], landmarks["right_ankle"])
    knee_angle = (left + right) / 2

    depth = _clamp((175 - knee_angle) / 95)
    rom_score = int(depth * 100)

    symmetry_penalty = min(20, int(abs(left - right) * 0.7))
    form_score = max(0, min(100, 92 - symmetry_penalty))

    cue = "Good control"
    if knee_angle > 125:
        cue = "Go slightly deeper"
    elif symmetry_penalty > 10:
        cue = "Keep knees aligned and balanced"

    if not state.in_rep_bottom and knee_angle < 105:
        state.in_rep_bottom = True
    elif state.in_rep_bottom and knee_angle > 155:
        state.reps += 1
        state.in_rep_bottom = False

    return rom_score, form_score, cue, False


def _arm_lift_ratio(shoulder: Landmark, wrist: Landmark) -> float:
    vertical_gain = shoulder.y - wrist.y
    return _clamp((vertical_gain + 0.03) / 0.32)


def _abduction_metrics(state: SessionState, landmarks: Dict[str, Landmark]):
    required = ["left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist"]
    vis = _avg_visibility(landmarks, required)
    if vis < 0.35:
        return 0, 0, "Keep shoulders, elbows, and wrists visible in frame", True

    left_raise = _arm_lift_ratio(landmarks["left_shoulder"], landmarks["left_wrist"])
    right_raise = _arm_lift_ratio(landmarks["right_shoulder"], landmarks["right_wrist"])
    arm_raise = max(left_raise, right_raise)
    rom_score = int(arm_raise * 100)

    balance_penalty = min(24, int(abs(left_raise - right_raise) * 90))
    elbow_drop_penalty = 0
    if left_raise > 0.25 and landmarks["left_elbow"].y - landmarks["left_shoulder"].y > 0.18:
        elbow_drop_penalty += 8
    if right_raise > 0.25 and landmarks["right_elbow"].y - landmarks["right_shoulder"].y > 0.18:
        elbow_drop_penalty += 8

    form_score = max(0, min(100, 92 - balance_penalty - elbow_drop_penalty))

    cue = "Smooth lift"
    if arm_raise < 0.45:
        cue = "Raise your arm until the wrist reaches shoulder height"
    elif balance_penalty > 10:
        cue = "Move both arms evenly"
    elif elbow_drop_penalty > 0:
        cue = "Keep elbows lifted and wrists wide"

    if not state.in_rep_bottom and arm_raise > 0.55:
        state.in_rep_bottom = True
    elif state.in_rep_bottom and arm_raise < 0.18:
        state.reps += 1
        state.in_rep_bottom = False

    return rom_score, form_score, cue, False


def score_frame(state: SessionState, landmarks: Dict[str, Landmark], pain_level: int):
    if state.exercise_id == "squat":
        rom_score, form_score, cue, low_conf = _squat_metrics(state, landmarks)
    else:
        rom_score, form_score, cue, low_conf = _abduction_metrics(state, landmarks)

    state.rom_scores.append(rom_score)
    state.form_scores.append(form_score)

    risk_flag = low_conf or pain_level >= 7 or form_score < 35
    if pain_level >= 7:
        cue = "Pain is high. Pause session and use triage"

    return {
        "rep_count": state.reps,
        "rom_score": rom_score,
        "form_score": form_score,
        "cue_text": cue,
        "risk_flag": risk_flag,
    }
