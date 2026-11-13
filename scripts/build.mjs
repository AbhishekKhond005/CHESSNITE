import { build } from 'vite';
import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
await mkdir('engine', { recursive: true });
for (const name of ['stockfish-19-lite-single.js', 'stockfish-19-lite-single.wasm']) {
  await copyFile(`node_modules/stockfish/bin/${name}`, `engine/${name}`);
}
await copyFile('node_modules/stockfish/Copying.txt', 'engine/stockfish-license.txt');
await copyFile('third_party/stockfish-v19.0.1.tar.gz', 'engine/stockfish-source.tar.gz');
await writeFile('engine/stockfish-source.txt', 'Stockfish.js 19.0.1, unmodified lite single-threaded build.\nGPL-3.0.\nLocal corresponding source archive: /stockfish-source.tar.gz\nSource release: https://github.com/nmrugg/stockfish.js/tree/v19.0.1\nCommit: 0d5dd7944f88c817c07a26bc4fb1905d5f9c46d6\nPackage: https://www.npmjs.com/package/stockfish/v/19.0.1\n');
let notices = 'CHESSNITE dependency notices\n\n';
for (const [name, file] of [['React', 'react/LICENSE'], ['React DOM', 'react-dom/LICENSE'], ['chess.js', 'chess.js/LICENSE'], ['Lucide icons', 'lucide-react/LICENSE']]) {
  notices += `${name}\n${await readFile('node_modules/' + file, 'utf8')}\n\n`;
}
await writeFile('engine/dependency-notices.txt', notices);
await build();
