import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js';

const ui = {
    startBtn: document.getElementById('startBtn'),
    addBtn: document.getElementById('addBtn'),
    resetBtn: document.getElementById('resetBtn'),
    controlsToggle: document.getElementById('controlsToggle'),
    controlsPanel: document.getElementById('controlsPanel'),
    controlsClose: document.getElementById('controlsClose'),
    fullscreenBtn: document.getElementById('fullscreenBtn'),
    cameraSelect: document.getElementById('cameraSelect'),
    statusMetrics: document.getElementById('statusMetrics'),
    boundaryModeSelect: document.getElementById('boundaryModeSelect'),
    sensitivityRange: document.getElementById('sensitivityRange'),
    sensitivityValue: document.getElementById('sensitivityValue'),
    gravityRange: document.getElementById('gravityRange'),
    gravityValue: document.getElementById('gravityValue'),
    airDragRange: document.getElementById('airDragRange'),
    airDragValue: document.getElementById('airDragValue'),
    massRange: document.getElementById('massRange'),
    massValue: document.getElementById('massValue'),
    stage: document.getElementById('stage'),
    video: document.getElementById('camera'),
    canvas: document.getElementById('renderCanvas'),
    tipCanvas: document.getElementById('tipCanvas'),
    physicsDetails: document.getElementById('physicsDetails'),
    hud: document.querySelector('.hud'),
    showHudCheckbox: document.getElementById('showHudCheckbox'),
    selectionOverlay: document.getElementById('selectionOverlay'),
    removeTargetBtn: document.getElementById('removeTargetBtn'),
    cancelTargetBtn: document.getElementById('cancelTargetBtn')
};

function openControls() {
    ui.controlsPanel.classList.add('open');
    ui.controlsToggle.style.display = 'none';
}

function closeControls() {
    ui.controlsPanel.classList.remove('open');
    ui.controlsToggle.style.display = '';
}

const userAgent = navigator.userAgent || '';
const isTouchAppleDevice = /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafariBrowser = /Safari/i.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Android/i.test(userAgent);
const prefersPseudoFullscreen = isTouchAppleDevice && isSafariBrowser;

function isPseudoFullscreenActive() {
    return ui.stage.classList.contains('pseudo-fullscreen');
}

function isNativeFullscreenActive() {
    return document.fullscreenElement === ui.stage ||
        document.fullscreenElement === ui.video ||
        document.webkitFullscreenElement === ui.stage ||
        document.webkitFullscreenElement === ui.video;
}

function isFullscreenActive() {
    return isNativeFullscreenActive() || isPseudoFullscreenActive();
}

function setPseudoFullscreen(active) {
    ui.stage.classList.toggle('pseudo-fullscreen', active);
    document.documentElement.classList.toggle('ball-fullscreen-lock', active);
    document.body.classList.toggle('ball-fullscreen-lock', active);
    if (active) {
        window.scrollTo(0, 0);
    }
}

function scheduleResizeStage() {
    resizeStage();
    requestAnimationFrame(() => {
        resizeStage();
        requestAnimationFrame(resizeStage);
    });
}

function updateFullscreenUI() {
    const active = isFullscreenActive();
    ui.fullscreenBtn.innerHTML = active ? '&#x2716;' : '&#x26F6;';
    ui.fullscreenBtn.setAttribute('aria-label', active ? 'Exit full screen' : 'Enter full screen');
    ui.fullscreenBtn.setAttribute('title', active ? 'Exit full screen' : 'Enter full screen');
    scheduleResizeStage();
}

async function toggleFullscreen() {
    const requestFullscreen = ui.stage.requestFullscreen || ui.stage.webkitRequestFullscreen || ui.stage.webkitRequestFullScreen;
    const exitFullscreen = document.exitFullscreen || document.webkitExitFullscreen || document.webkitCancelFullScreen;

    if (isPseudoFullscreenActive()) {
        setPseudoFullscreen(false);
        updateFullscreenUI();
        return;
    }

    if (isNativeFullscreenActive()) {
        if (exitFullscreen) {
            try {
                await exitFullscreen.call(document);
            } catch (error) {
                console.warn('Failed to exit native fullscreen:', error);
            }
        }
        return;
    }

    if (prefersPseudoFullscreen || !requestFullscreen) {
        setPseudoFullscreen(true);
        updateFullscreenUI();
        return;
    }

    try {
        await requestFullscreen.call(ui.stage);
    } catch (error) {
        console.warn('Native fullscreen request failed. Falling back to pseudo fullscreen.', error);
        setPseudoFullscreen(true);
        updateFullscreenUI();
    }
}

// Default open on wide screens
if (window.innerWidth >= 900) {
    ui.physicsDetails.open = true;
}

const state = {
    running: false,
    lastFrameTime: 0,
    fps: 0,
    handLandmarker: null,
    stream: null,
    lastVideoTime: -1,
    lastHands: [],
    handsCount: 0,
    tipCount: 0,
    trackedTips: [],
    contactsCount: 0,
    boundaryMode: 'walls',
    sensitivity: 1.0,
    gravity: 0.0,
    airDrag: 0.0,
    mass: 1.0,
    statusMessage: 'Camera is off.',
    nextTrackingErrorReportAt: 0
};

let filesetResolverCtor = null;
let handLandmarkerCtor = null;

const LOCAL_MEDIAPIPE_BASE = new URL('./ball_assets/mediapipe/tasks-vision-0.10.32', import.meta.url).href;
const LOCAL_MODEL_PATH = new URL('./ball_assets/models/hand_landmarker.task', import.meta.url).href;
let mediapipeWasmBaseUrl = `${LOCAL_MEDIAPIPE_BASE}/wasm`;

const MEDIAPIPE_SOURCES = [
    {
        label: 'local-module',
        url: `${LOCAL_MEDIAPIPE_BASE}/vision_bundle.mjs`,
        wasmBase: `${LOCAL_MEDIAPIPE_BASE}/wasm`
    },
    {
        label: 'unpkg-module',
        url: 'https://unpkg.com/@mediapipe/tasks-vision@0.10.32/vision_bundle.mjs',
        wasmBase: 'https://unpkg.com/@mediapipe/tasks-vision@0.10.32/wasm'
    }
];

function isLocalLoopbackHost() {
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname);
}

function extractVisionApi(moduleNamespace) {
    const candidates = [
        moduleNamespace,
        moduleNamespace && moduleNamespace.default
    ];
    for (const candidate of candidates) {
        if (candidate && candidate.FilesetResolver && candidate.HandLandmarker) {
            return {
                filesetResolver: candidate.FilesetResolver,
                handLandmarker: candidate.HandLandmarker
            };
        }
    }
    return null;
}

async function ensureHandTrackingDeps() {
    if (filesetResolverCtor && handLandmarkerCtor) {
        return;
    }

    const errors = [];

    for (const source of MEDIAPIPE_SOURCES) {
        try {
            const moduleNamespace = await import(source.url);

            const api = extractVisionApi(moduleNamespace);
            if (!api) {
                errors.push(`${source.label}: API missing`);
                continue;
            }

            filesetResolverCtor = api.filesetResolver;
            handLandmarkerCtor = api.handLandmarker;
            mediapipeWasmBaseUrl = source.wasmBase;
            return;
        } catch (error) {
            const message = error && error.message ? error.message : String(error);
            errors.push(`${source.label}: ${message}`);
        }
    }

    throw new Error(`Unable to load MediaPipe hand tracker. ${errors.join(' | ')}`);
}

// --- Multi-sphere architecture ---

const SPHERE_RADIUS = 0.18;
const PLANE_Z = 0;
const MAX_SPHERES = 3;
const IDEAL_WALL_RESTITUTION = 1.0;
const IDEAL_SPHERE_RESTITUTION = 1.0;
const PHYSICS_SUBSTEPS = 3;
const COLLISION_SOLVER_POSITION_ITERATIONS = 6;
const COLLISION_SEPARATION_EPSILON = SPHERE_RADIUS * 0.004;

const SPHERE_COLORS = [
    0x22d3ee, // cyan
    0xf472b6, // pink
    0xa78bfa, // purple
    0xfbbf24, // amber
    0x34d399, // emerald
    0xfb923c  // orange
];

