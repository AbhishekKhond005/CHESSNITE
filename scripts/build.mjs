import { build } from 'vite';
import { mkdir, copyFile, writeFile } from 'node:fs/promises';
await mkdir('engine', { recursive: true });
for (const name of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  await copyFile(`node_modules/stockfish/bin/${name}`, `engine/${name}`);
}
await copyFile('node_modules/stockfish/Copying.txt', 'engine/stockfish-license.txt');
await writeFile('engine/stockfish-source.txt', 'Stockfish.js 19.0.1, unmodified lite single-threaded build.\nGPL-3.0.\nCorresponding source: https://github.com/nmrugg/stockfish.js/tree/v19.0.1\nPackage: https://www.npmjs.com/package/stockfish/v/19.0.1\n');
await build();
