import { useEffect, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowRight, ArrowLeft, BookOpen, Check, ChevronRight, CircleHelp, Download, Flag, FolderOpen, GraduationCap, History, LayoutGrid, Lightbulb, LockKeyhole, Palette, Play, RefreshCw, RotateCcw, Settings, ShieldCheck, Sparkles, Swords, Target, Trophy, Upload, Volume2, X } from 'lucide-react';
import Board, { palettes } from './Board.jsx';
import BotView from './BotView.jsx';
import { replyDelay } from './interaction.js';
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
  const texturePack = packs.find(item => item.id === data?.settings?.texture);
  const textureAsset = texturePack && Object.values(texturePack.boards || {})[0];
  const pack = piecePack && { ...piecePack, textureUrl: textureAsset ? texturePack.baseUrl + textureAsset.path : null, textureCrop: data?.settings?.textureCrop ?? 4 };
  const sound = event => {
    if (!data?.settings.sounds) return;
    const sounds = packs.find(item => item.id === 'chesscom-sounds') || packs.find(item => Object.keys(item.sounds || {}).length);
    const asset = sounds?.sounds?.[event]?.mp3;
    if (asset) { const audio = new Audio(sounds.baseUrl + asset.path); audio.volume = 0.45; audio.play().catch(() => {}); }
  };
  if (!data) return <div className="loading"><span className="brand-mark">♞</span><h1>Opening your study room</h1><p>{error || 'Loading your saved progress…'}</p>{error && <button className="button" onClick={() => location.reload()}>Try again</button>}</div>;
  const completed = lessons.filter(item => data.progress[item.id]?.completed).length;
  const screen = route.split('/')[0], active = screen === 'lesson' ? 'learn' : screen;
  return <div className="app-layout">
    <aside className="sidebar"><a className="brand" href="#learn"><span className="brand-mark">♞</span><span>chessnite<span className="brand-dot">.</span></span></a>
      <div className="workspace-label">YOUR STUDY ROOM</div><nav aria-label="Main navigation">{Object.entries(names).map(([key, label]) => { const Icon = icons[key]; return <button key={key} className={`nav-item ${active === key ? 'active' : ''}`} onClick={() => go(key)}><Icon size={19}/><span>{label}</span>{key === 'practice' && dueReviews(data.progress).length > 0 && <span className="nav-count">{dueReviews(data.progress).length}</span>}</button>; })}</nav>
      <div className="sidebar-bottom"><div className="local-profile"><span className="avatar">Y</span><div><strong>Your workspace</strong><small>Personal · stored locally</small></div></div><p><span className={`save-dot ${error ? 'error' : ''}`} />{status}</p></div>
    </aside>
    <main className="main"><header className="topbar"><div><span className="breadcrumb">Study room</span><ChevronRight size={14}/><span>{names[active] || 'London System'}</span></div><span className="topbar-note"><ShieldCheck size={15}/> Your pace. Your repertoire.</span></header>
      {(error || message) && <div className="notice" role="alert"><span>{error || message}</span>{error && <><button onClick={retry}>Retry save</button><button onClick={() => downloadJSON('chessnite-unsaved-backup.json', data)}>Export this tab</button></>}{!error && <button onClick={() => setMessage('')} aria-label="Dismiss"><X size={16}/></button>}</div>}
      <div className="content">
      {screen === 'learn' && <LearningPath {...{ data, completed, pack, start, go }}/>}
      {screen === 'lesson' && <LessonView key={route} lesson={lessons.find(item => item.id === route.split('/')[1]) || lessons[0]} {...{ data, change, pack, sound, start, go }}/>}
      {screen === 'practice' && <Practice {...{ data, start, go }}/>}
      {screen === 'appearance' && <Appearance {...{ data, change, packs, pack, sound }}/>}
      {screen === 'sessions' && <Sessions {...{ data, start, go }}/>}
      {screen === 'settings' && <SettingsView {...{ data, change, setMessage }}/>}
      {screen === 'play' && <BotView {...{ data, change, pack, sound, go }}/>}
      </div><footer className="footer"><span>Made for the moves that matter.</span><span>London System · First edition</span></footer>
    </main>
  </div>;
}

