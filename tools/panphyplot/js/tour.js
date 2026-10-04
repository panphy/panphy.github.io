// Guided tour
//
// A tour chapter runs at ?tour=<chapter> on practice data. Saving is switched off for
// that whole page load, so the saved workspace is never read or written; leaving the
// tour reloads the plain page, which brings that workspace back.

const TOUR_SEEN_KEY = 'panphyplot-tour-seen';
// A phone screen cannot show a tour card beside the app, so the tour is not offered there.
// Keep in step with the query that hides the Tour button in tour.css.
const TOUR_PHONE_QUERY = '(max-width: 699px), (max-height: 499px)';
// Matches the width below which the app stacks its two panels.
const TOUR_NARROW_WIDTH = 900;

// Pendulum practical, T = 2π√(L/g). The linearised sample gives g from the gradient of
// T² against L; the raw sample is the same experiment before any processing.
const TOUR_SAMPLES = {
	linearised: {
		headers: { x: 'L / m', y: 'T² / s²' },
		rows: [
			['0.20', '0.82'], ['0.30', '1.19'], ['0.40', '1.63'], ['0.50', '2.00'],
			['0.60', '2.44'], ['0.70', '2.80'], ['0.80', '3.25'], ['0.90', '3.61']
		]
	},
	raw: {
		headers: { x: 'L / m', y: 'T / s' },
		rows: [
			['0.20', '0.906'], ['0.30', '1.091'], ['0.40', '1.277'], ['0.50', '1.414'],
			['0.60', '1.562'], ['0.70', '1.673'], ['0.80', '1.803'], ['0.90', '1.900']
		]
	}
};
const TOUR_CUSTOM_FORMULA = '2*pi*sqrt(x/g)';
const TOUR_PROCESSING_FORMULA = 'y^2';

const tour = {
	chapterId: null,
	stepIndex: 0,
	stepDone: null,
	frame: 0,
	spotlight: null,
	card: null,
	target: null
};

function readTourStorage(key) {
	try {
		return localStorage.getItem(key);
	} catch (error) {
		return null;
	}
}

function markTourSeen() {
	try {
		localStorage.setItem(TOUR_SEEN_KEY, 'true');
	} catch (error) {
		console.warn('Unable to save tour preference:', error);
	}
}

function openTourSection(sectionId) {
	const section = document.getElementById(sectionId);
	if (section && !section.classList.contains('is-open')) {
		toggleSection(sectionId, document.querySelector(`[aria-controls="${sectionId}"]`));
	}
}

function isTourSectionOpen(sectionId) {
	const section = document.getElementById(sectionId);
	return !!section && section.classList.contains('is-open');
}

function showTourBasicFitTab() {
	openTourSection('best-fit-content');
	const basicTab = document.querySelector('.tablink[onclick*="BasicFit"]');
	if (basicTab && !basicTab.classList.contains('active')) basicTab.click();
}

function hasCurrentTourFit() {
	const result = datasetFitResults[activeSet];
	return !!result && !result.stale;
}

function runTourLinearFit() {
	showTourBasicFitTab();
	const fitMethod = document.getElementById('fit-method');
	if (fitMethod.value !== 'Linear') {
		fitMethod.value = 'Linear';
		updateBasicFitEquation();
	}
	fitCurve();
}

function tourRowsHaveUncertainty(axis) {
	const points = getFiniteDatasetPoints(activeSet);
	return !!datasetToggles[activeSet]?.[axis] && points.length > 0
		&& points.every(point => point[`${axis}ErrorRaw`] > 0);
}

function applyTourUncertainty(axis, errorType, value) {
	openTourSection('uncertainties-content');
	const typeSelect = document.getElementById(`${axis}-error-type`);
	if (typeSelect.value !== errorType) {
		typeSelect.value = errorType;
		updateErrorType(axis);
	}
	document.getElementById(`global-${axis}-uncertainty`).value = value;
	applyGlobalUncertainties(axis);
}

