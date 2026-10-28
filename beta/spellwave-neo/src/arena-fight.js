// Spellwave Neo — arena boss fight controller (orb MCQ + minion DPS).
import {
  arenaProfile,
  arenaRosterNames,
  arenaClearBonus,
  speedDispelBonus,
  ARENA_DISPEL_CHIP,
  ARENA_MINION_CHIP,
  ARENA_DISPEL_SCORE,
  ARENA_ORB_DAMAGE,
  ARENA_HEAD_BONUS,
} from './arena-config.js?v=20261028-neo-arena';
import { getBossChoice, shuffledOptions, buildChoiceSegments } from './boss-choices.js?v=20261028-neo-arena';
import { escapeHtml, wrapSups } from './prompt-utils.js?v=20261028-neo-arena';

export function createArenaFight(api) {
  const els = {
    hud: document.getElementById('arenaHud'),
    name: document.getElementById('arenaBossName'),
    fill: document.getElementById('arenaHpFill'),
    segments: document.getElementById('arenaHpSegments'),
    hpValue: document.getElementById('arenaHpValue'),
    hpMax: document.getElementById('arenaHpMax'),
    orb: document.getElementById('arenaOrb'),
    fuse: document.getElementById('arenaOrbFuse'),
    kind: document.getElementById('arenaOrbKind'),
    clue: document.getElementById('arenaOrbClue'),
    line: document.getElementById('arenaOrbLine'),
    options: document.getElementById('arenaOrbOptions'),
  };

  let active = false;
  let cleared = false;
  let profile = null;
  let hp = 0;
  let maxHp = 0;
  let heads = 1;
  let segmentHp = 0;
  let headAlive = [];
  let headMeshes = [];
  let orbQueue = [];
  let activeOrb = null;
  let gapTimer = 0;
  let fightMinionsSpawned = 0;
  let fightSpawnTimer = 0;
  let supportSpawned = 0;

  function reset() {
    dismissOrb();
    hideHud();
    for (const head of headMeshes) api.removeArenaHead(head);
    headMeshes = [];
    active = false;
    cleared = false;
    profile = null;
    hp = 0;
    maxHp = 0;
    heads = 1;
    segmentHp = 0;
    headAlive = [];
    orbQueue = [];
    activeOrb = null;
    gapTimer = 0;
    fightMinionsSpawned = 0;
    fightSpawnTimer = 0;
    supportSpawned = 0;
  }

  function hideHud() {
    els.hud?.classList.add('is-hidden');
    els.orb?.classList.add('is-hidden');
  }

  function showHud() {
    els.hud?.classList.remove('is-hidden');
  }

  function refreshHpUi() {
    if (!els.fill) return;
    const ratio = maxHp > 0 ? Math.max(0, hp) / maxHp : 0;
    els.fill.style.transform = `scaleX(${ratio})`;
    if (els.hpValue) els.hpValue.textContent = String(Math.max(0, hp));
    if (els.hpMax) els.hpMax.textContent = String(maxHp);
    if (els.segments && heads > 1) {
      els.segments.hidden = false;
      els.segments.style.setProperty('--segments', String(heads));
      const marks = [];
      for (let i = 1; i < heads; i += 1) {
        marks.push(`<i style="left:${(i / heads) * 100}%"></i>`);
      }
      els.segments.innerHTML = marks.join('');
    } else if (els.segments) {
      els.segments.hidden = true;
      els.segments.innerHTML = '';
    }
  }

  function livingHeadIndex() {
    const living = headAlive.map((alive, i) => (alive ? i : -1)).filter((i) => i >= 0);
    if (living.length === 0) return 0;
    return living[Math.floor(Math.random() * living.length)];
  }

  function updateHeadVisuals() {
    headMeshes.forEach((head, i) => {
      if (!head?.group) return;
      head.group.visible = !!headAlive[i];
    });
  }

  function checkHeadLosses() {
    if (heads <= 1 || segmentHp <= 0) return;
    for (let i = 0; i < heads; i += 1) {
      if (!headAlive[i]) continue;
      const floor = (heads - 1 - i) * segmentHp;
      // Head i dies when HP falls to or below the floor of remaining lower heads.
      // Heads are ordered 0..n-1; head 0 is first segment from the left (full bar end).
      const headMax = (heads - i) * segmentHp;
      const headMin = (heads - 1 - i) * segmentHp;
      if (hp <= headMin) {
        headAlive[i] = false;
        updateHeadVisuals();
        api.onHeadDown?.(i);
        api.addScore?.(ARENA_HEAD_BONUS);
        api.showBanner?.(`HEAD ${i + 1} DOWN!`, 'boss-kill');
      }
      void floor;
      void headMax;
    }
  }

  function damageBoss(amount) {
    if (!active || cleared || amount <= 0) return;
    hp = Math.max(0, hp - amount);
    refreshHpUi();
    checkHeadLosses();
    if (hp <= 0) finishFight();
  }

  function finishFight() {
    if (cleared) return;
    cleared = true;
    dismissOrb();
    orbQueue = [];
    api.addScore?.(arenaClearBonus(api.getWave()));
    api.showBanner?.('BOSS DEFEATED!', 'boss-kill');
    api.playBossDefeat?.();
    for (const head of headMeshes) api.explodeArenaHead?.(head);
    headMeshes = [];
    hideHud();
    active = false;
    // Clear remaining fight minions softly so the wave can end.
    api.clearFightAdds?.();
    api.onArenaCleared?.();
  }

  function dismissOrb() {
    if (els.orb) els.orb.classList.add('is-hidden');
    if (els.options) els.options.innerHTML = '';
    activeOrb = null;
  }

  function renderOrbCard(orb) {
    if (!els.orb) return;
    const isEq = !!orb.wordData.isEquation;
    if (els.kind) {
      els.kind.textContent = isEq ? 'equation' : 'definition';
      els.kind.dataset.kind = isEq ? 'equation' : 'definition';
    }
    if (els.clue) {
      els.clue.textContent = isEq
        ? (orb.wordData.term || '')
        : (orb.wordData.definition || '');
    }
    if (els.line) {
      const html = (orb.segments || []).map((segment) => {
        if (segment.type === 'text') {
          return /^\s+$/.test(segment.text)
            ? segment.text
            : `<span class="given-tok">${wrapSups(escapeHtml(segment.text))}</span>`;
        }
        const exponent = segment.exponent
          ? `<sup class="given-sup">${segment.exponent}</sup>`
          : '';
        return `<span class="answer-slot"></span>${exponent}`;
      }).join('');
      els.line.innerHTML = html;
    }
    if (els.options) {
      els.options.innerHTML = '';
      orb.options.forEach((option, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'arena-orb-option';
        btn.dataset.index = String(index);
        btn.innerHTML = `<span class="arena-orb-key">${index + 1}</span><span class="arena-orb-text">${escapeHtml(option.text)}</span>`;
        btn.addEventListener('click', () => trySelect(index));
        els.options.append(btn);
      });
    }
    els.orb.classList.remove('is-hidden');
    if (els.fuse) els.fuse.style.transform = 'scaleX(1)';
  }

  function launchNextOrb() {
    if (!active || cleared || activeOrb || orbQueue.length === 0) return;
    const wordData = orbQueue.shift();
    const choice = getBossChoice(wordData, api.getWave());
    if (!choice) {
      gapTimer = 0.2;
      return;
    }
    const options = shuffledOptions(choice);
    const headIndex = livingHeadIndex();
    activeOrb = {
      wordData,
      choice,
      options,
      segments: buildChoiceSegments(wordData.term, choice.answer.text),
      fuse: profile.fuse,
      fuseMax: profile.fuse,
      headIndex,
    };
    api.telegraphOrb?.(headMeshes[headIndex]);
    renderOrbCard(activeOrb);
    api.playOrbLaunch?.();
  }

  function resolveOrb(optionIndex) {
    if (!activeOrb) return false;
    const orb = activeOrb;
    const option = orb.options[optionIndex];
    if (!option) return false;
    const correct = !!option.isAnswer;
    const fuseLeft = orb.fuse;
    const fuseMax = orb.fuseMax;
    dismissOrb();
    gapTimer = profile.gap;
    if (correct) {
      api.playDispel?.();
      api.addScore?.(ARENA_DISPEL_SCORE + speedDispelBonus(fuseLeft, fuseMax));
      damageBoss(ARENA_DISPEL_CHIP);
    } else {
      api.breakChain?.();
      api.hurtPlayer?.(ARENA_ORB_DAMAGE);
      api.playOrbMiss?.();
    }
    return true;
  }

  function timeoutOrb() {
    if (!activeOrb) return;
    dismissOrb();
    gapTimer = profile.gap;
    api.breakChain?.();
    api.hurtPlayer?.(ARENA_ORB_DAMAGE);
    api.playOrbMiss?.();
  }

  function trySelect(index) {
    if (!active || !activeOrb) return false;
    return resolveOrb(index);
  }

  function trySelectKey(key) {
    if (!active || !activeOrb) return false;
    if (key === '1' || key === '2' || key === '3') {
      const index = Number(key) - 1;
      if (index >= activeOrb.options.length) return true; // consume key, ignore
      trySelect(index);
      return true;
    }
    return false;
  }

  function onMinionDefeated(enemy) {
    if (!active || cleared) return;
    if (enemy.isMedic || enemy.isMimic || enemy.isBoss || enemy.isArenaHead) return;
    damageBoss(ARENA_MINION_CHIP);
  }

  function start(questionList) {
    reset();
    profile = arenaProfile(api.getWave());
    maxHp = profile.hp;
    hp = maxHp;
    heads = profile.heads || 1;
    segmentHp = profile.segmentHp || 0;
    headAlive = Array.from({ length: heads }, () => true);
    orbQueue = [...questionList];
    gapTimer = 1.0;
    fightMinionsSpawned = 0;
    fightSpawnTimer = 0.8;
    supportSpawned = 0;
    active = true;
    cleared = false;

    const names = arenaRosterNames(api.getWave());
    if (els.name) els.name.textContent = heads > 1 ? 'Triad Sovereign' : names[0];
    headMeshes = api.spawnArenaHeads(names);
    showHud();
    refreshHpUi();
    api.showBanner?.(heads > 1 ? 'TRIAD BOSS!' : 'BOSS FIGHT');
    api.playBossWarning?.();
  }

  function liveFightMinions() {
    return api.countFightMinions?.() ?? 0;
  }

  function update(delta) {
    if (!active || cleared) return { done: false };

    if (activeOrb) {
      activeOrb.fuse -= delta;
      const ratio = Math.max(0, activeOrb.fuse / activeOrb.fuseMax);
      if (els.fuse) els.fuse.style.transform = `scaleX(${ratio})`;
      if (activeOrb.fuse <= 0) timeoutOrb();
    } else {
      gapTimer = Math.max(0, gapTimer - delta);
      if (gapTimer <= 0) launchNextOrb();
    }

    // Fight adds: typed minions (and light support on finale).
    const wantSupport = api.getWave() >= 10 && supportSpawned < 4;
    if (fightMinionsSpawned < profile.minions || wantSupport) {
      fightSpawnTimer -= delta;
      if (fightSpawnTimer <= 0 && liveFightMinions() < profile.liveMinions) {
        if (wantSupport && Math.random() < 0.28) {
          api.spawnFightSupport?.();
          supportSpawned += 1;
          fightSpawnTimer = 1.4;
        } else if (fightMinionsSpawned < profile.minions) {
          api.spawnFightMinion?.();
          fightMinionsSpawned += 1;
          fightSpawnTimer = 1.1 + Math.random() * 0.7;
        } else {
          fightSpawnTimer = 1.2;
        }
      }
    }

    // Idle bob for heads.
    api.animateArenaHeads?.(headMeshes, delta);

    return { done: false };
  }

  function isActive() {
    return active && !cleared;
  }

  function isCleared() {
    return cleared;
  }

  function hasLiveOrb() {
    return !!activeOrb;
  }

  return {
    reset,
    start,
    update,
    trySelectKey,
    trySelect,
    onMinionDefeated,
    isActive,
    isCleared,
    hasLiveOrb,
    damageBoss,
  };
}
