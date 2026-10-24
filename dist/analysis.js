// UCI scores are relative to the player whose turn it is.
export function readEngineInfo(line) {
  const score = line.match(/\bscore (cp|mate) (-?\d+)/);
  const pv = line.match(/\bpv ([a-h][1-8][a-h][1-8][qrbn]?)(?:\s|$)/);
  const depth = line.match(/\bdepth (\d+)/);
  if (!score || !pv || !depth) return null;
  return {
    depth: Number(depth[1]),
    rank: Number(line.match(/\bmultipv (\d+)/)?.[1] || 1),
    score: score[1] === 'cp' ? Number(score[2]) / 100 : Number(score[2]) > 0 ? 100 : -100,
    move: pv[1],
    bounded: /\b(?:lowerbound|upperbound)\b/.test(line),
  };
}

export function gradeMove(move, baseline, reply, positionAfter) {
  const uci = move.from + move.to + (move.promotion || '');
  const best = baseline.move === uci;
  const loss = best ? 0 : Math.max(0, baseline.score + reply.score);
  const first = baseline.variations?.find(v => v.rank === 1);
  const second = baseline.variations?.find(v => v.rank === 2);
  // Compare alternatives only from the same completed depth, without score bounds.
  const gap = first?.move === uci && second && first.depth === second.depth && !first.bounded && !second.bounded
    ? first.score - second.score : 0;
  if (best && gap >= 1.25 && baseline.score >= -0.5) {
    return { symbol: '!!', label: 'Excellent move', tone: 'excellent', loss };
  }
  if (best) return { symbol: '!', label: 'Best move', tone: 'good', loss };
  if (loss >= 2) return { symbol: '??', label: 'Blunder', tone: 'bad', loss };
  if (loss >= 1) return { symbol: '?', label: 'Mistake', tone: 'bad', loss };
  if (loss >= 0.4) return { symbol: '?!', label: 'Inaccuracy', tone: 'dubious', loss };
  const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  const recapture = positionAfter.moves({ verbose: true }).find(m => m.from + m.to + (m.promotion || '') === reply.move);
  const sacrifice = recapture?.to === move.to && recapture.captured &&
    values[move.piece] - (values[move.captured] || 0) >= 2;
  if (sacrifice && reply.score <= 0.5) {
    return { symbol: '!?', label: 'Interesting move', tone: 'interesting', loss };
  }
  return { symbol: '', label: 'Good move', tone: 'good', loss };
}

export function latestTrails(history, index = history.length) {
  const moves = {};
  for (let i = index - 1; i >= 0; i--) {
    const move = history[i];
    if (!moves[move.color]) moves[move.color] = move;
    if (moves.w && moves.b) break;
  }
  return Object.values(moves);
}
