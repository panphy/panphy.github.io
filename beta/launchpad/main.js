// Launchpad: game flow, input and the flight display.
import { Scene, loadTextures } from './scene.js';
import { Flight, MAX_PHYSICS_WARP } from './flight.js';
import { CONTRACTS, rocketFits, judge } from './contracts.js';
import { Guidance } from './guidance.js';
import { FLEET, analyze, designFor } from './rocket.js';
import { R_EARTH, OMEGA, SPACE_EDGE, keplerStep, circularSpeed, pressureRatio } from './physics.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'launchpad-company';
const DEG = 180 / Math.PI;
const START_FUNDS = 10;
const FREE_FLIGHT = {
  id: 'free', free: true, customer: 'No customer, no bill', fee: 0,
  payload: { name: 'Free flight', mass: 1000, diameter: 1.6, length: 2.6 },
  target: null
};

// ---------- saved progress ----------

// best holds each delivered contract's best accuracy; owned the rockets licensed so far.
function loadSave() {
  const fresh = { funds: START_FUNDS, best: {}, owned: FLEET.filter((rocket) => rocket.price === 0).map((rocket) => rocket.id), sound: true };
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY));
    if (!save || typeof save.funds !== 'number') return fresh;
    return { funds: save.funds, best: save.best || {}, owned: [...new Set([...fresh.owned, ...(save.owned || [])])], sound: save.sound !== false };
  } catch { return fresh; }
}
const save = loadSave();
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* play on without saving */ }
}
const deliveredCount = () => Object.keys(save.best).length;

// ---------- formatting ----------