function LearningPath({ data, completed, pack, start, go }) {
  const next = nextLesson(data.progress), percent = Math.round(completed / lessons.length * 100);
  const ongoing = data.activeLesson && !data.activeLesson.ended ? lessons.find(item => item.id === data.activeLesson.lessonId) : next;
  const demo = gameAt(lessons[3].moves, 15);
  return <><div className="page-heading"><div><span className="eyebrow">A LITTLE BETTER, EVERY SESSION</span><h1>Your next move starts here.</h1><p>Build an opening you understand, one idea at a time.</p></div><div className="quiet-badge"><BookOpen size={16}/> 1 course in your library</div></div>
    <section className="course-hero"><div className="hero-copy"><span className="tag">WHITE REPERTOIRE <span>•</span> BEGINNER FRIENDLY</span><h2>The London<br/>System<span>.</span></h2><p>A reliable setup. Active pieces. A plan beyond move eight.<br className="desktop-break"/> Make the London your own.</p><button className="button primary" onClick={() => start(ongoing.id)}>{completed ? 'Continue learning' : 'Start the course'}<ArrowRight size={17}/></button><div className="hero-meta"><span>{lessons.length} lessons</span><span>4 chapters</span><span>3–7 min each</span></div></div><div className="hero-board"><Board game={demo} pack={pack} palette={data.settings.board} disabled/><span className="board-caption">A familiar setup. Plenty to discover.</span></div></section>
    <div className="stats-strip"><div><div className="stat-icon"><GraduationCap size={19}/></div><span><strong>{completed} <em>/ {lessons.length}</em></strong><small>Lessons completed</small></span></div><div><div className="stat-icon"><Target size={19}/></div><span><strong>{dueReviews(data.progress).length}</strong><small>Reviews ready</small></span></div><div><div className="stat-icon"><History size={19}/></div><span><strong>{data.sessions.length}</strong><small>Study sessions</small></span></div><div className="overall-progress"><div><strong>Course progress</strong><span>{percent}%</span></div><div className="progress-track"><span style={{ width: percent + '%' }}/></div></div></div>
    <div className="path-layout"><section><div className="section-heading"><h2>Your learning path</h2><span>Learn → recall → play</span></div><div className="units">{units.map((unit, index) => {
      const available = unitAvailable(index, data.progress), finished = unit.lessons.filter(item => data.progress[item.id]?.completed).length;
      return <article className={`unit ${!available ? 'locked-unit' : ''}`} key={unit.id}><div className="unit-heading"><span className="chapter-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{unit.title}</h3><p>{unit.subtitle}</p></div><span className="unit-count">{finished}/{unit.lessons.length}</span></div><div className="lesson-list">{unit.lessons.map((item, number) => {
        const done = data.progress[item.id]?.completed, current = next.id === item.id;
        return <button key={item.id} disabled={!available} onClick={() => start(item.id)} className={`lesson-row ${current ? 'current' : ''}`}><span className={`lesson-node ${done ? 'done' : ''}`}>{done ? <Check size={18}/> : !available ? <LockKeyhole size={15}/> : isCheckpoint(item) ? <Flag size={17}/> : <Play size={16}/>}</span><span className="lesson-info"><strong>{item.title}</strong><small>{isCheckpoint(item) ? 'Checkpoint · recall without hints' : item.description}</small></span>{current && available ? <span className="next-label">UP NEXT</span> : <span className="lesson-duration">{done ? 'Review' : `${number % 2 ? 5 : 3} min`}</span>}<ChevronRight size={16}/></button>;
      })}</div></article>;
    })}</div></section><aside className="path-aside"><div className="tip-card"><span className="label-icon"><Lightbulb size={18}/> THE IDEA, NOT JUST THE MOVES</span><h3>A system, not a script.</h3><p>Black won’t always cooperate. Learn why your pieces belong on these squares, then adapt when the position changes.</p></div><div className="side-card"><span className="eyebrow">PUT IT INTO PRACTICE</span><div className="bot-avatar">♞</div><h3>Meet Robin</h3><span className="rating-pill">1000 strength target</span><p>A calculating sparring partner for your new London repertoire.</p><button className="text-button" onClick={() => go('play')}>Play a practice game <ArrowRight size={16}/></button></div><div className="small-note"><ShieldCheck size={18}/><p>Your progress is saved on this computer. Pick up where you left off.</p></div></aside></div>
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
  if (!session) return <div className="empty-state"><BookOpen/><h1>{lesson.title}</h1><p>{lesson.objective}</p><button className="button primary" onClick={() => start(lesson.id)}>Start lesson <ArrowRight size={17}/></button></div>;
  const game = gameAt(lesson.moves, session.cursor), whiteMoves = lesson.moves.filter((_, i) => i % 2 === 0).length;
  const decision = Math.floor(session.cursor / 2), percent = session.cursor / lesson.moves.length * 100;
  function submit(move) {
    if (session.ended || waiting) return false;
    const trial = new Chess(game.fen()); let played;
    try { played = trial.move(move); } catch { return false; }
    if (played.san !== lesson.moves[session.cursor]) {
      sound('puzzle-wrong'); setFeedback(`${played.san} is legal, but this lesson practices a different continuation. Try again.`);
      change(state => { if (!state.activeLesson.mistakes.includes(session.cursor)) state.activeLesson.mistakes.push(session.cursor); return state; }); return false;
    }
    sound(played.captured ? 'capture' : 'move-self'); setFeedback('Good move. Notice how your pieces work together.'); setHint(false);
    change(state => advanceLesson(state, lesson, session.cursor + 1));
    return true;
  }

  const help = () => { setHint(true); change(state => { state.activeLesson.assisted = true; return state; }); setFeedback(isCheckpoint(lesson) ? 'Practice mode: help is available, but this attempt will not pass the checkpoint.' : 'Hint shown. Your review will remember that this move needed help.'); };
  return <><button className="back-link" onClick={() => go('learn')}><ArrowLeft size={16}/> Back to learning path</button><div className="lesson-top"><div><span className="eyebrow">{session.review ? 'SPACED REVIEW' : isCheckpoint(lesson) ? 'CHECKPOINT' : 'LONDON SYSTEM'}</span><h1>{lesson.title}</h1><p>{lesson.objective}</p></div><span className="quiet-badge">{Math.min(decision + 1, whiteMoves)} / {whiteMoves} decisions</span></div><div className="progress-track lesson-progress"><span style={{ width: percent + '%' }}/></div>
    <div className="study-layout"><section className="board-area"><div className="player-label"><span className="player-token">♟</span><div><strong>Black</strong><small>Prepared lesson replies</small></div></div><Board game={game} onMove={submit} pack={pack} palette={data.settings.board} disabled={session.ended || waiting} highlight={hint ? game.moves({ verbose: true }).find(move => move.san === lesson.moves[session.cursor])?.from : null}/><div className="player-label"><span className="player-token white-token">♙</span><div><strong>You’re White</strong><small>The London System</small></div><span className="board-help">Click or drag a piece</span></div></section>
      <aside className="lesson-panel">{session.ended ? <><span className="result-icon"><Trophy size={28}/></span><span className="eyebrow">SESSION COMPLETE</span><h2>{isCheckpoint(lesson) && !data.progress[lesson.id]?.completed ? 'A little more practice.' : 'Another idea, understood.'}</h2><p>{Math.round(session.result.score * 100)}% correct on the first try{session.assisted ? ' · assisted' : ' · unassisted'}.</p><div className="inset-note">{isCheckpoint(lesson) && !data.progress[lesson.id]?.completed ? 'Pass with at least 80% accuracy and no hints. Retry whenever you’re ready.' : `This lesson is saved. Next review: ${new Date(data.progress[lesson.id]?.dueAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}.`}</div><button className="button primary full" onClick={() => start(nextLesson(data.progress).id)}>Continue learning <ArrowRight size={16}/></button><button className="button full" onClick={() => start(lesson.id, session.review, true)}><RotateCcw size={16}/> Try again</button><button className="text-button" onClick={() => { change(state => { state.game = { pgn: game.pgn(), side: 'w', source: lesson.title, startedAt: new Date().toISOString(), id: crypto.randomUUID() }; return state; }); go('play'); }}>Play this position against Robin <ArrowRight size={16}/></button></> : <><span className="eyebrow">YOUR TURN</span><h2>Find White’s next move.</h2><p>{isCheckpoint(lesson) && !session.assisted ? 'Recall the line. We’ll explain the result after your attempt.' : lesson.cues[decision] || 'Continue your coordinated development.'}</p><div className="inset-note"><Lightbulb size={19}/><span>{decision === 0 ? 'Start with the center. Then give each piece a useful job.' : 'If Black changes the structure, think about what changed before continuing the setup.'}</span></div><div className="lesson-feedback" role="status">{feedback || 'The board is ready. Take your time.'}</div>{hint && <div className="hint-answer">This line continues with <strong>{lesson.moves[session.cursor]}</strong>.</div>}<button className="button full" onClick={help} disabled={waiting}><CircleHelp size={16}/>{isCheckpoint(lesson) ? 'Switch to practice & show hint' : 'Show a hint'}</button><p className="microcopy">A different legal move is not necessarily bad. Here, you’re learning one specific line.</p></>}
      <div className="moves-panel"><span className="eyebrow">MOVES PLAYED</span><div>{game.history().map((move, index) => <span key={index}>{index % 2 === 0 && <small>{Math.floor(index / 2) + 1}.</small>} {move}</span>)}</div></div></aside></div>
  </>;
}

