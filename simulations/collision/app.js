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
    wallsToggle: document.getElementById('wallsToggle'),
    oneDToggle: document.getElementById('oneDToggle'),
    sensitivityRange: document.getElementById('sensitivityRange'),
    sensitivityValue: document.getElementById('sensitivityValue'),
    gravityRange: document.getElementById('gravityRange'),
    gravityValue: document.getElementById('gravityValue'),
    airDragRange: document.getElementById('airDragRange'),
    airDragValue: document.getElementById('airDragValue'),
    ballControlsSection: document.getElementById('ballControlsSection'),
    ballControlsCount: document.getElementById('ballControlsCount'),
    ballControlsList: document.getElementById('ballControlsList'),
    stage: document.getElementById('stage'),
    video: document.getElementById('camera'),
    canvas: document.getElementById('renderCanvas'),
    tipCanvas: document.getElementById('tipCanvas'),
    physicsDetails: document.getElementById('physicsDetails'),
    hud: document.querySelector('.hud'),
    selectionOverlay: document.getElementById('selectionOverlay'),
    removeTargetBtn: document.getElementById('removeTargetBtn'),
    cancelTargetBtn: document.getElementById('cancelTargetBtn')
};

function getFocusableElements(container) {
    return container.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
}

function trapFocus(event) {
    const focusable = getFocusableElements(ui.controlsPanel);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
}

function openControls() {
    ui.controlsPanel.classList.add('open');
    ui.controlsToggle.style.display = 'none';
    ui.controlsPanel.addEventListener('keydown', handleControlsPanelKeydown);
    ui.controlsClose.focus();
}

function closeControls() {
    ui.controlsPanel.classList.remove('open');
    ui.controlsToggle.style.display = '';
    ui.controlsPanel.removeEventListener('keydown', handleControlsPanelKeydown);
    ui.controlsToggle.focus();
}

function handleControlsPanelKeydown(event) {
    if (event.key === 'Escape') {
        closeControls();
        return;
    }
    if (event.key === 'Tab') {
        trapFocus(event);
    }
}

const userAgent = navigator.userAgent || '';
const isTouchAppleDevice = /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isSafariBrowser = /Safari/i.test(userAgent) &&
    !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Android/i.test(userAgent);
const prefersPseudoFullscreen = isTouchAppleDevice && isSafariBrowser;

if (isTouchAppleDevice) {
    document.documentElement.classList.add('ios-touch-device');
}

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
    oneD: false,
    sensitivity: 1.0,
    gravity: 0.0,
    airDrag: 0.0,
    statusMessage: 'Camera is off.',
    nextTrackingErrorReportAt: 0,
    selectedSphere: null,
    lastDrawVideoTime: -1,
    nextHandDetectAt: 0,
    lastHudUpdateAt: 0,
    lastHudText: '',
    tipOverlayVisible: false
};

let filesetResolverCtor = null;
let handLandmarkerCtor = null;

const LOCAL_MEDIAPIPE_BASE = new URL('./collision_assets/mediapipe/tasks-vision-0.10.32', import.meta.url).href;
const LOCAL_MODEL_PATH = new URL('./collision_assets/models/hand_landmarker.task', import.meta.url).href;
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

const CAMERA_PREFERENCE_STORAGE_KEY = 'panphy-collision-preferred-camera';

function loadPreferredCameraId() {
    try {
        const storedId = localStorage.getItem(CAMERA_PREFERENCE_STORAGE_KEY);
        if (typeof storedId === 'string' && storedId.trim()) {
            return storedId;
        }
    } catch (error) {
        // Ignore storage access issues (e.g. private mode restrictions).
    }
    return '';
}

function savePreferredCameraId(deviceId) {
    try {
        if (typeof deviceId === 'string' && deviceId.trim()) {
            localStorage.setItem(CAMERA_PREFERENCE_STORAGE_KEY, deviceId);
            return;
        }
        localStorage.removeItem(CAMERA_PREFERENCE_STORAGE_KEY);
    } catch (error) {
        // Ignore storage access issues (e.g. private mode restrictions).
    }
}

function getActiveStreamDeviceId(stream = state.stream) {
    if (!stream) {
        return '';
    }
    const activeTrack = stream.getVideoTracks()[0];
    if (!activeTrack) {
        return '';
    }
    const settings = activeTrack.getSettings();
    if (settings && typeof settings.deviceId === 'string' && settings.deviceId) {
        return settings.deviceId;
    }
    return '';
}

function hasCameraOption(deviceId) {
    if (!deviceId) {
        return false;
    }
    return [...ui.cameraSelect.options].some((option) => option.value === deviceId);
}

function buildVideoConstraints(deviceId = '') {
    const constraints = {
        width: { ideal: 1280 },
        height: { ideal: 720 }
    };

    if (deviceId) {
        constraints.deviceId = { exact: deviceId };
    } else {
        constraints.facingMode = 'user';
    }
    return constraints;
}

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
const PHYSICS_SUBSTEPS = 3;
const PHYSICS_SUBSTEPS_1D = 6;
const COLLISION_SOLVER_POSITION_ITERATIONS = 3;
const COLLISION_SOLVER_VELOCITY_ITERATIONS = 3;
const COLLISION_SOLVER_POSITION_ITERATIONS_1D = 10;
const COLLISION_SOLVER_VELOCITY_ITERATIONS_1D = 7;
const ONE_D_STACK_STABILIZATION_PASSES = 4;
const COLLISION_SEPARATION_EPSILON = SPHERE_RADIUS * 0.004;
const GRAVITY_SCALE = 9.81;
const MIN_SPHERE_MASS = 0.2;
const MAX_SPHERE_MASS = 5.0;
const DEFAULT_SPHERE_MASS = 1.0;
const MIN_SPHERE_RESTITUTION = 0.0;
const MAX_SPHERE_RESTITUTION = 1.0;
const DEFAULT_SPHERE_RESTITUTION = 1.0;

function randomHexColor() {
    return Math.floor(Math.random() * 0x1000000);
}

function darkenHexColor(colorValue, factor = 0.3) {
    const red = (colorValue >> 16) & 0xff;
    const green = (colorValue >> 8) & 0xff;
    const blue = colorValue & 0xff;

    const darkRed = Math.max(0, Math.floor(red * factor));
    const darkGreen = Math.max(0, Math.floor(green * factor));
    const darkBlue = Math.max(0, Math.floor(blue * factor));

    return (darkRed << 16) | (darkGreen << 8) | darkBlue;
}

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
const FINGER_CHAINS = [
    [1, 2, 3, 4],   // thumb
    [5, 6, 7, 8],   // index
    [9, 10, 11, 12], // middle
    [13, 14, 15, 16], // ring
    [17, 18, 19, 20] // pinky
];
const HAND_MIN_DETECTION_CONFIDENCE = 0.62;
const HAND_MIN_PRESENCE_CONFIDENCE = 0.62;
const HAND_MIN_TRACKING_CONFIDENCE = 0.65;
const HAND_MIN_HANDEDNESS_SCORE = 0.6;
const HAND_MIN_BBOX_AREA = 0.003;
const HAND_MIN_SPAN = 0.06;
const HAND_MIN_PALM_WIDTH = 0.035;
const HAND_MIN_TIP_SPREAD_SCALE = 0.2;
const HAND_MIN_VALID_FINGER_CHAINS = 2;
const HAND_MIN_FINGER_CHAIN_SCALE = 0.42;
const HAND_MIN_THUMB_CHAIN_SCALE = 0.28;
const HAND_TRACKING_IDLE_INTERVAL_MS = 60;
const HUD_UPDATE_INTERVAL_MS = 200;

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
    powerPreference: 'default'
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