// Emissive colors (darker tint of each sphere color)
const SPHERE_EMISSIVES = [
    0x052f40,
    0x3d1028,
    0x1e1540,
    0x3d2e08,
    0x0a3020,
    0x3d1e08
];

const spheres = [];

// Shared geometry and wireframe material (reused across all spheres)
const sharedSphereGeometry = new THREE.SphereGeometry(SPHERE_RADIUS, 36, 28);
const sharedWireMaterial = new THREE.MeshBasicMaterial({
    color: 0x00131c,
    wireframe: true,
    transparent: true,
    opacity: 0.25
});

const FINGERTIP_POINTS = [4, 8, 12, 16, 20];
const PALM_LANDMARKS = [0, 5, 9, 13, 17]; // wrist + MCP joints

// Hand skeleton connections for visual feedback
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
];

// velocityTransfer: fraction of hand approach speed added as impulse on first contact
const REAL_INTERACTION_PROFILE = {
    contactRadius: 0.15,
    spring: 112,
    damping: 6.4,
    correction: 0.64,
    restitution: 0.9,
    stickPull: 0,
    stickCapture: 0,
    maxSpeed: 3.2,
    velocityTransfer: 0.58
};

const scene = new THREE.Scene();
const camera3d = new THREE.PerspectiveCamera(52, 1, 0.01, 20);
camera3d.position.set(0, 0, 2.2);
scene.add(camera3d);

const renderer = new THREE.WebGLRenderer({
    canvas: ui.canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
});
const tipCtx = ui.tipCanvas.getContext('2d', { alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

scene.add(new THREE.HemisphereLight(0xb8f7ff, 0x091321, 1.05));
const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
keyLight.position.set(1.4, 1.6, 2.0);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.8);
rimLight.position.set(-1.4, -0.4, -1.0);
scene.add(rimLight);

const scratch = {
    rayPoint: new THREE.Vector3(),
    rayDir: new THREE.Vector3(),
    tipWorld: new THREE.Vector3(),
    gripWorld: new THREE.Vector3(),
    normal: new THREE.Vector3()
};

// Per-landmark position/velocity history for fingertip velocity tracking
const tipHistory = new Map();
// Tracks which tip keys were in contact last frame (for first-contact impulse)
// Keyed by "${tipKey}:${sphereIndex}" to track per-sphere contacts
const activeContacts = new Set();
const handGripStates = new Map();

function renderHudInfo() {
    const fpsText = state.running ? state.fps.toFixed(0) : '--';
    ui.statusMetrics.textContent =
        `${state.statusMessage} | FPS: ${fpsText} | Hands: ${state.handsCount} | Tips: ${state.tipCount} | Contacts: ${state.contactsCount} | Spheres: ${spheres.length}`;
}

function setStatus(message, isError = false) {
    state.statusMessage = message;
    ui.statusMetrics.classList.toggle('status-error', isError);
    renderHudInfo();
}

function getInteractionProfile() {
    const base = REAL_INTERACTION_PROFILE;
    const s = Math.max(0.6, Math.min(2.0, state.sensitivity));
    const sensitivityNorm = (s - 0.6) / 1.4;
    const powerScale = 0.75 + (0.9 * sensitivityNorm);
    const rangeScale = 0.9 + (0.2 * sensitivityNorm);
    return {
        contactRadius: base.contactRadius * rangeScale,
        spring: base.spring * powerScale,
        damping: base.damping,
        correction: base.correction,
        airDrag: Math.max(0, Math.min(1.0, state.airDrag)),
        restitution: base.restitution,
        stickPull: base.stickPull,
        stickCapture: base.stickCapture,
        maxSpeed: base.maxSpeed,
        velocityTransfer: base.velocityTransfer * powerScale
    };
}

function updateBoundaryModeUI() {
    ui.stage.setAttribute('data-boundary-mode', state.boundaryMode);
}

function updateSensitivityLabel() {
    ui.sensitivityValue.textContent = `${state.sensitivity.toFixed(1)}x`;
}

function updateGravityLabel() {
    ui.gravityValue.textContent = `${state.gravity.toFixed(2)}g`;
}

function updateAirDragLabel() {
    ui.airDragValue.textContent = state.airDrag.toFixed(2);
}

function updateMassLabel() {
    ui.massValue.textContent = `${state.mass.toFixed(1)} kg`;
}

function updateMetrics() {
    renderHudInfo();
}

function updateAddBtnState() {
    ui.addBtn.disabled = !state.running || spheres.length >= MAX_SPHERES;
}

function updateStartButtonState() {
    const isRunning = state.running;
    ui.startBtn.textContent = isRunning ? 'Stop Camera' : 'Start Camera';
    ui.startBtn.setAttribute('aria-label', isRunning ? 'Stop camera' : 'Start camera');
}

function resizeStage() {
    const rect = ui.stage.getBoundingClientRect();
    if (!rect.width || !rect.height) {
        return;
    }

    renderer.setSize(rect.width, rect.height, false);
    camera3d.aspect = rect.width / rect.height;
    camera3d.updateProjectionMatrix();

    ui.tipCanvas.width = Math.max(1, Math.round(rect.width));
    ui.tipCanvas.height = Math.max(1, Math.round(rect.height));
    if (tipCtx) {
        tipCtx.clearRect(0, 0, ui.tipCanvas.width, ui.tipCanvas.height);
    }
}

function getViewBounds() {
    const depth = camera3d.position.z - PLANE_Z;
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera3d.fov * 0.5)) * depth;
    const halfWidth = halfHeight * camera3d.aspect;
    return { halfWidth, halfHeight };
}

function createSphere(colorIndex) {
    const material = new THREE.MeshStandardMaterial({
        color: SPHERE_COLORS[colorIndex],
        emissive: SPHERE_EMISSIVES[colorIndex],
        emissiveIntensity: 1.0,
        metalness: 0.22,
        roughness: 0.22,
        transparent: true,
        opacity: 0.9
    });
    const mesh = new THREE.Mesh(sharedSphereGeometry, material);
    const wire = new THREE.Mesh(sharedSphereGeometry, sharedWireMaterial);
    const group = new THREE.Group();
    group.add(mesh, wire);

    return {
        group,
        material,
        position: new THREE.Vector3(0, 0, PLANE_Z),
        spawnPosition: new THREE.Vector3(0, 0, PLANE_Z),
        velocity: new THREE.Vector3(0, 0, 0),
        contactCount: 0
    };
}

function addSphere() {
    if (spheres.length >= MAX_SPHERES) {
        return;
    }

    const colorIndex = spheres.length % SPHERE_COLORS.length;
    const sphere = createSphere(colorIndex);

    // Place at random position within inner 60% of view bounds
    const bounds = getViewBounds();
    const rangeX = bounds.halfWidth * 0.6;
    const rangeY = bounds.halfHeight * 0.6;
    sphere.position.set(
        (Math.random() * 2 - 1) * rangeX,
        (Math.random() * 2 - 1) * rangeY,
        PLANE_Z
    );
    sphere.spawnPosition.copy(sphere.position);
    sphere.group.position.copy(sphere.position);

    scene.add(sphere.group);
    spheres.push(sphere);
    updateAddBtnState();

    const count = spheres.length;
    setStatus(`Sphere ${count} added.${count < MAX_SPHERES ? ' Add more or start pushing!' : ' Max reached.'}`);
}

function resetAll() {
    if (spheres.length === 0) {
        setStatus('No spheres to reset. Press "Add Sphere" to create one.');
        return;
    }

    deselectSphere();
    for (const sphere of spheres) {
        sphere.position.copy(sphere.spawnPosition);
        sphere.velocity.set(0, 0, 0);
        sphere.contactCount = 0;
        sphere.group.position.set(sphere.position.x, sphere.position.y, PLANE_Z);
        sphere.group.rotation.set(0, 0, 0);
    }
    activeContacts.clear();
    tipHistory.clear();
    handGripStates.clear();
    releaseHandSuppression.clear();
    updateAddBtnState();
    setStatus(`Motion reset. Spheres restored to their starting positions.`);
}