function Practice({ data, start, go }) {
  const due = dueReviews(data.progress), completed = lessons.filter(item => data.progress[item.id]?.completed);
  return <><PageTitle eyebrow="MAKE IT STICK" title="A little recall goes a long way." subtitle="Revisit your lines before they become unfamiliar."/><div className="review-banner"><RefreshCw size={27}/><div><h2>{due.length ? `${due.length} reviews are ready` : 'You’re all caught up.'}</h2><p>{due.length ? 'Start with the oldest review. Practice at your own pace.' : 'Your next review appears here after you finish a lesson.'}</p></div>{due.length > 0 && <button className="button primary" onClick={() => start(due[0].id, true)}>Start review <ArrowRight size={16}/></button>}</div><h2 className="section-title">Practice any lesson</h2><p className="muted">Explore freely. Practice doesn’t require unlocking a chapter.</p><div className="practice-grid">{lessons.map(item => <button className="practice-card" key={item.id} onClick={() => start(item.id, Boolean(data.progress[item.id]?.completed), true)}><span className="practice-icon"><BookOpen size={20}/></span><strong>{item.title}</strong><p>{item.description}</p><small>{data.progress[item.id]?.mastered ? 'Retained mastery' : data.progress[item.id]?.completed ? 'Ready for recall' : 'Explore this lesson'} <ArrowRight size={14}/></small></button>)}</div></>;
}

