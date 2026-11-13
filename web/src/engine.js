// Runtime UCI adapter. Search requests are serialized; aborted results never reach the board.
export function selectCandidate(candidates, random = Math.random) {
  if (!candidates.length) throw new Error('Robin did not find a legal move. Please retry.');
  const ordered = [...candidates].sort((a, b) => b.score - a.score);
  const viable = ordered.filter(item => ordered[0].score - item.score <= 300);
  const weights = viable.map(item => Math.exp((item.score - ordered[0].score) / 135));
  let choice = random() * weights.reduce((a, b) => a + b, 0);
  return viable.find((_, index) => (choice -= weights[index]) <= 0)?.move || viable.at(-1).move;
}

export class RobinEngine {
  constructor() {
    this.worker = new Worker('/stockfish-19-lite-single.js');
    this.sequence = Promise.resolve();
    this.ready = new Promise((resolve, reject) => {
      this.readyTimer = setTimeout(() => reject(new Error('The engine took too long to load. Retry to load Robin again.')), 20000);
      this.readyResolve = () => { clearTimeout(this.readyTimer); resolve(); };
      this.readyReject = reject;
    });
    this.ready.catch(() => {});
    this.worker.onmessage = event => String(event.data).split('\n').forEach(line => this.onLine(line));
    this.worker.onerror = () => { const error = new Error('The local engine could not start. Check that the app files are complete, then retry.'); this.readyReject(error); this.job?.reject(error); this.job = null; };
    this.worker.postMessage('uci');
  }
  onLine(line) {
    if (line === 'uciok') {
      for (const command of ['setoption name Hash value 16', 'setoption name MultiPV value 5', 'setoption name Skill Level value 20', 'isready']) this.worker.postMessage(command);
    }
    if (line === 'readyok') this.readyResolve();
    if (!this.job) return;
    const match = line.match(/info depth (\d+).*?multipv (\d+).*?score (cp|mate) (-?\d+).*? pv (\S+)/);
    if (match) {
      const score = match[3] === 'mate' ? Math.sign(Number(match[4])) * 100000 : Number(match[4]);
      const existing = this.job.candidates.get(Number(match[2]));
      if (!existing || Number(match[1]) >= existing.depth) this.job.candidates.set(Number(match[2]), { depth: Number(match[1]), score, move: match[5] });
    }
    if (line.startsWith('bestmove ')) {
      const job = this.job; this.job = null; clearTimeout(job.timer); job.signal?.removeEventListener('abort', job.abort);
      if (job.signal?.aborted) return job.reject(new DOMException('Cancelled', 'AbortError'));
      const candidates = [...job.candidates.values()].filter(item => job.legal.has(item.move));
      const best = line.split(' ')[1];
      if (!candidates.length && job.legal.has(best)) candidates.push({ move: best, score: 0 });
      try { job.resolve(selectCandidate(candidates)); } catch (error) { job.reject(error); }
    }
  }
  think(game, signal) {
    const fen = game.header().FEN || new game.constructor().fen();
    const history = game.history({ verbose: true }).map(move => move.from + move.to + (move.promotion || ''));
    const legal = new Set(game.moves({ verbose: true }).map(move => move.from + move.to + (move.promotion || '')));
    this.sequence = this.sequence.catch(() => {}).then(async () => {
      await this.ready;
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      return new Promise((resolve, reject) => {
        const abort = () => this.worker.postMessage('stop');
        const timer = setTimeout(() => { this.worker.postMessage('stop'); if (this.job) { this.job = null; reject(new Error('Robin’s search timed out. Please retry.')); this.worker.terminate(); } }, 10000);
        this.job = { resolve, reject, signal, abort, timer, legal, candidates: new Map() };
        signal?.addEventListener('abort', abort, { once: true });
        this.worker.postMessage(`position fen ${fen}${history.length ? ' moves ' + history.join(' ') : ''}`);
        this.worker.postMessage('go depth 5 movetime 180');
      });
    });
    return this.sequence;
  }
  dispose() {
    clearTimeout(this.readyTimer);
    this.readyReject(new DOMException('Cancelled', 'AbortError'));
    if (this.job) { clearTimeout(this.job.timer); this.job.signal?.removeEventListener('abort', this.job.abort); this.job.reject(new DOMException('Cancelled', 'AbortError')); this.job = null; }
    this.worker.terminate();
  }
}
