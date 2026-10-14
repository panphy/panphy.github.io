// Compose the existing teaching figures without changing their source decks.
(() => {
  const atomFigures = window.DeckFigures;
  window.DeckFigures = {
    ...atomFigures,
    render() {
      window.SampleEnergyFigures.render();
      window.SampleCircuitFigures.render();
      atomFigures.render();
    }
  };
})();
