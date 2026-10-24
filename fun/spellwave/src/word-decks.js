// word-decks.js — picks words so they do not keep coming back. Pure: no DOM; the
// game keeps last run's words in localStorage and passes them in.
//
// A deck picks from whatever pool the wave allows, favouring, in order: words
// not yet used this run, then words not used in the last run, then the words
// used least. So nothing repeats until the pool has run out, and the early
// waves' easy words rotate from one run to the next.
export function createWordDeck({ random = Math.random } = {}) {
  const uses = new Map();
  let lastRun = new Set();

  const score = entry => (uses.get(entry.term) || 0) * 2 + (lastRun.has(entry.term) ? 1 : 0);

  return {
    // A random entry among the freshest that pass the test, marked as used; null if none passes.
    pick(pool, accept = () => true) {
      const candidates = pool.filter(accept);
      if (candidates.length === 0) return null;
      const best = Math.min(...candidates.map(score));
      const freshest = candidates.filter(entry => score(entry) === best);
      const entry = freshest[Math.floor(random() * freshest.length)];
      uses.set(entry.term, (uses.get(entry.term) || 0) + 1);
      return entry;
    },
    hasUsed: term => uses.has(term),
    usedTerms: () => [...uses.keys()],
    // Start a run: forget this run's uses and remember the given terms as last run's.
    reset(lastRunTerms = []) {
      uses.clear();
      lastRun = new Set(lastRunTerms);
    },
  };
}
