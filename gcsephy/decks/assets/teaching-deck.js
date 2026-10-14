// Shared visual setup runs before the viewers clone slides into thumbnails.
(() => {
  const root = document.documentElement;
  const year = root.classList.contains('deck-y11') ? 11 : root.classList.contains('deck-y10') ? 10 : 9;
  document.querySelectorAll('#deck > .slide').forEach(slide => {
    const badge = document.createElement('span');
    badge.className = 'year-badge';
    badge.textContent = `Year ${year}`;
    slide.appendChild(badge);
    // GCSE Physics (8463) only, not Combined Science: Trilogy. The top edge holds the year badge.
    if (slide.classList.contains('triple')) {
      const flag = document.createElement('span');
      flag.className = 'triple-flag';
      flag.textContent = 'Triple Science only';
      slide.appendChild(flag);
    }
  });
  document.querySelectorAll('#deck table').forEach(table => {
    // Reveal the content, while keeping the table structure and grid visible.
    table.querySelectorAll('td, th').forEach(cell => {
      if (!cell.matches('.step') && !cell.parentElement.matches('.step')) return;
      const content = document.createElement('span');
      content.className = 'cell-content';
      while (cell.firstChild) content.appendChild(cell.firstChild);
      cell.appendChild(content);
    });
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    table.before(wrapper);
    wrapper.appendChild(table);
  });
  const themeButton = document.getElementById('theme-button');
  if (themeButton && !themeButton.querySelector('svg')) window.PanPhyThemeToggle.mount(themeButton);
})();
