// Launchpad: game flow, input and the flight display.
import { Scene, loadTextures } from './scene.js';
import { Flight, MAX_PHYSICS_WARP } from './flight.js';
import { MISSIONS, SANDBOX } from './missions.js';
import { ENGINES, PAYLOADS, MAX_STAGES, MAX_ENGINES, analyze, cloneDesign } from './rocket.js';
import { R_EARTH, OMEGA, keplerStep, circularSpeed, pressureRatio } from './physics.js';
import { Sound } from './audio.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'launchpad-save';
const DEG = 180 / Math.PI;
const ALL_MISSIONS = [...MISSIONS, SANDBOX];
const DV_NEED = { space: 2000, orbit: 9300, circular: 9500, sandbox: 9300 };
const DV_NOTE = {
  space: 'Reaching 100 km takes about 2,000 m/s.',
  orbit: 'Reaching low orbit takes about 9,300 m/s.',
  circular: 'Reaching a 400 km orbit takes about 9,500 m/s.',
  sandbox: 'Reaching low orbit takes about 9,300 m/s.'
};

// ---------- saved progress ----------

function loadSave() {
  try {
    const save = JSON.parse(localStorage.getItem(SAVE_KEY)) || {};
    return { done: save.done || [], designs: save.designs || {}, sound: save.sound !== false };
  } catch { return { done: [], designs: {}, sound: true }; }
}
const save = loadSave();
function storeSave() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch { /* play on without saving */ }
}

// ---------- formatting ----------

