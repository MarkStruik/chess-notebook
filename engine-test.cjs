const { spawn } = require('child_process');
const assert = require('assert/strict');
const { Chess } = require('./dist/vendor/chess.js');
const { readEngineInfo } = require('./dist/analysis.js');
const child = spawn(process.execPath, ['dist/vendor/stockfish-19-lite-single.js']);
let buffer = '', alternatives = new Map(), finished = false;
const timer = setTimeout(() => { child.kill(); console.error('Engine timed out'); process.exitCode = 1; }, 15000);
child.on('error', error => { clearTimeout(timer); console.error(error); process.exitCode = 1; });
child.on('exit', () => { clearTimeout(timer); if (!finished) process.exitCode = 1; });
child.stderr.on('data', data => process.stderr.write(data));
child.stdout.on('data', data => {
  buffer += data;
  const lines = buffer.split('\n'); buffer = lines.pop();
  for (const line of lines) {
    if (line.trim() === 'uciok') child.stdin.write('isready\n');
    if (line.trim() === 'readyok') child.stdin.write('setoption name MultiPV value 2\nposition startpos moves e2e4\ngo depth 9\n');
    const info = readEngineInfo(line);
    if (info) alternatives.set(info.rank, info);
    if (line.startsWith('bestmove ')) {
      try {
        const move = line.split(' ')[1], chess = new Chess(); chess.move('e4');
        chess.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move[4] });
        assert.equal(alternatives.get(1).depth, 9);
        assert.equal(alternatives.get(2).depth, 9);
        assert.notEqual(alternatives.get(1).move, alternatives.get(2).move);
        assert.equal(alternatives.get(1).move, move);
        assert.ok(alternatives.get(1).score >= alternatives.get(2).score);
        finished = true;
        console.log('PASS: bundled Stockfish handshake, legal reply, and two ranked alternatives at a completed depth.');
      } catch (error) { console.error(error); process.exitCode = 1; }
      clearTimeout(timer); child.kill();
    }
  }
});
child.stdin.write('uci\n');