const number = (value, digits = 0) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace('-', '−');
function distance(meters) {
  if (!Number.isFinite(meters)) return '∞';
  return Math.abs(meters) < 10000 ? `${number(Math.round(meters) || 0)} m` : `${number(meters / 1000, 1)} km`;
}
function duration(seconds) {
  if (!Number.isFinite(seconds)) return '';
  const s = Math.max(0, Math.floor(seconds));
  const pad = (value) => String(value).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
const tonnes = (kg) => (kg >= 1000 ? `${number(kg / 1000, kg < 10000 ? 2 : 1)} t` : `${number(Math.round(kg))} kg`);

function money(millions) {
  const value = Math.round(millions * 10) / 10;
  return `${value < 0 ? '−' : ''}$${number(Math.abs(value), Number.isInteger(value) ? 0 : 1)}M`;
}
const kmText = (meters) => `${number(Math.round(meters / 1000))} km`;
function targetText(target) {
  if (!target) return 'Fly anywhere';
  if (target.kind === 'space') return 'Release above 100 km';
  if (target.ap === target.pe) return `${kmText(target.ap)} circular orbit, ±${kmText(target.apTol)}`;
  return `${kmText(target.pe)} × ${kmText(target.ap)} transfer orbit, ±${kmText(target.apTol)} at the top`;
}

// ---------- state ----------

const sound = new Sound();
sound.enabled = save.sound;
let scene = null;
let mode = 'loading';        // 'menu' | 'prep' | 'flight'
let contract = null;
let rocket = null;           // the fleet rocket chosen for this contract
let flight = null;
let guidance = null;
let advice = null;           // the guidance's latest word
let power = 0;
let paused = false;
let wreck = null;            // { time } once the rocket is lost
const keys = new Set();
const touchPitch = { west: false, east: false };
const demo = { t: 0, x: 0, y: 0, vx: 0, vy: 0 };

function updateShift() {
  if (scene) scene.setShift(mode === 'prep' && innerWidth > 760 ? 198 : 0);
}

function setMode(next) {
  mode = next;
  document.body.dataset.mode = next;
  $('menu').hidden = next !== 'menu';
  $('prep').hidden = next !== 'prep';
  $('hud').hidden = next !== 'flight';
  $('markers').hidden = next !== 'flight';
  updateShift();
  hideOverlay();
}

// ---------- contracts ----------

function showMenu() {
  flight = null;
  contract = null;
  setMode('menu');
  $('funds').textContent = money(save.funds);
  $('funds').classList.toggle('debt', save.funds < 0);
  const count = deliveredCount();
  $('delivered').textContent = `${count} of ${CONTRACTS.length}`;
  const list = $('contract-list');
  list.replaceChildren();
  for (const item of [...CONTRACTS, FREE_FLIGHT]) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    const best = save.best[item.id];
    const locked = !item.free && item.rank > count;
    button.className = `contract-card${best !== undefined ? ' done' : ''}`;
    button.disabled = locked;
    button.innerHTML = '<span class="order"></span><span class="name"></span><span class="what"></span><span class="state"><b class="num"></b><i></i></span>';
    button.children[0].textContent = item.customer;
    button.children[1].textContent = item.payload.name;
    button.children[2].textContent = targetText(item.target);
    const [fee, status] = button.children[3].children;
    fee.textContent = item.free ? '' : money(item.fee);
    if (locked) status.textContent = `After ${item.rank - count} more ${item.rank - count === 1 ? 'delivery' : 'deliveries'}`;
    else if (best !== undefined) status.textContent = `Delivered ✓ ${Math.round(best * 100)}%`;
    else status.textContent = item.free ? 'Fly →' : 'Open →';
    button.addEventListener('click', () => { sound.start(); sound.click(); showPrep(item); });
    li.append(button);
    list.append(li);
  }
  // A quiet orbit to watch behind the menu.
  const radius = R_EARTH + 420000;
  const angle = 0.2;
  Object.assign(demo, { t: 0, x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
  const speed = circularSpeed(radius);
  demo.vx = -speed * Math.sin(angle);
  demo.vy = speed * Math.cos(angle);
  scene.setRocket(null);
  scene.setTargetOrbit(0);
  scene.setMap(false);
  scene.view.blend = 0;
  scene.view.yaw = -Math.PI / 2 - 0.55;
  scene.view.elevation = 0.3;
  scene.view.distance = 100;
  scene.autoRotate = 0;
}

// ---------- launch preparation ----------

const fits = (item) => (contract.free ? analyze(designFor(item, contract.payload)).canLiftOff : rocketFits(item, contract));
const owned = (item) => contract.free || save.owned.includes(item.id);

function showPrep(item) {
  contract = item;
  // The cheapest rocket that can do the job; one still to be licensed is shown but cannot fly.
  const able = FLEET.filter(fits);
  rocket = able.find(owned) || able[0];
  setMode('prep');
  $('prep-title').textContent = item.payload.name;
  $('prep-customer').textContent = item.customer;
  $('prep-goal').textContent = targetText(item.target);
  $('prep-mass').textContent = tonnes(item.payload.mass);
  $('prep-fee').textContent = item.free ? '—' : money(item.fee);
  scene.setMap(false);
  scene.view.blend = 0;
  scene.view.yaw = 0.6;
  scene.setTargetOrbit(0);
  renderPrep(true);
}

function renderPrep(reframe) {
  $('prep-funds').textContent = money(save.funds);
  $('prep-funds').classList.toggle('debt', save.funds < 0);
  const list = $('rocket-list');
  list.replaceChildren();
  for (const item of FLEET) {
    const card = document.createElement('div');
    const able = fits(item), mine = owned(item);
    card.className = `rocket-card${item === rocket ? ' picked' : ''}`;
    const pick = document.createElement('button');
    pick.type = 'button';
    pick.className = 'rocket-pick';
    pick.disabled = !able;
    pick.setAttribute('aria-pressed', String(item === rocket));
    pick.innerHTML = '<strong></strong><span></span><b class="num"></b>';
    pick.children[0].textContent = item.name;
    pick.children[1].textContent = able ? item.role : 'Too small for this payload and orbit';
    pick.children[2].textContent = contract.free ? '' : `${money(item.cost)} a launch`;
    pick.addEventListener('click', () => { rocket = item; sound.click(); renderPrep(true); });
    card.append(pick);
    if (!mine) {
      const buy = document.createElement('button');
      buy.type = 'button';
      buy.className = 'rocket-buy';
      buy.textContent = `Buy license ${money(item.price)}`;
      buy.disabled = save.funds < item.price;
      buy.addEventListener('click', () => {
        save.funds -= item.price;
        save.owned.push(item.id);
        storeSave();
        if (able) rocket = item;
        sound.success();
        renderPrep(true);
      });
      card.append(buy);
    }
    list.append(card);
  }
  const info = analyze(designFor(rocket, contract.payload));
  $('total-mass').textContent = tonnes(info.liftoffMass);
  $('total-profit').textContent = contract.free ? '—' : money(contract.fee - rocket.cost);
  $('launch-button').disabled = !owned(rocket);
  scene.setRocket(info);
  $('total-height').textContent = `${number(scene.rocket.height, 1)} m`;
  if (reframe) scene.frameRocket();
  scene.autoRotate = 0.07;
  // Shown standing on the pad behind the panel.
  flight = new Flight(designFor(rocket, contract.payload));
}

$('prep-back').addEventListener('click', showMenu);
$('launch-button').addEventListener('click', startFlight);

// ---------- flight ----------

function startFlight() {
  sound.start();
  flight = new Flight(designFor(rocket, contract.payload));
  guidance = contract.target ? new Guidance(contract.target) : null;
  advice = null;
  if (guidance) flight.hold = 'guide';
  setMode('flight');
  scene.setRocket(flight.info);
  scene.frameRocket();
  scene.setMap(false);
  scene.view.blend = 0;
  scene.view.yaw = 0.35;
  scene.autoRotate = 0;
  scene.setTargetOrbit(contract.target && contract.target.ap ? R_EARTH + contract.target.ap : 0);
  power = 0;
  paused = false;
  wreck = null;
  keys.clear();
  $('hud-title').textContent = contract.payload.name;
  $('hud-goal').textContent = targetText(contract.target);
  $('hud-cue').textContent = '';
  $('hold-guide').hidden = !guidance;
  document.querySelector('.hud-mission').classList.remove('done');
  $('throttle').value = 100;
  $('map-button').setAttribute('aria-pressed', 'false');
  hideAlert();
}

let alertTimer = 0;
function showAlert(text, kind = '', seconds = 3.5) {
  const alert = $('alert');
  alert.textContent = text;
  alert.className = `alert show ${kind}`;
  alertTimer = seconds;
}
function hideAlert() { $('alert').className = 'alert'; alertTimer = 0; }

function toggleMap() {
  scene.setMap(!scene.mapOpen);
  $('map-button').setAttribute('aria-pressed', String(scene.mapOpen));
}

function setHold(kind) {
  if (!flight || flight.over || (kind === 'guide' && !guidance)) return;
  flight.hold = flight.hold === kind ? 'off' : kind;
}

function changeWarp(step) {
  if (!flight || flight.over) return;
  flight.setWarp(flight.warpIndex + step);
}

function stageAction() {
  if (!flight || flight.over || paused) return;
  sound.start();
  flight.activateStage();
}

function deployAction() {
  if (!flight || flight.over || paused || flight.deployed || flight.phase !== 'flying') return;
  if (flight.altitude < SPACE_EDGE) { showAlert('The payload can only be released above 100 km'); return; }
  flight.deployPayload();
}

function handleEvents() {
  for (const event of flight.events.splice(0)) {
    if (event.type === 'liftoff') {
      scene.kick(0.6);
      showAlert('Liftoff', 'good', 2);
      if (!contract.free) { save.funds -= rocket.cost; storeSave(); }
    }
    if (event.type === 'stage') { sound.thump(); scene.kick(0.5); hideAlert(); }
    if (event.type === 'burnout') showAlert(event.last ? 'Out of propellant' : 'Stage empty: press Space to drop it', event.last ? 'danger' : '', 6);
    if (event.type === 'space') showAlert('You are in space', 'good');
    if (event.type === 'deploy') { sound.thump(); settle(); }
    if (event.type === 'warp-limited') showAlert('Faster time needs engines off, above 140 km');
    if (event.type === 'warp-stop' && event.reason === 'atmosphere') showAlert('Entering the atmosphere');
    if (event.type === 'crashed' || event.type === 'breakup' || event.type === 'burnup') {
      wreck = { time: 0, type: event.type, speed: flight.telemetry().surfaceSpeed };
      scene.explode();
      scene.kick(3);
      sound.failure();
      hideAlert();
    }
    if (event.type === 'landed') showAlert('Touchdown', 'good');
  }
}

// The payload is away: pay for where it was left.
function settle() {
  if (contract.free) { showAlert('Payload released', 'good'); return; }
  const verdict = judge(contract, flight.deployed);
  const count = deliveredCount();
  save.funds += verdict.pay + verdict.bonus;
  if (verdict.grade === 'delivered') {
    save.best[contract.id] = Math.max(save.best[contract.id] || 0, verdict.accuracy);
    document.querySelector('.hud-mission').classList.add('done');
    sound.success();
  }
  storeSave();
  const fresh = deliveredCount() > count && CONTRACTS.some((item) => item.rank === count + 1);
  const words = {
    delivered: `${contract.customer} has its payload where it asked.${fresh ? ' A new contract is open.' : ''}`,
    off: 'The orbit is outside the agreed limits. The customer pays half and will spend its own propellant to fix it.',
    stranded: 'The orbit is far from the one agreed. The customer pays a fifth of the fee.',
    lost: flight.deployed.bound ? 'Released too low: the payload will fall back into the atmosphere.' : 'Released on a path that leaves the Earth: the payload is gone.'
  };
  if (contract.target.kind === 'space') words.lost = 'Released below 100 km.';
  showOverlay({
    soft: true,
    title: { delivered: 'Payload delivered', off: 'Off target', stranded: 'Wrong orbit', lost: 'Payload lost' }[verdict.grade],
    text: words[verdict.grade],
    stats: [
      ['Fee paid', money(verdict.pay)],
      ['Accuracy bonus', money(verdict.bonus)],
      ['Launch cost', money(-rocket.cost)],
      ['Profit', money(verdict.pay + verdict.bonus - rocket.cost)],
      ['Funds', money(save.funds)]
    ],
    actions: [
      { label: 'Keep flying', run: hideOverlay },
      { label: 'Contracts', primary: true, run: showMenu }
    ]
  });
}

function showWreck() {
  const reasons = {
    crashed: `Hit the ground at ${number(Math.round(wreck.speed))} m/s.`,
    breakup: 'The airflow tore the rocket apart. Low down, keep the nose along your path.',
    burnup: 'Burned up coming back into the atmosphere.'
  };
  const cargoLost = !flight.deployed && !contract.free;
  showOverlay({
    title: cargoLost ? 'Rocket and payload lost' : 'Flight over',
    text: reasons[wreck.type],
    stats: cargoLost ? [['Launch cost', money(-rocket.cost)], ['Funds', money(save.funds)]] : [],
    actions: [
      { label: 'Contracts', run: showMenu },
      { label: 'Change the rocket', run: () => showPrep(contract) },
      { label: 'Fly again', primary: true, run: startFlight }
    ]
  });
}

function showPause() {
  if (mode !== 'flight' || wreck) return;
  paused = true;
  showOverlay({
    title: 'Paused',
    text: '',
    actions: [
      { label: 'Contracts', run: showMenu },
      { label: 'Change the rocket', run: () => showPrep(contract) },
      { label: 'Restart', run: startFlight },
      { label: 'Resume', primary: true, run: () => { paused = false; hideOverlay(); } }
    ]
  });
}

function showOverlay({ title, text, stats = [], actions, soft = false }) {
  const overlay = $('overlay');
  overlay.hidden = false;
  overlay.classList.toggle('soft', soft);
  $('overlay-title').textContent = title;
  $('overlay-text').textContent = text;
  $('overlay-text').hidden = !text;
  $('overlay-stats').replaceChildren(...stats.map(([label, value]) => {
    const div = document.createElement('div');
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label; dd.textContent = value; dd.className = 'num';
    div.append(dt, dd);
    return div;
  }));
  const buttons = actions.map((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.className = action.primary ? 'primary' : 'ghost';
    button.addEventListener('click', () => { sound.click(); action.run(); });
    return button;
  });
  $('overlay-actions').replaceChildren(...buttons);
  if (!soft) buttons[buttons.length - 1].focus();
}
function hideOverlay() { $('overlay').hidden = true; }

// What the guidance says now, and time warp eased down so a burn is not flown past.
function consultGuidance(tel) {
  if (!guidance) return;
  advice = guidance.update(flight, tel);
  flight.guideAngle = advice.heading;
  if (flight.hold === 'guide' && advice.heading === null) flight.hold = 'off';
  if (advice.burnIn !== null) {
    while (flight.warp > MAX_PHYSICS_WARP && advice.burnIn < 20 + flight.warp * 0.4) flight.warpIndex -= 1;
  }
  const cue = flight.over ? '' : advice.cue;
  if ($('hud-cue').textContent !== cue) $('hud-cue').textContent = cue;
}

// ---------- input ----------

window.addEventListener('keydown', (event) => {
  if (mode !== 'flight' || event.target.closest('input, select, textarea')) return;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(key)) event.preventDefault();
  if (key === 'Escape') { if (paused) { paused = false; hideOverlay(); } else showPause(); return; }
  if (paused || event.repeat && key === ' ') return;
  keys.add(key);
  if (key === ' ') stageAction();
  if (key === 'm') toggleMap();
  if (key === 'z' && flight) flight.throttle = 1;
  if (key === 'x' && flight) flight.throttle = 0;
  if (key === 'p') deployAction();
  if (key === 'g') setHold('guide');
  if (key === 'q') setHold('prograde');
  if (key === 'e') setHold('retrograde');
  if (key === '.' || key === '>') changeWarp(1);
  if (key === ',' || key === '<') changeWarp(-1);
});
window.addEventListener('keyup', (event) => keys.delete(event.key.length === 1 ? event.key.toLowerCase() : event.key));
window.addEventListener('blur', () => keys.clear());

function holdButton(id, side) {
  const button = $(id);
  const set = (on) => { touchPitch[side] = on; button.classList.toggle('down', on); };
  button.addEventListener('pointerdown', (event) => { button.setPointerCapture(event.pointerId); set(true); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, () => set(false));
  button.addEventListener('keydown', (event) => { if (event.key === 'Enter') set(true); });
  button.addEventListener('keyup', (event) => { if (event.key === 'Enter') set(false); });
}
holdButton('pitch-west', 'west');
holdButton('pitch-east', 'east');
$('stage-button').addEventListener('click', stageAction);
$('deploy-button').addEventListener('click', deployAction);
$('hold-guide').addEventListener('click', () => setHold('guide'));
$('map-button').addEventListener('click', toggleMap);
$('menu-button').addEventListener('click', showPause);
$('hold-prograde').addEventListener('click', () => setHold('prograde'));
$('hold-retrograde').addEventListener('click', () => setHold('retrograde'));
$('warp-up').addEventListener('click', () => changeWarp(1));
$('warp-down').addEventListener('click', () => changeWarp(-1));
$('throttle-full').addEventListener('click', () => { if (flight) flight.throttle = 1; });
$('throttle-cut').addEventListener('click', () => { if (flight) flight.throttle = 0; });
$('throttle').addEventListener('input', (event) => { if (flight) flight.throttle = Number(event.target.value) / 100; });
$('sound-button').setAttribute('aria-pressed', String(save.sound));
$('sound-button').addEventListener('click', () => {
  save.sound = !save.sound;
  storeSave();
  sound.setEnabled(save.sound);
  if (save.sound) sound.start();
  $('sound-button').setAttribute('aria-pressed', String(save.sound));
});

function readInput(dt) {
  const east = keys.has('d') || keys.has('ArrowRight') || touchPitch.east;
  const west = keys.has('a') || keys.has('ArrowLeft') || touchPitch.west;
  flight.pitchInput = (east ? 1 : 0) - (west ? 1 : 0);
  const up = keys.has('Shift') || keys.has('w') || keys.has('ArrowUp');
  const down = keys.has('Control') || keys.has('s') || keys.has('ArrowDown');
  if (up !== down) flight.throttle = Math.min(1, Math.max(0, flight.throttle + (up ? 1 : -1) * dt * 0.6));
}

// ---------- flight display ----------

const dialTicks = $('dial-ticks');
for (let angle = 0; angle < 360; angle += 30) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('class', 'dial-tick');
  line.setAttribute('y1', -50);
  line.setAttribute('y2', angle % 90 === 0 ? -44 : -47);
  line.setAttribute('transform', `rotate(${angle})`);
  dialTicks.append(line);
}

const markerNodes = new Map();
function drawMarkers(tel) {
  const seen = new Set();
  for (const marker of scene.markers) {
    seen.add(marker.id);
    let node = markerNodes.get(marker.id);
    if (!node) {
      node = document.createElement('div');
      node.className = `marker ${marker.id}`;
      $('markers').append(node);
      markerNodes.set(marker.id, node);
    }
    node.style.transform = `translate(${marker.x.toFixed(1)}px, ${marker.y.toFixed(1)}px)`;
    node.style.opacity = marker.alpha;
    node.hidden = false;
    if (marker.id === 'ap') node.textContent = `Ap ${distance(tel.apoapsis)}`;
    if (marker.id === 'pe') node.textContent = `Pe ${distance(tel.periapsis)}`;
  }
  for (const [id, node] of markerNodes) if (!seen.has(id)) node.hidden = true;
}

let hudTick = 0;
function drawHud(tel, dt) {
  const tilt = (flight.heading - flight.angle) * DEG;
  $('dial-needle').setAttribute('transform', `rotate(${tilt.toFixed(1)})`);
  const moving = (tel.altitude < 45000 ? tel.surfaceSpeed : tel.orbitalSpeed) > 5;
  const prograde = (flight.progradeAngle() - flight.angle) * DEG;
  $('dial-prograde').setAttribute('transform', `rotate(${prograde.toFixed(1)})`);
  $('dial-retrograde').setAttribute('transform', `rotate(${(prograde + 180).toFixed(1)})`);
  $('dial-prograde').style.display = $('dial-retrograde').style.display = moving ? '' : 'none';
  const guide = advice && advice.heading !== null && !flight.over ? (advice.heading - flight.angle) * DEG : null;
  $('dial-guide').style.display = guide === null ? 'none' : '';
  if (guide !== null) $('dial-guide').setAttribute('transform', `rotate(${guide.toFixed(1)})`);
  $('fuel-fill').style.transform = `scaleX(${tel.propFraction.toFixed(4)})`;
  if (document.activeElement !== $('throttle')) $('throttle').value = Math.round(flight.throttle * 100);

  hudTick += dt;
  if (hudTick < 0.08) return;
  hudTick = 0;
  const surface = tel.altitude < 45000;
  $('r-altitude').textContent = distance(tel.altitude);
  $('r-speed-label').textContent = surface ? 'Speed over the ground' : 'Orbital speed';
  $('r-speed').textContent = `${number(Math.round(surface ? tel.surfaceSpeed : tel.orbitalSpeed))} m/s`;
  $('r-ap').textContent = tel.orbit.bound ? distance(tel.apoapsis) : 'Escape';
  $('r-pe').textContent = distance(tel.periapsis);
  const target = contract.target && contract.target.ap ? contract.target : null;
  $('r-ap').classList.toggle('on', Boolean(target) && tel.orbit.bound && Math.abs(tel.apoapsis - target.ap) <= target.apTol);
  $('r-pe').classList.toggle('on', Boolean(target) && Math.abs(tel.periapsis - target.pe) <= target.peTol);
  const flying = flight.phase === 'flying';
  $('r-ap-time').textContent = flying && tel.orbit.bound && tel.apoapsis > tel.altitude + 1 ? `in ${duration(tel.toAp)}` : '';
  $('r-pe-time').textContent = flying && tel.periapsis > 0 ? `in ${duration(tel.toPe)}` : '';
  let pitch = tel.pitch * DEG;
  if (pitch > 180) pitch -= 360;
  $('r-pitch').textContent = `${number(Math.round(pitch))}° above the horizon`;
  $('r-throttle').textContent = `${Math.round(flight.throttle * 100)}%`;
  const stage = flight.stageInfo;
  $('stage-name').textContent = `Stage ${flight.stage + 1} of ${flight.info.stages.length}`;
  $('stage-engine').textContent = `${stage.count} × ${stage.engine.name}`;
  $('r-fuel').textContent = tonnes(flight.prop[flight.stage]);
  $('r-dv').textContent = `${number(Math.round(tel.dv))} m/s`;
  $('r-twr').textContent = number(tel.twr, 2);
  $('r-g').textContent = `${number(flight.gForce, 1)} g`;
  const empty = flight.prop[flight.stage] <= 0;
  const canStage = flight.phase === 'pad' || flight.stage < flight.info.stages.length - 1;
  $('stage-button-text').textContent = flight.phase === 'pad' ? 'Launch' : 'Drop stage';
  $('stage-button').disabled = !canStage;
  $('stage-button').classList.toggle('pulse', flight.phase === 'pad' || (empty && canStage));
  const ready = Boolean(advice && advice.ready) && !flight.thrusting();
  $('deploy-button').disabled = flight.phase !== 'flying' || Boolean(flight.deployed);
  $('deploy-button').classList.toggle('primary', ready);
  $('deploy-button').classList.toggle('pulse', ready);
  const launched = flight.liftoffTime !== null;
  $('hud-time').textContent = launched ? `T+ ${duration(flight.t - flight.liftoffTime)}` : 'T− 00:00';
  $('warp-value').textContent = `${number(flight.warp)}×`;
  $('warp-value').classList.toggle('fast', flight.warp > MAX_PHYSICS_WARP);
  $('hold-guide').setAttribute('aria-pressed', String(flight.hold === 'guide'));
  $('hold-prograde').setAttribute('aria-pressed', String(flight.hold === 'prograde'));
  $('hold-retrograde').setAttribute('aria-pressed', String(flight.hold === 'retrograde'));

  if (flying && alertTimer <= 0) {
    if (flight.stress > 5000) showAlert('Air stress high: point along your path', 'danger', 0.4);
    else if (flight.heat > 0.55) showAlert('Overheating', 'danger', 0.4);
  }
}

// ---------- main loop ----------

let last = performance.now();
let lastState = null;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (scene) update(dt);
}

