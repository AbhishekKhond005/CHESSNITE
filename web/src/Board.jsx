import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DRAG_THRESHOLD, RETURN_MS, SLIDE_MS, pointerSquare, squarePoint } from './interaction.js';
export const palettes = {
  sage: { name: 'Sage', light: '#e8edde', dark: '#779584' },
  walnut: { name: 'Walnut', light: '#f0dfc5', dark: '#a57853' },
  slate: { name: 'Slate', light: '#e4e8eb', dark: '#8999a8' },
  sand: { name: 'Linen', light: '#f4ebd9', dark: '#c4b28f' },
};
const glyphs = { wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙', bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟' };
const uci = move => move.from + move.to + (move.promotion || '');
const piecesAt = game => Object.fromEntries(game.board().flat().filter(Boolean).map(piece => [piece.square, piece.color + piece.type]));
export default function Board({ game, onMove, pack, palette = 'sage', flipped = false, disabled = false, highlight = null }) {
  const [selected, setSelected] = useState(null), [promotion, setPromotion] = useState(null);
  const [drag, setDrag] = useState(null), [hover, setHover] = useState(null), [motion, setMotion] = useState([]);
  const board = useRef(null), gesture = useRef(null), previous = useRef(null), timer = useRef(null), draggedMove = useRef(null), sequence = useRef(0);
  const fen = game.fen(), history = game.history({ verbose: true }), pieces = piecesAt(game);
  const animated = pack?.motion !== false && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const files = [...'abcdefgh'], ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  if (flipped) { files.reverse(); ranks.reverse(); }
  const colors = palettes[palette] || palettes.sage;
  const legal = selected && !disabled ? game.moves({ square: selected, verbose: true }) : [];
  const last = history.at(-1);
  const inCheck = game.isCheck();
  useLayoutEffect(() => {
    const old = previous.current;
    previous.current = { fen, history, pieces, flipped };
    clearTimeout(timer.current);
    setSelected(null); setDrag(null); setHover(null); gesture.current = null;
    const entries = [];
    if (animated && old && old.flipped === flipped && old.fen !== fen) {
      const forward = history.length === old.history.length + 1 && old.history.every((move, index) => uci(move) === uci(history[index]));
      const backward = old.history.length === history.length + 1 && history.every((move, index) => uci(move) === uci(old.history[index]));
      const move = forward ? last : backward ? old.history.at(-1) : null;
      if (move) {
        const from = forward ? move.from : move.to, to = forward ? move.to : move.from;
        if (draggedMove.current !== from + to) entries.push({ from, to, code: old.pieces[from], type: 'slide' });
        if (move.flags.includes('k') || move.flags.includes('q')) {
          const rank = move.from[1], rookFrom = (move.flags.includes('k') ? 'h' : 'a') + rank, rookTo = (move.flags.includes('k') ? 'f' : 'd') + rank;
          entries.push({ from: forward ? rookFrom : rookTo, to: forward ? rookTo : rookFrom, code: move.color + 'r', type: 'slide' });
        }
        if (forward && move.captured && entries.length) {
          const at = move.flags.includes('e') ? move.to[0] + move.from[1] : move.to;
          entries.unshift({ from: at, to: at, code: old.pieces[at], type: 'capture' });
        }
      }
    }
    draggedMove.current = null;
    setMotion(entries.map(entry => ({ ...entry, id: ++sequence.current })));
    if (entries.length) timer.current = setTimeout(() => setMotion([]), SLIDE_MS);
  }, [fen, flipped]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    const resetGesture = () => { gesture.current = null; setDrag(null); setHover(null); setSelected(null); };
    window.addEventListener('blur', resetGesture);
    return () => window.removeEventListener('blur', resetGesture);
  }, []);
  function attempt(from, to, promoted, dragged = false) {
    if (disabled || !from || !to) return false;
    const candidates = game.moves({ square: from, verbose: true }).filter(item => item.to === to);
    if (!candidates.length) return false;
    if (candidates.some(item => item.promotion) && !promoted) { setPromotion({ from, to, dragged }); return true; }
    draggedMove.current = dragged ? from + to : null;
    const accepted = onMove?.({ from, to, ...(promoted ? { promotion: promoted } : {}) }) !== false;
    if (accepted) { setSelected(null); setPromotion(null); }
    else draggedMove.current = null;
    return accepted;
  }
  function click(square, prior = selected) {
    if (disabled) return;
    if (prior && attempt(prior, square)) return;
    setSelected(pieces[square]?.[0] === game.turn() ? prior === square ? null : square : null);
  }
  function pointerDown(event, square) {
    if (disabled || event.button !== 0 || promotion) return;
    const own = pieces[square]?.[0] === game.turn();
    gesture.current = { from: own ? square : null, down: square, x: event.clientX, y: event.clientY, prior: selected, moved: false, pointerId: event.pointerId };
    if (own) setSelected(square);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
  function pointerMove(event) {
    const held = gesture.current;
    if (!held?.from || held.pointerId !== event.pointerId) return;
    if (!held.moved && Math.hypot(event.clientX - held.x, event.clientY - held.y) < DRAG_THRESHOLD) return;
    held.moved = true;
    const rect = board.current.getBoundingClientRect();
    setDrag({ from: held.from, code: pieces[held.from], x: event.clientX, y: event.clientY, size: rect.width / 8 });
    setHover(pointerSquare(event.clientX, event.clientY, rect, flipped));
  }
  function returnPiece(held, x, y) {
    if (!animated || !held?.from) return;
    const rect = board.current.getBoundingClientRect(), point = squarePoint(held.from, flipped), size = rect.width / 8;
    setMotion([{ id: ++sequence.current, type: 'return', from: held.from, to: held.from, code: pieces[held.from],
      offsetX: (x - rect.left - (point.x + .5) * size) / size * 100,
      offsetY: (y - rect.top - (point.y + .5) * size) / size * 100 }]);
    clearTimeout(timer.current); timer.current = setTimeout(() => setMotion([]), RETURN_MS);
  }
  function pointerUp(event, cancelled = false) {
    const held = gesture.current;
    if (!held || held.pointerId !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    setDrag(null); setHover(null);
    if (held.moved) {
      const to = cancelled ? null : pointerSquare(event.clientX, event.clientY, board.current.getBoundingClientRect(), flipped);
      if (!attempt(held.from, to, undefined, true)) returnPiece(held, event.clientX, event.clientY);
    } else if (!cancelled) click(held.down, held.prior);
  }
  function sprite(code) {
    const asset = pack?.pieces?.[code];
    return asset ? <img src={pack.baseUrl + asset.path} alt={code} draggable={false}/> : <span className={`piece-glyph ${code?.[0]}`}>{glyphs[code]}</span>;
  }
  return <div className="board-shell"><div ref={board} data-interactive={!disabled} className={`chessboard ${pack?.textureUrl ? 'textured' : ''}`} role="group" aria-label="Chess board" style={{ '--light-square': colors.light, '--dark-square': colors.dark, ...(pack?.textureUrl ? { backgroundImage: `url("${pack.textureUrl}")`, backgroundSize: `${100 / (1 - Math.max(0, Math.min(10, pack.textureCrop)) * .02)}%`, backgroundPosition: 'center' } : {}) }}>
    {ranks.flatMap((rank, row) => files.map((file, col) => {
      const square = file + rank, code = pieces[square], available = legal.some(item => item.to === square);
      const hidden = drag?.from === square || motion.some(item => item.to === square && item.type !== 'capture');
      const light = ('abcdefgh'.indexOf(file) + rank) % 2 === 0;
      return <button key={square} type="button" data-square={square} aria-label={`${square}${code ? ' ' + code : ''}`} aria-pressed={selected === square}
        className={`square ${light ? 'light' : 'dark'} ${last && [last.from, last.to].includes(square) ? 'last' : ''} ${selected === square ? 'selected' : ''} ${highlight === square ? 'hint-square' : ''} ${hover === square ? 'drop-hover' : ''} ${inCheck && code === game.turn() + 'k' ? 'in-check' : ''}`}
        onPointerDown={event => pointerDown(event, square)} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={event => pointerUp(event, true)} onLostPointerCapture={() => { if (gesture.current) { gesture.current = null; setDrag(null); setHover(null); } }} onClick={event => { if (event.detail === 0) click(square); }}>
        {col === 0 && <span className="rank-coordinate">{rank}</span>}{row === 7 && <span className="file-coordinate">{file}</span>}
        {code && <span className={`board-piece ${hidden ? 'piece-hidden' : ''}`}>{sprite(code)}</span>}
        {available && <span className={code ? 'capture-marker' : 'move-marker'} />}
      </button>;
    }))}
    <div className="motion-layer" aria-hidden="true">{motion.map(item => {
      const to = squarePoint(item.to, flipped), from = squarePoint(item.from, flipped);
      return <span key={item.id} data-motion={item.type} className={`moving-piece ${item.type}`} style={{ left: to.x * 12.5 + '%', top: to.y * 12.5 + '%', '--travel-x': (item.offsetX ?? (from.x - to.x) * 100) + '%', '--travel-y': (item.offsetY ?? (from.y - to.y) * 100) + '%', '--move-duration': (item.type === 'return' ? RETURN_MS : SLIDE_MS) + 'ms' }}>{sprite(item.code)}</span>;
    })}</div>
  </div>{drag && <div className="drag-piece" data-testid="drag-piece" aria-hidden="true" style={{ left: drag.x - drag.size / 2, top: drag.y - drag.size / 2, width: drag.size, height: drag.size }}>{sprite(drag.code)}</div>}
  {promotion && <div className="promotion-picker" role="dialog" aria-label="Choose promotion piece"><p>Promote to</p>{['q', 'r', 'b', 'n'].map(type => <button key={type} aria-label={({ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' })[type]} onClick={() => attempt(promotion.from, promotion.to, type, promotion.dragged)}>{sprite(game.turn() + type)}</button>)}<button onClick={() => setPromotion(null)}>Cancel</button></div>}</div>;
}
