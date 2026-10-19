// Bootstrap the single-dataset introduction. Guided practice never changes saved work.
document.addEventListener('DOMContentLoaded', () => {
    const practice = typeof getTourInitialState === 'function' ? getTourInitialState() : null;
    const saved = practice ? migratePersistedState(practice) : loadState();
    window.PanPhyThemeToggle.mount(document.getElementById('theme-button'));
    window.addEventListener('panphy:theme-change', () => {
        lastPlotState.plot.dataKey = lastPlotState.plot.layoutKey = null;
        updatePlot();
    });
    if(saved) {
        rawData = saved.rawData;
        datasetHeaders = saved.datasetHeaders;
        datasetToggles = saved.datasetToggles;
        datasetErrorTypes = saved.datasetErrorTypes;
        datasetDraftRows = normalizeDatasetDraftRows(saved.datasetDraftRows, 1);
        datasetTitles = normalizeDatasetTitles(saved.datasetTitles, 1);
        dataset1XValues = saved.dataset1XValues;
        fittedCurves = normalizeFittedCurvesState(saved.fittedCurves, 1);
        datasetFitResults = normalizeDatasetFitResultsState(saved.datasetFitResults, 1);
        document.getElementById('legacy-data-note').hidden = !saved.migratedFromLegacy;
        loadActiveGraphTitle();
        loadHeaders();
        loadErrorTypes();
        loadToggles();
        populateTableFromActiveDataset();
    } else clearRows(true);

    const result = datasetFitResults[0];
    const fitMethod = document.getElementById('fit-method');
    if (result?.choice?.kind === 'basic' && Array.from(fitMethod.options).some(option => option.value === result.choice.method)) {
        fitMethod.value = result.choice.method;
    }
    updateBasicFitEquation();
    if(result) renderFittingResult(result.equation,result.rSquared);
    else clearFittingResultDisplay();

    ['x','y'].forEach(axis => {
        const input = document.getElementById(`global-${axis}-uncertainty`);
        const apply = () => {if(input.value.trim()) applyGlobalUncertainties(axis);};
        input.addEventListener('change',apply);
        input.addEventListener('keydown',event => {if(event.key==='Enter'){event.preventDefault();apply();}});
    });
    document.getElementById('graph-title').addEventListener('input', () => {
        titleWasAuto = false;
        saveActiveGraphTitle();
        scheduleSaveState();
    });
    updateGraphTitle();
    initializeDialogFocus();
    updatePlot();
    scheduleSaveState();
});
