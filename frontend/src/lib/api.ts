export type ExerciseId = "squat" | "shoulder_abduction";

export interface FrameMetricsPayload {
  session_id: string;
  timestamp: number;
  exercise_id: ExerciseId;
  pain_level: number;
  landmarks: Record<string, { x: number; y: number; z: number; visibility: number }>;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init
  });
  if (!response.ok) {
    throw new Error(`API error ${response.status}`);
  }
  return response.json() as Promise<T>;
}

export const api = {
  assessment: (payload: Record<string, unknown>) =>
    request<{ assessment_id: string; program_name: string; recommended_sessions_per_week: number }>("/api/assessment", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  sessionStart: (exercise_id: ExerciseId) =>
    request<{ session_id: string; started_at: string }>("/api/session/start", {
      method: "POST",
      body: JSON.stringify({ exercise_id })
    }),
  frameMetrics: (payload: FrameMetricsPayload) =>
    request<{ rep_count: number; rom_score: number; form_score: number; cue_text: string; risk_flag: boolean }>(
      "/api/session/frame-metrics",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    ),
  sessionComplete: (session_id: string) =>
    request<{ total_reps: number; average_rom_score: number; average_form_score: number }>("/api/session/complete", {
      method: "POST",
      body: JSON.stringify({ session_id })
    }),
  progressSummary: () =>
    request<{ adherence_pct: number; pain_reduction_pct: number; recovery_score: number; weekly_streak_days: number; milestones: string[] }>(
      "/api/progress/summary"
    ),
  outcomesDemo: () =>
    request<{ covered_lives: number; adherence_improvement_pct: number; pain_reduction_avg_pct: number; productivity_proxy_gain_pct: number; estimated_claim_savings_pct: number }>(
      "/api/outcomes/demo"
    ),
  triageCheck: (pain_level: number, red_flags: string[]) =>
    request<{ risk_level: "low" | "moderate" | "high"; recommendation: string; telept_referral: boolean }>("/api/triage/check", {
      method: "POST",
      body: JSON.stringify({ pain_level, red_flags })
    })
};