const number = (value, digits = 0) => value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).replace('-', '−');
function distance(meters) {
  if (!Number.isFinite(meters)) return '∞';
  return Math.abs(meters) < 10000 ? `${number(Math.round(meters))} m` : `${number(meters / 1000, 1)} km`;
}
function duration(seconds) {
  if (!Number.isFinite(seconds)) return '';
  const s = Math.max(0, Math.floor(seconds));
  const pad = (value) => String(value).padStart(2, '0');
  return s >= 3600 ? `${Math.floor(s / 3600)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}` : `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}
const tonnes = (kg) => (kg >= 1000 ? `${number(kg / 1000, kg < 10000 ? 2 : 1)} t` : `${number(Math.round(kg))} kg`);

// ---------- state ----------

const sound = new Sound();
sound.enabled = save.sound;
let scene = null;
let mode = 'loading';        // 'menu' | 'build' | 'flight'
let mission = null;
let design = null;
let flight = null;
let power = 0;
let paused = false;
let missionDone = false;
let wreck = null;            // { time } once the rocket is lost
const keys = new Set();
const touchPitch = { west: false, east: false };
const demo = { t: 0, x: 0, y: 0, vx: 0, vy: 0 };

function updateShift() {
  if (scene) scene.setShift(mode === 'build' && innerWidth > 760 ? 198 : 0);
}

function setMode(next) {
  mode = next;
  document.body.dataset.mode = next;
  $('menu').hidden = next !== 'menu';
  $('builder').hidden = next !== 'build';
  $('hud').hidden = next !== 'flight';
  $('markers').hidden = next !== 'flight';
  updateShift();
  hideOverlay();
}

// ---------- mission select ----------

function showMenu() {
  flight = null;
  mission = null;
  setMode('menu');
  const list = $('mission-list');
  list.replaceChildren();
  ALL_MISSIONS.forEach((item, index) => {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    const done = save.done.includes(item.id);
    button.className = `mission-card${done ? ' done' : ''}`;
    const order = item === SANDBOX ? 'Open' : `Mission ${index + 1}`;
    button.innerHTML = `<span class="order"></span><span class="name"></span><span class="what"></span><span class="state"></span>`;
    button.children[0].textContent = order;
    button.children[1].textContent = item.title;
    button.children[2].textContent = item.goal;
    button.children[3].textContent = done ? 'Complete ✓' : 'Start →';
    button.addEventListener('click', () => { sound.start(); sound.click(); showBuilder(item); });
    li.append(button);
    list.append(li);
  });
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

// ---------- builder ----------

function showBuilder(item) {
  mission = item;
  design = cloneDesign(save.designs[item.id] || item.design);
  if (item.payload) design.payload = item.payload;
  setMode('build');
  $('builder-title').textContent = item.title;
  $('builder-goal').textContent = item.goal;
  $('builder-brief').textContent = item.brief;
  $('builder-brief').hidden = !item.brief;
  $('dv-note').textContent = DV_NOTE[item.id];
  const select = $('payload-select');
  select.replaceChildren(...Object.entries(PAYLOADS).map(([id, payload]) => new Option(payload.name, id)));
  select.disabled = Boolean(item.payload);
  scene.setMap(false);
  scene.view.blend = 0;
  scene.view.yaw = 0.6;
  scene.setTargetOrbit(0);
  renderBuilder(true);
}

function propStep(prop) {
  if (prop < 5000) return 250;
  if (prop < 20000) return 1000;
  if (prop < 100000) return 5000;
  return 10000;
}

function renderBuilder(reframe) {
  const info = analyze(design);
  $('payload-select').value = design.payload;
  $('payload-mass').textContent = tonnes(info.payload.mass);
  const list = $('stage-list');
  list.replaceChildren();
  // Listed from the top of the rocket down, as it stands.
  for (let i = design.stages.length - 1; i >= 0; i -= 1) {
    const stage = design.stages[i];
    const facts = info.stages[i];
    const card = document.createElement('div');
    card.className = 'stage-card';
    card.innerHTML = `
      <header><strong>Stage ${i + 1}</strong><button type="button" class="link-button" data-act="remove">Remove</button></header>
      <label class="row"><span>Engine</span><select data-act="engine" aria-label="Stage ${i + 1} engine"></select></label>
      <div class="row"><span>Engines</span><div class="stepper">
        <button type="button" data-act="count-" aria-label="Fewer engines">−</button><output></output><button type="button" data-act="count+" aria-label="More engines">+</button></div></div>
      <div class="row"><span>Propellant</span><div class="stepper">
        <button type="button" data-act="prop-" aria-label="Less propellant">−</button>
        <span class="unit"><input type="number" inputmode="decimal" min="0.25" max="600" step="0.25" aria-label="Stage ${i + 1} propellant in tonnes"></span>
        <button type="button" data-act="prop+" aria-label="More propellant">+</button></div></div>
      <p class="stage-facts"><span>Δv <b></b></span><span class="twr">Thrust ÷ weight <b></b></span><span>Burn <b></b></span></p>`;
    const select = card.querySelector('select');
    select.replaceChildren(...Object.entries(ENGINES).map(([id, engine]) => new Option(`${engine.name}: ${engine.role}, ${number(engine.thrust / 1000)} kN`, id)));
    select.value = stage.engine;
    card.querySelector('output').textContent = stage.count;
    const input = card.querySelector('input');
    input.value = stage.prop / 1000;
    const [dv, twr, burn] = card.querySelectorAll('.stage-facts b');
    dv.textContent = `${number(Math.round(facts.dv))} m/s`;
    twr.textContent = number(facts.twr, 2);
    burn.textContent = `${number(Math.round(facts.burnTime))} s`;
    card.querySelector('.twr').classList.toggle('bad', i === 0 && facts.twr <= 1);
    card.querySelector('[data-act="remove"]').hidden = design.stages.length < 2;
    card.addEventListener('click', (event) => {
      const act = event.target.closest('[data-act]')?.dataset.act;
      if (!act || act === 'engine') return;
      if (act === 'remove') design.stages.splice(i, 1);
      if (act === 'count-') stage.count = Math.max(1, stage.count - 1);
      if (act === 'count+') stage.count = Math.min(MAX_ENGINES, stage.count + 1);
      if (act === 'prop-') stage.prop = Math.max(250, stage.prop - propStep(stage.prop - 1));
      if (act === 'prop+') stage.prop = Math.min(600000, stage.prop + propStep(stage.prop));
      sound.click();
      designChanged(act === 'remove');
    });
    select.addEventListener('change', () => { stage.engine = select.value; designChanged(false); });
    input.addEventListener('change', () => {
      const value = Number(input.value);
      if (Number.isFinite(value) && value > 0) stage.prop = Math.min(600000, Math.max(250, value * 1000));
      designChanged(false);
    });
    list.append(card);
  }
  $('add-stage').hidden = design.stages.length >= MAX_STAGES;
  $('total-mass').textContent = tonnes(info.liftoffMass);
  $('total-dv').textContent = `${number(Math.round(info.totalDv))} m/s`;
  const need = DV_NEED[mission.id];
  $('dv-fill').style.width = `${Math.min(100, info.totalDv / 12000 * 100)}%`;
  $('dv-fill').classList.toggle('short', info.totalDv < need);
  $('dv-need').style.left = `${need / 12000 * 100}%`;
  $('builder-warning').textContent = info.canLiftOff ? '' : 'Too heavy to lift off: stage 1 needs more thrust than weight.';
  $('launch-button').disabled = !info.canLiftOff;
  flight = new Flight(design);
  scene.setRocket(info);
  $('total-height').textContent = `${number(scene.rocket.height, 1)} m`;
  if (reframe) scene.frameRocket();
  scene.autoRotate = 0.07;
}

function designChanged(reframe) {
  save.designs[mission.id] = cloneDesign(design);
  storeSave();
  renderBuilder(reframe);
}

$('payload-select').addEventListener('change', (event) => { design.payload = event.target.value; designChanged(true); });
$('add-stage').addEventListener('click', () => {
  const below = design.stages[design.stages.length - 1];
  design.stages.push({ engine: below.prop > 20000 ? 'halo' : 'wisp', count: 1, prop: Math.max(500, Math.round(below.prop / 4000) * 1000) });
  designChanged(true);
});
$('builder-reset').addEventListener('click', () => { design = cloneDesign(mission.design); designChanged(true); });
$('builder-back').addEventListener('click', showMenu);
$('launch-button').addEventListener('click', startFlight);

// ---------- flight ----------

function startFlight() {
  sound.start();
  flight = new Flight(design);
  setMode('flight');
  scene.setRocket(flight.info);
  scene.frameRocket();
  scene.setMap(false);
  scene.view.blend = 0;
  scene.view.yaw = 0.35;
  scene.autoRotate = 0;
  scene.setTargetOrbit(mission.target ? R_EARTH + mission.target : 0);
  power = 0;
  paused = false;
  missionDone = false;
  wreck = null;
  keys.clear();
  $('hud-title').textContent = mission.title;
  $('hud-goal').textContent = mission.goal;
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
  if (!flight || flight.over) return;
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

function handleEvents() {
  for (const event of flight.events.splice(0)) {
    if (event.type === 'liftoff') { scene.kick(0.6); showAlert('Liftoff', 'good', 2); }
    if (event.type === 'stage') { sound.thump(); scene.kick(0.5); hideAlert(); }
    if (event.type === 'burnout') showAlert(event.last ? 'Out of propellant' : 'Stage empty: press Space to drop it', event.last ? 'danger' : '', 6);
    if (event.type === 'space') showAlert('You are in space', 'good');
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

function completeMission() {
  missionDone = true;
  if (!save.done.includes(mission.id)) { save.done.push(mission.id); storeSave(); }
  document.querySelector('.hud-mission').classList.add('done');
  sound.success();
  const tel = flight.telemetry();
  const next = MISSIONS[MISSIONS.indexOf(mission) + 1] || SANDBOX;
  showOverlay({
    soft: true,
    title: 'Mission complete',
    text: mission.id === 'space' ? 'You crossed the edge of space. Staying up there is the next problem.' : 'You are in orbit: falling around the Earth, and missing it.',
    stats: [['Time', duration(flight.t - flight.liftoffTime)], ['Altitude', distance(tel.altitude)], ['Δv left', `${number(Math.round(tel.dv))} m/s`]],
    actions: [
      { label: 'Keep flying', run: hideOverlay },
      { label: `Next: ${next.title}`, primary: true, run: () => showBuilder(next) }
    ]
  });
}

function showWreck() {
  const reasons = {
    crashed: `Hit the ground at ${number(Math.round(wreck.speed))} m/s.`,
    breakup: 'The airflow tore the rocket apart. Low down, keep the nose along your path.',
    burnup: 'Burned up coming back into the atmosphere.'
  };
  showOverlay({
    title: missionDone ? 'Flight over' : 'Rocket lost',
    text: reasons[wreck.type],
    actions: [
      { label: 'Missions', run: showMenu },
      { label: 'Change the rocket', run: () => showBuilder(mission) },
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
      { label: 'Missions', run: showMenu },
      { label: 'Change the rocket', run: () => showBuilder(mission) },
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
  const launched = flight.liftoffTime !== null;
  $('hud-time').textContent = launched ? `T+ ${duration(flight.t - flight.liftoffTime)}` : 'T− 00:00';
  $('warp-value').textContent = `${number(flight.warp)}×`;
  $('warp-value').classList.toggle('fast', flight.warp > MAX_PHYSICS_WARP);
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
      if (!missionDone && !flight.over && mission.done(flight, tel)) completeMission();
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
      orbit: tel.orbit, showRocket: !flight.over
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
  showBuilder, startFlight, MISSIONS,
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
