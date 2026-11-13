// Reviewed launch course. Move orders are validated by the course test suite.
const lesson = (id, title, description, moves, cues, objective) => ({ id, title, description, moves: moves.split(' '), cues, objective });
export const units = [
  { id: 'foundations', title: 'Meet the London', subtitle: 'A sound setup. A clear plan.', lessons: [
    lesson('claim-center', 'Start with the center', 'Give your pieces room to work.', 'd4 d5 Nf3 Nf6 Bf4', ['Claim central space with the d-pawn.', 'Develop the knight toward the center.', 'Bring your bishop out before playing e3.'], 'Build the London triangle without shutting in your bishop.'),
    lesson('triangle', 'Build your triangle', 'Support the center without rushing.', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3', ['Take central space.', 'Develop your king’s knight.', 'Activate the bishop outside the pawn chain.', 'Support d4 and open the diagonal for your other bishop.', 'Reinforce d4 with c3.'], 'Understand the d4–e3–c3 pawn structure.'),
  ]},
  { id: 'development', title: 'Bring everyone to the party', subtitle: 'Finish development and protect your king.', lessons: [
    lesson('develop', 'Knights before adventures', 'Prepare a natural square for every piece.', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2', ['Occupy the center.', 'Develop with Nf3.', 'Get the bishop outside the chain.', 'Open the f1 bishop’s diagonal.', 'Keep your center supported.', 'Develop the other knight without blocking the c-pawn.'], 'Develop the b1 knight to d2, keeping the setup coordinated.'),
    lesson('castle', 'A home for your king', 'Complete your setup and castle.', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bd3 O-O O-O', ['Claim space.', 'Develop the knight.', 'Activate the bishop.', 'Support your center.', 'Reinforce d4.', 'Bring the second knight to d2.', 'Aim the bishop toward h7.', 'Castle kingside.'], 'Reach a complete, safe London setup.'),
  ]},
  { id: 'replies', title: 'When Black changes the plan', subtitle: 'Learn replies, not just a sequence.', lessons: [
    lesson('bishop-challenge', 'Meet an early …Bd6', 'Trade actively or keep your bishop.', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 Bd6 Bxd6 Qxd6 Bd3', ['Take the center.', 'Develop the knight.', 'Activate your bishop.', 'Support d4.', 'Accept the bishop exchange on d6.', 'Develop the remaining bishop toward the center.'], 'Recognize that exchanging the active bishop can be a sound choice.'),
    lesson('keep-bishop', 'Keep the bishop pair', 'Step back when the bishop is challenged.', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 Bd6 Bg3 O-O Bd3', ['Claim central space.', 'Develop.', 'Bring out the bishop.', 'Open the f1 bishop’s diagonal.', 'Retreat to g3 while staying on the diagonal.', 'Continue development with Bd3.'], 'Use Bg3 as an alternative to exchanging on d6.'),
    lesson('queenside-pressure', 'Watch the b2 pawn', 'Understand the pressure after …Qb6.', 'd4 d5 Nf3 Nf6 Bf4 c5 e3 Nc6 c3 Qb6 Qb3', ['Take space.', 'Develop the knight.', 'Activate your bishop.', 'Strengthen d4.', 'Add a defender to d4.', 'Meet pressure on b2 and d4 with Qb3.'], 'Spot the queen’s double pressure rather than making automatic setup moves.'),
    lesson('indian-setup', 'Against a fianchetto', 'Use the same ideas in a different structure.', 'd4 Nf6 Nf3 g6 Bf4 Bg7 e3 O-O Be2 d6 O-O', ['Claim the center.', 'Develop naturally.', 'Activate your bishop.', 'Support d4 and open a diagonal.', 'Develop safely to e2.', 'Castle before starting an attack.'], 'Build a London setup against …g6 without assuming Black plays …d5.'),
  ]},
  { id: 'plans', title: 'Find your next move', subtitle: 'Turn a setup into a middlegame.', lessons: [
    lesson('e5-outpost', 'The e5 outpost', 'Coordinate before jumping into the center.', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bd3 O-O O-O b6 Ne5', ['Take space.', 'Develop.', 'Activate your bishop.', 'Support the center.', 'Reinforce d4.', 'Develop to d2.', 'Point toward the kingside.', 'Castle.', 'Use the supported e5 square.'], 'Identify a thematic Ne5 idea; it is a candidate, not an automatic move in every London position.'),
    lesson('checkpoint', 'London checkpoint', 'Recall the complete setup without help.', 'd4 d5 Nf3 Nf6 Bf4 e6 e3 c5 c3 Nc6 Nbd2 Bd6 Bd3 O-O O-O b6 Ne5 Bb7 Qf3 Rc8 Rad1', [], 'Make ten prepared decisions without a hint. Eight correct first attempts pass this launch checkpoint.'),
  ]},
];
export const lessons = units.flatMap(unit => unit.lessons.map(item => ({ ...item, unitId: unit.id })));
export const course = { id: 'london-v1', title: 'The London System', version: 1, side: 'w' };
export const isCheckpoint = lesson => lesson.id === 'checkpoint';
export function nextLesson(progress) { return lessons.find(item => !progress[item.id]?.completed) || lessons.at(-1); }
export function unitAvailable(index, progress) { return index === 0 || units[index - 1].lessons.every(item => progress[item.id]?.completed); }
export function dueReviews(progress, now = Date.now()) { return lessons.filter(item => progress[item.id]?.dueAt && Date.parse(progress[item.id].dueAt) <= now); }
export function recordResult(previous = {}, result, now = Date.now()) {
  const success = result.score >= 0.8 && !result.assisted;
  const days = [1, 3, 7, 14, 30];
  const reviews = result.review && success ? Math.min((previous.reviews || 0) + 1, 4) : success ? previous.reviews || 0 : 0;
  const reviewDates = [...(previous.reviewDates || [])];
  const last = reviewDates.at(-1) || previous.completedAt;
  if (result.review && success && last && now - Date.parse(last) >= 86400000) reviewDates.push(new Date(now).toISOString());
  return { ...previous, completed: previous.completed || (result.checkpoint ? success : true),
    completedAt: previous.completedAt || new Date(now).toISOString(), bestScore: Math.max(previous.bestScore || 0, result.score),
    attempts: (previous.attempts || 0) + 1, reviews, reviewDates,
    mastered: Boolean(previous.mastered || reviewDates.length >= 2),
    lastScore: result.score, assisted: result.assisted, dueAt: new Date(now + days[reviews] * 86400000).toISOString() };
}