function describeTourGravity() {
	const curve = fittedCurves[activeSet];
	// A linear fit stores just its two end points.
	if (!curve || curve.x.length !== 2) return '';
	const gradient = (curve.y[1] - curve.y[0]) / (curve.x[1] - curve.x[0]);
	const gravity = 4 * Math.PI ** 2 / gradient;
	if (!Number.isFinite(gravity) || gravity <= 0) return '';
	return ` Here the gradient is 4π²/g, so this data gives g ≈ ${gravity.toFixed(1)} m/s².`;
}

function showTourCustomFitTab() {
	openTourSection('best-fit-content');
	const customTab = document.querySelector('.tablink[onclick*="CustomFit"]');
	if (customTab && !customTab.classList.contains('active')) customTab.click();
}

function isTourCustomFitTabOpen() {
	return isTourSectionOpen('best-fit-content') && document.getElementById('CustomFit').classList.contains('active');
}

// True once the formula box holds an equation whose only parameter is g.
function hasTourCustomFormula() {
	const inputs = document.querySelectorAll('#custom-fit-parameters-list .custom-fit-parameter-input');
	return inputs.length === 1 && inputs[0].getAttribute('data-param') === 'g';
}

function enterTourCustomFormula() {
	showTourCustomFitTab();
	const formulaInput = document.getElementById('custom-fit-formula-input');
	formulaInput.value = TOUR_CUSTOM_FORMULA;
	formulaInput.dispatchEvent(new Event('input', { bubbles: true }));
	formulaInput.dispatchEvent(new Event('change', { bubbles: true }));
}

function hasCurrentTourCustomFit() {
	return hasCurrentTourFit() && datasetFitResults[activeSet].choice?.kind === 'custom';
}

function runTourCustomFit() {
	if (!hasTourCustomFormula()) enterTourCustomFormula();
	fitCustomCurve();
}

function describeTourCustomGravity() {
	if (!hasCurrentTourCustomFit()) return '';
	const gravity = parseNumericInput(customFitStates[activeSet]?.initialValues?.g);
	if (!Number.isFinite(gravity) || gravity <= 0) return '';
	return ` Here the fit gives g ≈ ${gravity.toFixed(1)} m/s² directly.`;
}

function isTourElementShown(id) {
	const element = document.getElementById(id);
	return !!element && element.getClientRects().length > 0;
}

// Copying the processed columns adds a dataset and switches to it.
function hasTourProcessedDataset() {
	return rawData.length > 1;
}

function hasTourProcessedColumn() {
	return document.getElementById('data-processing-derived-list').children.length > 0;
}

function hasTourProcessedMapping() {
	return document.getElementById('data-processing-output-y').value.startsWith('derived:');
}

// Reopening the popup clears its processed columns, so only open it when it is closed.
function openTourProcessing() {
	if (!hasTourProcessedDataset() && !isTourElementShown('data-processing-container')) openDataProcessingPopup();
}

function startTourProcessedColumn() {
	openTourProcessing();
	if (!hasTourProcessedColumn() && !isTourElementShown('data-processing-formula-panel')) {
		document.getElementById('data-processing-process-y').click();
	}
}

function createTourProcessedColumn() {
	if (hasTourProcessedDataset()) return;
	startTourProcessedColumn();
	if (hasTourProcessedColumn()) return;
	document.getElementById('data-processing-formula-input').value = TOUR_PROCESSING_FORMULA;
	document.getElementById('data-processing-apply').click();
}

function mapTourProcessedColumn() {
	if (hasTourProcessedDataset()) return;
	createTourProcessedColumn();
	const outputY = document.getElementById('data-processing-output-y');
	const processed = Array.from(outputY.options).filter(option => option.value.startsWith('derived:')).pop();
	if (processed) outputY.value = processed.value;
}

function copyTourProcessedData() {
	if (hasTourProcessedDataset()) return;
	mapTourProcessedColumn();
	document.getElementById('data-processing-copy').click();
}

