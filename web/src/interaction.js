export const SLIDE_MS = 190;
export const RETURN_MS = 140;
export const DRAG_THRESHOLD = 5;
export function squarePoint(square, flipped = false) {
  const file = square.charCodeAt(0) - 97, rank = Number(square[1]);
  return flipped ? { x: 7 - file, y: rank - 1 } : { x: file, y: 8 - rank };
}
export function pointerSquare(x, y, rect, flipped = false) {
  if (x < rect.left || y < rect.top || x >= rect.right || y >= rect.bottom) return null;
  const file = Math.floor((x - rect.left) / rect.width * 8), rank = Math.floor((y - rect.top) / rect.height * 8);
  return flipped ? 'hgfedcba'[file] + (rank + 1) : 'abcdefgh'[file] + (8 - rank);
}
export function replyDelay(random = Math.random, lesson = false) {
  return Math.round((lesson ? 700 : 1000) + random() * (lesson ? 250 : 600));
}
export function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Cancelled', 'AbortError')); };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}
export function resolveBoard(settings, packs, piecePack) {
  let choice = settings.boardChoice;
  if (!choice) {
    const id = settings.texture || (Object.keys(piecePack?.boards || {}).length ? piecePack.id : null);
    choice = id ? 'pack:' + id : 'flat:' + (settings.board || 'sage');
  }
  const boardPack = choice.startsWith('pack:') ? packs.find(item => item.id === choice.slice(5)) : null;
  const asset = boardPack && Object.values(boardPack.boards || {})[0];
  return { choice, url: asset ? boardPack.baseUrl + asset.path : null, name: boardPack?.name, palette: choice.startsWith('flat:') ? choice.slice(5) : settings.board || 'sage' };
}
