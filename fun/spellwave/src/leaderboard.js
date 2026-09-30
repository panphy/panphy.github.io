// Hall of Wizards: Supabase-backed top-score list and the initials modal.
// Self-contained; main.js supplies score formatting and receives modal-close events.

const SUPABASE_URL = 'https://ldkgodxalwuvkqygchns.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxka2dvZHhhbHd1dmtxeWdjaG5zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3NzEyNTgsImV4cCI6MjA4NTM0NzI1OH0.PZ3rbRZCfwzniQgq5RiZ9cikPNvdYwr9uGYNwN6xQKY';
const TABLE = 'spellwave_leaderboard';
const SUBMIT_RPC = 'submit_spellwave_score';
const SCORE_FIELD = 'score';
const CACHE_KEY = 'spellwaveLeaderboardCacheV1';
const BOARD_SIZE = 5;
const MIN_SCORE = 1;
// Matches the server check (spellwave_score_range); the highest legitimate run is ~67.6k.
const MAX_SCORE = 70000;
const HIGHLIGHT_MS = 6000;

export function createLeaderboard({ formatScore, onModalClose = () => {} }) {
  const supabaseScript = document.getElementById('supabaseScript');
  const scoreList = document.getElementById('swScoreList');
  const statusEl = document.getElementById('swLeaderboardStatus');
  const modal = document.getElementById('swInitialsModal');
  const initialsInput = document.getElementById('swInitialsInput');
  const errorEl = document.getElementById('swInitialsError');
  const submitButton = document.getElementById('swSubmitInitials');
  const skipButton = document.getElementById('swSkipInitials');
  const modalScore = document.getElementById('swModalScore');

  let client = null;
  let topScores = [];
  let recentSubmission = null;
  let pendingScore = 0;
  let isSubmitting = false;
  let lastFocused = null;

  function initClient() {
    if (client) return client;
    try {
      const sb = window.supabase || window.Supabase || null;
      if (sb && typeof sb.createClient === 'function') {
        client = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      }
    } catch (e) {
      console.warn('Supabase init failed:', e);
    }
    return client;
  }

  function waitForClient({ timeoutMs = 4000, intervalMs = 200 } = {}) {
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const check = () => {
        const found = initClient();
        if (found || Date.now() - startedAt >= timeoutMs) { resolve(found); return; }
        setTimeout(check, intervalMs);
      };
      check();
    });
  }

  function restHeaders(accessToken = null) {
    return {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    };
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && Array.isArray(parsed.scores) ? parsed : null;
    } catch { return null; }
  }

  function saveCache(scores) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ scores: scores || [], savedAt: Date.now() }));
    } catch {}
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  function sanitizeScore(value) {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < MIN_SCORE || n > MAX_SCORE) return null;
    return n;
  }

  function normalizeScores(entries) {
    return (entries || []).map((e) => {
      const val = sanitizeScore(e[SCORE_FIELD]);
      return val === null ? null : { initials: e.initials, score: val };
    }).filter(Boolean);
  }

  function registerRecentSubmission(initials, score) {
    recentSubmission = { initials: initials.toUpperCase(), score, expiresAt: Date.now() + HIGHLIGHT_MS };
  }

  function isRecentSubmission(entry) {
    if (!recentSubmission) return false;
    if (Date.now() > recentSubmission.expiresAt) { recentSubmission = null; return false; }
    return !!entry && entry.initials === recentSubmission.initials && entry.score === recentSubmission.score;
  }

  function mergeRecentSubmission(entries) {
    if (!recentSubmission) return entries || [];
    if (Date.now() > recentSubmission.expiresAt) { recentSubmission = null; return entries || []; }
    const list = Array.isArray(entries) ? [...entries] : [];
    if (!list.some(isRecentSubmission)) {
      list.push({ initials: recentSubmission.initials, score: recentSubmission.score });
    }
    list.sort((a, b) => b.score - a.score);
    return list.slice(0, BOARD_SIZE);
  }

  function isSameBoard(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i].initials !== b[i].initials || Number(a[i].score) !== Number(b[i].score)) return false;
    }
    return true;
  }

  function isHighScore(score) {
    if (topScores.length < BOARD_SIZE) return true;
    return score > (topScores[topScores.length - 1]?.score ?? 0);
  }

  async function fetchTopScoresRest() {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${TABLE}`);
    url.searchParams.set('select', `initials,${SCORE_FIELD}`);
    url.searchParams.set('order', `${SCORE_FIELD}.desc`);
    url.searchParams.set('limit', String(BOARD_SIZE));
    const response = await fetch(url.toString(), { method: 'GET', headers: restHeaders() });
    if (!response.ok) throw new Error(`REST fetch failed: ${response.status}`);
    return response.json();
  }

  async function submitScoreRest(initials, score, accessToken = null) {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${SUBMIT_RPC}`, {
      method: 'POST',
      headers: { ...restHeaders(accessToken), Prefer: 'return=minimal' },
      body: JSON.stringify({ initials: initials.toUpperCase(), score }),
    });
    if (!response.ok) throw new Error(`RPC insert failed: ${response.status}`);
    return true;
  }

  function applyFetched(fetched) {
    const cached = normalizeScores(loadCache()?.scores || []);
    const merged = mergeRecentSubmission(fetched);
    if (!isSameBoard(merged, topScores) || topScores.length === 0) {
      topScores = merged;
      renderTopScores();
    }
    if (!isSameBoard(fetched, cached)) saveCache(fetched);
    setStatus('Live');
  }

  async function fetchTopScores({ preferRemote = false, showLoading = true } = {}) {
    if (showLoading) renderLoading();
    let active = initClient();
    if (!active && preferRemote) active = await waitForClient();
    try {
      if (active) {
        const { data, error } = await active
          .from(TABLE)
          .select(`initials, ${SCORE_FIELD}`)
          .order(SCORE_FIELD, { ascending: false })
          .limit(BOARD_SIZE);
        if (error) throw error;
        applyFetched(normalizeScores(data || []));
      } else {
        applyFetched(normalizeScores(await fetchTopScoresRest()));
      }
    } catch (err) {
      console.warn('Supabase fetch failed, retrying with REST:', err);
      try {
        applyFetched(normalizeScores(await fetchTopScoresRest()));
      } catch (restErr) {
        console.error('Leaderboard fetch failed:', restErr);
        setStatus('Offline');
        if (topScores.length === 0) renderLoading();
      }
    }
  }

  // The REST path is used only when the client library never loaded. After a
  // failed client.rpc the insert may still have landed server-side, so retrying
  // through REST could store the score twice.
  async function submitScore(initials, score) {
    let active = initClient();
    if (!active) active = await waitForClient();
    try {
      if (active) {
        const { error } = await active.rpc(SUBMIT_RPC, { initials: initials.toUpperCase(), score });
        if (error) throw error;
      } else {
        await submitScoreRest(initials, score);
      }
      registerRecentSubmission(initials, score);
      topScores = mergeRecentSubmission(topScores);
      renderTopScores();
      saveCache(topScores);
      setTimeout(() => fetchTopScores({ preferRemote: true, showLoading: false }), 800);
      return true;
    } catch (err) {
      console.error('Score submit failed:', err);
      return false;
    }
  }

  function renderTopScores() {
    if (!scoreList) return;
    scoreList.innerHTML = '';
    if (topScores.length === 0) {
      const li = document.createElement('li');
      li.className = 'sw-loading';
      li.textContent = 'No scores yet';
      scoreList.appendChild(li);
      return;
    }
    topScores.forEach((entry) => {
      const li = document.createElement('li');
      if (isRecentSubmission(entry)) li.classList.add('sw-highlight');
      const initialsSpan = document.createElement('span');
      initialsSpan.className = 'sw-initials';
      initialsSpan.textContent = entry.initials;
      const scoreSpan = document.createElement('span');
      scoreSpan.className = 'sw-score-val';
      scoreSpan.textContent = formatScore(entry.score);
      li.append(initialsSpan, scoreSpan);
      scoreList.appendChild(li);
    });
  }

  function renderLoading() {
    if (scoreList) scoreList.innerHTML = '<li class="sw-loading">Loading…</li>';
  }

  function isModalOpen() {
    return Boolean(modal && !modal.hidden);
  }

  function showModal(score) {
    if (!modal || !initialsInput || !submitButton || !modalScore) return;
    if (isModalOpen()) return;
    lastFocused = document.activeElement;
    pendingScore = score;
    modalScore.textContent = formatScore(score);
    initialsInput.value = '';
    if (errorEl) errorEl.textContent = '';
    submitButton.disabled = false;
    submitButton.textContent = 'Submit Score';
    modal.hidden = false;
    setTimeout(() => initialsInput.focus(), 100);
  }

  function hideModal() {
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    isSubmitting = false;
    if (lastFocused && lastFocused.isConnected && typeof lastFocused.focus === 'function') {
      lastFocused.focus({ preventScroll: true });
    }
    lastFocused = null;
    onModalClose();
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || !isModalOpen()) return;
    const items = [initialsInput, submitButton, skipButton].filter((el) => el && !el.disabled);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    } else if (!modal.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }

  async function handleSubmit() {
    if (isSubmitting || !initialsInput || !submitButton) return;
    const initials = initialsInput.value.trim().toUpperCase();
    if (!/^[A-Z0-9]{3}$/.test(initials)) {
      if (errorEl) errorEl.textContent = 'Enter exactly 3 letters or numbers';
      initialsInput.focus();
      return;
    }
    const sanitized = sanitizeScore(pendingScore);
    if (sanitized === null) {
      if (errorEl) errorEl.textContent = 'Score could not be submitted.';
      return;
    }
    isSubmitting = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting…';
    const success = await submitScore(initials, sanitized);
    if (success) {
      hideModal();
    } else {
      if (errorEl) errorEl.textContent = 'Failed to submit. Try again.';
      isSubmitting = false;
      submitButton.disabled = false;
    }
    submitButton.textContent = 'Submit Score';
  }

  // Offer the score entry if it would place on the board. A duplicate call while
  // the modal is open is ignored.
  function handleScore(finalScore) {
    const sanitized = sanitizeScore(finalScore);
    if (sanitized === null || isModalOpen()) return;
    if (isHighScore(sanitized)) showModal(sanitized);
  }

  function init() {
    initClient();
    const cached = loadCache();
    if (cached && cached.scores.length > 0) {
      topScores = mergeRecentSubmission(normalizeScores(cached.scores));
      renderTopScores();
    } else {
      renderLoading();
    }
    fetchTopScores({ preferRemote: true, showLoading: false });
    if (supabaseScript) {
      supabaseScript.addEventListener('load', () => {
        fetchTopScores({ preferRemote: true, showLoading: false });
      });
    }
    if (initialsInput) {
      initialsInput.addEventListener('input', (event) => {
        event.target.value = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
        if (errorEl) errorEl.textContent = '';
      });
      initialsInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          event.stopPropagation();
          handleSubmit();
        }
      });
    }
    if (submitButton) submitButton.addEventListener('click', handleSubmit);
    if (skipButton) skipButton.addEventListener('click', hideModal);
    if (modal) modal.addEventListener('keydown', trapFocus);
  }

  return { init, handleScore, hideModal, isModalOpen };
}