function landmarkToPlane(landmark, out) {
    const ndcX = (landmark.x * 2) - 1;
    const ndcY = -((landmark.y * 2) - 1);

    scratch.rayPoint.set(ndcX, ndcY, 0.5).unproject(camera3d);
    scratch.rayDir.copy(scratch.rayPoint).sub(camera3d.position);

    if (Math.abs(scratch.rayDir.z) < 0.0001) {
        return false;
    }

    const t = (PLANE_Z - camera3d.position.z) / scratch.rayDir.z;
    if (!Number.isFinite(t) || t < 0) {
        return false;
    }

    out.copy(camera3d.position).addScaledVector(scratch.rayDir, t);
    return true;
}

const tipPool = [];
let tipPoolIndex = 0;
const seenKeys = new Set();
function getTipObject() {
    if (tipPoolIndex >= tipPool.length) {
        tipPool.push({ key: '', x: 0, y: 0, worldX: 0, worldY: 0, velX: 0, velY: 0 });
    }
    return tipPool[tipPoolIndex++];
}

function trackPoint(key, landmark, now, tips) {
    if (!landmarkToPlane(landmark, scratch.tipWorld)) {
        return;
    }

    const worldX = scratch.tipWorld.x;
    const worldY = scratch.tipWorld.y;

    let velX = 0;
    let velY = 0;
    const prev = tipHistory.get(key);
    if (prev) {
        const elapsed = (now - prev.time) / 1000;
        if (elapsed > 0 && elapsed < 0.12) {
            const rawVelX = (worldX - prev.worldX) / elapsed;
            const rawVelY = (worldY - prev.worldY) / elapsed;
            // EMA smoothing to reduce landmark noise
            const alpha = 0.55;
            velX = prev.velX !== undefined
                ? alpha * rawVelX + (1 - alpha) * prev.velX
                : rawVelX;
            velY = prev.velY !== undefined
                ? alpha * rawVelY + (1 - alpha) * prev.velY
                : rawVelY;
        }
    }

    tipHistory.set(key, { worldX, worldY, velX, velY, time: now });
    const tipObj = getTipObject();
    tipObj.key = key;
    tipObj.x = landmark.x;
    tipObj.y = landmark.y;
    tipObj.worldX = worldX;
    tipObj.worldY = worldY;
    tipObj.velX = velX;
    tipObj.velY = velY;
    tips.push(tipObj);
}

function getPalmLandmark(hand) {
    let palmX = 0;
    let palmY = 0;
    let palmZ = 0;
    let palmCount = 0;
    for (let i = 0; i < PALM_LANDMARKS.length; i++) {
        const lmIndex = PALM_LANDMARKS[i];
        const lm = hand[lmIndex];
        if (!lm) {
            continue;
        }
        palmX += lm.x;
        palmY += lm.y;
        palmZ += lm.z || 0;
        palmCount += 1;
    }
    if (palmCount < 3) {
        return null;
    }
    return {
        x: palmX / palmCount,
        y: palmY / palmCount,
        z: palmZ / palmCount
    };
}

function collectTrackedTips() {
    const now = performance.now();
    const tips = [];
    seenKeys.clear();
    tipPoolIndex = 0;

    for (let handIndex = 0; handIndex < state.lastHands.length; handIndex++) {
        const hand = state.lastHands[handIndex];
        // Fingertips
        for (let i = 0; i < FINGERTIP_POINTS.length; i++) {
            const tipIndex = FINGERTIP_POINTS[i];
            const landmark = hand[tipIndex];
            if (!landmark) {
                continue;
            }
            const key = `${handIndex}-${tipIndex}`;
            seenKeys.add(key);
            trackPoint(key, landmark, now, tips);
        }

        const palmLandmark = getPalmLandmark(hand);
        if (palmLandmark) {
            const key = `${handIndex}-palm`;
            seenKeys.add(key);
            trackPoint(key, palmLandmark, now, tips);
        }
    }

    // Prune history for landmarks no longer visible
    for (const k of tipHistory.keys()) {
        if (!seenKeys.has(k)) {
            tipHistory.delete(k);
        }
    }

    return tips;
}

function drawTrackedTips() {
    if (!tipCtx) {
        return;
    }
    const width = ui.tipCanvas.width;
    const height = ui.tipCanvas.height;
    tipCtx.clearRect(0, 0, width, height);

    // Draw hand skeleton for each detected hand
    for (let handIndex = 0; handIndex < state.lastHands.length; handIndex++) {
        const hand = state.lastHands[handIndex];
        tipCtx.lineWidth = 1.5;
        tipCtx.strokeStyle = 'rgba(34, 197, 94, 0.4)';
        tipCtx.lineJoin = 'round';
        for (let c = 0; c < HAND_CONNECTIONS.length; c++) {
            const conn = HAND_CONNECTIONS[c];
            const lmA = hand[conn[0]];
            const lmB = hand[conn[1]];
            if (!lmA || !lmB) {
                continue;
            }
            tipCtx.beginPath();
            tipCtx.moveTo(lmA.x * width, lmA.y * height);
            tipCtx.lineTo(lmB.x * width, lmB.y * height);
            tipCtx.stroke();
        }

        // Joint dots
        tipCtx.fillStyle = 'rgba(34, 197, 94, 0.55)';
        for (let i = 0; i < hand.length; i++) {
            const lm = hand[i];
            if (!lm) {
                continue;
            }
            tipCtx.beginPath();
            tipCtx.arc(lm.x * width, lm.y * height, 3, 0, Math.PI * 2);
            tipCtx.fill();
        }
    }

    // Highlighted fingertip and palm circles
    tipCtx.lineWidth = 2.5;
    tipCtx.strokeStyle = '#22c55e';
    tipCtx.fillStyle = 'rgba(34, 197, 94, 0.22)';
    for (let i = 0; i < state.trackedTips.length; i++) {
        const tip = state.trackedTips[i];
        const x = tip.x * width;
        const y = tip.y * height;
        const isPalm = tip.key.endsWith('-palm');
        const radius = isPalm ? 18 : 12;
        tipCtx.beginPath();
        tipCtx.arc(x, y, radius, 0, Math.PI * 2);
        tipCtx.fill();
        tipCtx.stroke();
    }
}

const newContacts = new Set();
const frameGrippedSpheres = new Set();
const releaseHandSuppression = new Map();
const GRIP_CAPTURE_RADIUS = SPHERE_RADIUS * 2.45;
const GRIP_FINGER_PROXIMITY_RADIUS = SPHERE_RADIUS * 1.95;
const GRIP_MIN_FINGERS_NEAR = 2;
const GRIP_CAPTURE_FRAMES = 1;
const GRIP_RELEASE_FRAMES = 2;
const GRIP_TRACK_LOST_GRACE_FRAMES = 6;
const GRIP_MIN_CLOSED_FINGERS = 4;
const GRIP_MIN_OPEN_FINGERS = 3;
const GRIP_PRECAPTURE_MIN_CLOSED_FINGERS = 3;
const GRIP_PRECAPTURE_MIN_FINGERS_NEAR = 2;
const GRIP_MAX_HOLD_SPEED = 5.5;
const GRIP_MEMORY_DAMPING = 0.9;
const GRIP_CARRY_VELOCITY_ALPHA = 0.4;
const GRIP_RELEASE_DEADZONE_SPEED = 0.12;
const GRIP_RELEASE_SUPPRESSION_SECONDS = 0.30;
const GRIP_RELEASE_RAMP_SECONDS = 0.24;
const PUSH_LOOKAHEAD_SECONDS = 0.05;
const PUSH_RADIUS_BOOST_MAX = SPHERE_RADIUS * 0.7;
const PUSH_SHELL_FORCE_SCALE = 0.32;
const PUSH_MIN_APPROACH_SPEED = 0.03;
const PALM_CONTACT_RADIUS_SCALE = 1.55;
const PALM_LOOKAHEAD_SCALE = 1.35;
const PALM_RADIUS_BOOST_SCALE = 1.4;
const PALM_SHELL_FORCE_SCALE_MIN = 0.55;
const PALM_FORCE_SCALE = 1.18;
const PALM_MIN_APPROACH_SPEED_SCALE = 0.55;
const PALM_IMPULSE_SCALE = 1.12;
const PALM_IDLE_SUPPRESS_MIN_OPEN_FINGERS = 4;
const PALM_IDLE_SUPPRESS_MAX_SPEED = 0.18;
const FINGER_OPEN_RATIO = {
    4: 0.92,
    8: 1.02,
    12: 1.04,
    16: 1.0,
    20: 0.95
};
const FINGER_CLOSED_RATIO = {
    4: 0.72,
    8: 0.82,
    12: 0.84,
    16: 0.81,
    20: 0.78
};