// Reusable scratch vectors to avoid per-frame allocations.
// IMPORTANT: These are mutated in-place by landmarkToPlane, trackPoint,
// countFingertipsNearSphere, holdSphereWithHand, and applyTipForces.
// Callers must read values before the next mutation of the same field.
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

function renderHudInfo(force = false) {
    const fpsText = state.running ? state.fps.toFixed(0) : '--';
    const nextText =
        `${state.statusMessage} | FPS: ${fpsText} | Hands: ${state.handsCount} | Tips: ${state.tipCount} | Contacts: ${state.contactsCount} | Spheres: ${spheres.length}`;
    if (!force && state.lastHudText === nextText) {
        return;
    }
    state.lastHudText = nextText;
    ui.statusMetrics.textContent = nextText;
}

function setStatus(message, isError = false) {
    state.statusMessage = message;
    ui.statusMetrics.classList.toggle('status-error', isError);
    renderHudInfo(true);
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

function clampSphereMass(value) {
    return Math.max(MIN_SPHERE_MASS, Math.min(MAX_SPHERE_MASS, value));
}

function clampSphereRestitution(value) {
    return Math.max(MIN_SPHERE_RESTITUTION, Math.min(MAX_SPHERE_RESTITUTION, value));
}

function formatSphereMass(value) {
    return `${value.toFixed(1)} kg`;
}

function formatSphereRestitution(value) {
    return value.toFixed(2);
}

function toCssHexColor(colorValue) {
    return `#${colorValue.toString(16).padStart(6, '0')}`;
}

function createBallSliderControl({
    sphereNumber,
    labelText,
    valueText,
    min,
    max,
    step,
    value,
    onInput
}) {
    const label = document.createElement('label');
    label.className = 'control-block';

    const row = document.createElement('span');
    row.className = 'control-label-row';

    const labelEl = document.createElement('span');
    labelEl.className = 'control-label';
    labelEl.textContent = labelText;

    const valueEl = document.createElement('span');
    valueEl.className = 'value-badge';
    valueEl.textContent = valueText;

    row.append(labelEl, valueEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.setAttribute('aria-label', `${labelText} for Sphere ${sphereNumber}`);
    input.addEventListener('input', () => onInput(input, valueEl));

    label.append(row, input);
    return label;
}

function renderBallControls() {
    if (!ui.ballControlsList || !ui.ballControlsSection || !ui.ballControlsCount) {
        return;
    }

    ui.ballControlsCount.textContent = `${spheres.length} / ${MAX_SPHERES}`;
    ui.ballControlsList.innerHTML = '';

    if (spheres.length === 0) {
        return;
    }

    for (let index = 0; index < spheres.length; index++) {
        const sphere = spheres[index];
        const card = document.createElement('article');
        card.className = 'ball-control-card';

        const header = document.createElement('div');
        header.className = 'ball-control-header';

        const colorDot = document.createElement('span');
        colorDot.className = 'ball-color-dot';
        colorDot.style.backgroundColor = toCssHexColor(sphere.colorHex);

        const title = document.createElement('span');
        title.className = 'ball-control-title';
        title.textContent = `Sphere ${index + 1}`;

        header.append(colorDot, title);
        card.appendChild(header);

        const sphereNumber = index + 1;

        const massControl = createBallSliderControl({
            sphereNumber,
            labelText: 'Mass',
            valueText: formatSphereMass(sphere.mass),
            min: MIN_SPHERE_MASS,
            max: MAX_SPHERE_MASS,
            step: 0.1,
            value: sphere.mass,
            onInput: (inputEl, valueEl) => {
                const nextValue = Number(inputEl.value);
                if (!Number.isFinite(nextValue)) {
                    return;
                }
                sphere.mass = clampSphereMass(nextValue);
                valueEl.textContent = formatSphereMass(sphere.mass);
                inputEl.value = sphere.mass.toFixed(1);
            }
        });

        const restitutionControl = createBallSliderControl({
            sphereNumber,
            labelText: 'Coeff. of restitution',
            valueText: formatSphereRestitution(sphere.restitution),
            min: MIN_SPHERE_RESTITUTION,
            max: MAX_SPHERE_RESTITUTION,
            step: 0.01,
            value: sphere.restitution,
            onInput: (inputEl, valueEl) => {
                const nextValue = Number(inputEl.value);
                if (!Number.isFinite(nextValue)) {
                    return;
                }
                sphere.restitution = clampSphereRestitution(nextValue);
                valueEl.textContent = formatSphereRestitution(sphere.restitution);
                inputEl.value = sphere.restitution.toFixed(2);
            }
        });

        const sliderRow = document.createElement('div');
        sliderRow.className = 'ball-control-grid';
        sliderRow.append(massControl, restitutionControl);

        card.appendChild(sliderRow);
        ui.ballControlsList.appendChild(card);
    }
}

function updateMetrics(now) {
    if ((now - state.lastHudUpdateAt) < HUD_UPDATE_INTERVAL_MS) {
        return;
    }
    state.lastHudUpdateAt = now;
    renderHudInfo();
}

function getOneDWallsSphereCapacity() {
    const bounds = getViewBounds();
    const xLimit = Math.max(0.2, bounds.halfWidth - SPHERE_RADIUS);
    const minSeparation = (SPHERE_RADIUS * 2) + COLLISION_SEPARATION_EPSILON;
    const availableSpan = Math.max(0, xLimit * 2);
    return Math.max(1, Math.floor(availableSpan / Math.max(0.0001, minSeparation)) + 1);
}

function updateAddBtnState() {
    const oneDCapacity = Math.min(MAX_SPHERES, getOneDWallsSphereCapacity());
    const maxAllowedSpheres = (state.oneD && state.boundaryMode === 'walls') ? oneDCapacity : MAX_SPHERES;
    ui.addBtn.disabled = !state.running || spheres.length >= maxAllowedSpheres;
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
    cachedViewBounds = null;
    cachedViewBoundsFrame = -1;

    ui.tipCanvas.width = Math.max(1, Math.round(rect.width));
    ui.tipCanvas.height = Math.max(1, Math.round(rect.height));
    if (tipCtx) {
        tipCtx.clearRect(0, 0, ui.tipCanvas.width, ui.tipCanvas.height);
        state.tipOverlayVisible = false;
        state.lastDrawVideoTime = -1;
    }

    if (state.oneD && state.boundaryMode === 'walls') {
        stabilizeOneDWallPacking();
        for (const sphere of spheres) {
            sphere.group.position.set(sphere.position.x, sphere.position.y, PLANE_Z);
        }
    }
    updateAddBtnState();
}

let cachedViewBounds = null;
let cachedViewBoundsFrame = -1;
let currentFrameId = 0;

function getViewBounds() {
    if (cachedViewBounds && cachedViewBoundsFrame === currentFrameId) {
        return cachedViewBounds;
    }
    const depth = camera3d.position.z - PLANE_Z;
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera3d.fov * 0.5)) * depth;
    const halfWidth = halfHeight * camera3d.aspect;
    cachedViewBounds = { halfWidth, halfHeight };
    cachedViewBoundsFrame = currentFrameId;
    return cachedViewBounds;
}

