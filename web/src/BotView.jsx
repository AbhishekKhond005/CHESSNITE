import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowRight, Download, Flag, RefreshCw, RotateCcw, Swords, Play, BookOpen } from 'lucide-react';
import Board from './Board.jsx';
import { RobinEngine } from './engine.js';
import { lessons } from './course.js';
import { pause, replyDelay } from './interaction.js';

function parseGame(pgn) { const game = new Chess(); if (pgn) game.loadPgn(pgn); return game; }
export default function BotView({ data, change, pack, sound }) {
  const saved = data.game;
  const game = useMemo(() => parseGame(saved?.pgn), [saved?.pgn]);
  const [side, setSide] = useState('w'), [thinking, setThinking] = useState(false), [error, setError] = useState(''), [engineVersion, setEngineVersion] = useState(0);
  const [flipped, setFlipped] = useState(false), engine = useRef(null);
  const fen = game.fen();
  useEffect(() => { engine.current = new RobinEngine(); return () => engine.current?.dispose(); }, [engineVersion]);
  function persist(nextGame) { change(state => { state.game.pgn = nextGame.pgn(); return state; }); }
  function finish(result) {
    change(state => {
      if (!state.game || state.game.result) return state;
      state.game.result = result;
      state.sessions.unshift({ id: state.game.id, kind: 'game', title: `Practice with Robin${state.game.source ? ' · ' + state.game.source : ''}`, result, pgn: state.game.pgn, date: new Date().toISOString(), duration: Math.round((Date.now() - Date.parse(state.game.startedAt)) / 1000) });
      state.sessions = state.sessions.slice(0, 5000); return state;
    });
  }
  useEffect(() => {
    if (!saved || saved.result) { setThinking(false); return; }
    if (game.isGameOver()) { finish(game.isCheckmate() ? game.turn() === 'w' ? '0–1' : '1–0' : '½–½'); setThinking(false); return; }
    if (game.turn() === saved.side) { setThinking(false); return; }
    const controller = new AbortController(); let active = true;
    setThinking(true); setError('');
    Promise.all([engine.current.think(game, controller.signal), pause(replyDelay(), controller.signal)]).then(([uci]) => {
      if (!active) return;
      const next = parseGame(saved.pgn);
      const move = next.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), ...(uci[4] ? { promotion: uci[4] } : {}) });
      if (!move) throw new Error('Robin returned an invalid move. Please retry.');
      sound(next.isCheck() ? 'move-check' : move.captured ? 'capture' : 'move-opponent'); persist(next);
    }).catch(err => { if (active && err.name !== 'AbortError') { setError(err.message); setThinking(false); } });
    return () => { active = false; controller.abort(); };
  }, [fen, saved?.id, saved?.result, saved?.side, engineVersion]);
  function newGame(fromLondon = false) {
    const next = new Chess();
    if (fromLondon) lessons[3].moves.forEach(move => next.move(move));
    change(state => {
      if (state.game?.pgn && !state.game.result) state.sessions.unshift({ id: state.game.id, kind: 'game', title: 'Unfinished practice with Robin', result: 'Unfinished', pgn: state.game.pgn, date: new Date().toISOString() });
      state.game = { id: crypto.randomUUID(), side, pgn: next.pgn(), source: fromLondon ? 'London setup' : null, startedAt: new Date().toISOString() }; return state;
    });
    setError(''); setFlipped(false); sound('game-start');
  }
  function submit(move) {
    if (!saved || saved.result || thinking || game.turn() !== saved.side || error) return false;
    const next = parseGame(saved.pgn);
    try {
      const played = next.move(move);
      sound(next.isCheck() ? 'move-check' : played.captured ? 'capture' : played.isKingsideCastle() || played.isQueensideCastle() ? 'castle' : 'move-self'); persist(next); return true;
    } catch { setError('That move could not be applied. Try selecting the piece again.'); return false; }
  }
  function undo() {
    const next = parseGame(saved.pgn); next.undo();
    while (next.turn() !== saved.side && next.history().length) next.undo();
    persist(next); setError('');
  }
  function exportPGN() {
    const blob = URL.createObjectURL(new Blob([game.pgn()], { type: 'application/x-chess-pgn' }));
    const link = document.createElement('a'); link.href = blob; link.download = 'chessnite-robin.pgn'; link.click(); setTimeout(() => URL.revokeObjectURL(blob), 1000);
  }
  const setup = <><div className="radio-row"><button className={`button ${side === 'w' ? 'selected' : ''}`} onClick={() => setSide('w')}>White</button><button className={`button ${side === 'b' ? 'selected' : ''}`} onClick={() => setSide('b')}>Black</button></div><button className="button primary full" aria-label="Play from the start" onClick={() => newGame(false)}><Play size={19}/> Play</button><button className="button full" aria-label="Play from the London setup" onClick={() => newGame(true)}><BookOpen size={19}/> London position</button></>;
  return <><div className="page-heading compact-heading"><h1>Play</h1></div>
    <div className="study-layout"><section className="board-area"><div className="player-label"><span className="player-token">&#9822;</span><div><strong>Robin</strong><small>1000</small></div></div><Board game={game} onMove={submit} pack={pack} palette={data.settings.board} flipped={saved ? (saved.side === 'b') !== flipped : flipped} disabled={!saved || Boolean(saved.result) || thinking || game.turn() !== saved.side || Boolean(error)}/><div className="player-label"><span className="player-token white-token">&#9817;</span><div><strong>{saved?.side === 'b' ? 'Black' : 'White'}</strong></div><button className="icon-button" aria-label="Flip board" title="Flip board" onClick={() => setFlipped(!flipped)}><RefreshCw size={20}/></button></div></section>
    <aside className="lesson-panel"><div className="compact-player"><div className="bot-avatar"><Swords size={30}/></div><div><h2>Robin</h2><span className="rating-pill" title="Uncalibrated strength target">1000</span></div></div>
      {saved ? <><div className="game-status" role="status">{saved.result ? `Finished | ${saved.result}` : error || (thinking ? 'Robin is thinking?' : game.isCheck() ? 'Check - your move' : 'Your move')}</div>{error && <button className="button full" onClick={() => { setError(''); setEngineVersion(value => value + 1); }}>Retry engine</button>}
      <div className="game-toolbar"><button className="icon-button" aria-label="Undo" title="Undo" disabled={!game.history().length || Boolean(saved.result)} onClick={undo}><RotateCcw size={21}/></button><button className="icon-button" aria-label="Resign" title="Resign" disabled={Boolean(saved.result)} onClick={() => finish(saved.side === 'w' ? '0?1' : '1?0')}><Flag size={21}/></button><button className="icon-button" aria-label="Export game as PGN" title="Export PGN" onClick={exportPGN}><Download size={21}/></button></div>
      {saved.source && <div className="game-source"><BookOpen size={17}/>{saved.source}</div>}
      <div className="moves-panel"><span className="eyebrow">Moves</span><div>{game.history().map((move, index) => <span key={index}>{index % 2 === 0 && <small>{Math.floor(index / 2) + 1}.</small>} {move}</span>)}</div></div><details className="subtle-details"><summary><Play size={17}/> New game</summary>{setup}</details></> : setup}
      <details className="subtle-details"><summary>About Robin</summary><p>Calculated moves with a 1000-strength target. The rating is not externally calibrated.</p></details>
    </aside></div></>;
}
