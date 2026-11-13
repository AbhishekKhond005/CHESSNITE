import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowRight, ArrowLeft, BookOpen, Check, ChevronRight, CircleHelp, Download, Flag, FolderOpen, GraduationCap, History, LayoutGrid, Lightbulb, LockKeyhole, Palette, Play, RefreshCw, RotateCcw, Settings, ShieldCheck, Sparkles, Swords, Target, Trophy, Upload, Volume2, X } from 'lucide-react';
import Board, { palettes } from './Board.jsx';
import BotView from './BotView.jsx';
import { replyDelay, resolveBoard } from './interaction.js';
import Appearance from './Appearance.jsx';
import { playSound, warmSounds } from './audio.js';
import { lessons, units, nextLesson, unitAvailable, dueReviews, recordResult, isCheckpoint, advanceLesson } from './course.js';
import { downloadJSON, request, useWorkspace } from './workspace.js';

const icons = { learn: GraduationCap, practice: Target, play: Swords, appearance: Palette, sessions: History, settings: Settings };
const names = { learn: 'Learning path', practice: 'Practice & review', play: 'Play Robin', appearance: 'Appearance', sessions: 'Your sessions', settings: 'Settings' };
const initialSession = (id, review = false) => ({ id: crypto.randomUUID(), lessonId: id, cursor: 0, mistakes: [], assisted: false, review, startedAt: new Date().toISOString() });
const gameAt = (line, cursor) => { const game = new Chess(); line.slice(0, cursor).forEach(move => game.move(move)); return game; };

