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
  playShieldActivateSound,
  playShieldBlockSound,
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

  // Shield (A.T. Field) state
  let shieldActive = false;
  let shieldCharges = 0;
  let shieldGroup = null;
  let shieldHitProgress = 0; // 0 to 1 for block impact flash/pulse
  let shieldFadeTimer = 0;   // 0 to 1 for deactivation fade out

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
    `,
    shield: `
      <svg class="svg-magic magic-shield" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <polygon points="38,22 33,33 22,38 11,33 6,22 11,11 22,6 33,11" class="shield-oct shield-outer"></polygon>
        <polygon points="33,22 30,30 22,33 14,30 11,22 14,14 22,11 30,14" class="shield-oct shield-middle"></polygon>
        <polygon points="28,22 26,26 22,28 18,26 16,22 18,18 22,16 26,18" class="shield-oct shield-inner"></polygon>
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
        const potionName = potion.replace(/_/g, ' ');
        slot.classList.add('occupied');
        slot.setAttribute('data-potion', potion);
        slot.setAttribute('aria-label', `Potion Slot ${index + 1}: ${potionName}`);
        slot.setAttribute('title', `Use Potion: ${potionName}`);
        if (iconContainer) {
          iconContainer.innerHTML = POTION_SVGS[potion] || '';
        }
      } else {
        slot.removeAttribute('data-potion');
        slot.setAttribute('aria-label', `Potion Slot ${index + 1} (Empty)`);
        slot.setAttribute('title', `Potion Slot ${index + 1} (Empty)`);
        if (iconContainer) {
          iconContainer.innerHTML = '';
        }
      }
    });
  }

  function addPotion(type) {
    if (!type) {
      const types = ['time_freeze', 'chain_lightning', 'shockwave', 'shield'];
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

  function disposeShieldGroup() {
    if (!shieldGroup) return;
    shieldGroup.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        child.material.dispose();
      }
    });
    shieldGroup = null;
    const screenOverlay = document.getElementById('shieldScreenOverlay');
    if (screenOverlay) {
      screenOverlay.style.opacity = 0;
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
    } else if (potion === 'shield') {
      shieldActive = true;
      shieldCharges = 2;
      shieldHitProgress = 0;
      shieldFadeTimer = 0;
      playShieldActivateSound();
      showBanner('A.T. FIELD!', 'shield');

      if (THREE && effectsGroup) {
        if (shieldGroup) {
          effectsGroup.remove(shieldGroup);
          disposeShieldGroup();
        }

        shieldGroup = new THREE.Group();
        shieldGroup.position.set(0, 2.0, WALL_Z - 0.5);

        // Build a flat-top octagon by rotating the group Math.PI/8
        // Each of 8 sectors is a ShapeGeometry trapezoid — proper straight edges

        function makeOctSector(rInner, rOuter, a1, a2) {
          const shape = new THREE.Shape();
          shape.moveTo(rOuter * Math.cos(a1), rOuter * Math.sin(a1));
          shape.lineTo(rOuter * Math.cos(a2), rOuter * Math.sin(a2));
          shape.lineTo(rInner * Math.cos(a2), rInner * Math.sin(a2));
          shape.lineTo(rInner * Math.cos(a1), rInner * Math.sin(a1));
          shape.closePath();
          return new THREE.ShapeGeometry(shape);
        }

        for (let i = 0; i < 8; i++) {
          const a1 = i * Math.PI / 4;
          const a2 = (i + 1) * Math.PI / 4;
          const centerAngle = (a1 + a2) / 2;

          const segmentGroup = new THREE.Group();

          // Fill panel (center to outer_r)
          const fillShape = new THREE.Shape();
          fillShape.moveTo(0, 0);
          fillShape.lineTo(4.35 * Math.cos(a1), 4.35 * Math.sin(a1));
          fillShape.lineTo(4.35 * Math.cos(a2), 4.35 * Math.sin(a2));
          fillShape.closePath();
          const fieldMesh = new THREE.Mesh(new THREE.ShapeGeometry(fillShape), new THREE.MeshBasicMaterial({
            color: 0xff2200, transparent: true, opacity: 0.08,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending
          }));
          fieldMesh.userData.isField = true;

          // Outer ring strip
          const outerMesh = new THREE.Mesh(makeOctSector(4.35, 4.5, a1, a2), new THREE.MeshBasicMaterial({
            color: 0xff2200, transparent: true, opacity: 0.55,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending
          }));

          // Middle ring strip
          const middleMesh = new THREE.Mesh(makeOctSector(2.9, 3.0, a1, a2), new THREE.MeshBasicMaterial({
            color: 0xff2200, transparent: true, opacity: 0.55,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending
          }));

          // Inner ring strip
          const innerMesh = new THREE.Mesh(makeOctSector(1.45, 1.5, a1, a2), new THREE.MeshBasicMaterial({
            color: 0xff2200, transparent: true, opacity: 0.55,
            side: THREE.DoubleSide, blending: THREE.AdditiveBlending
          }));

          segmentGroup.add(fieldMesh, outerMesh, middleMesh, innerMesh);
          segmentGroup.userData = {
            angle: centerAngle,
            speedFactor: 1.0 + (Math.random() - 0.5) * 0.4,
            spinSpeed: (Math.random() - 0.5) * 20.0,
            driftAngleOffset: (Math.random() - 0.5) * 0.3,
            zDrift: (Math.random() - 0.5) * 2.0
          };
          shieldGroup.add(segmentGroup);
        }

        shieldGroup.rotation.z = Math.PI / 8; // Flat-top octagon alignment
        effectsGroup.add(shieldGroup);
      }
    }

    if (potionCheatActive) {
      // immediately refill the slot with a random potion
      const types = ['time_freeze', 'chain_lightning', 'shockwave', 'shield'];
      const randomType = types[Math.floor(Math.random() * types.length)];
      potions[index] = randomType;
    }

    updatePotionUI();
  }

  function triggerShieldHitVisual() {
    playShieldBlockSound();
    shieldHitProgress = 1.0;

    const shieldFlash = document.getElementById('shieldFlash');
    if (shieldFlash) {
      shieldFlash.classList.remove('show');
      void shieldFlash.offsetWidth; // Force reflow
      shieldFlash.classList.add('show');
    }
  }

  function blockLeak() {
    if (!shieldActive) return false;
    shieldActive = false;
    shieldFadeTimer = 1.0; // Start Z-scale fade out
    return true;
  }

  function blockBossHit() {
    if (!shieldActive) return false;
    shieldCharges -= 1;
    if (shieldCharges <= 0) {
      shieldActive = false;
      shieldFadeTimer = 1.0; // Start Z-scale fade out
    }
    return true;
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

      // Update A.T. Field shield group
      if (shieldGroup) {
        const screenOverlay = document.getElementById('shieldScreenOverlay');
        const time = getGameTime();

        if (shieldActive) {
          let ringOpacity = 0.55;
          let fieldOpacity = 0.08;
          let screenOpacity = 0.04 + Math.sin(time * 3.0) * 0.02; // breathe 0.02 to 0.06

          if (shieldHitProgress > 0) {
            shieldHitProgress = Math.max(0, shieldHitProgress - delta * 2.2); // Fade impact flash
            const scale = 1.0 + shieldHitProgress * 0.28;
            shieldGroup.scale.set(scale, scale, 1);
            
            ringOpacity = 0.55 + shieldHitProgress * 0.45;
            fieldOpacity = 0.08 + shieldHitProgress * 0.22;
            screenOpacity = screenOpacity + shieldHitProgress * 0.10;
          } else {
            // Slower breathing scale
            const pulse = 1.0 + Math.sin(time * 3.0) * 0.02;
            shieldGroup.scale.set(pulse, pulse, 1);
            
            ringOpacity = 0.55 + Math.sin(time * 3.0) * 0.15;
            fieldOpacity = 0.08 + Math.sin(time * 3.0) * 0.03;
          }

          // Apply opacities
          shieldGroup.traverse((child) => {
            if (child.isMesh) {
              child.material.opacity = child.userData.isField ? fieldOpacity : ringOpacity;
            }
          });
          if (screenOverlay) {
            screenOverlay.style.opacity = screenOpacity;
          }

          // Reset segment position and rotation (in case of transition)
          shieldGroup.children.forEach((child) => {
            child.position.set(0, 0, 0);
            child.rotation.z = 0;
          });
        } else {
          // Shattered pieces deactivation fade out (~0.4s)
          shieldFadeTimer = Math.max(0, shieldFadeTimer - delta * 2.5);
          const fadeProgress = shieldFadeTimer;

          const baseRingOpacity = 0.55 + Math.sin(time * 3.0) * 0.15;
          const baseFieldOpacity = 0.08 + Math.sin(time * 3.0) * 0.03;
          const baseScreenOpacity = 0.04 + Math.sin(time * 3.0) * 0.02;

          const ringOpacity = baseRingOpacity * fadeProgress;
          const fieldOpacity = baseFieldOpacity * fadeProgress;
          const screenOpacity = baseScreenOpacity * fadeProgress;

          // Apply opacities
          shieldGroup.traverse((child) => {
            if (child.isMesh) {
              child.material.opacity = child.userData.isField ? fieldOpacity : ringOpacity;
            }
          });
          if (screenOverlay) {
            screenOverlay.style.opacity = screenOpacity;
          }

          // Animate each segment group flying outward with ease-out quadratic scatter
          shieldGroup.children.forEach((child) => {
            if (child.userData && child.userData.angle !== undefined) {
              const easeOut = 1.0 - fadeProgress * fadeProgress;
              const driftAngle = child.userData.angle + child.userData.driftAngleOffset;
              const distance = easeOut * 7.0 * child.userData.speedFactor;
              child.position.x = Math.cos(driftAngle) * distance;
              child.position.y = Math.sin(driftAngle) * distance;
              child.position.z = easeOut * child.userData.zDrift;
              child.rotation.z = easeOut * child.userData.spinSpeed;
            }
          });

          if (shieldFadeTimer <= 0) {
            if (effectsGroup) {
              effectsGroup.remove(shieldGroup);
            }
            disposeShieldGroup();
            if (screenOverlay) {
              screenOverlay.style.opacity = 0;
            }
          }
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
          const types = ['time_freeze', 'chain_lightning', 'shockwave', 'shield'];
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
    shieldActive = false;
    shieldCharges = 0;
    shieldHitProgress = 0;
    shieldFadeTimer = 0;

    if (shieldGroup && effectsGroup) {
      effectsGroup.remove(shieldGroup);
    }
    disposeShieldGroup();

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
    isShieldActive: () => shieldActive,
    blockLeak,
    blockBossHit,
    triggerShieldHitVisual
  };
}

