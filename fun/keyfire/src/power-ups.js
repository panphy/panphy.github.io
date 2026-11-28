/**
 * Power-up system for KeyFire
 * Encapsulates power-up states, SVG icon templates, active timers,
 * 3D visual indicators for Shockwave travelling waves,
 * and the power-up cheat.
 */

export const POWER_UP_TYPES = ['time_freeze', 'chain_lightning', 'shockwave', 'shield', 'railgun'];
// The railgun's shots: each one finishes a word on its first letter.
export const RAILGUN_SHOTS = 3;

export function createPowerUpSystem({
  getMode,
  getEnemies,
  getGameTime,
  showBanner,
  powerUpBar,
  powerUpSlots,
  effectsGroup,
  playShockwaveSound,
  playShieldActivateSound,
  playShieldBlockSound,
  playGodModeOnSound,
  playGodModeOffSound,
  playStartSound,
  playChainPrimeSound,
  playRailgunChargeSound,
  playTimeFreezeSound,
  playTimeResumeSound,
  THREE,
  SPAWN_Z,
  WALL_Z
}) {
  let powerUps = [null, null, null, null];
  let timeFreezeTimer = 0;
  let chainLightningPrimed = false;
  let railgunShots = 0;
  // Three pips over the cannon show the railgun's shots left; the game keeps them
  // above the gun as it turns (placeRailgunPips in main.js).
  const railgunPips = powerUpBar ? document.createElement('div') : null;
  if (railgunPips) {
    railgunPips.className = 'railgun-pips';
    railgunPips.setAttribute('role', 'status');
    railgunPips.hidden = true;
    railgunPips.innerHTML = '<span></span>'.repeat(RAILGUN_SHOTS);
    (powerUpBar.parentElement || document.body).append(railgunPips);
  }
  let powerUpCheatActive = false;

  // Shield state
  let shieldActive = false;
  let shieldCharges = 0;
  let shieldGroup = null;
  let shieldHitProgress = 0; // 0 to 1 for block impact flash/pulse
  let shieldFadeTimer = 0;   // 0 to 1 for deactivation fade out

  const activeShockwaves = [];
  const pendingWaves = [];

  // Chunky icons in the keycap style: filled shapes with a thick ink outline.
  const INK = '#3d2b1c';
  const POWER_UP_SVGS = {
    time_freeze: `
      <svg class="power-up-svg power-up-art" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <rect x="18" y="3.5" width="8" height="5" rx="1.5" fill="#8ef0e6" stroke="${INK}" stroke-width="2.6"/>
        <circle cx="22" cy="24" r="15" fill="#fff6dc" stroke="${INK}" stroke-width="3.4"/>
        <path d="M22 24V15.5M22 24l6 3.5" fill="none" stroke="#1a8fb0" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="22" cy="24" r="2.6" fill="${INK}"/>
        <path d="M13 14.5a14 14 0 0 1 5-3.5" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity="0.9"/>
      </svg>
    `,
    chain_lightning: `
      <svg class="power-up-svg power-up-art" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <path d="M26 3 L11 24 H20 L16 41 L33 18 H23.5 Z" fill="#ffd24a" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M24 9 L16.5 20" stroke="#fff6dc" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
    `,
    shockwave: `
      <svg class="power-up-svg power-up-art" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <g fill="none" stroke-linecap="round">
          <path d="M8 26 Q22 4 36 26" stroke="${INK}" stroke-width="8"/>
          <path d="M8 26 Q22 4 36 26" stroke="#8ef0e6" stroke-width="3.6"/>
          <path d="M12 33 Q22 17 32 33" stroke="${INK}" stroke-width="8"/>
          <path d="M12 33 Q22 17 32 33" stroke="#4fd8d0" stroke-width="3.6"/>
        </g>
        <circle cx="22" cy="38" r="4" fill="#ff8a3a" stroke="${INK}" stroke-width="2.8"/>
      </svg>
    `,
    railgun: `
      <svg class="power-up-svg power-up-art" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <path d="M6 30 L30 8 L36 14 L12 36 Z" fill="#ff7ad9" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
        <path d="M10 30 L30 12 M14 33 L33 15" stroke="#fff6dc" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
        <circle cx="35" cy="9" r="5" fill="#fff6dc" stroke="${INK}" stroke-width="2.6"/>
        <path d="M6 30 L12 36 L5 39 Z" fill="${INK}"/>
      </svg>
    `,
    shield: `
      <svg class="power-up-svg power-up-art" viewBox="0 0 44 44" aria-hidden="true" focusable="false">
        <path d="M22 4 L37 9.5 V21 C37 30 30.5 36.5 22 40 C13.5 36.5 7 30 7 21 V9.5 Z" fill="#8ef0e6" stroke="${INK}" stroke-width="3.2" stroke-linejoin="round"/>
        <path d="M22 9.5 L32 13 V21 C32 27 28 31.5 22 34 Z" fill="#4fd8d0"/>
        <path d="M12 13 V20" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/>
      </svg>
    `
  };

  function updatePowerUpUI() {
    if (!powerUpBar || !powerUpSlots) return;

    powerUpSlots.forEach((slot, index) => {
      const powerUp = powerUps[index];
      // Only this class is redrawn: the flash of a slot just used must survive.
      slot.classList.toggle('occupied', Boolean(powerUp));
      const iconContainer = slot.querySelector('.power-up-icon');
      if (powerUp) {
        const powerUpName = powerUp.replace(/_/g, ' ');
        slot.setAttribute('data-power-up', powerUp);
        slot.setAttribute('aria-label', `Power-up slot ${index + 1}: ${powerUpName}`);
        slot.setAttribute('title', `Use power-up: ${powerUpName}`);
        if (iconContainer) {
          iconContainer.innerHTML = POWER_UP_SVGS[powerUp] || '';
        }
      } else {
        slot.removeAttribute('data-power-up');
        slot.setAttribute('aria-label', `Power-up slot ${index + 1} (empty)`);
        slot.setAttribute('title', `Power-up slot ${index + 1} (empty)`);
        if (iconContainer) {
          iconContainer.innerHTML = '';
        }
      }
    });
  }

  function randomPowerUp() {
    return POWER_UP_TYPES[Math.floor(Math.random() * POWER_UP_TYPES.length)];
  }

  function addPowerUp(type) {
    if (!type) type = randomPowerUp();

    const freeSlot = powerUps.indexOf(null);
    if (freeSlot !== -1) {
      powerUps[freeSlot] = type;
      updatePowerUpUI();
      playStartSound(); // Play collection chime
      return true;
    } else {
      if (powerUpBar) {
        powerUpBar.classList.add('full-shake');
        window.setTimeout(() => powerUpBar.classList.remove('full-shake'), 400);
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

  function activatePowerUpSlot(index) {
    if (getMode() !== 'running') return;
    const powerUp = powerUps[index];
    if (!powerUp) return;

    const isAlreadyActive = (powerUp === 'time_freeze' && timeFreezeTimer > 0) ||
                            (powerUp === 'chain_lightning' && chainLightningPrimed) ||
                            (powerUp === 'railgun' && railgunShots > 0) ||
                            (powerUp === 'shield' && shieldActive);

    if (isAlreadyActive) {
      const slotEl = powerUpSlots[index];
      if (slotEl) {
        slotEl.classList.remove('blocked-active');
        void slotEl.offsetWidth; // force reflow
        slotEl.classList.add('blocked-active');
        slotEl.addEventListener('animationend', () => slotEl.classList.remove('blocked-active'), { once: true });
      }
      return;
    }

    const slotEl = powerUpSlots[index];
    if (slotEl) {
      slotEl.classList.add('activating');
      slotEl.addEventListener('animationend', () => slotEl.classList.remove('activating'), { once: true });
    }

    powerUps[index] = null;

    if (powerUp === 'time_freeze') {
      timeFreezeTimer = 3.5;
      playTimeFreezeSound();
      showBanner('TIME FREEZE!', 'time-freeze');
    } else if (powerUp === 'chain_lightning') {
      // Chain lightning and the railgun replace each other: the new one takes over.
      setRailgunShots(0);
      chainLightningPrimed = true;
      document.body.classList.add('chain-lightning-primed');
      playChainPrimeSound();
      showBanner('CHAIN PRIMED!', 'chain-lightning');
    } else if (powerUp === 'railgun') {
      clearChainLightning();
      setRailgunShots(RAILGUN_SHOTS);
      playRailgunChargeSound();
      showBanner('RAILGUN!', 'railgun');
    } else if (powerUp === 'shockwave') {
      playShockwaveSound();
      showBanner('SHOCKWAVE!', 'shockwave');

      // Pushes back all targeted/alive enemies and stuns them
      const aliveEnemies = getEnemies();
      aliveEnemies.forEach((enemy) => {
        if (enemy.dying) return;
        // What a boss throws is knocked back along its flight, so it takes longer to land.
        if (enemy.isProjectile && enemy.rail) {
          enemy.rail.t = Math.max(0, enemy.rail.t - 0.45);
          return;
        }
        if (enemy.revealed) {
          enemy.pushbackTargetZ = Math.max(SPAWN_Z, enemy.group.position.z - 15);
          enemy.stunTimer = 1.5;
        }
      });

      // Queue 3 consecutive wavefronts
      pendingWaves.push({ delay: 0.0 });
      pendingWaves.push({ delay: 0.15 });
      pendingWaves.push({ delay: 0.30 });
    } else if (powerUp === 'shield') {
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

    if (powerUpCheatActive) {
      // immediately refill the slot with a random power-up
      powerUps[index] = randomPowerUp();
    }

    updatePowerUpUI();
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

  // Anything that gets through (a monster's strike or a boss's rock) costs one charge.
  function blockLeak() {
    if (!shieldActive) return false;
    shieldCharges -= 1;
    if (shieldCharges <= 0) {
      shieldActive = false;
      shieldFadeTimer = 1.0; // Start the fade out
    }
    return true;
  }

  function update(delta) {
    if (getMode() === 'running') {
      if (timeFreezeTimer > 0) {
        timeFreezeTimer = Math.max(0, timeFreezeTimer - delta);
        if (timeFreezeTimer <= 0) {
          playTimeResumeSound();
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

  function togglePowerUpCheat() {
    powerUpCheatActive = !powerUpCheatActive;
    if (powerUpCheatActive) {
      // Fill all slots
      for (let i = 0; i < 4; i++) {
        if (powerUps[i] === null) {
          powerUps[i] = randomPowerUp();
        }
      }
      updatePowerUpUI();
      playGodModeOnSound();
      showBanner('POWER-UP CHEAT ON!', 'cheat');
    } else {
      playGodModeOffSound();
      showBanner('POWER-UP CHEAT OFF!', 'cheat');
    }
  }

  function clearChainLightning() {
    chainLightningPrimed = false;
    document.body.classList.remove('chain-lightning-primed');
  }

  function setRailgunShots(count) {
    railgunShots = count;
    if (!railgunPips) return;
    railgunPips.hidden = count <= 0;
    railgunPips.setAttribute('aria-label', `Railgun: ${count} shot${count === 1 ? '' : 's'} left`);
    railgunPips.querySelectorAll('span').forEach((pip, index) => pip.classList.toggle('is-spent', index >= count));
  }

  function clear() {
    powerUps = [null, null, null, null];
    timeFreezeTimer = 0;
    chainLightningPrimed = false;
    setRailgunShots(0);
    powerUpCheatActive = false;
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
    updatePowerUpUI();
  }

  function deactivateShield() {
    if (shieldActive) {
      shieldActive = false;
      shieldCharges = 0;
      shieldFadeTimer = 1.0;
    }
  }

  return {
    addPowerUp,
    activatePowerUpSlot,
    update,
    clear,
    togglePowerUpCheat,
    isTimeFrozen: () => timeFreezeTimer > 0,
    isChainLightningPrimed: () => chainLightningPrimed,
    clearChainLightningPrimed: clearChainLightning,
    getRailgunShots: () => railgunShots,
    railgunPips,
    // Spends one shot; false when there is none.
    useRailgunShot: () => {
      if (railgunShots <= 0) return false;
      setRailgunShots(railgunShots - 1);
      return true;
    },
    isPowerUpCheatActive: () => powerUpCheatActive,
    isShieldActive: () => shieldActive,
    deactivateShield,
    blockLeak,
    triggerShieldHitVisual,
    getPowerUps: () => [...powerUps],
    getPowerUpIcon: (type) => POWER_UP_SVGS[type] || ''
  };
}