function getOrCreateHandGripState(handKey) {
    let gripState = handGripStates.get(handKey);
    if (!gripState) {
        gripState = {
            sphere: null,
            closedFrames: 0,
            openFrames: 0,
            lostFrames: 0,
            lastGripX: 0,
            lastGripY: 0,
            lastVelX: 0,
            lastVelY: 0,
            carryVelX: 0,
            carryVelY: 0
        };
        handGripStates.set(handKey, gripState);
    }
    return gripState;
}

function clearGripState(gripState) {
    if (!gripState) {
        return;
    }
    gripState.sphere = null;
    gripState.closedFrames = 0;
    gripState.openFrames = 0;
    gripState.lostFrames = 0;
    gripState.lastVelX = 0;
    gripState.lastVelY = 0;
    gripState.carryVelX = 0;
    gripState.carryVelY = 0;
}

function updateReleaseHandSuppression(dt) {
    for (const [sphere, age] of releaseHandSuppression) {
        if (!spheres.includes(sphere)) {
            releaseHandSuppression.delete(sphere);
            continue;
        }
        const nextAge = age + dt;
        if (nextAge >= GRIP_RELEASE_SUPPRESSION_SECONDS + GRIP_RELEASE_RAMP_SECONDS) {
            releaseHandSuppression.delete(sphere);
        } else {
            releaseHandSuppression.set(sphere, nextAge);
        }
    }
}

function getReleaseHandInfluenceScale(sphere) {
    const age = releaseHandSuppression.get(sphere);
    if (age === undefined) {
        return 1;
    }
    if (age < GRIP_RELEASE_SUPPRESSION_SECONDS) {
        return 0;
    }
    const rampElapsed = age - GRIP_RELEASE_SUPPRESSION_SECONDS;
    return Math.min(1, rampElapsed / Math.max(0.0001, GRIP_RELEASE_RAMP_SECONDS));
}

function applyReleaseVelocity(gripState) {
    const sphere = gripState && gripState.sphere;
    if (!sphere) {
        return;
    }
    let releaseVelX = gripState.carryVelX;
    let releaseVelY = gripState.carryVelY;
    const releaseSpeed = Math.hypot(releaseVelX, releaseVelY);
    if (releaseSpeed < GRIP_RELEASE_DEADZONE_SPEED) {
        releaseVelX = 0;
        releaseVelY = 0;
    } else if (releaseSpeed > GRIP_MAX_HOLD_SPEED) {
        const scale = GRIP_MAX_HOLD_SPEED / releaseSpeed;
        releaseVelX *= scale;
        releaseVelY *= scale;
    }
    sphere.velocity.x = releaseVelX;
    sphere.velocity.y = releaseVelY;
    releaseHandSuppression.set(sphere, 0);
}

function releaseGripState(gripState, applyVelocity = true) {
    if (!gripState) {
        return;
    }
    if (applyVelocity && gripState.sphere) {
        applyReleaseVelocity(gripState);
    }
    clearGripState(gripState);
}

function clearGripReferencesToSphere(targetSphere) {
    for (const gripState of handGripStates.values()) {
        if (gripState.sphere === targetSphere) {
            clearGripState(gripState);
        }
    }
    releaseHandSuppression.delete(targetSphere);
}

function analyzeHandGripPose(hand) {
    const palmLandmark = getPalmLandmark(hand);
    const indexMcp = hand[5];
    const pinkyMcp = hand[17];
    if (!palmLandmark || !indexMcp || !pinkyMcp) {
        return null;
    }

    const palmScale = Math.hypot(indexMcp.x - pinkyMcp.x, indexMcp.y - pinkyMcp.y);
    if (palmScale < 0.01) {
        return null;
    }

    let openCount = 0;
    let closedCount = 0;
    for (let i = 0; i < FINGERTIP_POINTS.length; i++) {
        const tipIndex = FINGERTIP_POINTS[i];
        const tip = hand[tipIndex];
        if (!tip) {
            return null;
        }
        const distToPalm = Math.hypot(tip.x - palmLandmark.x, tip.y - palmLandmark.y);
        if (distToPalm >= palmScale * FINGER_OPEN_RATIO[tipIndex]) {
            openCount += 1;
        }
        if (distToPalm <= palmScale * FINGER_CLOSED_RATIO[tipIndex]) {
            closedCount += 1;
        }
    }

    return {
        palmLandmark,
        openCount,
        closedCount,
        isMostlyOpen: openCount >= GRIP_MIN_OPEN_FINGERS,
        isMostlyClosed: closedCount >= GRIP_MIN_CLOSED_FINGERS
    };
}

function countFingertipsNearSphere(hand, sphere, radius) {
    let nearCount = 0;
    for (let i = 0; i < FINGERTIP_POINTS.length; i++) {
        const tipIndex = FINGERTIP_POINTS[i];
        const tip = hand[tipIndex];
        if (!tip || !landmarkToPlane(tip, scratch.tipWorld)) {
            continue;
        }
        const dist = Math.hypot(
            sphere.position.x - scratch.tipWorld.x,
            sphere.position.y - scratch.tipWorld.y
        );
        if (dist <= radius) {
            nearCount += 1;
        }
    }
    return nearCount;
}

function holdSphereAtWorld(sphere, worldX, worldY, velX, velY) {
    const clampedVelX = Math.max(-GRIP_MAX_HOLD_SPEED, Math.min(GRIP_MAX_HOLD_SPEED, velX || 0));
    const clampedVelY = Math.max(-GRIP_MAX_HOLD_SPEED, Math.min(GRIP_MAX_HOLD_SPEED, velY || 0));
    sphere.position.x = worldX;
    sphere.position.y = worldY;
    sphere.velocity.x = clampedVelX;
    sphere.velocity.y = clampedVelY;
    sphere.group.position.set(worldX, worldY, PLANE_Z);
    sphere.contactCount += 1;
    return true;
}

function holdSphereWithHand(sphere, handIndex, palmLandmark, gripState) {
    if (!landmarkToPlane(palmLandmark, scratch.gripWorld)) {
        return false;
    }

    const palmTipData = tipHistory.get(`${handIndex}-palm`);
    let velX = 0;
    let velY = 0;
    if (palmTipData) {
        velX = palmTipData.velX;
        velY = palmTipData.velY;
    }

    if (gripState) {
        gripState.carryVelX = (gripState.carryVelX * (1 - GRIP_CARRY_VELOCITY_ALPHA)) + (velX * GRIP_CARRY_VELOCITY_ALPHA);
        gripState.carryVelY = (gripState.carryVelY * (1 - GRIP_CARRY_VELOCITY_ALPHA)) + (velY * GRIP_CARRY_VELOCITY_ALPHA);
        gripState.lostFrames = 0;
        gripState.lastGripX = scratch.gripWorld.x;
        gripState.lastGripY = scratch.gripWorld.y;
        gripState.lastVelX = gripState.carryVelX;
        gripState.lastVelY = gripState.carryVelY;
    }
    return holdSphereAtWorld(sphere, scratch.gripWorld.x, scratch.gripWorld.y, gripState ? gripState.carryVelX : velX, gripState ? gripState.carryVelY : velY);
}

function holdSphereFromMemory(gripState, dt) {
    if (!gripState || !gripState.sphere) {
        return false;
    }
    const predictedX = gripState.lastGripX + (gripState.lastVelX * dt);
    const predictedY = gripState.lastGripY + (gripState.lastVelY * dt);
    gripState.lastGripX = predictedX;
    gripState.lastGripY = predictedY;
    gripState.lastVelX *= GRIP_MEMORY_DAMPING;
    gripState.lastVelY *= GRIP_MEMORY_DAMPING;
    gripState.carryVelX = gripState.lastVelX;
    gripState.carryVelY = gripState.lastVelY;
    return holdSphereAtWorld(
        gripState.sphere,
        predictedX,
        predictedY,
        gripState.lastVelX,
        gripState.lastVelY
    );
}

