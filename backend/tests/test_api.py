from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def sample_landmarks():
    return {
        "left_hip": {"x": 0.42, "y": 0.55, "z": 0.0, "visibility": 0.92},
        "left_knee": {"x": 0.43, "y": 0.7, "z": 0.0, "visibility": 0.94},
        "left_ankle": {"x": 0.43, "y": 0.88, "z": 0.0, "visibility": 0.95},
        "right_hip": {"x": 0.58, "y": 0.55, "z": 0.0, "visibility": 0.9},
        "right_knee": {"x": 0.57, "y": 0.7, "z": 0.0, "visibility": 0.93},
        "right_ankle": {"x": 0.57, "y": 0.88, "z": 0.0, "visibility": 0.95},
    }


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_assessment_contract():
    payload = {
        "body_region": "shoulder",
        "pain_baseline": 6,
        "mobility_self_score": 3,
        "contraindications": [],
    }
    response = client.post("/api/assessment", json=payload)
    body = response.json()
    assert response.status_code == 200
    assert "assessment_id" in body
    assert body["recommended_sessions_per_week"] in [3, 4]


def test_session_lifecycle_contract():
    start = client.post("/api/session/start", json={"exercise_id": "squat"})
    assert start.status_code == 200
    session_id = start.json()["session_id"]

    frame = client.post(
        "/api/session/frame-metrics",
        json={
            "session_id": session_id,
            "timestamp": 1.0,
            "exercise_id": "squat",
            "pain_level": 2,
            "landmarks": sample_landmarks(),
        },
    )
    assert frame.status_code == 200
    frame_body = frame.json()
    assert set(frame_body.keys()) == {"rep_count", "rom_score", "form_score", "cue_text", "risk_flag"}

    complete = client.post("/api/session/complete", json={"session_id": session_id})
    assert complete.status_code == 200
    comp = complete.json()
    assert comp["session_id"] == session_id
    assert "average_form_score" in comp


def test_demo_endpoints():
    p = client.get("/api/progress/summary")
    o = client.get("/api/outcomes/demo")
    assert p.status_code == 200
    assert o.status_code == 200


def test_triage_risk_levels():
    low = client.post("/api/triage/check", json={"pain_level": 2, "red_flags": []})
    high = client.post("/api/triage/check", json={"pain_level": 9, "red_flags": ["night_pain"]})
    assert low.json()["risk_level"] == "low"
    assert high.json()["risk_level"] == "high"