import { useEffect, useMemo, useRef, useState } from "react";
import { DrawingUtils, FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";
import { api, type ExerciseId } from "../lib/api";
import { pickExerciseLabel, requiredKeys, toBackendLandmarks, trackingHint } from "../lib/pose";

type Props = {
  exerciseId: ExerciseId;
  onComplete: (summary: { reps: number; rom: number; form: number; painLevel: number }) => void;
};

export default function PoseSession({ exerciseId, onComplete }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const requestInFlightRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [repCount, setRepCount] = useState(0);
  const [romScore, setRomScore] = useState(0);
  const [formScore, setFormScore] = useState(0);
  const [cue, setCue] = useState(trackingHint(exerciseId));
  const [risk, setRisk] = useState(false);
  const [painLevel, setPainLevel] = useState(3);
  const [fps, setFps] = useState(0);
  const [backendHealthy, setBackendHealthy] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const required = useMemo(() => requiredKeys(exerciseId), [exerciseId]);

  useEffect(() => {
    setCue(trackingHint(exerciseId));
  }, [exerciseId]);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      setRunning(true);
      setCountdown(null);
      setCue("Session started. Move naturally and follow guidance.");
      return;
    }

    setCue(`Starting in ${countdown}s. ${trackingHint(exerciseId)}`);
    const timer = window.setTimeout(() => {
      setCountdown((prev) => (prev === null ? null : prev - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown, exerciseId]);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera API unavailable in this browser");
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          },
          audio: false
        });
        streamRef.current = stream;

        if (!videoRef.current) {
          throw new Error("Video element not ready");
        }

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();

        if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
          await new Promise<void>((resolve) => {
            const onLoadedData = () => {
              video.removeEventListener("loadeddata", onLoadedData);
              resolve();
            };
            video.addEventListener("loadeddata", onLoadedData);
          });
        }

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        const landmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task"
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.35,
          minPosePresenceConfidence: 0.35,
          minTrackingConfidence: 0.35
        });
        if (!mounted) return;

        landmarkerRef.current = landmarker;
        setCameraReady(true);
        setRunning(false);
        setCountdown(null);
        setCue(`Camera ready. ${trackingHint(exerciseId)}`);

        try {
          const session = await api.sessionStart(exerciseId);
          if (!mounted) return;
          setSessionId(session.session_id);
          setBackendHealthy(true);
        } catch {
          if (!mounted) return;
          setBackendHealthy(false);
          setCue("Camera ready. Backend offline, so live scoring is paused.");
        }

        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        const message = error instanceof Error ? error.message : "Unknown initialization error";
        setCue(`Camera initialization failed: ${message}`);
        setCameraReady(false);
        setBackendHealthy(false);
        setLoading(false);
      }
    }

    setup();

    return () => {
      mounted = false;
      setRunning(false);
      setCountdown(null);
      requestInFlightRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      const tracks = streamRef.current?.getTracks() ?? [];
      tracks.forEach((track) => track.stop());
      streamRef.current = null;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
    };
  }, [exerciseId]);

  useEffect(() => {
    if (!running || !videoRef.current || !canvasRef.current || !landmarkerRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawingUtils = new DrawingUtils(ctx);
    let lastFpsTick = performance.now();
    let frameCount = 0;

    const loop = async () => {
      if (!running || !landmarkerRef.current) return;
      if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }

      const nowMs = performance.now();
      frameCount += 1;
      if (nowMs - lastFpsTick > 800) {
        setFps(Math.round((frameCount * 1000) / (nowMs - lastFpsTick)));
        lastFpsTick = nowMs;
        frameCount = 0;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const result = landmarkerRef.current.detectForVideo(video, nowMs);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pose = result.landmarks?.[0];
      if (pose) {
        drawingUtils.drawLandmarks(pose, { radius: 3, color: "#22d3ee" });
        drawingUtils.drawConnectors(pose, PoseLandmarker.POSE_CONNECTIONS, { color: "#0ea5e9", lineWidth: 2 });

        const mapped = toBackendLandmarks(pose);
        const confidenceOk = required.every((key) => (mapped[key]?.visibility ?? 0) > 0.3);
        if (!confidenceOk) {
          setCue(trackingHint(exerciseId));
        } else if (sessionId && !requestInFlightRef.current) {
          requestInFlightRef.current = true;
          try {
            const response = await api.frameMetrics({
              session_id: sessionId,
              timestamp: Date.now() / 1000,
              exercise_id: exerciseId,
              pain_level: painLevel,
              landmarks: mapped
            });
            setBackendHealthy(true);
            setRepCount(response.rep_count);
            setRomScore(response.rom_score);
            setFormScore(response.form_score);
            setCue(response.cue_text);
            setRisk(response.risk_flag);
          } catch {
            setBackendHealthy(false);
            setCue("Camera is running. Live scoring unavailable, retrying API.");
          } finally {
            requestInFlightRef.current = false;
          }
        } else if (!sessionId) {
          setCue("Camera is running. Waiting for backend session.");
        }
      } else {
        setCue(trackingHint(exerciseId));
      }

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      requestInFlightRef.current = false;
    };
  }, [running, exerciseId, painLevel, required, sessionId, cameraReady]);

  function startSessionCountdown() {
    if (loading || !cameraReady) return;
    setRunning(false);
    setRepCount(0);
    setRomScore(0);
    setFormScore(0);
    setRisk(false);
    setCountdown(10);
  }

  async function completeSession() {
    if (!sessionId) {
      onComplete({ reps: repCount, rom: romScore, form: formScore, painLevel });
      return;
    }

    try {
      const summary = await api.sessionComplete(sessionId);
      onComplete({ reps: summary.total_reps, rom: summary.average_rom_score, form: summary.average_form_score, painLevel });
      setRunning(false);
    } catch {
      onComplete({ reps: repCount, rom: romScore, form: formScore, painLevel });
    }
  }

  return (
    <section className="session-shell panel">
      <div className="session-header">
        <h2>Live Session: {pickExerciseLabel(exerciseId)}</h2>
        <div className="chip-row">
          <span className="chip">FPS {fps}</span>
          <span className={`chip ${cameraReady ? "chip-ok" : "chip-warn"}`}>{cameraReady ? "Camera ready" : "Camera pending"}</span>
          <span className={`chip ${backendHealthy ? "chip-ok" : "chip-warn"}`}>{backendHealthy ? "API online" : "API retrying"}</span>
          {risk && <span className="chip chip-alert">Risk flagged</span>}
        </div>
      </div>

      <p className="session-tip">{trackingHint(exerciseId)}</p>

      <div className="video-panel">
        <video ref={videoRef} className="video" playsInline muted autoPlay />
        <canvas ref={canvasRef} className="overlay" />
        {loading && <div className="loading-mask">Initializing camera + pose engine...</div>}
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <p>Rep Count</p>
          <strong>{repCount}</strong>
        </div>
        <div className="metric-card">
          <p>ROM Score</p>
          <strong>{romScore}</strong>
        </div>
        <div className="metric-card">
          <p>Form Score</p>
          <strong>{formScore}</strong>
        </div>
        <div className="metric-card">
          <p>Pain Level</p>
          <input type="range" min={0} max={10} value={painLevel} onChange={(e) => setPainLevel(Number(e.target.value))} />
          <small>{painLevel}/10</small>
        </div>
      </div>

      <div className={`cue-box ${risk ? "cue-risk" : ""}`}>{cue}</div>

      {!running ? (
        <button className="cta" onClick={startSessionCountdown} disabled={loading || !cameraReady || countdown !== null}>
          {countdown !== null ? `Get Ready (${countdown}s)` : "Start Session"}
        </button>
      ) : (
        <button className="cta" onClick={completeSession}>
          Complete Session
        </button>
      )}
    </section>
  );
}