function applyTipForces(dt, profile) {
    frameGrippedSpheres.clear();
    updateReleaseHandSuppression(dt);
    if (spheres.length === 0) {
        handGripStates.clear();
        releaseHandSuppression.clear();
        return 0;
    }

    let totalContacts = 0;
    newContacts.clear();

    const precaptureSpheres = new Set();
    const visibleHands = new Set();
    const idleOpenPalmHands = new Set();
    for (let handIndex = 0; handIndex < state.lastHands.length; handIndex++) {
        const handKey = String(handIndex);
        visibleHands.add(handKey);
        const gripState = getOrCreateHandGripState(handKey);
        gripState.lostFrames = 0;
        const hand = state.lastHands[handIndex];
        const gripPose = analyzeHandGripPose(hand);
        if (!gripPose) {
            const fallbackPalm = getPalmLandmark(hand);
            if (gripState && gripState.sphere && fallbackPalm) {
                if (holdSphereWithHand(gripState.sphere, handIndex, fallbackPalm, gripState)) {
                    frameGrippedSpheres.add(gripState.sphere);
                }
            } else if (gripState && gripState.sphere) {
                gripState.lostFrames += 1;
                if (gripState.lostFrames <= GRIP_TRACK_LOST_GRACE_FRAMES && holdSphereFromMemory(gripState, dt)) {
                    frameGrippedSpheres.add(gripState.sphere);
                } else {
                    releaseGripState(gripState);
                }
            }
            continue;
        }

        if (
            gripState.sphere &&
            (gripState.sphere === state.selectedSphere || !spheres.includes(gripState.sphere) || frameGrippedSpheres.has(gripState.sphere))
        ) {
            clearGripState(gripState);
        }

        const palmTipData = tipHistory.get(`${handIndex}-palm`);
        const palmSpeed = palmTipData ? Math.hypot(palmTipData.velX, palmTipData.velY) : 0;
        if (
            !gripState.sphere &&
            gripPose.openCount >= PALM_IDLE_SUPPRESS_MIN_OPEN_FINGERS &&
            palmSpeed <= PALM_IDLE_SUPPRESS_MAX_SPEED
        ) {
            idleOpenPalmHands.add(handKey);
        }

        if (gripState.sphere) {
            if (gripPose.isMostlyOpen) {
                gripState.openFrames += 1;
            } else {
                gripState.openFrames = 0;
            }

            if (gripState.openFrames >= GRIP_RELEASE_FRAMES) {
                releaseGripState(gripState);
            } else if (holdSphereWithHand(gripState.sphere, handIndex, gripPose.palmLandmark, gripState)) {
                frameGrippedSpheres.add(gripState.sphere);
            }
            continue;
        }

        if (!landmarkToPlane(gripPose.palmLandmark, scratch.gripWorld)) {
            gripState.closedFrames = 0;
            continue;
        }

        let closestSphere = null;
        let minDist = GRIP_CAPTURE_RADIUS;
        let precaptureSphere = null;
        let precaptureDist = GRIP_CAPTURE_RADIUS;
        for (let si = 0; si < spheres.length; si++) {
            const sphere = spheres[si];
            if (sphere === state.selectedSphere || frameGrippedSpheres.has(sphere)) {
                continue;
            }
            const dist = Math.hypot(
                sphere.position.x - scratch.gripWorld.x,
                sphere.position.y - scratch.gripWorld.y
            );
            if (dist >= GRIP_CAPTURE_RADIUS) {
                continue;
            }

            const fingertipsNear = countFingertipsNearSphere(hand, sphere, GRIP_FINGER_PROXIMITY_RADIUS);
            if (gripPose.closedCount >= GRIP_PRECAPTURE_MIN_CLOSED_FINGERS && fingertipsNear >= GRIP_PRECAPTURE_MIN_FINGERS_NEAR && dist < precaptureDist) {
                precaptureDist = dist;
                precaptureSphere = sphere;
            }
            if (fingertipsNear >= GRIP_MIN_FINGERS_NEAR && dist < minDist) {
                minDist = dist;
                closestSphere = sphere;
            }
        }

        if (precaptureSphere) {
            precaptureSpheres.add(precaptureSphere);
        }

        if (!gripPose.isMostlyClosed) {
            gripState.closedFrames = 0;
            continue;
        }

        gripState.closedFrames += 1;
        if (gripState.closedFrames < GRIP_CAPTURE_FRAMES) {
            continue;
        }

        if (closestSphere) {
            gripState.sphere = closestSphere;
            gripState.closedFrames = 0;
            gripState.openFrames = 0;
            gripState.lostFrames = 0;
            if (holdSphereWithHand(closestSphere, handIndex, gripPose.palmLandmark, gripState)) {
                frameGrippedSpheres.add(closestSphere);
            } else {
                clearGripState(gripState);
            }
        } else {
            gripState.closedFrames = 0;
        }
    }

    // Keep gripped spheres stable briefly across hand-tracker dropouts.
    for (const [handKey, gripState] of handGripStates) {
        if (!visibleHands.has(handKey)) {
            if (gripState.sphere) {
                gripState.lostFrames += 1;
                if (gripState.lostFrames <= GRIP_TRACK_LOST_GRACE_FRAMES && holdSphereFromMemory(gripState, dt)) {
                    frameGrippedSpheres.add(gripState.sphere);
                    continue;
                }
                releaseGripState(gripState);
            }
            handGripStates.delete(handKey);
        }
    }

    // Reset contact counts for ungripped spheres
    for (let i = 0; i < spheres.length; i++) {
        if (!frameGrippedSpheres.has(spheres[i])) {
            spheres[i].contactCount = 0;
        }
    }

    for (let ti = 0; ti < state.trackedTips.length; ti++) {
        const tip = state.trackedTips[ti];
        const isPalm = tip.key.endsWith('-palm');
        if (isPalm) {
            const separatorIndex = tip.key.indexOf('-');
            const tipHandKey = separatorIndex >= 0 ? tip.key.slice(0, separatorIndex) : tip.key;
            if (idleOpenPalmHands.has(tipHandKey)) {
                continue;
            }
        }
        for (let si = 0; si < spheres.length; si++) {
            const sphere = spheres[si];
            if (frameGrippedSpheres.has(sphere) || sphere === state.selectedSphere || precaptureSpheres.has(sphere)) {
                continue;
            }

            scratch.normal.set(
                sphere.position.x - tip.worldX,
                sphere.position.y - tip.worldY,
                0
            );

            const tipSpeed = Math.hypot(tip.velX, tip.velY);
            const baseLookaheadScale = 1.0;
            const lookaheadScale = baseLookaheadScale * (isPalm ? PALM_LOOKAHEAD_SCALE : 1);
            const baseContactRadius = profile.contactRadius * (isPalm ? PALM_CONTACT_RADIUS_SCALE : 1);
            const radiusBoost = Math.min(
                PUSH_RADIUS_BOOST_MAX * lookaheadScale * (isPalm ? PALM_RADIUS_BOOST_SCALE : 1),
                tipSpeed * PUSH_LOOKAHEAD_SECONDS * lookaheadScale
            );
            const effectiveContactRadius = baseContactRadius + radiusBoost;

            const distance = scratch.normal.length();
            if (distance >= effectiveContactRadius) {
                continue;
            }

            const handInfluenceScale = getReleaseHandInfluenceScale(sphere);
            if (handInfluenceScale <= 0) {
                continue;
            }

            totalContacts += 1;
            sphere.contactCount += 1;
            const contactKey = `${tip.key}:${si}`;
            newContacts.add(contactKey);

            if (distance < 0.000001) {
                scratch.normal.set(0, 1, 0);
            } else {
                scratch.normal.multiplyScalar(1 / distance);
            }

            const corePenetration = baseContactRadius - distance;
            const minShellScale = isPalm
                ? Math.max(PUSH_SHELL_FORCE_SCALE, PALM_SHELL_FORCE_SCALE_MIN)
                : PUSH_SHELL_FORCE_SCALE;
            const shellScale = (corePenetration >= 0 || radiusBoost < 0.000001)
                ? 1
                : Math.max(minShellScale, 1 - ((distance - baseContactRadius) / radiusBoost));
            const contactScale = handInfluenceScale * shellScale * (isPalm ? PALM_FORCE_SCALE : 1);

            const relVelAlongNormal =
                (tip.velX - sphere.velocity.x) * scratch.normal.x +
                (tip.velY - sphere.velocity.y) * scratch.normal.y;

            if (corePenetration > 0) {
                // Spring-damper: pushes sphere away from tip, damps inward sphere motion
                const inwardSpeed = Math.min(
                    (sphere.velocity.x * scratch.normal.x) + (sphere.velocity.y * scratch.normal.y),
                    0
                );
                const pushForce = (profile.spring * corePenetration) - (profile.damping * inwardSpeed);
                let pushAccel = pushForce / state.mass;

                // Cap extreme forces
                pushAccel = Math.min(pushAccel, 50.0);

                sphere.position.x += scratch.normal.x * corePenetration * profile.correction * contactScale;
                sphere.position.y += scratch.normal.y * corePenetration * profile.correction * contactScale;
                sphere.velocity.x += scratch.normal.x * pushAccel * dt * contactScale;
                sphere.velocity.y += scratch.normal.y * pushAccel * dt * contactScale;
            }

            // First-contact velocity impulse
            if (!activeContacts.has(contactKey) && handInfluenceScale >= 0.999) {
                const minApproachSpeed = PUSH_MIN_APPROACH_SPEED * (isPalm ? PALM_MIN_APPROACH_SPEED_SCALE : 1);
                if (relVelAlongNormal > minApproachSpeed) {
                    let impulse = (relVelAlongNormal * profile.velocityTransfer) / state.mass;
                    if (corePenetration <= 0 && radiusBoost > 0) {
                        // Slightly boost shell contacts so quick flicks still transfer momentum.
                        impulse *= 1.15;
                    }
                    if (isPalm) {
                        impulse *= PALM_IMPULSE_SCALE;
                    }
                    impulse = Math.min(impulse, 25.0); // Cap extreme impulses
                    sphere.velocity.x += scratch.normal.x * impulse * contactScale;
                    sphere.velocity.y += scratch.normal.y * impulse * contactScale;
                }
            }

            if (!isPalm && profile.stickPull > 0 && corePenetration > 0 && distance > 0.000001) {
                const toTipX = tip.worldX - sphere.position.x;
                const toTipY = tip.worldY - sphere.position.y;
                const invDistance = 1 / distance;
                const stickFactor = corePenetration / profile.contactRadius;
                const stickAccel = profile.stickPull / state.mass;
                sphere.velocity.x += toTipX * invDistance * stickAccel * stickFactor * dt * contactScale;
                sphere.velocity.y += toTipY * invDistance * stickAccel * stickFactor * dt * contactScale;
                sphere.position.x += toTipX * profile.stickCapture * stickFactor * dt * contactScale;
                sphere.position.y += toTipY * profile.stickCapture * stickFactor * dt * contactScale;
            }
        }
    }

    // Update contact state for next frame's first-contact detection
    activeContacts.clear();
    newContacts.forEach(k => activeContacts.add(k));

    return totalContacts;
}

