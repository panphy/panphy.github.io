// Plain labels and formatting for the app's own basic-fit output. User labels are never parsed as math.
(function() {
    const SUPERSCRIPTS = { '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹','-':'⁻','+':'⁺' };
    function formatEquationText(equation) {
        let text = String(equation || '').replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
        text = text.replace(/\\(?:times|cdot)/g, '×').replace(/\\(?:left|right)/g, '').replace(/\\[, ]/g, ' ');
        text = text.replace(/\^\{([^{}]*)\}/g, (_, power) => /^[-+]?\d+$/.test(power)
            ? Array.from(power, c => SUPERSCRIPTS[c]).join('') : `^(${power})`);
        return text.replace(/_\{?(\d)\}?/g, (_, digit) => '₀₁₂₃₄₅₆₇₈₉'[Number(digit)])
            .replace(/\\(?:space|%)/g, match => match === '\\%' ? '%' : ' ').replace(/\s+/g, ' ').trim();
    }
    function processLabel(label) {
        return String(label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    function updateGraphTitle(force = false) {
        const input = document.getElementById('graph-title');
        if (!input) return;
        if (force || titleWasAuto) {
            input.value = `${document.getElementById('y-column-name').value || 'y'} vs ${document.getElementById('x-column-name').value || 'x'}`;
            titleWasAuto = true;
        }
        saveActiveGraphTitle();
    }
    Object.assign(window, { formatEquationText, processLabel, updateGraphTitle });
})();
