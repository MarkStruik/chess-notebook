// Local commentary: every remark describes the played move, never a future line.
const remarks = {
  excellent: [
    'That was the narrow path through the jungle. You found it.',
    'A move with a little extra sparkle. You found something the alternatives missed.',
    'That one deserves a small, dignified fist pump.',
  ],
  best: [
    'Right on the money. The engine and you are nodding at the same time.',
    'That is the engine’s first choice. Take a tiny bow.',
    'Top of the shortlist. Nicely spotted.',
    'The silicon jury approves. Good eyes.',
  ],
  interesting: [
    'A little material, a little mischief. The engine sees compensation in that idea.',
    'An adventurous idea with something behind it. Nicely creative.',
  ],
  inaccuracy: [
    'A small wobble. The position had a little more to offer.',
    'A slightly loose stitch. Keep the next move tidy.',
    'That gave away a little ground. Plenty of chess left.',
  ],
  mistake: [
    'The position got tougher there. A calm reset will help.',
    'That one needed another glance. Take a breath before the next move.',
    'A banana peel on the chessboard. Time to steady your footing.',
  ],
  blunder: [
    'Oof, that gave a lot away. Breathe, regroup, and look for your next chance.',
    'That move went on an unexpected adventure. Time for a careful reset.',
    'A proper plot twist. Take a breath and make the next decision count.',
  ],
  quiet: [
    'Quiet move. No fireworks required.',
    'Steady chess. A useful move can speak softly.',
    'A sensible step. Keep the pieces working together.',
  ],
};
const pick = (bank, index) => bank[((index % bank.length) + bank.length) % bank.length];
export function coachComment(move, grade, index = 0) {
  if (move.san?.includes('#')) return 'Checkmate. A very convincing full stop.';
  if (grade.label === 'Excellent move') return pick(remarks.excellent, index);
  if (grade.label === 'Interesting move') return pick(remarks.interesting, index);
  if (grade.label === 'Blunder') return pick(remarks.blunder, index);
  if (grade.label === 'Mistake') return pick(remarks.mistake, index);
  if (grade.label === 'Inaccuracy') return pick(remarks.inaccuracy, index);
  if (move.promotion) {
    const piece = { q: 'queen', r: 'rook', b: 'bishop', n: 'knight' }[move.promotion];
    return 'A pawn walked in; a ' + piece + ' walked out. Quite the upgrade.';
  }
  if (/^O-O/.test(move.san || '')) return 'King tucked in, rook clocked in. A tidy castle.';
  if (move.san?.includes('+')) return 'A polite knock on the king’s door. Check.';
  if (move.captured) return 'Your ' + ({ p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' }[move.piece]) + ' found something worth picking up.';
  if (grade.label === 'Best move') return pick(remarks.best, index);
  const homeRank = move.color === 'w' ? '1' : '8';
  if (['b', 'n'].includes(move.piece) && move.from?.[1] === homeRank && index < 20) {
    return 'Your ' + (move.piece === 'n' ? 'knight' : 'bishop') + ' has left the sofa and joined the game.';
  }
  if (move.piece === 'p' && ['d4', 'e4', 'd5', 'e5'].includes(move.to)) return 'A little claim to the middle. Your pawn brought a flag.';
  return pick(remarks.quiet, index);
}

export function showCoachBubble(move, grade) {
  return grade.label !== 'Good move' || Boolean(move.captured || move.promotion || /[+#]/.test(move.san || '') || /^O-O/.test(move.san || ''));
}