function constrainSphereToView(sphere, profile) {
    const bounds = getViewBounds();
    if (state.boundaryMode === 'wrap') {
        const xWrapLimit = Math.max(0.2, bounds.halfWidth + SPHERE_RADIUS);
        const yWrapLimit = Math.max(0.2, bounds.halfHeight + SPHERE_RADIUS);
        const xSpan = xWrapLimit * 2;
        const ySpan = yWrapLimit * 2;

        while (sphere.position.x > xWrapLimit) {
            sphere.position.x -= xSpan;
        }
        while (sphere.position.x < -xWrapLimit) {
            sphere.position.x += xSpan;
        }
        while (sphere.position.y > yWrapLimit) {
            sphere.position.y -= ySpan;
        }
        while (sphere.position.y < -yWrapLimit) {
            sphere.position.y += ySpan;
        }

        sphere.position.z = PLANE_Z;
        sphere.velocity.z = 0;
        return;
    }

    const xLimit = Math.max(0.2, bounds.halfWidth - SPHERE_RADIUS);
    const yLimit = Math.max(0.2, bounds.halfHeight - SPHERE_RADIUS);
    const restitution = IDEAL_WALL_RESTITUTION;

    if (sphere.position.x > xLimit) {
        sphere.position.x = xLimit;
        sphere.velocity.x = -Math.abs(sphere.velocity.x) * restitution;
    } else if (sphere.position.x < -xLimit) {
        sphere.position.x = -xLimit;
        sphere.velocity.x = Math.abs(sphere.velocity.x) * restitution;
    }

    if (sphere.position.y > yLimit) {
        sphere.position.y = yLimit;
        sphere.velocity.y = -Math.abs(sphere.velocity.y) * restitution;
    } else if (sphere.position.y < -yLimit) {
        sphere.position.y = -yLimit;
        sphere.velocity.y = Math.abs(sphere.velocity.y) * restitution;
    }

    sphere.position.z = PLANE_Z;
    sphere.velocity.z = 0;
}

function isPinnedSphere(sphere) {
    return frameGrippedSpheres.has(sphere) || sphere === state.selectedSphere;
}

function resolveSphereCollisions(applyVelocity = true) {
    const diameter = SPHERE_RADIUS * 2;
    const diameterSq = diameter * diameter;
    for (let i = 0; i < spheres.length; i++) {
        for (let j = i + 1; j < spheres.length; j++) {
            const a = spheres[i];
            const b = spheres[j];
            const aPinned = isPinnedSphere(a);
            const bPinned = isPinnedSphere(b);
            if (aPinned && bPinned) {
                continue;
            }

            const dx = b.position.x - a.position.x;
            const dy = b.position.y - a.position.y;
            const distSq = (dx * dx) + (dy * dy);

            if (distSq >= diameterSq) {
                continue;
            }

            let nx = 0;
            let ny = 1;
            let dist = Math.sqrt(Math.max(0, distSq));
            if (dist > 0.000001) {
                nx = dx / dist;
                ny = dy / dist;
            } else {
                // Deterministic fallback normal when centers coincide.
                const rvx = b.velocity.x - a.velocity.x;
                const rvy = b.velocity.y - a.velocity.y;
                const rvLen = Math.hypot(rvx, rvy);
                if (rvLen > 0.000001) {
                    nx = rvx / rvLen;
                    ny = rvy / rvLen;
                } else {
                    const seed = ((i + 1) * 73856093) ^ ((j + 1) * 19349663);
                    const angle = (Math.abs(seed) % 6283) / 1000;
                    nx = Math.cos(angle);
                    ny = Math.sin(angle);
                }
                dist = 0;
            }

            const penetration = diameter - dist;
            if (penetration <= 0) {
                continue;
            }
            const invMassA = aPinned ? 0 : 1;
            const invMassB = bPinned ? 0 : 1;
            const invMassSum = invMassA + invMassB;
            if (invMassSum <= 0) {
                continue;
            }

            // Position correction with small bias so contacts don't sink.
            const correction = (penetration + COLLISION_SEPARATION_EPSILON) / invMassSum;
            a.position.x -= nx * correction * invMassA;
            a.position.y -= ny * correction * invMassA;
            b.position.x += nx * correction * invMassB;
            b.position.y += ny * correction * invMassB;

            if (!applyVelocity) {
                continue;
            }

            // Resolve normal velocity with inverse-mass impulse.
            const relVelN = (b.velocity.x - a.velocity.x) * nx + (b.velocity.y - a.velocity.y) * ny;

            // Only resolve if spheres are approaching
            if (relVelN >= 0) {
                continue;
            }

            const impulse = (-(1 + IDEAL_SPHERE_RESTITUTION) * relVelN) / invMassSum;
            a.velocity.x -= impulse * nx * invMassA;
            a.velocity.y -= impulse * ny * invMassA;
            b.velocity.x += impulse * nx * invMassB;
            b.velocity.y += impulse * ny * invMassB;
        }
    }
}