const TOUR_CHAPTERS = {
	'first-fit': {
		title: 'First fit',
		next: 'uncertainties',
		steps: [
			{
				title: 'Welcome to PanPhyPlot',
				body: 'This short tour fits a straight line to data from a pendulum experiment. It runs on practice data, so your own work is untouched.'
			},
			{
				title: 'Enter your data',
				target: '.table-container',
				body: 'Each row is one measurement: the pendulum length L and the period squared T². Type into any cell, and click a column heading to rename it.'
			},
			{
				title: 'The graph follows the table',
				target: '#plot',
				body: 'Points are plotted as you type, and the axis labels come from your column headings. The title above the graph can be edited.'
			},
			{
				title: 'Open the fitting options',
				target: '[aria-controls="best-fit-content"]',
				body: 'Best-fit lines and curves live in a section that starts closed.',
				action: {
					instruction: 'Click Add Best Fit Line.',
					isDone: () => isTourSectionOpen('best-fit-content'),
					perform: () => openTourSection('best-fit-content')
				}
			},
			{
				title: 'Choose a model',
				target: '#BasicFit',
				prepare: showTourBasicFitTab,
				body: 'Theory says T² is proportional to L, so keep Linear. The other tabs offer sinusoidal and Gaussian curves, or a formula of your own.'
			},
			{
				title: 'Fit the line',
				target: '#BasicFit .fit-button',
				prepare: showTourBasicFitTab,
				body: 'PanPhyPlot finds the straight line that lies closest to all the points.',
				action: {
					instruction: 'Click Fit Curve.',
					isDone: hasCurrentTourFit,
					perform: runTourLinearFit
				}
			},
			{
				title: 'Read the result',
				target: '.result',
				prepare: () => {
					if (!hasCurrentTourFit()) runTourLinearFit();
				},
				body: () => 'The equation gives the gradient and intercept of the line, and an R² close to 1 means the points lie close to it.'
					+ describeTourGravity()
			},
			{
				title: 'Chapter complete',
				body: 'You have plotted data and fitted a line to it. The next chapter adds uncertainties and error bars to the same data.'
			}
		]
	},
	uncertainties: {
		title: 'Uncertainties',
		next: 'custom-fit',
		start: () => {
			runTourLinearFit();
			toggleSection('best-fit-content', document.querySelector('[aria-controls="best-fit-content"]'));
		},
		steps: [
			{
				title: 'Adding uncertainties',
				body: 'Every measurement has an uncertainty. This chapter adds error bars to the pendulum data, which already has a best-fit line.'
			},
			{
				title: 'Open the uncertainty controls',
				target: '[aria-controls="uncertainties-content"]',
				body: 'Uncertainties are optional, so their controls start closed.',
				action: {
					instruction: 'Click Add Uncertainties.',
					isDone: () => isTourSectionOpen('uncertainties-content'),
					perform: () => openTourSection('uncertainties-content')
				}
			},
			{
				title: 'An absolute uncertainty',
				target: () => document.querySelectorAll('.uncertainty-card')[0],
				prepare: () => openTourSection('uncertainties-content'),
				body: 'The lengths were read from a ruler, good to about ±0.002 m. One value can be given to every row at once.',
				action: {
					instruction: 'Type 0.002 in the Δx box, then click Apply to All.',
					isDone: () => tourRowsHaveUncertainty('x'),
					perform: () => applyTourUncertainty('x', 'absolute', '0.002')
				}
			},
			{
				title: 'A percentage uncertainty',
				target: () => document.querySelectorAll('.uncertainty-card')[1],
				prepare: () => openTourSection('uncertainties-content'),
				body: 'A percentage suits a quantity whose uncertainty grows with the reading. Give T² an uncertainty of 3%.',
				action: {
					instruction: 'Change the Δy type to Percentage (%), type 3, then click Apply to All.',
					isDone: () => datasetErrorTypes[activeSet]?.y === 'percentage' && tourRowsHaveUncertainty('y'),
					perform: () => applyTourUncertainty('y', 'percentage', '3')
				}
			},
			{
				title: 'Adjust single rows',
				target: '.table-container',
				body: 'The table now has a ± column for each quantity. Edit any cell there if one measurement was less certain than the rest.'
			},
			{
				title: 'Read the error bars',
				target: '#plot',
				body: 'Each point now carries error bars. A good model passes through most of them; a point whose bars miss the line is worth measuring again.'
			},
			{
				title: 'What the fit uses',
				target: '.result',
				body: 'PanPhyPlot fits use unweighted least squares. The error bars help you judge the fit, and they do not change the line.'
			},
			{
				title: 'Chapter complete',
				body: 'You can now plot data with error bars and judge a best-fit line against them. The next chapter fits an equation of your own to curved data.'
			}
		]
	},
	'custom-fit': {
		title: 'Custom fit',
		next: 'data-processing',
		sample: 'raw',
		steps: [
			{
				title: 'Fitting your own equation',
				body: 'This is the pendulum data as it was measured: period T against length L. The points follow a curve, so a straight line will not do.'
			},
			{
				title: 'Open the Custom tab',
				target: '.tablink[onclick*="CustomFit"]',
				prepare: () => openTourSection('best-fit-content'),
				body: 'The Custom tab fits any equation you can write down.',
				action: {
					instruction: 'Click Custom.',
					isDone: isTourCustomFitTabOpen,
					perform: showTourCustomFitTab
				}
			},
			{
				title: 'Type the equation',
				target: '#custom-fit-formula-panel',
				prepare: showTourCustomFitTab,
				body: 'Theory says T = 2π√(L/g). Use x for the length and write every multiplication with *. Any other letter becomes a parameter to fit.',
				action: {
					instruction: `Type ${TOUR_CUSTOM_FORMULA} in the formula box.`,
					isDone: hasTourCustomFormula,
					perform: enterTourCustomFormula
				}
			},
			{
				title: 'Starting values',
				target: '#custom-fit-parameters-panel',
				prepare: () => {
					if (!hasTourCustomFormula()) enterTourCustomFormula();
				},
				body: 'PanPhyPlot found one parameter, g, and gave it a starting value. The fit improves on that value step by step, so a sensible start matters for harder equations.'
			},
			{
				title: 'Fit the curve',
				target: '#CustomFit .fit-button',
				prepare: () => {
					if (!hasTourCustomFormula()) enterTourCustomFormula();
				},
				body: 'PanPhyPlot adjusts g until the curve lies as close as possible to the points.',
				action: {
					instruction: 'Click Fit Curve.',
					isDone: hasCurrentTourCustomFit,
					perform: runTourCustomFit
				}
			},
			{
				title: 'Read the result',
				target: '.result',
				prepare: () => {
					if (!hasCurrentTourCustomFit()) runTourCustomFit();
				},
				body: () => 'The equation now shows the fitted value of g, and the status line says whether the fit converged.'
					+ describeTourCustomGravity()
			},
			{
				title: 'Chapter complete',
				body: 'You have fitted an equation of your own. The next chapter reaches the same answer another way, by turning the curve into a straight line.'
			}
		]
	},
	'data-processing': {
		title: 'Data processing',
		sample: 'raw',
		steps: [
			{
				title: 'Making a curve straight',
				body: 'Since T = 2π√(L/g), a graph of T² against L is a straight line. Data Processing builds new columns such as T² from the ones you measured.'
			},
			{
				title: 'Open Data Processing',
				target: '.button-row-data-processing .section-toggle',
				body: 'Processing happens in its own window.',
				action: {
					instruction: 'Click Data Processing.',
					isDone: () => hasTourProcessedDataset() || isTourElementShown('data-processing-container'),
					perform: openTourProcessing
				}
			},
			{
				title: 'Your source data',
				target: '#data-processing-source-table-wrap',
				prepare: openTourProcessing,
				body: 'The window lists the valid rows of the current dataset. Nothing you do here changes those measurements.'
			},
			{
				title: 'Start a new column',
				target: '#data-processing-process-y',
				prepare: openTourProcessing,
				body: 'A processed column is made from the x or the y column. T is the y column here.',
				action: {
					instruction: 'Click Process y.',
					isDone: () => hasTourProcessedDataset() || hasTourProcessedColumn()
						|| isTourElementShown('data-processing-formula-panel'),
					perform: startTourProcessedColumn
				}
			},
			{
				title: 'Write the formula',
				target: () => document.getElementById(isTourElementShown('data-processing-formula-panel')
					? 'data-processing-formula-panel' : 'data-processing-derived-list'),
				prepare: startTourProcessedColumn,
				body: 'The formula uses x and y for the two source columns. Squaring the period gives T².',
				action: {
					instruction: `Type ${TOUR_PROCESSING_FORMULA}, then click Apply.`,
					isDone: () => hasTourProcessedDataset() || hasTourProcessedColumn(),
					perform: createTourProcessedColumn
				}
			},
			{
				title: 'Choose what to plot',
				target: '.data-processing-mapping-grid',
				prepare: createTourProcessedColumn,
				body: 'Pick which columns become the new x and y. Keep L for x, and plot the new T² column as y.',
				action: {
					instruction: 'Set New y column to the processed column.',
					isDone: () => hasTourProcessedDataset() || hasTourProcessedMapping(),
					perform: mapTourProcessedColumn
				}
			},
			{
				title: 'Copy to a new dataset',
				target: '#data-processing-copy',
				prepare: mapTourProcessedColumn,
				body: 'The processed columns go into a separate dataset, so the original measurements stay as they were.',
				action: {
					instruction: 'Click Copy to Dataset.',
					isDone: hasTourProcessedDataset,
					perform: copyTourProcessedData
				}
			},
			{
				title: 'A straight-line graph',
				target: '#plot',
				prepare: copyTourProcessedData,
				body: 'PanPhyPlot has switched to the new dataset: T² against L is a straight line, ready for a linear fit. Click the y column heading to give it a tidier name, such as T² / s².'
			},
			{
				title: 'Tour complete',
				body: 'You can now fit your own equations and process data before plotting it. The Manual covers the remaining features, such as combined plots.'
			}
		]
	}
};