function createSphere(colorHex) {
    const material = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: darkenHexColor(colorHex),
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
        colorHex,
        group,
        material,
        position: new THREE.Vector3(0, 0, PLANE_Z),
        spawnPosition: new THREE.Vector3(0, 0, PLANE_Z),
        prevSubstepX: 0,
        integratedSubstepX: 0,
        prevSubstepY: 0,
        velocity: new THREE.Vector3(0, 0, 0),
        mass: DEFAULT_SPHERE_MASS,
        restitution: DEFAULT_SPHERE_RESTITUTION,
        contactCount: 0
    };
}

function addSphere() {
    const oneDCapacity = Math.min(MAX_SPHERES, getOneDWallsSphereCapacity());
    const maxAllowedSpheres = (state.oneD && state.boundaryMode === 'walls') ? oneDCapacity : MAX_SPHERES;
    if (spheres.length >= maxAllowedSpheres) {
        return;
    }

    const colorHex = randomHexColor();
    const sphere = createSphere(colorHex);

    // Place at random position within inner 60% of view bounds
    const bounds = getViewBounds();
    const rangeX = bounds.halfWidth * 0.6;
    const rangeY = state.oneD ? 0 : bounds.halfHeight * 0.6;
    sphere.position.set(
        (Math.random() * 2 - 1) * rangeX,
        rangeY === 0 ? 0 : (Math.random() * 2 - 1) * rangeY,
        PLANE_Z
    );
    sphere.spawnPosition.copy(sphere.position);
    sphere.prevSubstepX = sphere.position.x;
    sphere.integratedSubstepX = sphere.position.x;
    sphere.prevSubstepY = sphere.position.y;
    sphere.group.position.copy(sphere.position);

    scene.add(sphere.group);
    spheres.push(sphere);
    if (state.oneD && state.boundaryMode === 'walls') {
        stabilizeOneDWallPacking();
        sphere.group.position.set(sphere.position.x, sphere.position.y, PLANE_Z);
        for (const existing of spheres) {
            existing.group.position.set(existing.position.x, existing.position.y, PLANE_Z);
        }
    }
    renderBallControls();
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
        sphere.prevSubstepX = sphere.position.x;
        sphere.integratedSubstepX = sphere.position.x;
        sphere.prevSubstepY = sphere.position.y;
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
        if (elapsed > 0 && elapsed < TIP_VELOCITY_MAX_ELAPSED) {
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

function getLandmarkDistance(hand, indexA, indexB) {
    const a = hand[indexA];
    const b = hand[indexB];
    if (!a || !b) {
        return 0;
    }
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function getHandednessScore(result, handIndex) {
    const handednessSets = result && (result.handedness || result.handednesses);
    if (!Array.isArray(handednessSets)) {
        return null;
    }
    const categories = handednessSets[handIndex];
    if (!Array.isArray(categories) || categories.length === 0) {
        return null;
    }
    let maxScore = null;
    for (let i = 0; i < categories.length; i++) {
        const category = categories[i];
        if (!category || !Number.isFinite(category.score)) {
            continue;
        }
        maxScore = maxScore === null ? category.score : Math.max(maxScore, category.score);
    }
    return maxScore;
}

function isLikelyRealHand(hand) {
    if (!Array.isArray(hand) || hand.length < 21) {
        return false;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < 21; i++) {
        const lm = hand[i];
        if (!lm || !Number.isFinite(lm.x) || !Number.isFinite(lm.y)) {
            return false;
        }
        minX = Math.min(minX, lm.x);
        minY = Math.min(minY, lm.y);
        maxX = Math.max(maxX, lm.x);
        maxY = Math.max(maxY, lm.y);
    }

    const boxWidth = maxX - minX;
    const boxHeight = maxY - minY;
    const bboxArea = boxWidth * boxHeight;
    if (bboxArea < HAND_MIN_BBOX_AREA || Math.max(boxWidth, boxHeight) < HAND_MIN_SPAN) {
        return false;
    }

    const palmWidth = getLandmarkDistance(hand, 5, 17);
    if (palmWidth < HAND_MIN_PALM_WIDTH) {
        return false;
    }

    const palm = getPalmLandmark(hand);
    if (!palm) {
        return false;
    }

    let tipSpreadSum = 0;
    for (let i = 0; i < FINGERTIP_POINTS.length; i++) {
        const tip = hand[FINGERTIP_POINTS[i]];
        tipSpreadSum += Math.hypot(tip.x - palm.x, tip.y - palm.y);
    }
    const avgTipSpread = tipSpreadSum / FINGERTIP_POINTS.length;
    if (avgTipSpread < palmWidth * HAND_MIN_TIP_SPREAD_SCALE) {
        return false;
    }

    let validFingerChains = 0;
    for (let chainIndex = 0; chainIndex < FINGER_CHAINS.length; chainIndex++) {
        const chain = FINGER_CHAINS[chainIndex];
        const chainLength =
            getLandmarkDistance(hand, chain[0], chain[1]) +
            getLandmarkDistance(hand, chain[1], chain[2]) +
            getLandmarkDistance(hand, chain[2], chain[3]);
        const requiredScale = chainIndex === 0
            ? HAND_MIN_THUMB_CHAIN_SCALE
            : HAND_MIN_FINGER_CHAIN_SCALE;
        if (chainLength >= palmWidth * requiredScale) {
            validFingerChains += 1;
        }
    }

    return validFingerChains >= HAND_MIN_VALID_FINGER_CHAINS;
}

function extractReliableHands(result) {
    const landmarks = result && Array.isArray(result.landmarks) ? result.landmarks : [];
    if (landmarks.length === 0) {
        return [];
    }
    const reliableHands = [];
    for (let i = 0; i < landmarks.length; i++) {
        const hand = landmarks[i];
        if (!isLikelyRealHand(hand)) {
            continue;
        }
        const handednessScore = getHandednessScore(result, i);
        if (handednessScore !== null && handednessScore < HAND_MIN_HANDEDNESS_SCORE) {
            continue;
        }
        reliableHands.push(hand);
    }
    return reliableHands;
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

    const hasOverlayContent = state.lastHands.length > 0 || state.trackedTips.length > 0;
    if (!hasOverlayContent) {
        if (!state.tipOverlayVisible) {
            return;
        }
        tipCtx.clearRect(0, 0, ui.tipCanvas.width, ui.tipCanvas.height);
        state.tipOverlayVisible = false;
        state.lastDrawVideoTime = state.lastVideoTime;
        return;
    }

    if (state.lastDrawVideoTime === state.lastVideoTime) {
        return;
    }
    state.lastDrawVideoTime = state.lastVideoTime;
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

    state.tipOverlayVisible = true;
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
const GRIP_MEMORY_HOLD_MAX_SPEED = 0.45;
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
const MAX_PUSH_ACCEL = 50.0;
const MAX_IMPULSE = 25.0;
const SHELL_IMPULSE_BOOST = 1.15;
const TIP_VELOCITY_MAX_ELAPSED = 0.12;
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
const ONE_D_CONTACT_Y_TOLERANCE = SPHERE_RADIUS * 1.4;

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

function clearAllGripStates(applyVelocity = false) {
    for (const gripState of handGripStates.values()) {
        releaseGripState(gripState, applyVelocity);
    }
    handGripStates.clear();
    frameGrippedSpheres.clear();
    releaseHandSuppression.clear();
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
    const clampedVelY = state.oneD ? 0 : Math.max(-GRIP_MAX_HOLD_SPEED, Math.min(GRIP_MAX_HOLD_SPEED, velY || 0));
    sphere.position.x = worldX;
    sphere.position.y = state.oneD ? 0 : worldY;
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

function shouldHoldGripFromMemory(gripState) {
    if (!gripState || !gripState.sphere) {
        return false;
    }
    if (state.oneD) {
        return false;
    }
    const carrySpeed = Math.hypot(
        gripState.carryVelX || 0,
        state.oneD ? 0 : (gripState.carryVelY || 0)
    );
    const sphereSpeed = Math.hypot(
        gripState.sphere.velocity.x || 0,
        state.oneD ? 0 : (gripState.sphere.velocity.y || 0)
    );
    return Math.max(carrySpeed, sphereSpeed) <= GRIP_MEMORY_HOLD_MAX_SPEED;
}

function applyTipForces(dt, profile) {
    frameGrippedSpheres.clear();
    updateReleaseHandSuppression(dt);
    if (spheres.length === 0) {
        handGripStates.clear();
        releaseHandSuppression.clear();
        return 0;
    }
    if (state.oneD && handGripStates.size > 0) {
        clearAllGripStates(false);
    }

    let totalContacts = 0;
    newContacts.clear();

    const precaptureSpheres = new Set();
    const visibleHands = new Set();
    const idleOpenPalmHands = new Set();
    for (let handIndex = 0; handIndex < state.lastHands.length; handIndex++) {
        const handKey = String(handIndex);
        visibleHands.add(handKey);
        const hand = state.lastHands[handIndex];
        if (state.oneD) {
            continue;
        }
        const gripState = getOrCreateHandGripState(handKey);
        gripState.lostFrames = 0;
        const gripPose = analyzeHandGripPose(hand);
        if (!gripPose) {
            const fallbackPalm = getPalmLandmark(hand);
            if (gripState && gripState.sphere && fallbackPalm) {
                if (holdSphereWithHand(gripState.sphere, handIndex, fallbackPalm, gripState)) {
                    frameGrippedSpheres.add(gripState.sphere);
                }
            } else if (gripState && gripState.sphere) {
                gripState.lostFrames += 1;
                if (!shouldHoldGripFromMemory(gripState)) {
                    releaseGripState(gripState, false);
                } else if (gripState.lostFrames <= GRIP_TRACK_LOST_GRACE_FRAMES && holdSphereFromMemory(gripState, dt)) {
                    frameGrippedSpheres.add(gripState.sphere);
                } else {
                    releaseGripState(gripState, false);
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
                const shouldUseMemoryHold =
                    shouldHoldGripFromMemory(gripState) &&
                    gripState.lostFrames <= GRIP_TRACK_LOST_GRACE_FRAMES;
                if (shouldUseMemoryHold && holdSphereFromMemory(gripState, dt)) {
                    frameGrippedSpheres.add(gripState.sphere);
                    continue;
                }
                releaseGripState(gripState, false);
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
        if (state.oneD && isPalm) {
            continue;
        }
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
            if (state.oneD) {
                const laneOffsetY = Math.abs((sphere.position.y || 0) - tip.worldY);
                if (laneOffsetY > ONE_D_CONTACT_Y_TOLERANCE) {
                    continue;
                }
            }

            scratch.normal.set(
                sphere.position.x - tip.worldX,
                state.oneD ? 0 : (sphere.position.y - tip.worldY),
                0
            );

            const tipSpeed = state.oneD ? Math.abs(tip.velX) : Math.hypot(tip.velX, tip.velY);
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
                scratch.normal.set(state.oneD ? 1 : 0, state.oneD ? 0 : 1, 0);
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
            const sphereMass = clampSphereMass(sphere.mass);

            const nxF = scratch.normal.x;
            const nyF = state.oneD ? 0 : scratch.normal.y;

            const relVelAlongNormal =
                (tip.velX - sphere.velocity.x) * nxF +
                (state.oneD ? 0 : (tip.velY - sphere.velocity.y) * nyF);

            if (corePenetration > 0) {
                // Spring-damper: pushes sphere away from tip, damps inward sphere motion
                const inwardSpeed = Math.min(
                    (sphere.velocity.x * nxF) + (state.oneD ? 0 : sphere.velocity.y * nyF),
                    0
                );
                const pushForce = (profile.spring * corePenetration) - (profile.damping * inwardSpeed);
                let pushAccel = pushForce / sphereMass;

                pushAccel = Math.min(pushAccel, MAX_PUSH_ACCEL);

                sphere.position.x += nxF * corePenetration * profile.correction * contactScale;
                sphere.velocity.x += nxF * pushAccel * dt * contactScale;
                if (!state.oneD) {
                    sphere.position.y += nyF * corePenetration * profile.correction * contactScale;
                    sphere.velocity.y += nyF * pushAccel * dt * contactScale;
                }
            }

            // First-contact velocity impulse
            if (!activeContacts.has(contactKey) && handInfluenceScale >= 0.999) {
                const minApproachSpeed = PUSH_MIN_APPROACH_SPEED * (isPalm ? PALM_MIN_APPROACH_SPEED_SCALE : 1);
                if (relVelAlongNormal > minApproachSpeed) {
                    let impulse = (relVelAlongNormal * profile.velocityTransfer) / sphereMass;
                    if (corePenetration <= 0 && radiusBoost > 0) {
                        impulse *= SHELL_IMPULSE_BOOST;
                    }
                    if (isPalm) {
                        impulse *= PALM_IMPULSE_SCALE;
                    }
                    impulse = Math.min(impulse, MAX_IMPULSE);
                    sphere.velocity.x += nxF * impulse * contactScale;
                    if (!state.oneD) {
                        sphere.velocity.y += nyF * impulse * contactScale;
                    }
                }
            }

            if (!isPalm && profile.stickPull > 0 && corePenetration > 0 && distance > 0.000001) {
                const toTipX = tip.worldX - sphere.position.x;
                const invDistance = 1 / distance;
                const stickFactor = corePenetration / profile.contactRadius;
                const stickAccel = profile.stickPull / sphereMass;
                sphere.velocity.x += toTipX * invDistance * stickAccel * stickFactor * dt * contactScale;
                sphere.position.x += toTipX * profile.stickCapture * stickFactor * dt * contactScale;
                if (!state.oneD) {
                    const toTipY = tip.worldY - sphere.position.y;
                    sphere.velocity.y += toTipY * invDistance * stickAccel * stickFactor * dt * contactScale;
                    sphere.position.y += toTipY * profile.stickCapture * stickFactor * dt * contactScale;
                }
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

        if (!Number.isFinite(sphere.position.x) || !Number.isFinite(sphere.position.y)) {
            sphere.position.set(0, 0, PLANE_Z);
            sphere.velocity.set(0, 0, 0);
            return;
        }

        if (sphere.position.x > xWrapLimit) {
            sphere.position.x -= xSpan * Math.ceil((sphere.position.x - xWrapLimit) / xSpan);
        } else if (sphere.position.x < -xWrapLimit) {
            sphere.position.x += xSpan * Math.ceil((-xWrapLimit - sphere.position.x) / xSpan);
        }
        if (sphere.position.y > yWrapLimit) {
            sphere.position.y -= ySpan * Math.ceil((sphere.position.y - yWrapLimit) / ySpan);
        } else if (sphere.position.y < -yWrapLimit) {
            sphere.position.y += ySpan * Math.ceil((-yWrapLimit - sphere.position.y) / ySpan);
        }

        sphere.position.z = PLANE_Z;
        sphere.velocity.z = 0;
        if (state.oneD) {
            sphere.position.y = 0;
            sphere.velocity.y = 0;
        }
        return;
    }

    const xLimit = Math.max(0.2, bounds.halfWidth - SPHERE_RADIUS);
    const yLimit = Math.max(0.2, bounds.halfHeight - SPHERE_RADIUS);
    const restitution = IDEAL_WALL_RESTITUTION * clampSphereRestitution(sphere.restitution);

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

    if (state.oneD) {
        sphere.position.y = 0;
        sphere.velocity.y = 0;
    }
}

function isPinnedSphere(sphere) {
    return frameGrippedSpheres.has(sphere) || sphere === state.selectedSphere;
}

function getOneDCollisionNormalX(a, b, dx) {
    const prevDx = (b.prevSubstepX ?? b.position.x) - (a.prevSubstepX ?? a.position.x);
    if (Math.abs(prevDx) > 0.000001) {
        return prevDx >= 0 ? 1 : -1;
    }
    if (Math.abs(dx) > 0.000001) {
        return dx >= 0 ? 1 : -1;
    }
    const relVelX = b.velocity.x - a.velocity.x;
    if (Math.abs(relVelX) > 0.000001) {
        // Oppose relative motion so coincident centers can still resolve with an impulse.
        return relVelX >= 0 ? -1 : 1;
    }
    return 1;
}

function didOneDCentersCrossThisSubstep(a, b) {
    const prevDx = (b.prevSubstepX ?? b.position.x) - (a.prevSubstepX ?? a.position.x);
    const currDx = (b.integratedSubstepX ?? b.position.x) - (a.integratedSubstepX ?? a.position.x);
    return (prevDx > 0 && currDx < 0) || (prevDx < 0 && currDx > 0);
}

function stabilizeOneDWallPacking() {
    if (!state.oneD || state.boundaryMode !== 'walls' || spheres.length < 2) {
        return;
    }
    if (spheres.some(isPinnedSphere)) {
        return;
    }

    const bounds = getViewBounds();
    const xLimit = Math.max(0.2, bounds.halfWidth - SPHERE_RADIUS);
    const minSeparation = (SPHERE_RADIUS * 2) + COLLISION_SEPARATION_EPSILON;
    const ordered = [...spheres].sort((a, b) => a.position.x - b.position.x);
    const count = ordered.length;
    const availableSpan = xLimit * 2;
    const requiredSpan = minSeparation * (count - 1);
    const violationTolerance = COLLISION_SEPARATION_EPSILON * 0.5;

    let hasViolation = false;
    for (let i = 0; i < count; i++) {
        const sphere = ordered[i];
        if (sphere.position.x > xLimit + violationTolerance || sphere.position.x < -xLimit - violationTolerance) {
            hasViolation = true;
            break;
        }
    }
    if (!hasViolation) {
        for (let i = 0; i < count - 1; i++) {
            const gap = ordered[i + 1].position.x - ordered[i].position.x;
            if (gap < (minSeparation - violationTolerance)) {
                hasViolation = true;
                break;
            }
        }
    }
    if (!hasViolation) {
        return;
    }

    if (requiredSpan > availableSpan + 0.000001) {
        // Not enough horizontal room: spread as evenly as possible to minimize overlap.
        const spacing = availableSpan / Math.max(1, count - 1);
        for (let i = 0; i < count; i++) {
            const sphere = ordered[i];
            sphere.position.x = -xLimit + (spacing * i);
            sphere.position.y = 0;
            sphere.velocity.y = 0;
        }
        return;
    }

    const lowerBounds = new Array(count);
    const upperBounds = new Array(count);
    lowerBounds[0] = -xLimit;
    for (let i = 1; i < count; i++) {
        lowerBounds[i] = lowerBounds[i - 1] + minSeparation;
    }
    upperBounds[count - 1] = xLimit;
    for (let i = count - 2; i >= 0; i--) {
        upperBounds[i] = upperBounds[i + 1] - minSeparation;
    }

    for (let pass = 0; pass < ONE_D_STACK_STABILIZATION_PASSES; pass++) {
        ordered[0].position.x = Math.min(upperBounds[0], Math.max(lowerBounds[0], ordered[0].position.x));
        for (let i = 1; i < count; i++) {
            const clamped = Math.min(upperBounds[i], Math.max(lowerBounds[i], ordered[i].position.x));
            ordered[i].position.x = Math.max(clamped, ordered[i - 1].position.x + minSeparation);
        }

        ordered[count - 1].position.x = Math.min(upperBounds[count - 1], Math.max(lowerBounds[count - 1], ordered[count - 1].position.x));
        for (let i = count - 2; i >= 0; i--) {
            const clamped = Math.min(upperBounds[i], Math.max(lowerBounds[i], ordered[i].position.x));
            ordered[i].position.x = Math.min(clamped, ordered[i + 1].position.x - minSeparation);
        }
    }

    for (const sphere of ordered) {
        sphere.position.y = 0;
        sphere.velocity.y = 0;
    }
}


function getSweptCollisionNormal2D(a, b, diameter) {
    const startRelX = (b.prevSubstepX ?? b.position.x) - (a.prevSubstepX ?? a.position.x);
    const startRelY = (b.prevSubstepY ?? b.position.y) - (a.prevSubstepY ?? a.position.y);
    const endRelX = b.position.x - a.position.x;
    const endRelY = b.position.y - a.position.y;
    const relStepX = endRelX - startRelX;
    const relStepY = endRelY - startRelY;

    const startDistSq = (startRelX * startRelX) + (startRelY * startRelY);
    const endDistSq = (endRelX * endRelX) + (endRelY * endRelY);
    const diameterSq = diameter * diameter;

    if (startDistSq <= diameterSq || endDistSq >= startDistSq) {
        return null;
    }

    const aCoeff = (relStepX * relStepX) + (relStepY * relStepY);
    if (aCoeff <= 1e-12) {
        return null;
    }

    const bCoeff = 2 * ((startRelX * relStepX) + (startRelY * relStepY));
    const cCoeff = startDistSq - diameterSq;
    const discriminant = (bCoeff * bCoeff) - (4 * aCoeff * cCoeff);
    if (discriminant < 0) {
        return null;
    }

    const sqrtDisc = Math.sqrt(discriminant);
    const invDenominator = 1 / (2 * aCoeff);
    const tEnter = (-bCoeff - sqrtDisc) * invDenominator;
    const tExit = (-bCoeff + sqrtDisc) * invDenominator;
    let toi = null;

    if (tEnter >= 0 && tEnter <= 1) {
        toi = tEnter;
    } else if (tExit >= 0 && tExit <= 1) {
        toi = tExit;
    }

    if (toi === null) {
        return null;
    }

    const hitRelX = startRelX + (relStepX * toi);
    const hitRelY = startRelY + (relStepY * toi);
    const hitLen = Math.hypot(hitRelX, hitRelY);
    if (hitLen <= 1e-6) {
        return null;
    }

    return {
        nx: hitRelX / hitLen,
        ny: hitRelY / hitLen
    };
}

function resolveSphereCollisions(applyVelocity = true) {
    const diameter = SPHERE_RADIUS * 2;
    const diameterSq = diameter * diameter;
    const velocityContactDistance = diameter + COLLISION_SEPARATION_EPSILON;
    const velocityContactDistanceSq = velocityContactDistance * velocityContactDistance;
    const is1D = state.oneD;
    const allowSweptOneDCollision = is1D && state.boundaryMode === 'walls' && applyVelocity;
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
            const dy = is1D ? 0 : (b.position.y - a.position.y);
            const distSq = (dx * dx) + (dy * dy);
            const contactLimitSq = applyVelocity ? velocityContactDistanceSq : diameterSq;
            const crossedInStep = allowSweptOneDCollision ? didOneDCentersCrossThisSubstep(a, b) : false;
            const sweptHit2D = (!is1D && applyVelocity) ? getSweptCollisionNormal2D(a, b, diameter) : null;

            if (distSq > contactLimitSq && !crossedInStep && !sweptHit2D) {
                continue;
            }

            let nx = 0;
            let ny = 0;
            let dist = Math.sqrt(Math.max(0, distSq));

            if (is1D) {
                // In 1D mode, collision normal is always along x-axis
                nx = getOneDCollisionNormalX(a, b, dx);
                ny = 0;
                dist = Math.abs(dx);
            } else if (sweptHit2D) {
                nx = sweptHit2D.nx;
                ny = sweptHit2D.ny;
                dist = Math.min(dist, diameter);
            } else if (dist > 0.000001) {
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
            if (penetration <= 0 && !applyVelocity) {
                continue;
            }
            const invMassA = aPinned ? 0 : (1 / clampSphereMass(a.mass));
            const invMassB = bPinned ? 0 : (1 / clampSphereMass(b.mass));
            const invMassSum = invMassA + invMassB;
            if (invMassSum <= 0) {
                continue;
            }

            if (penetration > 0) {
                // Position correction with small bias so contacts don't sink.
                const correction = (penetration + COLLISION_SEPARATION_EPSILON) / invMassSum;
                a.position.x -= nx * correction * invMassA;
                b.position.x += nx * correction * invMassB;
                if (!is1D) {
                    a.position.y -= ny * correction * invMassA;
                    b.position.y += ny * correction * invMassB;
                }
            } else if (is1D && crossedInStep) {
                // Reorder tunneled 1D pairs back to a touching state before impulse.
                const desiredSeparation = diameter + COLLISION_SEPARATION_EPSILON;
                const currentSeparationAlongNormal = (b.position.x - a.position.x) * nx;
                const correctionNeeded = desiredSeparation - currentSeparationAlongNormal;
                if (correctionNeeded > 0) {
                    const correction = correctionNeeded / invMassSum;
                    a.position.x -= nx * correction * invMassA;
                    b.position.x += nx * correction * invMassB;
                }
            }

            if (!applyVelocity) {
                continue;
            }

            // Resolve normal velocity with inverse-mass impulse.
            const relVelN = (b.velocity.x - a.velocity.x) * nx + (is1D ? 0 : (b.velocity.y - a.velocity.y) * ny);

            // Only resolve if spheres are approaching
            if (relVelN >= 0) {
                continue;
            }

            const pairRestitution = Math.min(
                clampSphereRestitution(a.restitution),
                clampSphereRestitution(b.restitution)
            );
            const impulse = (-(1 + pairRestitution) * relVelN) / invMassSum;
            a.velocity.x -= impulse * nx * invMassA;
            b.velocity.x += impulse * nx * invMassB;
            if (!is1D) {
                a.velocity.y -= impulse * ny * invMassA;
                b.velocity.y += impulse * ny * invMassB;
            }
        }
    }
}

function updatePhysics(dt, profile) {
    if (spheres.length === 0) {
        return;
    }

    const substeps = state.oneD ? PHYSICS_SUBSTEPS_1D : PHYSICS_SUBSTEPS;
    const subDt = dt / substeps;
    for (let substep = 0; substep < substeps; substep++) {
        const positionIterations = state.oneD ? COLLISION_SOLVER_POSITION_ITERATIONS_1D : COLLISION_SOLVER_POSITION_ITERATIONS;
        const velocityIterations = state.oneD ? COLLISION_SOLVER_VELOCITY_ITERATIONS_1D : COLLISION_SOLVER_VELOCITY_ITERATIONS;

        for (const sphere of spheres) {
            sphere.prevSubstepX = sphere.position.x;
            sphere.integratedSubstepX = sphere.position.x;
            sphere.prevSubstepY = sphere.position.y;
        }

        for (const sphere of spheres) {
            if (isPinnedSphere(sphere)) {
                continue;
            }

            if (!state.oneD) {
                sphere.velocity.y -= state.gravity * GRAVITY_SCALE * subDt;
            }
            sphere.position.x += sphere.velocity.x * subDt;
            if (!state.oneD) {
                sphere.position.y += sphere.velocity.y * subDt;
            }
            constrainSphereToView(sphere, profile);
            sphere.integratedSubstepX = sphere.position.x;

            const linearDrag = Math.exp(-profile.airDrag * subDt);
            sphere.velocity.x *= linearDrag;
            sphere.velocity.y *= linearDrag;
        }

        // Position solver iterations to prevent visible overlap.
        for (let iter = 0; iter < positionIterations; iter++) {
            resolveSphereCollisions(false);
            for (const sphere of spheres) {
                if (!isPinnedSphere(sphere)) {
                    constrainSphereToView(sphere, profile);
                }
            }
        }
        if (state.oneD && state.boundaryMode === 'walls') {
            stabilizeOneDWallPacking();
        }

        // Iterative velocity solver improves simultaneous-contact chains.
        for (let iter = 0; iter < velocityIterations; iter++) {
            resolveSphereCollisions(true);
            for (const sphere of spheres) {
                if (!isPinnedSphere(sphere)) {
                    constrainSphereToView(sphere, profile);
                }
            }
        }
        if (state.oneD && state.boundaryMode === 'walls') {
            stabilizeOneDWallPacking();
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
        const rate = sphere.contactCount > 0 ? 12.0 : 4.0;
        const alpha = 1 - Math.exp(-rate * dt);
        sphere.material.emissiveIntensity += (target - sphere.material.emissiveIntensity) * alpha;
    }
}

function step(now) {
    if (!state.running) {
        return;
    }

    if (document.hidden) {
        state.lastFrameTime = now;
        requestAnimationFrame(step);
        return;
    }

    currentFrameId += 1;

    if (!state.lastFrameTime) {
        state.lastFrameTime = now;
        requestAnimationFrame(step);
        return;
    }
    const dt = Math.min((now - state.lastFrameTime) / 1000, 1 / 20);
    state.lastFrameTime = now;
    const instantFps = 1 / Math.max(dt, 0.0001);
    state.fps = state.fps ? (state.fps * 0.9) + (instantFps * 0.1) : instantFps;

    if (state.handLandmarker && ui.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const currentVideoTime = ui.video.currentTime;
        if (currentVideoTime !== state.lastVideoTime && now >= state.nextHandDetectAt) {
            state.lastVideoTime = currentVideoTime;
            try {
                const result = state.handLandmarker.detectForVideo(ui.video, now);
                state.lastHands = extractReliableHands(result);
                state.nextHandDetectAt = now + (state.lastHands.length > 0 ? 0 : HAND_TRACKING_IDLE_INTERVAL_MS);
            } catch (error) {
                state.lastHands = [];
                state.nextHandDetectAt = now + HAND_TRACKING_IDLE_INTERVAL_MS;
                if (now >= state.nextTrackingErrorReportAt) {
                    state.nextTrackingErrorReportAt = now + 2000;
                    const message = error && error.message ? error.message : String(error);
                    console.error('Hand tracking frame failed:', error);
                    setStatus(`Tracking hiccup: ${message}. Continuing...`, true);
                }
            }
        }
    }

    state.handsCount = state.lastHands.length;
    state.trackedTips = collectTrackedTips();
    state.tipCount = state.trackedTips.length;
    const profile = getInteractionProfile();
    state.contactsCount = applyTipForces(dt, profile);
    updatePhysics(dt, profile);
    updateGlow(dt);
    drawTrackedTips();
    updateMetrics(now);
    renderer.render(scene, camera3d);

    requestAnimationFrame(step);
}

// Raycaster for mouse/touch selection
const raycaster = new THREE.Raycaster();
const mouseVector = new THREE.Vector2();

function handleStageClick(event) {
    if (spheres.length === 0) return;
    if (ui.selectionOverlay.style.display !== 'none') return;
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
    sphere.velocity.set(0, 0, 0);
    ui.selectionOverlay.style.display = 'flex';
    ui.cancelTargetBtn.focus();
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
        renderBallControls();
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
    renderBallControls();
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
        numHands: 2,
        minHandDetectionConfidence: HAND_MIN_DETECTION_CONFIDENCE,
        minHandPresenceConfidence: HAND_MIN_PRESENCE_CONFIDENCE,
        minTrackingConfidence: HAND_MIN_TRACKING_CONFIDENCE
    });
}

async function populateCameraList() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === 'videoinput');
        if (videoDevices.length <= 1) {
            const activeDeviceId = getActiveStreamDeviceId();
            if (activeDeviceId) {
                savePreferredCameraId(activeDeviceId);
            }
            return;
        }
        ui.cameraSelect.innerHTML = '';
        videoDevices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.deviceId;
            option.textContent = device.label || `Camera ${index + 1}`;
            ui.cameraSelect.appendChild(option);
        });

        // Prefer active stream device, otherwise remembered preference.
        const activeDeviceId = getActiveStreamDeviceId();
        if (hasCameraOption(activeDeviceId)) {
            ui.cameraSelect.value = activeDeviceId;
            savePreferredCameraId(activeDeviceId);
        } else {
            const preferredDeviceId = loadPreferredCameraId();
            if (hasCameraOption(preferredDeviceId)) {
                ui.cameraSelect.value = preferredDeviceId;
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
            video: buildVideoConstraints(deviceId),
            audio: false
        });
        ui.video.srcObject = nextStream;
        await ui.video.play();
        state.stream = nextStream;
        state.lastVideoTime = -1;
        state.lastDrawVideoTime = -1;
        state.nextHandDetectAt = 0;
        state.tipOverlayVisible = false;

        if (previousStream && previousStream !== nextStream) {
            previousStream.getTracks().forEach((track) => track.stop());
        }

        if (hasCameraOption(deviceId)) {
            ui.cameraSelect.value = deviceId;
        }
        const activeDeviceId = getActiveStreamDeviceId(nextStream);
        savePreferredCameraId(activeDeviceId || deviceId);
        setStatus('Camera switched.');
    } catch (error) {
        const message = error && error.message ? error.message : String(error);
        const name = error && error.name ? error.name : '';
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

            if (hasCameraOption(previousDeviceId)) {
                ui.cameraSelect.value = previousDeviceId;
            }
            if (previousDeviceId) {
                savePreferredCameraId(previousDeviceId);
            }

            setStatus(`Could not switch camera: ${message}. Keeping current camera.`, true);
        } else {
            state.stream = null;
            if (name === 'NotFoundError' || name === 'OverconstrainedError') {
                savePreferredCameraId('');
            }
            setStatus(`Could not switch camera: ${message}`, true);
        }
    } finally {
        ui.cameraSelect.disabled = ui.cameraSelect.options.length <= 1;
    }
}

function setStreamTracksEnabled(enabled) {
    if (!state.stream) {
        return;
    }
    const tracks = state.stream.getVideoTracks();
    for (let i = 0; i < tracks.length; i++) {
        tracks[i].enabled = enabled;
    }
}

function handleVisibilityChange() {
    if (!state.running) {
        return;
    }

    if (document.hidden) {
        setStreamTracksEnabled(false);
        state.lastFrameTime = 0;
        state.lastDrawVideoTime = -1;
        state.nextHandDetectAt = 0;
        setStatus('Paused in background to save battery.');
        return;
    }

    setStreamTracksEnabled(true);
    state.lastFrameTime = performance.now();
    state.lastVideoTime = -1;
    state.lastDrawVideoTime = -1;
    state.nextHandDetectAt = 0;
    if (ui.video.paused) {
        void ui.video.play().catch((error) => {
            console.warn('Could not resume camera playback after background pause:', error);
        });
    }
    setStatus('Ready.');
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
            let nextStream = null;
            const preferredCameraId = loadPreferredCameraId();

            if (preferredCameraId) {
                try {
                    nextStream = await navigator.mediaDevices.getUserMedia({
                        video: buildVideoConstraints(preferredCameraId),
                        audio: false
                    });
                } catch (preferredError) {
                    const preferredName = preferredError && preferredError.name ? preferredError.name : 'Error';
                    console.warn(
                        `Preferred camera unavailable (${preferredName}). Falling back to default camera.`,
                        preferredError
                    );
                    if (preferredName === 'NotFoundError' || preferredName === 'OverconstrainedError') {
                        savePreferredCameraId('');
                    }
                }
            }

            if (!nextStream) {
                nextStream = await navigator.mediaDevices.getUserMedia({
                    video: buildVideoConstraints(),
                    audio: false
                });
            }

            state.stream = nextStream;
        }

        if (ui.video.srcObject !== state.stream) {
            ui.video.srcObject = state.stream;
        }
        await ui.video.play();
        await populateCameraList();
        const activeDeviceId = getActiveStreamDeviceId();
        if (activeDeviceId) {
            savePreferredCameraId(activeDeviceId);
        }
    } catch (error) {
        if (state.stream && state.stream.getTracks().every((track) => track.readyState !== 'live')) {
            state.stream = null;
        }
        ui.startBtn.disabled = false;
        updateStartButtonState();
        const name = error && error.name ? error.name : 'Error';
        const message = error && error.message ? error.message : String(error);
        console.error('Camera/tracking startup failed:', error);

        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
            setStatus('Camera access required. Click "Start Camera" to allow.');
        } else {
            setStatus(`Could not access camera (${name}): ${message}`, true);
        }
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
    state.nextHandDetectAt = 0;
    state.lastHudUpdateAt = 0;
    if (spheres.length === 0) {
        addSphere();
    }
    updateAddBtnState();
    ui.resetBtn.disabled = false;
    ui.startBtn.disabled = false;
    updateStartButtonState();
    if (document.hidden) {
        setStreamTracksEnabled(false);
        setStatus('Paused in background to save battery.');
    } else {
        setStatus('Ready.');
    }
    requestAnimationFrame(step);
}