function updatePhysics(dt, profile) {
    if (spheres.length === 0) {
        return;
    }

    const subDt = dt / PHYSICS_SUBSTEPS;
    for (let substep = 0; substep < PHYSICS_SUBSTEPS; substep++) {
        for (const sphere of spheres) {
            if (isPinnedSphere(sphere)) {
                continue;
            }

            sphere.velocity.y -= state.gravity * subDt;
            sphere.position.x += sphere.velocity.x * subDt;
            sphere.position.y += sphere.velocity.y * subDt;
            constrainSphereToView(sphere, profile);

            const linearDrag = Math.exp(-profile.airDrag * subDt);
            sphere.velocity.x *= linearDrag;
            sphere.velocity.y *= linearDrag;
        }

        // Position solver iterations to prevent visible overlap.
        for (let iter = 0; iter < COLLISION_SOLVER_POSITION_ITERATIONS; iter++) {
            resolveSphereCollisions(false);
            for (const sphere of spheres) {
                if (!isPinnedSphere(sphere)) {
                    constrainSphereToView(sphere, profile);
                }
            }
        }

        // One velocity pass after positions are separated.
        resolveSphereCollisions(true);
        for (const sphere of spheres) {
            if (!isPinnedSphere(sphere)) {
                constrainSphereToView(sphere, profile);
            }
        }
    }

    for (const sphere of spheres) {
        if (isPinnedSphere(sphere)) {
            continue;
        }
        sphere.group.rotation.z -= (sphere.velocity.x / SPHERE_RADIUS) * dt;
        sphere.group.rotation.x += (sphere.velocity.y / SPHERE_RADIUS) * dt;
        sphere.group.position.set(sphere.position.x, sphere.position.y, PLANE_Z);
    }
}

function updateGlow(dt) {
    for (const sphere of spheres) {
        const target = sphere.contactCount > 0 ? 3.0 : 1.0;
        const alpha = sphere.contactCount > 0 ? 0.3 : 0.1;
        sphere.material.emissiveIntensity += (target - sphere.material.emissiveIntensity) * alpha;
    }
}

function step(now) {
    if (!state.running) {
        return;
    }

    if (!state.lastFrameTime) {
        state.lastFrameTime = now;
    }
    const dt = Math.min((now - state.lastFrameTime) / 1000, 1 / 20);
    state.lastFrameTime = now;
    state.fps = state.fps ? (state.fps * 0.9) + ((1 / Math.max(dt, 0.0001)) * 0.1) : (1 / Math.max(dt, 0.0001));

    if (state.handLandmarker && ui.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        if (ui.video.currentTime !== state.lastVideoTime) {
            state.lastVideoTime = ui.video.currentTime;
            try {
                const result = state.handLandmarker.detectForVideo(ui.video, now);
                state.lastHands = result.landmarks || [];
            } catch (error) {
                state.lastHands = [];
                if (now >= state.nextTrackingErrorReportAt) {
                    state.nextTrackingErrorReportAt = now + 2000;
                    const message = error && error.message ? error.message : String(error);
                    console.error('Hand tracking frame failed:', error);
                    setStatus(`Tracking hiccup: ${message}. Continuing...`, true);
                }
            }
        }
    }

    // end of block

    state.handsCount = state.lastHands.length;
    state.trackedTips = collectTrackedTips();
    state.tipCount = state.trackedTips.length;
    const profile = getInteractionProfile();
    state.contactsCount = applyTipForces(dt, profile);
    updatePhysics(dt, profile);
    updateGlow(dt);
    drawTrackedTips();
    updateMetrics();
    renderer.render(scene, camera3d);

    requestAnimationFrame(step);
}

// Raycaster for mouse/touch selection
const raycaster = new THREE.Raycaster();
const mouseVector = new THREE.Vector2();

function handleStageClick(event) {
    if (spheres.length === 0) return;
    if (
        event.target !== ui.video &&
        event.target !== ui.canvas &&
        event.target !== ui.tipCanvas
    ) {
        return;
    }

    const rect = ui.canvas.getBoundingClientRect();
    let clientX, clientY;
    if (event.touches && event.touches.length > 0) {
        clientX = event.touches[0].clientX;
        clientY = event.touches[0].clientY;
    } else {
        clientX = event.clientX;
        clientY = event.clientY;
    }

    const normalizedX = (clientX - rect.left) / rect.width;
    const normalizedY = (clientY - rect.top) / rect.height;
    if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) {
        return;
    }

    // The stage is mirrored in CSS (`scaleX(-1)`), so pointer x must be mirrored for raycasting.
    mouseVector.x = (1 - normalizedX) * 2 - 1;
    mouseVector.y = -(normalizedY * 2 - 1);

    raycaster.setFromCamera(mouseVector, camera3d);

    // Check intersection with spheres
    const meshes = spheres.map(s => s.group.children[0]);
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
        const hitMesh = intersects[0].object;
        const hitSphere = spheres.find(s => s.group.children[0] === hitMesh);

        if (hitSphere) {
            selectSphere(hitSphere);
        }
    } else {
        deselectSphere();
    }
}

function selectSphere(sphere) {
    state.selectedSphere = sphere;
    sphere.velocity.set(0, 0, 0); // Freeze
    ui.selectionOverlay.style.display = 'flex';
}

function deselectSphere() {
    state.selectedSphere = null;
    ui.selectionOverlay.style.display = 'none';
}

function removeSelectedSphere() {
    if (state.selectedSphere) {
        clearGripReferencesToSphere(state.selectedSphere);
        scene.remove(state.selectedSphere.group);
        state.selectedSphere.material.dispose();
        const idx = spheres.indexOf(state.selectedSphere);
        if (idx > -1) {
            spheres.splice(idx, 1);
        }
        deselectSphere();
        updateAddBtnState();
    }
}

function removeAllSpheres() {
    if (spheres.length === 0) {
        return;
    }
    deselectSphere();
    for (const sphere of spheres) {
        clearGripReferencesToSphere(sphere);
        scene.remove(sphere.group);
        sphere.material.dispose();
    }
    spheres.length = 0;
    activeContacts.clear();
    tipHistory.clear();
    handGripStates.clear();
    releaseHandSuppression.clear();
    updateAddBtnState();
}

async function createHandLandmarker() {
    await ensureHandTrackingDeps();
    const vision = await filesetResolverCtor.forVisionTasks(
        mediapipeWasmBaseUrl
    );

    return handLandmarkerCtor.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: LOCAL_MODEL_PATH
        },
        runningMode: 'VIDEO',
        numHands: 2
    });
}

