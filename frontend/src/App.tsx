import { useEffect, useMemo, useState } from 'react';
import PoseSession from './components/PoseSession';
import ProgressCharts from './components/ProgressCharts';
import { api, type ExerciseId } from './lib/api';
import { seededProfile } from './lib/demoData';

type Screen = 'onboarding' | 'session' | 'progress';

type SessionSnapshot = {
  index: number;
  reps: number;
  rom: number;
  form: number;
  painLevel: number;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('onboarding');
  const [exercise, setExercise] = useState<ExerciseId>('squat');
  const [assessmentId, setAssessmentId] = useState<string>('');
  const [summary, setSummary] = useState({ reps: 0, rom: 0, form: 0, painLevel: seededProfile.currentPain });
  const [sessions, setSessions] = useState<SessionSnapshot[]>([]);
  const [progress, setProgress] = useState({
    adherence_pct: 0,
    pain_reduction_pct: 0,
    recovery_score: 0,
    weekly_streak_days: 0,
    milestones: ['Complete your first guided session'] as string[]
  });

  useEffect(() => {
    void api.progressSummary()
      .then((remote) => {
        setProgress((prev) => ({
          ...prev,
          milestones: remote.milestones
        }));
      })
      .catch(() => undefined);
  }, []);

  const nav = useMemo(
    () => [
      ['Onboarding', 'onboarding'],
      ['Live Session', 'session'],
      ['Progress', 'progress']
    ] as Array<[string, Screen]>,
    []
  );

  const heroStats = useMemo(
    () => [
      { label: 'Recovery score', value: progress.recovery_score + '%', caption: 'Live update' },
      { label: 'Weekly streak', value: progress.weekly_streak_days + ' days', caption: 'Consistency' },
      { label: 'Pain reduction', value: '-' + progress.pain_reduction_pct + '%', caption: 'From baseline' }
    ],
    [progress]
  );

  const chartTrend = useMemo(() => {
    const labels = sessions.map((item) => `Session ${item.index}`);
    const adherence = sessions.map((_, idx) => Math.min(100, Math.round(((idx + 1) / seededProfile.weeklyGoal) * 100)));
    const pain = sessions.map((item) => item.painLevel);
    return {
      labels: labels.length > 0 ? labels : ['Session 0'],
      adherence: adherence.length > 0 ? adherence : [0],
      pain: pain.length > 0 ? pain : [seededProfile.baselinePain]
    };
  }, [sessions]);

  const performanceTrend = useMemo(() => {
    const labels = sessions.map((item) => `S${item.index}`);
    return {
      labels: labels.length > 0 ? labels : ['S0'],
      rom: sessions.length > 0 ? sessions.map((item) => item.rom) : [0],
      form: sessions.length > 0 ? sessions.map((item) => item.form) : [0],
      reps: sessions.length > 0 ? sessions.map((item) => item.reps) : [0]
    };
  }, [sessions]);

  function recalculateProgress(nextSessions: SessionSnapshot[]) {
    if (nextSessions.length === 0) {
      setProgress({
        adherence_pct: 0,
        pain_reduction_pct: 0,
        recovery_score: 0,
        weekly_streak_days: 0,
        milestones: ['Complete your first guided session']
      });
      return;
    }

    const latest = nextSessions[nextSessions.length - 1];
    const avgRom = Math.round(nextSessions.reduce((sum, item) => sum + item.rom, 0) / nextSessions.length);
    const avgForm = Math.round(nextSessions.reduce((sum, item) => sum + item.form, 0) / nextSessions.length);
    const adherence = Math.min(100, Math.round((nextSessions.length / seededProfile.weeklyGoal) * 100));
    const painReduction = Math.max(
      0,
      Math.round(((seededProfile.baselinePain - latest.painLevel) / Math.max(1, seededProfile.baselinePain)) * 100)
    );
    const recoveryScore = Math.round(avgRom * 0.45 + avgForm * 0.45 + adherence * 0.1);

    const milestones: string[] = [];
    if (nextSessions.length >= 1) milestones.push('First live session completed');
    if (nextSessions.length >= seededProfile.weeklyGoal) milestones.push('Weekly goal achieved');
    if (painReduction >= 20) milestones.push('Pain trend improving by 20%+');
    if (avgForm >= 75) milestones.push('Average form score above 75');

    setProgress({
      adherence_pct: adherence,
      pain_reduction_pct: painReduction,
      recovery_score: recoveryScore,
      weekly_streak_days: Math.min(7, nextSessions.length),
      milestones: milestones.length > 0 ? milestones : ['Keep going to unlock milestones']
    });
  }

  async function createAssessment() {
    try {
      const response = await api.assessment({
        body_region: 'shoulder',
        pain_baseline: seededProfile.baselinePain,
        mobility_self_score: 3,
        contraindications: []
      });
      setAssessmentId(response.assessment_id);
    } catch {
      setAssessmentId('asmt_demo_offline');
    }
    setScreen('session');
  }

  return (
    <div className='app'>
      <header className='hero'>
        <div>
          <p className='kicker'>NeuroMotion Physio AI</p>
          <h1>Personalized rehab tracking with live motion feedback and dynamic recovery analytics.</h1>
          <p className='eyebrow'>No static charts. Every completed session now updates your recovery dashboard and trend lines in real time.</p>
          <div className='hero-cta'>
            <button className='cta' onClick={() => setScreen('onboarding')}>
              Start new assessment
            </button>
            <button className='ghost' onClick={() => setScreen('progress')}>
              Open progress dashboard
            </button>
          </div>
        </div>
        <div className='hero-panel'>
          <h3>Live KPI snapshot</h3>
          <div className='hero-stats'>
            {heroStats.map((stat) => (
              <div key={stat.label} className='hero-stat'>
                <p className='label'>{stat.label}</p>
                <strong>{stat.value}</strong>
                <span>{stat.caption}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      <nav>
        {nav.map(([label, value]) => (
          <button key={value} className={screen === value ? 'nav-btn active' : 'nav-btn'} onClick={() => setScreen(value)}>
            {label}
          </button>
        ))}
      </nav>

      {screen === 'onboarding' && (
        <section className='panel onboarding'>
          <div>
            <h2>Onboarding snapshot</h2>
            <p>Choose exercise, generate assessment, and start live tracking. Completed sessions feed your dashboard instantly.</p>
          </div>
          <div className='onboarding-grid'>
            <div>
              <p className='label'>Patient</p>
              <strong>{seededProfile.name}</strong>
            </div>
            <div>
              <p className='label'>Goal</p>
              <strong>{seededProfile.plan}</strong>
            </div>
            <div>
              <p className='label'>Weekly target</p>
              <strong>{seededProfile.weeklyGoal} sessions</strong>
            </div>
          </div>
          <label className='select-field'>
            Demo exercise
            <select value={exercise} onChange={(e) => setExercise(e.target.value as ExerciseId)}>
              <option value='squat'>Squat</option>
              <option value='shoulder_abduction'>Shoulder Abduction</option>
            </select>
          </label>
          <button className='cta' onClick={createAssessment}>Start live session</button>
          {assessmentId && <p className='hint'>Assessment ID: {assessmentId}</p>}
        </section>
      )}

      {screen === 'session' && (
        <PoseSession
          exerciseId={exercise}
          onComplete={(data) => {
            const nextSummary = { reps: data.reps, rom: data.rom, form: data.form, painLevel: data.painLevel };
            setSummary(nextSummary);
            setSessions((prev) => {
              const next = [...prev, { index: prev.length + 1, ...nextSummary }].slice(-8);
              recalculateProgress(next);
              return next;
            });
            setScreen('progress');
          }}
        />
      )}

      {screen === 'progress' && (
        <section className='panel'>
          <div className='panel-header'>
            <div>
              <h2>Progress dashboard</h2>
              <p>Charts and KPIs below are now generated from your completed live sessions.</p>
            </div>
            <div className='session-result'>
              <span className='label'>Latest session</span>
              <strong>{summary.reps} reps</strong>
              <small>ROM {summary.rom} · Form {summary.form} · Pain {summary.painLevel}/10</small>
            </div>
          </div>
          <ProgressCharts trend={chartTrend} performance={performanceTrend} />
          <div className='milestones'>
            <h3>Milestones</h3>
            <ul>
              {progress.milestones.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}
