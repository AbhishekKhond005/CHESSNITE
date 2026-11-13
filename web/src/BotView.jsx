import { useEffect, useMemo, useRef, useState } from 'react';
import { Chess } from 'chess.js';
import { ArrowRight, Download, Flag, RefreshCw, RotateCcw, Swords } from 'lucide-react';
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
  return <><div className="page-heading"><div><span className="eyebrow">PUT YOUR IDEAS ON THE BOARD</span><h1>A friendly face. A fresh position.</h1><p>No script to memorize. Robin calculates every move from the board.</p></div><span className="quiet-badge"><Swords size={16}/> Untimed practice</span></div>
    <div className="study-layout"><section className="board-area"><div className="player-label"><span className="player-token">♞</span><div><strong>Robin</strong><small>1000 strength target · {thinking ? 'Thinking…' : 'Ready to play'}</small></div></div><Board game={game} onMove={submit} pack={pack} palette={data.settings.board} flipped={saved ? (saved.side === 'b') !== flipped : flipped} disabled={!saved || Boolean(saved.result) || thinking || game.turn() !== saved.side || Boolean(error)}/><div className="player-label"><span className="player-token white-token">♙</span><div><strong>{saved?.side === 'b' ? 'You’re Black' : 'You’re White'}</strong><small>{saved?.source || 'Standard starting position'}</small></div><button className="text-button" onClick={() => setFlipped(!flipped)}><RefreshCw size={14}/> Flip board</button></div></section>
    <aside className="lesson-panel"><span className="eyebrow">YOUR SPARRING PARTNER</span><div className="bot-avatar">♞</div><h2>Robin</h2><p>A patient opponent for exploring the London and playing beyond your prepared lines.</p><span className="rating-pill">1000 · approximate strength</span>
      {saved && <><div className="game-status" role="status">{saved.result ? `Game finished · ${saved.result}` : error || (thinking ? 'Robin is thinking…' : game.isCheck() ? 'You’re in check. Find a legal reply.' : 'Your move. Take your time.')}</div>{error && <button className="button full" onClick={() => { setError(''); setEngineVersion(value => value + 1); }}>Reload engine & retry</button>}
      <div className="game-controls"><button className="button" disabled={!game.history().length || Boolean(saved.result)} onClick={undo}><RotateCcw size={14}/> Undo</button><button className="button" disabled={Boolean(saved.result)} onClick={() => finish(saved.side === 'w' ? '0–1' : '1–0')}><Flag size={14}/> Resign</button></div><button className="text-button" onClick={exportPGN}><Download size={15}/> Export game as PGN</button></>}
      <div className="moves-panel"><span className="eyebrow">{saved ? 'START ANOTHER GAME' : 'SET UP YOUR GAME'}</span><span className="panel-label">Play as</span><div className="radio-row"><button className={`button ${side === 'w' ? 'selected' : ''}`} onClick={() => setSide('w')}>White</button><button className={`button ${side === 'b' ? 'selected' : ''}`} onClick={() => setSide('b')}>Black</button></div><button className="button primary full" onClick={() => newGame(false)}>Play from the start <ArrowRight size={15}/></button><button className="button full" onClick={() => newGame(true)}>Play from the London setup</button></div>
      {saved && <div className="moves-panel"><span className="eyebrow">MOVES PLAYED</span><div>{game.history().map((move, index) => <span key={index}>{index % 2 === 0 && <small>{Math.floor(index / 2) + 1}.</small>} {move}</span>)}</div></div>}<p className="microcopy">The 1000 label is a practice target, not a measured online rating. Robin uses a local Stockfish search with varied candidate selection. Your game saves automatically.</p>
    </aside></div></>;
}