function Appearance({ data, change, packs, pack, sound }) {
  const update = values => change(state => { Object.assign(state.settings, values); return state; });
  return <><PageTitle eyebrow="MAKE YOURSELF AT HOME" title="Your board. Your style." subtitle="A familiar space makes it easier to focus on the position."/><div className="appearance-layout"><div><section className="settings-card"><h2>Piece set</h2><p>Choose from the sets in your local skin library.</p><div className="piece-options">{packs.filter(item => Object.keys(item.pieces || {}).length === 12).map(item => <button key={item.id} className={`piece-option ${pack?.id === item.id ? 'chosen' : ''}`} onClick={() => update({ pieces: item.id })}><span>{['wk', 'wq', 'wn'].map(code => <img key={code} src={item.baseUrl + item.pieces[code].path} alt={code}/>)}</span><strong>{item.name}</strong>{pack?.id === item.id && <Check size={16}/>}</button>)}</div></section><section className="settings-card"><h2>Board palette</h2><div className="palette-options">{Object.entries(palettes).map(([id, colors]) => <button key={id} className={data.settings.board === id ? 'chosen' : ''} onClick={() => update({ board: id, texture: null })}><span className="palette-swatch" style={{ background: `conic-gradient(${colors.light} 25%, ${colors.dark} 0 50%, ${colors.light} 0 75%, ${colors.dark} 0)` }}/><span>{colors.name}</span>{data.settings.board === id && <Check size={15}/>}</button>)}</div></section><section className="settings-card"><div className="setting-row"><div><h3>Sound cues</h3><p>Use your imported sound pack for moves and feedback.</p></div><button className={`toggle ${data.settings.sounds ? 'on' : ''}`} role="switch" aria-checked={data.settings.sounds} aria-label="Sound cues" onClick={() => update({ sounds: !data.settings.sounds })}><span/></button></div><button className="text-button" onClick={() => sound('move-self')}><Volume2 size={16}/> Preview move sound</button></section><TextureSettings {...{ packs, data, update }}/></div><aside className="appearance-preview"><Board game={gameAt(lessons[3].moves, 15)} pack={pack} palette={data.settings.board} disabled/><span className="board-caption">A preview of your study board</span><div className="small-note"><Check size={18}/><p>Changes save automatically and apply to lessons, practice, and bot games.</p></div></aside></div></>;
}