const isTourPhone = !!window.matchMedia && window.matchMedia(TOUR_PHONE_QUERY).matches;
const requestedTourChapter = new URLSearchParams(window.location.search).get('tour');
const isTourRequested = Object.prototype.hasOwnProperty.call(TOUR_CHAPTERS, requestedTourChapter);
// On a phone a tour link opens the normal app, saved workspace and all.
if (isTourRequested && !isTourPhone) {
	tour.chapterId = requestedTourChapter;
	persistenceDisabled = true;
}

// Offer the tour once, and only to someone with no saved workspace. Read before the
// app's first autosave creates one.
const shouldInviteToTour = !isTourRequested && !isTourPhone && !readTourStorage(TOUR_SEEN_KEY)
	&& [STORAGE_KEY, ...LEGACY_STORAGE_KEYS].every(key => readTourStorage(key) === null);

function getTourInitialState() {
	if (!tour.chapterId) return null;
	const sample = TOUR_SAMPLES[TOUR_CHAPTERS[tour.chapterId].sample || 'linearised'];
	return {
		schemaVersion: STATE_SCHEMA_VERSION,
		rawData: [sample.rows.map(([x, y]) => ({ x: Number(x), y: Number(y), xErrorRaw: 0, yErrorRaw: 0 }))],
		activeSet: 0,
		datasetHeaders: { 0: { ...sample.headers } },
		datasetNames: { 0: 'Pendulum' },
		datasetToggles: { 0: { x: false, y: false } },
		datasetErrorTypes: { 0: { x: 'absolute', y: 'absolute' } },
		datasetDraftRows: {
			0: sample.rows.map(([xValue, yValue]) => ({ xValue, yValue, xErrorValue: '', yErrorValue: '' }))
		},
		dataset1XValues: sample.rows.map(([x]) => Number(x)),
		latexMode: false,
		titleWasAuto: true
	};
}