function update(dt) {
  let state;
  let simDt = dt;
  if (mode === 'menu') {
    const step = dt * 22;
    Object.assign(demo, keplerStep(demo, step));
    demo.t += step;
    state = { ...demo, heading: Math.atan2(demo.vy, demo.vx), stage: 0, power: 0, heat: 0, debris: [], orbit: null, showRocket: false };
    sound.update(0, 0, 0, 1e6);
  } else if (flight) {
    if (mode === 'flight' && !paused && !flight.over) {
      consultGuidance(flight.telemetry());
      readInput(dt);
      const before = flight.t;
      flight.advance(dt);
      simDt = flight.t - before;
      handleEvents();
    }
    const tel = flight.telemetry();
    const target = flight.thrust > 0 ? flight.throttle : 0;
    power += (target - power) * Math.min(1, dt * 9);
    const air = pressureRatio(tel.altitude);
    if (mode === 'flight') {
      if (power > 0.01 && !paused) scene.kick(0.012 * power * (0.3 + air) * Math.cbrt(flight.info.liftoffMass / 1000));
      if (wreck) {
        wreck.time += dt;
        if (wreck.time > 1.6 && $('overlay').hidden) showWreck();
      }
      drawHud(tel, dt);
      if (alertTimer > 0) { alertTimer -= dt; if (alertTimer <= 0) hideAlert(); }
      sound.update(paused || flight.over ? 0 : power, air, paused ? 0 : tel.q / 30000, scene.mapOpen ? 1e5 : scene.view.distance);
    } else sound.update(0, 0, 0, 1e6);
    // Once the rocket is lost the view stays with the air where it happened.
    const still = flight.over;
    state = {
      t: flight.t, x: flight.x, y: flight.y, vx: still ? -OMEGA * flight.y : flight.vx, vy: still ? OMEGA * flight.x : flight.vy, heading: flight.heading,
      stage: flight.stage, power: flight.over ? 0 : power, heat: flight.heat, debris: flight.debris,
      orbit: tel.orbit, showRocket: !flight.over, deployed: Boolean(flight.deployed)
    };
    lastState = state;
    scene.render(state, dt, paused ? 0 : simDt);
    if (mode === 'flight') drawMarkers(tel);
    return;
  }
  if (state) scene.render(state, dt, simDt);
}