function Sessions({ data, start, go }) {
  return <><PageTitle eyebrow="YOUR WORK, REMEMBERED" title="Every session adds up." subtitle="A record of what you’ve studied and the games you’ve played."/>{!data.sessions.length ? <div className="empty-state"><History size={34}/><h2>Your first session is waiting.</h2><p>Finish a London lesson to start your history.</p><button className="button primary" onClick={() => go('learn')}>Open your course <ArrowRight size={16}/></button></div> : <div className="session-table">{data.sessions.map(session => <div className="session-row" key={session.id}><span className="practice-icon">{session.kind === 'game' ? <Swords size={21}/> : <BookOpen size={21}/>}</span><div><strong>{session.title}</strong><small>{new Date(session.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · {session.review ? 'Review' : session.kind === 'game' ? 'Practice game' : 'Lesson'} {session.assisted ? '· Assisted' : ''}</small></div><span>{session.score !== undefined ? Math.round(session.score * 100) + '%' : session.result}</span>{session.kind !== 'game' && <button className="text-button" onClick={() => start(session.lessonId, true, true)}>Review <ArrowRight size={15}/></button>}</div>)}</div>}</>;
}

function TextureSettings({ packs, data, update }) {
  const available = packs.filter(item => Object.keys(item.boards || {}).length);
  return <section className="settings-card"><h2>Imported board texture</h2><p>Use a board image from your skin library, or keep the flat color palette.</p><label className="panel-label" htmlFor="board-texture">Board image</label><select className="text-input" id="board-texture" value={data.settings.texture || ''} onChange={event => update({ texture: event.target.value || null })}><option value="">Use flat colors</option>{available.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>{data.settings.texture && <><label className="panel-label" htmlFor="texture-crop">Trim outer frame · {data.settings.textureCrop ?? 4}%</label><input className="crop-slider" id="texture-crop" type="range" min="0" max="10" step="0.5" value={data.settings.textureCrop ?? 4} onChange={event => update({ textureCrop: Number(event.target.value) })}/><p>Adjust until the image squares line up with the pieces.</p></>}</section>;
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
  return <><PageTitle eyebrow="KEEP YOUR STUDY ROOM IN ORDER" title="A home for your progress." subtitle="Your learning stays on this computer. Keep a backup whenever you need one."/><div className="settings-stack"><section className="settings-card"><h2>Progress & backups</h2><p>Export lessons, review dates, game position, session history, and appearance preferences.</p><div className="button-row"><button className="button primary" onClick={() => downloadJSON(`chessnite-backup-${new Date().toISOString().slice(0, 10)}.json`, data)}><Download size={16}/> Export backup</button><label className="button file-button"><Upload size={16}/> Restore backup<input type="file" accept="application/json,.json" onChange={restore}/></label></div></section><section className="settings-card"><h2>A personal, local app</h2><p>CHESSNITE stores your sessions in a SQLite database on this computer. No account or cloud service is needed to study. Open the launcher whenever you want to return.</p><div className="inset-note">Local address: <strong>http://127.0.0.1:8765</strong></div></section><UpdatePanel setMessage={setMessage}/><section className="settings-card"><h2>Engine & open-source software</h2><p>Robin uses Stockfish.js in a separate browser worker. Its 1000 strength label is an uncalibrated practice target.</p><a href="/stockfish-license.txt" target="_blank" rel="noreferrer">Stockfish license</a> · <a href="/stockfish-source.txt" target="_blank" rel="noreferrer">Engine source information</a> ? <a href="/stockfish-source.tar.gz" download>Download engine source</a> ? <a href="/dependency-notices.txt" target="_blank" rel="noreferrer">Dependency notices</a></section></div></>;
}

function PageTitle({ eyebrow, title, subtitle }) { return <div className="page-heading"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div></div>; }
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
  return <section className="settings-card"><h2>App updates</h2><p>Get the latest version from your CHESSNITE GitHub repository. Your local progress and backups stay on this computer. Git and an internet connection are needed only for updates.</p><div className="button-row"><button className="button primary" disabled={update.status === 'updating' || restarting} onClick={runUpdate}><RefreshCw size={15}/>{update.status === 'updating' ? 'Checking for updates…' : 'Update from GitHub'}</button>{update.status === 'updated' && <button className="button" disabled={restarting} onClick={restart}>{restarting ? 'Restarting…' : 'Restart to finish'}</button>}</div><p className="update-note" role="status">{restarting ? 'Restarting your local app. This page will refresh automatically.' : update.message}{update.commit ? ` (${update.commit})` : ''}</p></section>;
}