function getTourUrl(chapterId) {
	return `${window.location.pathname}?tour=${chapterId}`;
}

function exitTour() {
	window.location.replace(window.location.pathname);
}

function createTourButton(label, className, onClick) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = `tour-button ${className}`;
	button.textContent = label;
	button.addEventListener('click', onClick);
	return button;
}

function getTourStep() {
	return TOUR_CHAPTERS[tour.chapterId].steps[tour.stepIndex];
}

function resolveTourTarget(step) {
	if (!step.target) return null;
	const element = typeof step.target === 'function' ? step.target() : document.querySelector(step.target);
	return element && element.getClientRects().length ? element : null;
}

// A step's target can change while it is shown, e.g. when a panel closes after its action.
function syncTourTarget() {
	const target = resolveTourTarget(getTourStep());
	if (target === tour.target) return;
	if (tour.target) tour.target.classList.remove('tour-target');
	tour.target = target;
	if (target) target.classList.add('tour-target');
}

function scrollTourTargetIntoView() {
	if (!tour.target) return;
	const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	tour.target.scrollIntoView({
		block: window.innerWidth < TOUR_NARROW_WIDTH ? 'start' : 'center',
		behavior: reducedMotion ? 'auto' : 'smooth'
	});
}

function renderTourStep() {
	const chapter = TOUR_CHAPTERS[tour.chapterId];
	const step = getTourStep();
	const isLastStep = tour.stepIndex === chapter.steps.length - 1;
	const card = tour.card;

	if (step.prepare) step.prepare();
	syncTourTarget();

	card.querySelector('.tour-eyebrow').textContent =
		`${chapter.title} · Step ${tour.stepIndex + 1} of ${chapter.steps.length}`;
	card.querySelector('.tour-title').textContent = step.title;

	const instruction = card.querySelector('.tour-instruction');
	instruction.textContent = step.action ? step.action.instruction : '';
	instruction.hidden = !step.action;

	const nav = card.querySelector('.tour-nav');
	nav.replaceChildren();
	const back = createTourButton('Back', 'tour-button-plain', () => showTourStep(tour.stepIndex - 1));
	back.disabled = tour.stepIndex === 0;
	nav.appendChild(back);

	if (isLastStep) {
		if (chapter.next) {
			nav.appendChild(createTourButton('Exit', 'tour-button-plain', exitTour));
			nav.appendChild(createTourButton('Next chapter', 'tour-button-primary',
				() => window.location.assign(getTourUrl(chapter.next))));
		} else {
			nav.appendChild(createTourButton('Finish', 'tour-button-primary', exitTour));
		}
	} else {
		if (step.action) {
			nav.appendChild(createTourButton('Do it for me', 'tour-button-plain tour-do-it', () => step.action.perform()));
		}
		nav.appendChild(createTourButton('Next', 'tour-button-primary tour-next', () => showTourStep(tour.stepIndex + 1)));
	}

	tour.stepDone = null;
	updateTourStepStatus();
}

