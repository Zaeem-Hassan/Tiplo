import type { ExerciseId } from "./api";

const POSE_INDEX: Record<string, number> = {
  nose: 0,
  left_shoulder: 11,
  right_shoulder: 12,
  left_elbow: 13,
  right_elbow: 14,
  left_wrist: 15,
  right_wrist: 16,
  left_hip: 23,
  right_hip: 24,
  left_knee: 25,
  right_knee: 26,
  left_ankle: 27,
  right_ankle: 28
};

export function pickExerciseLabel(exercise: ExerciseId): string {
  return exercise === "squat" ? "Squat" : "Shoulder Abduction";
}

export function trackingHint(exercise: ExerciseId): string {
  return exercise === "squat"
    ? "Stand back until your full body, including knees and ankles, is visible."
    : "Frame your head, shoulders, elbows, and wrists. Keep both arms visible while lifting.";
}

export function toBackendLandmarks(poseLandmarks: Array<{ x: number; y: number; z: number; visibility?: number }>) {
  const result: Record<string, { x: number; y: number; z: number; visibility: number }> = {};

  Object.entries(POSE_INDEX).forEach(([name, idx]) => {
    const p = poseLandmarks[idx];
    if (!p) return;

    result[name] = {
      x: p.x,
      y: p.y,
      z: p.z ?? 0,
      visibility: p.visibility ?? 0.5
    };
  });

  return result;
}

export function requiredKeys(exercise: ExerciseId): string[] {
  if (exercise === "squat") {
    return ["left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"];
  }
  return ["left_shoulder", "right_shoulder", "left_elbow", "right_elbow", "left_wrist", "right_wrist"];
}