// ---------- start ----------

async function start() {
  const params = new URLSearchParams(location.search);
  const coarse = matchMedia('(pointer: coarse)').matches;
  const quality = params.get('quality') || (coarse || (navigator.deviceMemory && navigator.deviceMemory <= 4) ? 'low' : 'high');
  try {
    const textures = await loadTextures(quality, (fraction) => { $('loading-fill').style.width = `${fraction * 100}%`; });
    scene = new Scene($('view'), textures, quality);
  } catch (error) {
    $('loading-text').textContent = 'This device could not start the 3D view.';
    console.error(error);
    return;
  }
  window.addEventListener('resize', () => { scene.resize(); updateShift(); });
  showMenu();
  $('loading').classList.add('done');
  setTimeout(() => { $('loading').hidden = true; }, 900);
  requestAnimationFrame(frame);
}
start();

// For tests and debugging in the console.
window.launchpad = {
  get flight() { return flight; },
  get scene() { return scene; },
  get guidance() { return guidance; },
  get advice() { return advice; },
  get save() { return save; },
  showMenu, showPrep, startFlight, CONTRACTS, FLEET,
  // Run n frames of the real game loop with a fixed time step.
  tick(n = 1, dt = 1 / 60) { for (let i = 0; i < n; i += 1) update(dt); },
  // Milliseconds to draw one frame, measured over n frames.
  bench(n = 20) {
    const gl = scene.renderer.getContext();
    const pixel = new Uint8Array(4);
    const t0 = performance.now();
    for (let i = 0; i < n; i += 1) { scene.render(lastState, 0.016, 0.016); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel); }
    return (performance.now() - t0) / n;
  },
  // Fly ahead by some seconds of game time with the controls as they are.
  advance(seconds, step = 0.05) {
    for (let t = 0; t < seconds && flight && !flight.over; t += step) { flight.advance(step / flight.warp); handleEvents(); }
  }
};