// Action steps keep Next disabled until the app's own state shows the action happened.
function updateTourStepStatus() {
	const step = getTourStep();
	// Some cards quote a fitted value, which can arrive after the card is shown.
	const bodyText = typeof step.body === 'function' ? step.body() : step.body;
	const body = tour.card.querySelector('.tour-body');
	if (body.textContent !== bodyText) body.textContent = bodyText;
	const done = step.action ? !!step.action.isDone() : true;
	if (done === tour.stepDone) return;
	tour.stepDone = done;

	const status = tour.card.querySelector('.tour-status');
	status.textContent = step.action && done ? 'Done. Press Next to continue.' : '';
	status.hidden = !status.textContent;
	const next = tour.card.querySelector('.tour-next');
	if (next) next.disabled = !done;
	const doIt = tour.card.querySelector('.tour-do-it');
	if (doIt) doIt.hidden = done;
}

function showTourStep(index) {
	const stepCount = TOUR_CHAPTERS[tour.chapterId].steps.length;
	tour.stepIndex = Math.min(Math.max(index, 0), stepCount - 1);
	renderTourStep();
	tour.card.focus({ preventScroll: true });
	scrollTourTargetIntoView();
	// Sections animate open, so settle the scroll again once they have finished.
	const stepIndex = tour.stepIndex;
	setTimeout(() => {
		if (tour.stepIndex === stepIndex) scrollTourTargetIntoView();
	}, 350);
}

function setTourBox(element, left, top, width, height) {
	const value = `${Math.round(left)}px,${Math.round(top)}px,${Math.round(width)}px,${Math.round(height)}px`;
	if (element.dataset.box === value) return;
	element.dataset.box = value;
	element.style.left = `${Math.round(left)}px`;
	element.style.top = `${Math.round(top)}px`;
	if (width !== null) {
		element.style.width = `${Math.round(width)}px`;
		element.style.height = `${Math.round(height)}px`;
	}
}