export default function App() {
  const workspace = useWorkspace(), { data, change, status, error, retry } = workspace;
  const [packs, setPacks] = useState([]), [route, setRoute] = useState(location.hash.slice(1) || 'learn');
  const [message, setMessage] = useState('');
  useEffect(() => { request('skins').then(setPacks).catch(err => setMessage(err.message)); const listener = () => setRoute(location.hash.slice(1) || 'learn'); window.addEventListener('hashchange', listener); return () => window.removeEventListener('hashchange', listener); }, []);
  const go = page => { location.hash = page; setRoute(page); window.scrollTo(0, 0); };
  const start = (id, review = false, restart = false) => {
    change(state => { if (restart || state.activeLesson?.lessonId !== id || state.activeLesson?.ended || review !== state.activeLesson?.review) state.activeLesson = initialSession(id, review); return state; });
    go('lesson/' + id);
  };
  const piecePack = packs.find(item => item.id === data?.settings?.pieces) || packs.find(item => Object.keys(item.pieces || {}).length === 12);
  const boardStyle = data ? resolveBoard(data.settings, packs, piecePack) : {};
  const pack = piecePack && { ...piecePack, textureUrl: boardStyle.url, textureCrop: data?.settings?.textureCrop ?? 4, motion: data?.settings?.motion !== false };
  const soundPack = packs.find(item => item.id === 'chesscom-sounds') || packs.find(item => Object.keys(item.sounds || {}).length);
  useEffect(() => { document.documentElement.dataset.theme = data?.settings?.theme || 'dark'; }, [data?.settings?.theme]);
  useEffect(() => {
    if (!data?.settings?.sounds) return;
    const warm = () => warmSounds(soundPack);
    document.addEventListener('pointerdown', warm, { once: true });
    return () => document.removeEventListener('pointerdown', warm);
  }, [data?.settings?.sounds, soundPack]);
  const sound = (event, preview = false) => {
    if (!data?.settings.sounds && !preview) return;
    const asset = soundPack?.sounds?.[event]?.mp3;
    if (asset) playSound(soundPack.baseUrl + asset.path, data.settings.volume ?? .9);
  };
  if (!data) return <div className="loading"><span className="brand-mark">♞</span><h1>Opening your study room</h1><p>{error || 'Loading your saved progress…'}</p>{error && <button className="button" onClick={() => location.reload()}>Try again</button>}</div>;
  const completed = lessons.filter(item => data.progress[item.id]?.completed).length;
  const screen = route.split('/')[0], active = screen === 'lesson' ? 'learn' : screen;
  return <div className="app-layout">
    <aside className="sidebar"><a className="brand" href="#learn"><span className="brand-mark">♞</span><span>chessnite<span className="brand-dot">.</span></span></a>
      <nav aria-label="Main navigation">{Object.entries(names).map(([key, label]) => { const Icon = icons[key]; return <button key={key} className={`nav-item ${active === key ? 'active' : ''}`} aria-label={label} title={label} onClick={() => go(key)}><Icon size={19}/><span>{label}</span>{key === 'practice' && dueReviews(data.progress).length > 0 && <span className="nav-count">{dueReviews(data.progress).length}</span>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="local-profile"><span className="avatar">Y</span><div><strong>Your workspace</strong><small>Personal · stored locally</small></div></div><p title={status}>{error ? <X size={19}/> : <Check size={19}/>}<span className="sr-only">{status}</span></p></div>
    </aside>
    <main className="main"><header className="topbar"><div><span className="breadcrumb">CHESSNITE</span><ChevronRight size={14}/><span>{names[active] || 'London System'}</span></div></header>
      {(error || message) && <div className="notice" role="alert"><span>{error || message}</span>{error && <><button onClick={retry}>Retry save</button><button onClick={() => downloadJSON('chessnite-unsaved-backup.json', data)}>Export this tab</button></>}{!error && <button onClick={() => setMessage('')} aria-label="Dismiss"><X size={16}/></button>}</div>}
      <div className="content">
      {screen === 'learn' && <LearningPath {...{ data, completed, pack, start, go }}/>}
      {screen === 'lesson' && <LessonView key={route} lesson={lessons.find(item => item.id === route.split('/')[1]) || lessons[0]} {...{ data, change, pack, sound, start, go }}/>}
      {screen === 'practice' && <Practice {...{ data, start, go }}/>}
      {screen === 'appearance' && <Appearance {...{ data, change, packs, pack, sound }}/>}
      {screen === 'sessions' && <Sessions {...{ data, start, go }}/>}
      {screen === 'settings' && <SettingsView {...{ data, change, setMessage }}/>}
      {screen === 'play' && <BotView {...{ data, change, pack, sound, go }}/>}
      </div>
    </main>
  </div>;
}

function LearningPath({ data, completed, pack, start, go }) {
  const next = nextLesson(data.progress), percent = Math.round(completed / lessons.length * 100);
  const ongoing = data.activeLesson && !data.activeLesson.ended ? lessons.find(item => item.id === data.activeLesson.lessonId) : next;
  const demo = gameAt(lessons[3].moves, 15);
  return <><div className="page-heading"><div><span className="eyebrow">A LITTLE BETTER, EVERY SESSION</span><h1>Learn</h1></div><div className="quiet-badge"><BookOpen size={16}/> 1 course in your library</div></div>
    <section className="course-hero"><div className="hero-copy"><span className="tag">WHITE REPERTOIRE <span>•</span> BEGINNER FRIENDLY</span><h2>The London<br/>System<span>.</span></h2><p>A flexible setup for White.</p><button className="button primary" aria-label={completed ? 'Continue learning' : 'Start the course'} onClick={() => start(ongoing.id)}>{completed ? 'Continue' : 'Start course'}<ArrowRight size={17}/></button><div className="hero-meta"><span>{lessons.length} lessons</span><span>4 chapters</span><span>3–7 min each</span></div></div><div className="hero-board"><Board game={demo} pack={pack} palette={data.settings.board} disabled/><span className="board-caption">A familiar setup. Plenty to discover.</span></div></section>
    <div className="stats-strip"><div><div className="stat-icon"><GraduationCap size={19}/></div><span><strong>{completed} <em>/ {lessons.length}</em></strong><small>Lessons completed</small></span></div><div><div className="stat-icon"><Target size={19}/></div><span><strong>{dueReviews(data.progress).length}</strong><small>Reviews ready</small></span></div><div><div className="stat-icon"><History size={19}/></div><span><strong>{data.sessions.length}</strong><small>Study sessions</small></span></div><div className="overall-progress"><div><strong>Course progress</strong><span>{percent}%</span></div><div className="progress-track"><span style={{ width: percent + '%' }}/></div></div></div>
    <div className="path-layout"><section><div className="section-heading"><h2>Your learning path</h2><span>Learn → recall → play</span></div><div className="units">{units.map((unit, index) => {
      const available = unitAvailable(index, data.progress), finished = unit.lessons.filter(item => data.progress[item.id]?.completed).length;
      return <article className={`unit ${!available ? 'locked-unit' : ''}`} key={unit.id}><div className="unit-heading"><span className="chapter-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{unit.title}</h3><p>{unit.subtitle}</p></div><span className="unit-count">{finished}/{unit.lessons.length}</span></div><div className="lesson-list">{unit.lessons.map((item, number) => {
        const done = data.progress[item.id]?.completed, current = next.id === item.id;
        return <button key={item.id} disabled={!available} onClick={() => start(item.id)} className={`lesson-row ${current ? 'current' : ''}`}><span className={`lesson-node ${done ? 'done' : ''}`}>{done ? <Check size={18}/> : !available ? <LockKeyhole size={15}/> : isCheckpoint(item) ? <Flag size={17}/> : <Play size={16}/>}</span><span className="lesson-info"><strong>{item.title}</strong></span>{current && available ? <span className="next-label">UP NEXT</span> : <span className="lesson-duration">{done ? 'Review' : `${number % 2 ? 5 : 3} min`}</span>}<ChevronRight size={16}/></button>;
      })}</div></article>;
    })}</div></section><aside className="path-aside"><div className="side-card"><div className="bot-avatar"><Swords size={30}/></div><h3>Robin <span className="rating-pill" title="Approximate strength target">1000</span></h3><button className="button primary full" onClick={() => go('play')}><Swords size={18}/> Play</button></div></aside></div>
  </>;
}

function LessonView({ lesson, data, change, pack, sound, start, go }) {
  const [feedback, setFeedback] = useState(''), [hint, setHint] = useState(false);
  const session = data.activeLesson?.lessonId === lesson.id ? data.activeLesson : null;
  const waiting = Boolean(session && !session.ended && session.cursor % 2 === 1 && session.cursor < lesson.moves.length);
  useEffect(() => {
    if (!waiting) return;
    const id = session.id, cursor = session.cursor;
    const timer = setTimeout(() => {
      const next = gameAt(lesson.moves, cursor + 1), played = next.history({ verbose: true }).at(-1);
      sound(next.isCheck() ? 'move-check' : played.captured ? 'capture' : 'move-opponent');
      change(state => state.activeLesson?.id === id && state.activeLesson.cursor === cursor ? advanceLesson(state, lesson, cursor + 1) : state);
    }, replyDelay(Math.random, true));
    return () => clearTimeout(timer);
  }, [session?.id, session?.cursor, session?.ended]);
  if (!session) return <div className="empty-state"><BookOpen/><h1>{lesson.title}</h1><button className="button primary" onClick={() => start(lesson.id)}>Start lesson <ArrowRight size={17}/></button></div>;
  const game = gameAt(lesson.moves, session.cursor), whiteMoves = lesson.moves.filter((_, i) => i % 2 === 0).length;
  const decision = Math.floor(session.cursor / 2), percent = session.cursor / lesson.moves.length * 100;
  function submit(move) {
    if (session.ended || waiting) return false;
    const trial = new Chess(game.fen()); let played;
    try { played = trial.move(move); } catch { return false; }
    if (played.san !== lesson.moves[session.cursor]) {
      sound('puzzle-wrong'); setFeedback(`${played.san}: try a different move.`);
      change(state => { if (!state.activeLesson.mistakes.includes(session.cursor)) state.activeLesson.mistakes.push(session.cursor); return state; }); return false;
    }
    sound(played.captured ? 'capture' : 'move-self'); setFeedback('Correct'); setHint(false);
    change(state => advanceLesson(state, lesson, session.cursor + 1));
    return true;
  }

  const help = () => { setHint(true); change(state => { state.activeLesson.assisted = true; return state; }); setFeedback(isCheckpoint(lesson) ? 'Practice mode: help is available, but this attempt will not pass the checkpoint.' : 'Hint shown. Your review will remember that this move needed help.'); };
  return <><button className="back-link" onClick={() => go('learn')}><ArrowLeft size={16}/> Back to learning path</button><div className="lesson-top"><div><span className="eyebrow">{session.review ? 'SPACED REVIEW' : isCheckpoint(lesson) ? 'CHECKPOINT' : 'LONDON SYSTEM'}</span><h1>{lesson.title}</h1></div><span className="quiet-badge">{Math.min(decision + 1, whiteMoves)} / {whiteMoves} decisions</span></div><div className="progress-track lesson-progress"><span style={{ width: percent + '%' }}/></div>
    <div className="study-layout"><section className="board-area"><div className="player-label"><span className="player-token">♟</span><div><strong>Black</strong></div></div><Board game={game} onMove={submit} pack={pack} palette={data.settings.board} disabled={session.ended || waiting} highlight={hint ? game.moves({ verbose: true }).find(move => move.san === lesson.moves[session.cursor])?.from : null}/><div className="player-label"><span className="player-token white-token">♙</span><div><strong>You’re White</strong><small>The London System</small></div></div></section>
      <aside className="lesson-panel">{session.ended ? <><span className="result-icon"><Trophy size={28}/></span><span className="eyebrow">SESSION COMPLETE</span><h2>{isCheckpoint(lesson) && !data.progress[lesson.id]?.completed ? 'A little more practice.' : 'Another idea, understood.'}</h2><p>{Math.round(session.result.score * 100)}% correct on the first try{session.assisted ? ' · assisted' : ' · unassisted'}.</p><div className="inset-note">{isCheckpoint(lesson) && !data.progress[lesson.id]?.completed ? 'Pass with at least 80% accuracy and no hints. Retry whenever you’re ready.' : `This lesson is saved. Next review: ${new Date(data.progress[lesson.id]?.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}.`}</div><button className="button primary full" onClick={() => start(nextLesson(data.progress).id)}>Continue learning <ArrowRight size={16}/></button><button className="button full" onClick={() => start(lesson.id, session.review, true)}><RotateCcw size={16}/> Try again</button><button className="text-button" onClick={() => { change(state => { state.game = { pgn: game.pgn(), side: 'w', source: lesson.title, startedAt: new Date().toISOString(), id: crypto.randomUUID() }; return state; }); go('play'); }}>Play this position against Robin <ArrowRight size={16}/></button></> : <><span className="eyebrow">YOUR TURN</span><h2>{waiting ? 'Black is thinking...' : 'Your move'}</h2>{!waiting && <p>{isCheckpoint(lesson) && !session.assisted ? 'Recall the line. We’ll explain the result after your attempt.' : lesson.cues[decision] || 'Continue your coordinated development.'}</p>}<div className="lesson-feedback" role="status">{feedback || ''}</div>{hint && <div className="hint-answer">This line continues with <strong>{lesson.moves[session.cursor]}</strong>.</div>}<button className="button full" onClick={help} disabled={waiting} aria-label={isCheckpoint(lesson) ? 'Switch to practice & show hint' : 'Show a hint'} title="Show a hint"><Lightbulb size={20}/> Hint</button><details className="subtle-details"><summary><BookOpen size={16}/> Lesson notes</summary><p>{lesson.objective}</p><p>Other legal moves may also be good. This exercise teaches one line.</p></details></>}
      <div className="moves-panel"><span className="eyebrow">MOVES PLAYED</span><div>{game.history().map((move, index) => <span key={index}>{index % 2 === 0 && <small>{Math.floor(index / 2) + 1}.</small>} {move}</span>)}</div></div></aside></div>
  </>;
}

function Practice({ data, start, go }) {
  const due = dueReviews(data.progress), completed = lessons.filter(item => data.progress[item.id]?.completed);
  return <><PageTitle eyebrow="MAKE IT STICK" title="Practice"/><div className="review-banner"><RefreshCw size={27}/><div><h2>{due.length ? `${due.length} reviews are ready` : 'You’re all caught up.'}</h2><p>{due.length ? 'Start with the oldest review. Practice at your own pace.' : 'Your next review appears here after you finish a lesson.'}</p></div>{due.length > 0 && <button className="button primary" onClick={() => start(due[0].id, true)}>Start review <ArrowRight size={16}/></button>}</div><h2 className="section-title">Practice any lesson</h2><div className="practice-grid">{lessons.map(item => <button className="practice-card" key={item.id} onClick={() => start(item.id, Boolean(data.progress[item.id]?.completed), true)}><span className="practice-icon"><BookOpen size={20}/></span><strong>{item.title}</strong><small>{data.progress[item.id]?.mastered ? 'Retained mastery' : data.progress[item.id]?.completed ? 'Ready for recall' : 'Explore this lesson'} <ArrowRight size={14}/></small></button>)}</div></>;
}

function Sessions({ data, start, go }) {
  return <><PageTitle title="Sessions"/>{!data.sessions.length ? <div className="empty-state"><History size={34}/><h2>Your first session is waiting.</h2><p>Finish a London lesson to start your history.</p><button className="button primary" onClick={() => go('learn')}>Open your course <ArrowRight size={16}/></button></div> : <div className="session-table">{data.sessions.map(session => <div className="session-row" key={session.id}><span className="practice-icon">{session.kind === 'game' ? <Swords size={21}/> : <BookOpen size={21}/>}</span><div><strong>{session.title}</strong><small>{new Date(session.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {session.review ? 'Review' : session.kind === 'game' ? 'Practice game' : 'Lesson'} {session.assisted ? '· Assisted' : ''}</small></div><span>{session.score !== undefined ? Math.round(session.score * 100) + '%' : session.result}</span>{session.kind !== 'game' && <button className="text-button" onClick={() => start(session.lessonId, true, true)}>Review <ArrowRight size={15}/></button>}</div>)}</div>}</>;
}

function SettingsView({ data, change, setMessage }) {
  async function restore(event) {
    const file = event.target.files[0]; if (!file) return;
    try {
      if (file.size > 1_000_000) throw new Error('Choose a CHESSNITE backup smaller than 1 MB.');
      const incoming = JSON.parse(await file.text());
      const object = value => value && typeof value === 'object' && !Array.isArray(value);
      if (!object(incoming) || incoming.schemaVersion !== 1 || !object(incoming.progress) || !Object.values(incoming.progress).every(object) || !Array.isArray(incoming.sessions) || !incoming.sessions.every(item => object(item) && ['id', 'title', 'date'].every(key => typeof item[key] === 'string')) || !object(incoming.settings) || (incoming.game != null && (!object(incoming.game) || typeof incoming.game.pgn !== 'string'))) throw new Error('This is not a supported CHESSNITE backup.');
      if (!confirm('Replace the progress and settings on this device with this backup? Export your current data first if you want to keep it.')) return;
      change(() => incoming); setMessage('Backup restored. Your data is being saved.');
    } catch (err) { setMessage(err.message); } finally { event.target.value = ''; }
  }
  return <><PageTitle eyebrow="KEEP YOUR STUDY ROOM IN ORDER" title="Settings"/><div className="settings-stack"><section className="settings-card"><h2>Progress & backups</h2><p>Keep a copy of your progress.</p><div className="button-row"><button className="button primary" onClick={() => downloadJSON(`chessnite-backup-${new Date().toISOString().slice(0, 10)}.json`, data)}><Download size={16}/> Export backup</button><label className="button file-button"><Upload size={16}/> Restore backup<input type="file" accept="application/json,.json" onChange={restore}/></label></div></section><UpdatePanel setMessage={setMessage}/><details className="settings-card subtle-details"><summary>About & licenses</summary><p>Robin uses Stockfish.js in a separate browser worker. Its 1000 strength label is an uncalibrated practice target.</p><a href="/stockfish-license.txt" target="_blank" rel="noreferrer">Stockfish license</a> · <a href="/stockfish-source.txt" target="_blank" rel="noreferrer">Engine source information</a> | <a href="/stockfish-source.tar.gz" download>Download engine source</a> | <a href="/dependency-notices.txt" target="_blank" rel="noreferrer">Dependency notices</a></details></div></>;
}

function PageTitle({ title, subtitle }) { return <div className="page-heading compact-heading"><div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div></div>; }
// Added in the next milestone, preserving a buildable course/persistence foundation.
function UpdatePanel({ setMessage }) {
  const [update, setUpdate] = useState({ status: 'idle', message: '' }), [restarting, setRestarting] = useState(false);
  useEffect(() => {
    let active = true;
    const poll = () => request('update').then(result => { if (active) setUpdate(result); }).catch(() => {});
    poll(); const timer = setInterval(poll, 2000); return () => { active = false; clearInterval(timer); };
  }, []);
  async function runUpdate() {
    try { setUpdate(await request('update', {})); } catch (err) { setMessage(err.message); }
  }
  async function restart() {
    setRestarting(true);
    try {
      const previous = await request('restart', {});
      for (let attempt = 0; attempt < 40; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 750));
        try { const health = await request('health'); if (health.bootId !== previous.bootId) { location.reload(); return; } } catch { /* Waiting for the local server to restart. */ }
      }
      throw new Error('Reopen Open CHESSNITE.cmd to finish restarting. Your saved data is safe.');
    } catch (err) { setMessage(err.message); setRestarting(false); }
  }
  return <section className="settings-card"><h2>App updates</h2><p>Get the latest version. Keep your progress.</p><div className="button-row"><button className="button primary" disabled={update.status === 'updating' || restarting} onClick={runUpdate}><RefreshCw size={15}/>{update.status === 'updating' ? 'Checking for updates…' : 'Update from GitHub'}</button>{update.status === 'updated' && <button className="button" disabled={restarting} onClick={restart}>{restarting ? 'Restarting…' : 'Restart to finish'}</button>}</div><p className="update-note" role="status">{restarting ? 'Restarting your local app. This page will refresh automatically.' : update.message}{update.commit ? ` (${update.commit})` : ''}</p></section>;
}
