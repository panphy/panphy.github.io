// Top Survivors: the top-ten survival times, stored in Supabase.
// Reads the dodge_leaderboard table and writes only through submit_dodge_score, over plain REST.

const SUPABASE_URL = 'https://ldkgodxalwuvkqygchns.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxka2dvZHhhbHd1dmtxeWdjaG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NzEyNTgsImV4cCI6MjA4NTM0NzI1OH0.PZ3rbRZCfwzniQgq5RiZ9cikPNvdYwr9uGYNwN6xQKY';
const TABLE = 'dodge_leaderboard';
const SUBMIT_RPC = 'submit_dodge_score';
// Bumped whenever the board is reset; lists saved under older keys are removed on load.
const CACHE_KEY = 'dodgeLeaderboardCacheV6';
const OLD_CACHE_KEYS = ['dodgeLeaderboardCacheV1', 'dodgeLeaderboardCacheV2', 'dodgeLeaderboardCacheV3', 'dodgeLeaderboardCacheV4', 'dodgeLeaderboardCacheV5'];
export const BOARD_SIZE = 10;
// Matches the server's range check in submit_dodge_score and the dodge_survival_time_range
// constraint; runs outside it are never offered for submission.
const MIN_SCORE = 1;
const MAX_SCORE = 600;
const HIGHLIGHT_MS = 8000;

const headers = {
  apikey: SUPABASE_ANON_KEY,
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

export function formatTime(seconds) {
  const n = Number(seconds);
  return `${Number.isFinite(n) ? n.toFixed(2) : '0.00'} s`;
}

function sanitize(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < MIN_SCORE || n > MAX_SCORE) return null;
  return Math.round(n * 100) / 100;
}

export function createLeaderboard({ list, status }) {
  let scores = [];
  let recent = null;

  function loadCache() {
    try {
      for (const key of OLD_CACHE_KEYS) localStorage.removeItem(key);
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return parsed && Array.isArray(parsed.scores) ? parsed.scores : null;
    } catch { return null; }
  }

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ scores, savedAt: Date.now() })); } catch {}
  }

  function isRecent(entry) {
    if (!recent) return false;
    if (Date.now() > recent.expiresAt) { recent = null; return false; }
    return entry.initials === recent.initials && entry.score === recent.score;
  }

  function withRecent(entries) {
    const merged = [...entries];
    if (recent && Date.now() <= recent.expiresAt && !merged.some(isRecent)) {
      merged.push({ initials: recent.initials, score: recent.score });
    }
    merged.sort((a, b) => b.score - a.score);
    return merged.slice(0, BOARD_SIZE);
  }

  function setStatus(text) {
    status.textContent = text;
    status.hidden = !text;
  }

  function render() {
    list.replaceChildren();
    for (let i = 0; i < BOARD_SIZE; i += 1) {
      const entry = scores[i];
      const li = document.createElement('li');
      const rank = document.createElement('span');
      rank.className = 'rank';
      rank.textContent = String(i + 1).padStart(2, '0');
      const name = document.createElement('span');
      name.className = 'name';
      const time = document.createElement('span');
      time.className = 'time';
      if (entry) {
        name.textContent = entry.initials;
        time.textContent = formatTime(entry.score);
        if (isRecent(entry)) li.classList.add('recent');
      } else {
        li.classList.add('empty');
        name.textContent = '---';
        time.textContent = '--.-- s';
      }
      li.append(rank, name, time);
      list.append(li);
    }
  }

  async function refresh() {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${TABLE}`);
    url.searchParams.set('select', 'initials,survival_time');
    url.searchParams.set('order', 'survival_time.desc');
    url.searchParams.set('limit', String(BOARD_SIZE));
    try {
      const response = await fetch(url, { headers });
      if (!response.ok) throw new Error(`Leaderboard fetch failed: ${response.status}`);
      const rows = await response.json();
      scores = withRecent(rows
        .map((row) => ({ initials: String(row.initials || '???'), score: sanitize(row.survival_time) }))
        .filter((row) => row.score !== null));
      saveCache();
      setStatus('');
    } catch (error) {
      console.warn(error);
      setStatus('Offline: showing saved scores');
    }
    render();
  }

  async function submit(initials, score) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${SUBMIT_RPC}`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({ initials: initials.toUpperCase(), survival_time: score }),
    });
    if (!response.ok) throw new Error(`Score submission failed: ${response.status}`);
    recent = { initials: initials.toUpperCase(), score, expiresAt: Date.now() + HIGHLIGHT_MS };
    scores = withRecent(scores);
    render();
    setTimeout(refresh, 800);
    setTimeout(render, HIGHLIGHT_MS + 100);
  }

  function qualifies(score) {
    const value = sanitize(score);
    if (value === null) return false;
    return scores.length < BOARD_SIZE || value > scores[scores.length - 1].score;
  }

  const cached = loadCache();
  if (cached) scores = cached.map((e) => ({ initials: e.initials, score: sanitize(e.score) })).filter((e) => e.score !== null);
  render();
  refresh();

  return { refresh, submit, qualifies, sanitize };
}