// Runs every frame: targets move while sections animate and the page scrolls.
function layoutTour() {
	tour.frame = requestAnimationFrame(layoutTour);
	updateTourStepStatus();
	syncTourTarget();

	const viewportWidth = window.innerWidth;
	const viewportHeight = window.innerHeight;
	const target = tour.target;
	let rect = null;

	if (target) {
		const bounds = target.getBoundingClientRect();
		const pad = 6;
		let left = Math.max(bounds.left - pad, 0);
		let top = Math.max(bounds.top - pad, 0);
		let right = Math.min(bounds.right + pad, viewportWidth);
		let bottom = Math.min(bounds.bottom + pad, viewportHeight);
		// Keep the highlight inside any scrolling panel that clips the target.
		for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
			if (getComputedStyle(parent).overflowY === 'visible') continue;
			const clip = parent.getBoundingClientRect();
			left = Math.max(left, clip.left);
			top = Math.max(top, clip.top);
			right = Math.min(right, clip.right);
			bottom = Math.min(bottom, clip.bottom);
		}
		rect = { left, top, right, bottom };
		setTourBox(tour.spotlight, left, top, Math.max(right - left, 0), Math.max(bottom - top, 0));
		tour.spotlight.classList.remove('tour-spotlight-empty');
	} else {
		// No target: a zero-size spotlight dims the whole page behind a centred card.
		setTourBox(tour.spotlight, viewportWidth / 2, viewportHeight / 2, 0, 0);
		tour.spotlight.classList.add('tour-spotlight-empty');
	}

	const card = tour.card;
	const docked = viewportWidth < TOUR_NARROW_WIDTH;
	card.classList.toggle('tour-card-docked', docked);
	if (docked) {
		if (card.dataset.box) {
			delete card.dataset.box;
			card.style.left = '';
			card.style.top = '';
		}
		return;
	}

	const gap = 16;
	const margin = 12;
	const cardWidth = card.offsetWidth;
	const cardHeight = card.offsetHeight;
	const banner = document.querySelector('.banner');
	const minTop = (banner ? Math.max(banner.getBoundingClientRect().bottom, 0) : 0) + margin;
	const clampTop = top => Math.min(Math.max(top, minTop), Math.max(minTop, viewportHeight - cardHeight - margin));
	const clampLeft = left => Math.min(Math.max(left, margin), Math.max(margin, viewportWidth - cardWidth - margin));
	let left = (viewportWidth - cardWidth) / 2;
	let top = clampTop((viewportHeight - cardHeight) / 2);

	if (rect) {
		// Small controls sit in the data panel: put the card beside the whole panel so it
		// does not cover the neighbouring controls.
		const panel = target.closest('.input-section');
		const panelRect = panel ? panel.getBoundingClientRect() : null;
		const fitsRightOf = box => box.right + gap + cardWidth <= viewportWidth - margin;
		const fitsLeftOf = box => box.left - gap - cardWidth >= margin;

		if (panelRect && fitsRightOf(panelRect)) {
			left = panelRect.right + gap;
			top = clampTop(rect.top);
		} else if (fitsRightOf(rect)) {
			left = rect.right + gap;
			top = clampTop(rect.top);
		} else if (fitsLeftOf(rect)) {
			left = rect.left - gap - cardWidth;
			top = clampTop(rect.top);
		} else if (rect.bottom + gap + cardHeight <= viewportHeight - margin) {
			left = clampLeft(rect.left);
			top = rect.bottom + gap;
		} else if (rect.top - gap - cardHeight >= minTop) {
			left = clampLeft(rect.left);
			top = rect.top - gap - cardHeight;
		} else {
			left = viewportWidth - cardWidth - margin;
			top = clampTop(viewportHeight - cardHeight - margin);
		}
	}
	setTourBox(card, left, top, null, null);
}

function isTourBlockedByDialog() {
	return Array.from(document.querySelectorAll('[aria-modal="true"]'))
		.some(dialog => dialog.getClientRects().length > 0);
}