async function populateCameraList() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (videoDevices.length <= 1) {
            return;
        }
        ui.cameraSelect.innerHTML = '';
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${index + 1}`;
            ui.cameraSelect.appendChild(option);
        });
        // Select the currently active device if possible
        if (state.stream) {
            const activeTrack = state.stream.getVideoTracks()[0];
            if (activeTrack) {
                const settings = activeTrack.getSettings();
                if (settings.deviceId) {
                    ui.cameraSelect.value = settings.deviceId;
                }
            }
        }
        ui.cameraSelect.disabled = false;
    } catch (error) {
        console.warn('Could not enumerate cameras:', error);
    }
}

async function switchCamera(deviceId) {
    if (!deviceId) {
        return;
    }
    const previousStream = state.stream;
    const previousTrack = previousStream ? previousStream.getVideoTracks()[0] : null;
    const previousSettings = previousTrack ? previousTrack.getSettings() : null;
    const previousDeviceId = previousSettings && previousSettings.deviceId ? previousSettings.deviceId : null;
    let nextStream = null;
    ui.cameraSelect.disabled = true;
    setStatus('Switching camera...');
    try {
        nextStream = await navigator.mediaDevices.getUserMedia({
            video: {
                deviceId: { exact: deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });
        ui.video.srcObject = nextStream;
        await ui.video.play();
        state.stream = nextStream;
        state.lastVideoTime = -1;

        if (previousStream && previousStream !== nextStream) {
            previousStream.getTracks().forEach((track) => track.stop());
        }

        if ([...ui.cameraSelect.options].some((option) => option.value === deviceId)) {
            ui.cameraSelect.value = deviceId;
        }
        setStatus('Camera switched.');
    } catch (error) {
        const message = error && error.message ? error.message : String(error);
        console.error('Camera switch failed:', error);
        if (nextStream) {
            nextStream.getTracks().forEach((track) => track.stop());
        }

        const hasLivePreviousStream =
            previousStream && previousStream.getTracks().some((track) => track.readyState === 'live');

        if (hasLivePreviousStream) {
            state.stream = previousStream;
            if (ui.video.srcObject !== previousStream) {
                ui.video.srcObject = previousStream;
            }
            try {
                await ui.video.play();
            } catch (resumeError) {
                console.warn('Could not resume previous camera stream:', resumeError);
            }

            if (previousDeviceId && [...ui.cameraSelect.options].some((option) => option.value === previousDeviceId)) {
                ui.cameraSelect.value = previousDeviceId;
            }

            setStatus(`Could not switch camera: ${message}. Keeping current camera.`, true);
        } else {
            state.stream = null;
            setStatus(`Could not switch camera: ${message}`, true);
        }
    } finally {
        ui.cameraSelect.disabled = ui.cameraSelect.options.length <= 1;
    }
}

async function startCameraAndTracking() {
    if (state.running) {
        return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus('getUserMedia is not available in this browser.', true);
        return;
    }

    if (!window.isSecureContext && !isLocalLoopbackHost()) {
        setStatus(`Camera access requires HTTPS or localhost. Current URL: ${window.location.origin}`, true);
        return;
    }

    ui.startBtn.disabled = true;
    setStatus('Requesting camera permission...');

    try {
        const hasLiveStream = state.stream && state.stream.getTracks().some((track) => track.readyState === 'live');
        if (!hasLiveStream) {
            state.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: false
            });
        }

        if (ui.video.srcObject !== state.stream) {
            ui.video.srcObject = state.stream;
        }
        await ui.video.play();
        await populateCameraList();
    } catch (error) {
        if (state.stream && state.stream.getTracks().every((track) => track.readyState !== 'live')) {
            state.stream = null;
        }
        ui.startBtn.disabled = false;
        updateStartButtonState();
        const name = error && error.name ? error.name : 'Error';
        const message = error && error.message ? error.message : String(error);
        console.error('Camera/tracking startup failed:', error);
        setStatus(`Could not access camera (${name}): ${message}`, true);
        return;
    }

    setStatus('Loading hand tracker...');

    try {
        state.handLandmarker = await createHandLandmarker();
    } catch (error) {
        ui.startBtn.disabled = false;
        updateStartButtonState();
        const name = error && error.name ? error.name : 'Error';
        const message = error && error.message ? error.message : String(error);
        console.error('Hand tracker load failed:', error);
        setStatus(`Camera started, but hand tracker failed (${name}): ${message}. Click Start Camera to retry.`, true);
        return;
    }

    resizeStage();
    state.running = true;
    state.lastFrameTime = performance.now();
    if (spheres.length === 0) {
        addSphere();
    }
    updateAddBtnState();
    ui.resetBtn.disabled = false;
    ui.startBtn.disabled = false;
    updateStartButtonState();
    setStatus('Ready.');
    requestAnimationFrame(step);
}

function stopCameraAndTracking() {
    state.running = false;
    state.lastFrameTime = 0;
    state.fps = 0;
    state.lastVideoTime = -1;
    state.lastHands = [];
    state.handsCount = 0;
    state.tipCount = 0;
    state.contactsCount = 0;
    state.trackedTips = [];
    state.nextTrackingErrorReportAt = 0;

    if (state.handLandmarker && typeof state.handLandmarker.close === 'function') {
        try {
            state.handLandmarker.close();
        } catch (error) {
            console.warn('Could not close hand landmarker cleanly:', error);
        }
    }
    state.handLandmarker = null;

    if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
        state.stream = null;
    }
    ui.video.srcObject = null;
    ui.cameraSelect.innerHTML = '<option value="">Default</option>';
    ui.cameraSelect.disabled = true;

    removeAllSpheres();
    ui.resetBtn.disabled = true;

    if (tipCtx) {
        tipCtx.clearRect(0, 0, ui.tipCanvas.width, ui.tipCanvas.height);
    }
    renderer.render(scene, camera3d);
    updateStartButtonState();
    setStatus('Camera stopped.');
}

async function handleStartStopClick() {
    if (state.running) {
        stopCameraAndTracking();
        return;
    }
    await startCameraAndTracking();
}

ui.startBtn.addEventListener('click', handleStartStopClick);
ui.addBtn.addEventListener('click', addSphere);
ui.resetBtn.addEventListener('click', resetAll);
ui.controlsToggle.addEventListener('click', openControls);
ui.controlsClose.addEventListener('click', closeControls);
ui.fullscreenBtn.addEventListener('click', toggleFullscreen);

ui.stage.addEventListener('pointerdown', handleStageClick);
ui.removeTargetBtn.addEventListener('click', removeSelectedSphere);
ui.cancelTargetBtn.addEventListener('click', deselectSphere);

ui.hud.addEventListener('click', () => {
    ui.hud.classList.add('hidden');
    ui.showHudCheckbox.checked = false;
});
ui.showHudCheckbox.addEventListener('change', () => {
    if (ui.showHudCheckbox.checked) {
        ui.hud.classList.remove('hidden');
    } else {
        ui.hud.classList.add('hidden');
    }
});
ui.cameraSelect.addEventListener('change', () => {
    if (state.running && ui.cameraSelect.value) {
        switchCamera(ui.cameraSelect.value);
    }
});
ui.boundaryModeSelect.addEventListener('change', () => {
    state.boundaryMode = ui.boundaryModeSelect.value === 'wrap' ? 'wrap' : 'walls';
    updateBoundaryModeUI();
    if (state.boundaryMode === 'wrap') {
        setStatus('Walls removed. Spheres now wrap across edges.');
    } else {
        setStatus('Walls enabled. Spheres now bounce at edges.');
    }
});
ui.sensitivityRange.addEventListener('input', () => {
    const nextValue = Number(ui.sensitivityRange.value);
    if (!Number.isFinite(nextValue)) {
        return;
    }
    state.sensitivity = Math.max(0.6, Math.min(2.0, nextValue));
    updateSensitivityLabel();
});
ui.gravityRange.addEventListener('input', () => {
    const nextValue = Number(ui.gravityRange.value);
    if (!Number.isFinite(nextValue)) {
        return;
    }
    state.gravity = Math.max(0, Math.min(2.0, nextValue));
    updateGravityLabel();
});
ui.airDragRange.addEventListener('input', () => {
    const nextValue = Number(ui.airDragRange.value);
    if (!Number.isFinite(nextValue)) {
        return;
    }
    state.airDrag = Math.max(0, Math.min(1.0, nextValue));
    updateAirDragLabel();
});
ui.massRange.addEventListener('input', () => {
    const nextValue = Number(ui.massRange.value);
    if (!Number.isFinite(nextValue)) {
        return;
    }
    state.mass = Math.max(0.2, Math.min(5.0, nextValue));
    updateMassLabel();
});

window.addEventListener('resize', scheduleResizeStage);
window.addEventListener('orientationchange', scheduleResizeStage);
if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
    window.visualViewport.addEventListener('resize', scheduleResizeStage);
}
document.addEventListener('fullscreenchange', updateFullscreenUI);
document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
if ('ResizeObserver' in window) {
    new ResizeObserver(scheduleResizeStage).observe(ui.stage);
}

window.addEventListener('beforeunload', () => {
    if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
    }
});

ui.boundaryModeSelect.value = state.boundaryMode;
updateBoundaryModeUI();
ui.sensitivityRange.value = state.sensitivity.toFixed(1);
updateSensitivityLabel();
ui.gravityRange.value = state.gravity.toFixed(2);
updateGravityLabel();
ui.airDragRange.value = state.airDrag.toFixed(2);
updateAirDragLabel();
ui.massRange.value = state.mass.toFixed(1);
updateMassLabel();
updateStartButtonState();
renderHudInfo();
updateFullscreenUI();
resizeStage();
renderer.render(scene, camera3d);
startCameraAndTracking();
