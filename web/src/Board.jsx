import { useState } from 'react';
export const palettes = {
  sage: { name: 'Sage', light: '#e8edde', dark: '#779584' },
  walnut: { name: 'Walnut', light: '#f0dfc5', dark: '#a57853' },
  slate: { name: 'Slate', light: '#e4e8eb', dark: '#8999a8' },
  sand: { name: 'Linen', light: '#f4ebd9', dark: '#c4b28f' },
};
const glyphs = { wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙', bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟' };
export default function Board({ game, onMove, pack, palette = 'sage', flipped = false, disabled = false, highlight = null }) {
  const [selected, setSelected] = useState(null), [promotion, setPromotion] = useState(null);
  const files = [...'abcdefgh'], ranks = [8, 7, 6, 5, 4, 3, 2, 1];
  if (flipped) { files.reverse(); ranks.reverse(); }
  const colors = palettes[palette] || palettes.sage;
  const legal = selected && !disabled ? game.moves({ square: selected, verbose: true }) : [];
  const last = game.history({ verbose: true }).at(-1);
  function move(from, to, promoted) {
    if (disabled || !from) return;
    const candidates = game.moves({ square: from, verbose: true }).filter(item => item.to === to);
    if (!candidates.length) return;
    if (candidates.some(item => item.promotion) && !promoted) { setPromotion({ from, to }); return; }
    setSelected(null); setPromotion(null); onMove?.({ from, to, ...(promoted ? { promotion: promoted } : {}) });
  }
  function click(square) {
    if (disabled) return;
    const piece = game.get(square);
    if (selected && legal.some(item => item.to === square)) return move(selected, square);
    setSelected(piece?.color === game.turn() ? square : null);
  }
  return <div className="board-shell"><div className="chessboard" role="group" aria-label="Chess board" style={{ '--light-square': colors.light, '--dark-square': colors.dark }}>
    {ranks.flatMap((rank, row) => files.map((file, col) => {
      const square = file + rank, piece = game.get(square), code = piece ? piece.color + piece.type : null;
      const asset = code && pack?.pieces?.[code], available = legal.some(item => item.to === square);
      const light = ('abcdefgh'.indexOf(file) + rank) % 2 === 0;
      return <button key={square} type="button" data-square={square} aria-label={`${square}${code ? ' ' + code : ''}`} aria-pressed={selected === square}
        className={`square ${light ? 'light' : 'dark'} ${last && [last.from, last.to].includes(square) ? 'last' : ''} ${selected === square ? 'selected' : ''} ${highlight === square ? 'hint-square' : ''}`}
        onClick={() => click(square)} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); move(event.dataTransfer.getData('text/plain'), square); }}>
        {col === 0 && <span className="rank-coordinate">{rank}</span>}{row === 7 && <span className="file-coordinate">{file}</span>}
        {piece && (asset ? <img src={pack.baseUrl + asset.path} alt={code} draggable={!disabled} onDragStart={event => { if (disabled || piece.color !== game.turn()) return event.preventDefault(); setSelected(square); event.dataTransfer.setData('text/plain', square); }} /> : <span className={`piece-glyph ${piece.color}`}>{glyphs[code]}</span>)}
        {available && <span className={piece ? 'capture-marker' : 'move-marker'} />}
      </button>;
    }))}
  </div>{promotion && <div className="promotion-picker" role="dialog" aria-label="Choose promotion piece"><p>Promote to</p>{['q', 'r', 'b', 'n'].map(type => <button key={type} onClick={() => move(promotion.from, promotion.to, type)}>{({ q: 'Queen', r: 'Rook', b: 'Bishop', n: 'Knight' })[type]}</button>)}<button onClick={() => setPromotion(null)}>Cancel</button></div>}</div>;
}