function stopCameraAndTracking() {
    state.running = false;
    state.lastFrameTime = 0;
    state.fps = 0;
    state.lastVideoTime = -1;
    state.lastDrawVideoTime = -1;
    state.nextHandDetectAt = 0;
    state.lastHudUpdateAt = 0;
    state.tipOverlayVisible = false;
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

ui.hud.classList.remove('hidden');

ui.cameraSelect.addEventListener('change', () => {
    if (state.running && ui.cameraSelect.value) {
        switchCamera(ui.cameraSelect.value);
    }
});
ui.wallsToggle.addEventListener('change', () => {
    state.boundaryMode = ui.wallsToggle.checked ? 'walls' : 'wrap';
    updateBoundaryModeUI();
    if (state.oneD && state.boundaryMode === 'walls') {
        stabilizeOneDWallPacking();
        for (const sphere of spheres) {
            sphere.group.position.set(sphere.position.x, sphere.position.y, PLANE_Z);
        }
    }
    updateAddBtnState();
    if (state.boundaryMode === 'wrap') {
        setStatus('Walls removed. Spheres now wrap across edges.');
    } else {
        setStatus('Walls enabled. Spheres now bounce at edges.');
    }
});
ui.oneDToggle.addEventListener('change', () => {
    state.oneD = ui.oneDToggle.checked;
    if (state.oneD) {
        clearAllGripStates(false);
        for (const sphere of spheres) {
            sphere.position.y = 0;
            sphere.velocity.y = 0;
            sphere.spawnPosition.y = 0;
            sphere.group.position.y = 0;
        }
        if (state.boundaryMode === 'walls') {
            stabilizeOneDWallPacking();
            for (const sphere of spheres) {
                sphere.group.position.set(sphere.position.x, sphere.position.y, PLANE_Z);
            }
        }
        setStatus('1D mode: spheres move horizontally only.');
    } else {
        setStatus('2D mode restored.');
    }
    updateAddBtnState();
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

window.addEventListener('resize', scheduleResizeStage);
window.addEventListener('orientationchange', scheduleResizeStage);
if (window.visualViewport && typeof window.visualViewport.addEventListener === 'function') {
    window.visualViewport.addEventListener('resize', scheduleResizeStage);
}
document.addEventListener('fullscreenchange', updateFullscreenUI);
document.addEventListener('webkitfullscreenchange', updateFullscreenUI);
document.addEventListener('visibilitychange', handleVisibilityChange);
if ('ResizeObserver' in window) {
    new ResizeObserver(scheduleResizeStage).observe(ui.stage);
}

ui.canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    setStatus('WebGL context lost. Waiting for recovery...', true);
});
ui.canvas.addEventListener('webglcontextrestored', () => {
    setStatus('WebGL context restored.');
    resizeStage();
    if (state.running) {
        renderer.render(scene, camera3d);
    }
});

window.addEventListener('beforeunload', () => {
    if (state.stream) {
        state.stream.getTracks().forEach((track) => track.stop());
    }
    sharedSphereGeometry.dispose();
    sharedWireMaterial.dispose();
    renderer.dispose();
});

ui.wallsToggle.checked = state.boundaryMode === 'walls';
ui.oneDToggle.checked = state.oneD;
updateBoundaryModeUI();
ui.sensitivityRange.value = state.sensitivity.toFixed(1);
updateSensitivityLabel();
ui.gravityRange.value = state.gravity.toFixed(2);
updateGravityLabel();
ui.airDragRange.value = state.airDrag.toFixed(2);
updateAirDragLabel();
renderBallControls();
updateStartButtonState();
renderHudInfo();
updateFullscreenUI();
resizeStage();
renderer.render(scene, camera3d);
startCameraAndTracking();
