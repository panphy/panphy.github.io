/**
 * Potion System Factory for Spellwave 2
 * Encapsulates potion states, SVG icon templates, active timers,
 * 3D visual indicators for Shockwave travelling waves,
 * and the 'idkfa' potion cheat mechanism.
 */

export function createPotionSystem({
  getMode,
  getEnemies,
  getGameTime,
  defeatEnemy,
  showBanner,
  potionBar,
  potionSlots,
  scene,
  effectsGroup,
  playShockwaveSound,
  playGodModeOnSound,
  playGodModeOffSound,
  playToggleSound,
  playStartSound,
  THREE,
  SPAWN_Z,
  WALL_Z
}) {
  let potions = [null, null, null, null];
  let timeFreezeTimer = 0;
  let chainLightningPrimed = false;
  let potionCheatActive = false;

  const activeShockwaves = [];
  const pendingWaves = [];

  const POTION_SVGS = {
    time_freeze: `
      <svg class="svg-magic magic-time" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <circle cx="22" cy="22" r="14" class="clock-rim"></circle>
        <path d="M19 8h6M22 8v3" class="clock-top"></path>
        <line x1="22" y1="22" x2="22" y2="15" class="clock-hand hour-hand"></line>
        <line x1="22" y1="22" x2="28" y2="22" class="clock-hand minute-hand"></line>
        <circle cx="22" cy="22" r="2" class="clock-center"></circle>
      </svg>
    `,
    chain_lightning: `
      <svg class="svg-magic magic-lightning" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <path d="M25 4 L14 22 H22 L18 40 L30 20 H22 Z" class="bolt-path"></path>
        <circle cx="10" cy="12" r="2" class="spark"></circle>
        <circle cx="34" cy="30" r="2" class="spark spark-2"></circle>
      </svg>
    `,
    shockwave: `
      <svg class="svg-magic magic-shockwave" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <path d="M 12 36 Q 22 20 32 36" class="shockwave-crest shockwave-crest-1" fill="none" stroke-linecap="round"></path>
        <path d="M 12 30 Q 22 14 32 30" class="shockwave-crest shockwave-crest-2" fill="none" stroke-linecap="round"></path>
        <path d="M 12 24 Q 22 8 32 24" class="shockwave-crest shockwave-crest-3" fill="none" stroke-linecap="round"></path>
      </svg>
    `
  };

  function updatePotionUI() {
    if (!potionBar || !potionSlots) return;

    potionSlots.forEach((slot, index) => {
      const potion = potions[index];
      slot.className = 'potion-slot';
      const iconContainer = slot.querySelector('.potion-icon');
      if (potion) {
        slot.classList.add('occupied');
        slot.setAttribute('data-potion', potion);
        slot.setAttribute('aria-label', `Potion Slot ${index + 1}: ${potion.replace(/_/g, ' ')}`);
        if (iconContainer) {
          iconContainer.innerHTML = POTION_SVGS[potion] || '';
        }
      } else {
        slot.removeAttribute('data-potion');
        slot.setAttribute('aria-label', `Potion Slot ${index + 1} (Empty)`);
        if (iconContainer) {
          iconContainer.innerHTML = '';
        }
      }
    });
  }

  function addPotion(type) {
    if (!type) {
      const types = ['time_freeze', 'chain_lightning', 'shockwave'];
      type = types[Math.floor(Math.random() * types.length)];
    }

    const freeSlot = potions.indexOf(null);
    if (freeSlot !== -1) {
      potions[freeSlot] = type;
      updatePotionUI();
      playStartSound(); // Play collection chime
      return true;
    } else {
      if (potionBar) {
        potionBar.classList.add('full-shake');
        window.setTimeout(() => potionBar.classList.remove('full-shake'), 400);
      }
      return false;
    }
  }

  function activatePotionSlot(index) {
    if (getMode() !== 'running') return;
    const potion = potions[index];
    if (!potion) return;

    const slotEl = potionSlots[index];
    if (slotEl) {
      slotEl.classList.add('activating');
      slotEl.addEventListener('animationend', () => slotEl.classList.remove('activating'), { once: true });
    }

    potions[index] = null;

    if (potion === 'time_freeze') {
      timeFreezeTimer = 3.5;
      playGodModeOnSound();
      showBanner('TIME FREEZE!', 'time-freeze');
    } else if (potion === 'chain_lightning') {
      chainLightningPrimed = true;
      document.body.classList.add('chain-lightning-primed');
      playToggleSound();
      showBanner('CHAIN PRIMED!', 'chain-lightning');
    } else if (potion === 'shockwave') {
      playShockwaveSound();
      showBanner('SHOCKWAVE!', 'shockwave');

      // Pushes back all targeted/alive enemies and stuns them
      const aliveEnemies = getEnemies();
      aliveEnemies.forEach((enemy) => {
        if (enemy.revealed && !enemy.dying) {
          enemy.pushbackTargetZ = Math.max(SPAWN_Z, enemy.group.position.z - 15);
          enemy.stunTimer = 1.5;
        }
      });

      // Queue 3 consecutive wavefronts
      pendingWaves.push({ delay: 0.0 });
      pendingWaves.push({ delay: 0.15 });
      pendingWaves.push({ delay: 0.30 });
    }

    if (potionCheatActive) {
      // immediately refill the slot with a random potion
      const types = ['time_freeze', 'chain_lightning', 'shockwave'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      potions[index] = randomType;
    }

    updatePotionUI();
  }

  function update(delta) {
    if (getMode() === 'running') {
      if (timeFreezeTimer > 0) {
        timeFreezeTimer = Math.max(0, timeFreezeTimer - delta);
        if (timeFreezeTimer <= 0) {
          playGodModeOffSound();
        }
      }

      // Process pending waves
      for (let i = pendingWaves.length - 1; i >= 0; i--) {
        const pw = pendingWaves[i];
        pw.delay -= delta;
        if (pw.delay <= 0) {
          if (THREE && effectsGroup) {
            const geo = new THREE.CylinderGeometry(8, 8, 3, 16, 1, true, -Math.PI / 2, Math.PI);
            const mat = new THREE.MeshBasicMaterial({
              color: 0x0088ff,
              transparent: true,
              opacity: 0.95,
              side: THREE.DoubleSide,
              blending: THREE.AdditiveBlending
            });
            const waveMesh = new THREE.Mesh(geo, mat);
            waveMesh.rotation.y = Math.PI;
            waveMesh.position.set(0, 1.5, WALL_Z);
            effectsGroup.add(waveMesh);

            activeShockwaves.push({
              mesh: waveMesh,
              z: WALL_Z,
              opacity: 0.95
            });
          }
          pendingWaves.splice(i, 1);
        }
      }
    }

    // Update active shockwaves
    for (let i = activeShockwaves.length - 1; i >= 0; i--) {
      const sw = activeShockwaves[i];
      // Wave travels fast towards SPAWN_Z
      sw.z -= delta * 35.0; // 35 units per second
      sw.mesh.position.z = sw.z;

      // Fade out opacity and expand scale slightly
      sw.opacity -= delta * 1.2;
      sw.mesh.material.opacity = Math.max(0, sw.opacity);

      const scaleX = 1.0 + (WALL_Z - sw.z) * 0.05;
      const scaleY = 1.0 + (WALL_Z - sw.z) * 0.02;
      sw.mesh.scale.set(scaleX, scaleY, scaleX);

      if (sw.opacity <= 0 || sw.z <= SPAWN_Z) {
        if (effectsGroup) {
          effectsGroup.remove(sw.mesh);
        }
        sw.mesh.geometry.dispose();
        sw.mesh.material.dispose();
        activeShockwaves.splice(i, 1);
      }
    }
  }

  function togglePotionCheat() {
    potionCheatActive = !potionCheatActive;
    if (potionCheatActive) {
      // Fill all slots
      for (let i = 0; i < 4; i++) {
        if (potions[i] === null) {
          const types = ['time_freeze', 'chain_lightning', 'shockwave'];
          potions[i] = types[Math.floor(Math.random() * types.length)];
        }
      }
      updatePotionUI();
      playGodModeOnSound();
      showBanner('POTION CHEAT ON!', 'cheat');
    } else {
      playGodModeOffSound();
      showBanner('POTION CHEAT OFF!', 'cheat');
    }
  }

  function clear() {
    potions = [null, null, null, null];
    timeFreezeTimer = 0;
    chainLightningPrimed = false;

    // Clean up active shockwaves
    for (const sw of activeShockwaves) {
      if (effectsGroup) {
        effectsGroup.remove(sw.mesh);
      }
      sw.mesh.geometry.dispose();
      sw.mesh.material.dispose();
    }
    activeShockwaves.length = 0;
    pendingWaves.length = 0;
    updatePotionUI();
  }

  return {
    addPotion,
    activatePotionSlot,
    update,
    clear,
    togglePotionCheat,
    isTimeFrozen: () => timeFreezeTimer > 0,
    isChainLightningPrimed: () => chainLightningPrimed,
    clearChainLightningPrimed: () => {
      chainLightningPrimed = false;
      document.body.classList.remove('chain-lightning-primed');
    },
    isPotionCheatActive: () => potionCheatActive,
  };
}
