// One context, decoded buffers, a gentle gain boost and a peak limiter.
let context, output, limiter;
const buffers = new Map();
function ready() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  if (!context) {
    context = new AudioContext(); output = context.createGain(); limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -3; limiter.knee.value = 3; limiter.ratio.value = 20;
    limiter.attack.value = .003; limiter.release.value = .1;
    output.connect(limiter); limiter.connect(context.destination);
  }
  context.resume().catch(() => {});
  return context;
}
async function decode(url, audio) {
  if (!buffers.has(url)) buffers.set(url, fetch(url).then(response => {
    if (!response.ok) throw new Error('Sound unavailable');
    return response.arrayBuffer();
  }).then(bytes => audio.decodeAudioData(bytes)).catch(error => { buffers.delete(url); throw error; }));
  return buffers.get(url);
}
export function warmSounds(pack) {
  const audio = ready();
  if (!audio || !pack) return;
  for (const event of ['move-self', 'move-opponent', 'capture', 'move-check', 'castle', 'puzzle-wrong']) {
    const asset = pack.sounds?.[event]?.mp3;
    if (asset) decode(pack.baseUrl + asset.path, audio).catch(() => {});
  }
}
export async function playSound(url, volume = .9) {
  const level = Math.max(0, Math.min(1, Number(volume)));
  if (!level) return;
  const audio = ready();
  if (!audio) { const element = new Audio(url); element.volume = level; element.play().catch(() => {}); return; }
  try {
    const buffer = await decode(url, audio);
    output.gain.setValueAtTime(level * 1.5, audio.currentTime);
    const source = audio.createBufferSource(); source.buffer = buffer; source.connect(output); source.start();
  } catch { /* An unavailable sound must never block a legal move. */ }
}