function buildTourCard() {
	const card = document.createElement('section');
	card.className = 'tour-card';
	card.setAttribute('role', 'dialog');
	card.setAttribute('aria-labelledby', 'tour-title');
	card.setAttribute('aria-describedby', 'tour-body');
	card.tabIndex = -1;

	const head = document.createElement('div');
	head.className = 'tour-card-head';
	const eyebrow = document.createElement('span');
	eyebrow.className = 'tour-eyebrow';
	head.appendChild(eyebrow);

	const title = document.createElement('h2');
	title.className = 'tour-title';
	title.id = 'tour-title';
	const body = document.createElement('p');
	body.className = 'tour-body';
	body.id = 'tour-body';
	const instruction = document.createElement('p');
	instruction.className = 'tour-instruction';
	const status = document.createElement('p');
	status.className = 'tour-status';
	status.setAttribute('role', 'status');
	const nav = document.createElement('div');
	nav.className = 'tour-nav';

	card.append(head, title, body, instruction, status, nav);
	return card;
}

function startTour() {
	markTourSeen();
	document.body.classList.add('tour-active');

	const practiceBar = document.createElement('div');
	practiceBar.className = 'tour-practice-bar';
	practiceBar.setAttribute('role', 'note');
	const practiceText = document.createElement('span');
	const practiceLabel = document.createElement('strong');
	practiceLabel.textContent = 'Practice mode.';
	practiceText.append(practiceLabel, ' Nothing here is saved. Your own work returns when you exit the tour.');
	const chapterSelect = document.createElement('select');
	chapterSelect.className = 'tour-chapter-select';
	chapterSelect.setAttribute('aria-label', 'Tour chapter');
	Object.entries(TOUR_CHAPTERS).forEach(([chapterId, chapter], index) => {
		const option = document.createElement('option');
		option.value = chapterId;
		option.textContent = `${index + 1}. ${chapter.title}`;
		chapterSelect.appendChild(option);
	});
	chapterSelect.value = tour.chapterId;
	chapterSelect.addEventListener('change', () => window.location.assign(getTourUrl(chapterSelect.value)));
	practiceBar.append(practiceText, chapterSelect, createTourButton('Exit tour', 'tour-button-plain', exitTour));
	const banner = document.querySelector('.banner');
	if (banner) banner.insertAdjacentElement('afterend', practiceBar);

	tour.spotlight = document.createElement('div');
	tour.spotlight.className = 'tour-spotlight';
	tour.spotlight.setAttribute('aria-hidden', 'true');

	tour.card = buildTourCard();
	const close = createTourButton('×', 'tour-close', exitTour);
	close.setAttribute('aria-label', 'Exit tour');
	close.title = 'Exit tour';
	tour.card.querySelector('.tour-card-head').appendChild(close);
	document.body.append(tour.spotlight, tour.card);

	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && !event.defaultPrevented && !isTourBlockedByDialog()) exitTour();
	});

	const chapter = TOUR_CHAPTERS[tour.chapterId];
	if (chapter.start) chapter.start();
	showTourStep(0);
	layoutTour();
}

function showTourInvite() {
	const card = buildTourCard();
	card.classList.add('tour-invite');
	card.querySelector('.tour-eyebrow').textContent = 'Guided tour';
	card.querySelector('.tour-title').textContent = 'New to PanPhyPlot?';
	card.querySelector('.tour-body').textContent =
		'Take a two-minute tour: plot some pendulum data and fit a line to it. It uses practice data, so nothing you enter is affected.';
	card.querySelector('.tour-instruction').hidden = true;
	card.querySelector('.tour-status').hidden = true;

	const dismiss = () => {
		markTourSeen();
		card.remove();
	};
	card.querySelector('.tour-nav').append(
		createTourButton('Not now', 'tour-button-plain', dismiss),
		createTourButton('Start tour', 'tour-button-primary', () => {
			markTourSeen();
			window.location.assign(getTourUrl('first-fit'));
		})
	);
	document.body.appendChild(card);
}

// Registered after main.js, so the app has finished initialising when this runs.
document.addEventListener('DOMContentLoaded', () => {
	if (tour.chapterId) {
		startTour();
	} else if (isTourRequested) {
		window.history.replaceState(null, '', window.location.pathname);
		showToast('The guided tour needs a tablet or computer.', 5000);
	} else if (shouldInviteToTour) {
		showTourInvite();
	}
});
