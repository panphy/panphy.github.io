

const hiddenVideo = document.getElementById('hiddenVideo');
const openVideoButton = document.getElementById('openVideo');
const emptyImportButton = document.getElementById('emptyImport');
const emptySampleButton = document.getElementById('emptySample');
const videoUploadInput = document.getElementById('videoUploadInput');
const playPauseButton = document.getElementById('playPause');
const playPauseIcon = document.getElementById('playPauseIcon');
const previousFrameButton = document.getElementById('previousFrame');
const nextFrameButton = document.getElementById('nextFrame');
const frameStepSelect = document.getElementById('frameStep');
const calibrateButton = document.getElementById('calibrate');
const setOriginButton = document.getElementById('setOrigin');
const exportDataButton = document.getElementById('exportData');
const exportPanPhyPlotButton = document.getElementById('exportPanPhyPlot');
const clearButton = document.getElementById('clearButton');
const setupButton = document.getElementById('setupButton');
const setupMenu = document.getElementById('setupMenu');
const manualModeButton = document.getElementById('manualMode');
const clearMenu = document.getElementById('clearMenu');
const clearDataPointsButton = document.getElementById('clearDataPoints');
const clearCalibrationButton = document.getElementById('clearCalibration');
const clearOriginButton = document.getElementById('clearOrigin');
const clearVideoButton = document.getElementById('clearVideo');
const undoPointButton = document.getElementById('undoPoint');
const redoPointButton = document.getElementById('redoPoint');
const selectMarksButton = document.getElementById('selectMarks');
const deleteSelectedButton = document.getElementById('deleteSelected');
const plotPositionButton = document.getElementById('plotPosition');
const plotVelocityButton = document.getElementById('plotVelocity');
const plotCompXButton = document.getElementById('plotCompX');
const plotCompYButton = document.getElementById('plotCompY');
const plotCompXYButton = document.getElementById('plotCompXY');
const hideCrossesToggle = document.getElementById('hideCrossesToggle');
const autoTrackToggle = document.getElementById('autoTrackToggle');
const autoStopButton = document.getElementById('autoStop');
const chartCanvasContainer = document.getElementById('chartCanvasContainer');
const chartCopyActionButton = document.getElementById('chartCopyAction');
const graphEmpty = document.getElementById('graphEmpty');
const graphHint = document.getElementById('graphHint');
const graphControls = document.getElementById('graphControls');
const graphView = document.getElementById('graphView');
const pointEditor = document.getElementById('pointEditor');
const showGraphTab = document.getElementById('showGraph');
const showPointsTab = document.getElementById('showPoints');
const messageBar = document.getElementById('messageBar');
const messageEl = document.getElementById('message');
const modeCancelButton = document.getElementById('modeCancel');
const videoStage = document.getElementById('videoStage');
const videoWrapper = document.getElementById('videoWrapper');
const emptyVideo = document.getElementById('emptyVideo');
const videoName = document.getElementById('videoName');
const fpsLabel = document.getElementById('fpsLabel');
const slider = document.getElementById('slider');
const timeDisplay = document.getElementById('timeDisplay');
const frameDisplay = document.getElementById('frameDisplay');
const frameCanvas = document.getElementById('frameCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const ctx = frameCanvas.getContext('2d');
const overlayCtx = overlayCanvas.getContext('2d');
const calibrationPrompt = document.getElementById('calibrationPrompt');
const actualLengthInput = document.getElementById('actualLength');
const actualUnitInput = document.getElementById('actualUnit');
const cancelCalibrationButton = document.getElementById('cancelCalibration');
const exportPrompt = document.getElementById('exportPrompt');
const exportFilenameInput = document.getElementById('exportFilename');
const cancelExportButton = document.getElementById('cancelExport');
const frameRatePrompt = document.getElementById('frameRatePrompt');
const userPlaybackFrameRateInput = document.getElementById('userPlaybackFrameRate');
const userCaptureFrameRateInput = document.getElementById('userCaptureFrameRate');
const cancelFrameRateButton = document.getElementById('cancelFrameRate');
const frameRateButton = document.getElementById('frameRateButton');
const frameRateHintButton = document.getElementById('frameRateHint');
const specialRecordingCheckbox = document.getElementById('specialRecordingMode');
const captureRateSection = document.getElementById('captureRateSection');
const detectedFpsDisplay = document.getElementById('detectedFpsDisplay');
const positionChartCanvas = document.getElementById('positionChart');

export {
	hiddenVideo,
	openVideoButton,
	emptyImportButton,
	emptySampleButton,
	videoUploadInput,
	playPauseButton,
	playPauseIcon,
	previousFrameButton,
	nextFrameButton,
	frameStepSelect,
	calibrateButton,
	setOriginButton,
	exportDataButton,
	exportPanPhyPlotButton,
	clearButton,
	setupButton,
	setupMenu,
	manualModeButton,
	clearMenu,
	clearDataPointsButton,
	clearCalibrationButton,
	clearOriginButton,
	clearVideoButton,
	undoPointButton,
	redoPointButton,
	selectMarksButton,
	deleteSelectedButton,
	plotPositionButton,
	plotVelocityButton,
	plotCompXButton,
	plotCompYButton,
	plotCompXYButton,
	hideCrossesToggle,
	autoTrackToggle,
	autoStopButton,
	chartCanvasContainer,
	chartCopyActionButton,
	graphEmpty,
	graphHint,
	graphControls,
	graphView,
	pointEditor,
	showGraphTab,
	showPointsTab,
	messageBar,
	messageEl,
	modeCancelButton,
	videoStage,
	videoWrapper,
	emptyVideo,
	videoName,
	fpsLabel,
	slider,
	timeDisplay,
	frameDisplay,
	frameCanvas,
	overlayCanvas,
	ctx,
	overlayCtx,
	calibrationPrompt,
	actualLengthInput,
	actualUnitInput,
	cancelCalibrationButton,
	exportPrompt,
	exportFilenameInput,
	cancelExportButton,
	frameRatePrompt,
	userPlaybackFrameRateInput,
	userCaptureFrameRateInput,
	cancelFrameRateButton,
	frameRateButton,
	frameRateHintButton,
	specialRecordingCheckbox,
	captureRateSection,
	detectedFpsDisplay,
	positionChartCanvas
};
