// Shared visual setup runs before the viewers clone slides into thumbnails.
(() => {
  const root = document.documentElement;
  const year = root.classList.contains('deck-y11') ? 11 : root.classList.contains('deck-y10') ? 10 : 9;
  document.querySelectorAll('#deck > .slide').forEach(slide => {
    const badge = document.createElement('span');
    badge.className = 'year-badge';
    badge.textContent = `Year ${year}`;
    slide.appendChild(badge);
  });
  document.querySelectorAll('#deck table').forEach(table => {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    table.before(wrapper);
    wrapper.appendChild(table);
  });
  const themeButton = document.getElementById('theme-button');
  if (themeButton && !themeButton.querySelector('svg')) window.PanPhyThemeToggle.mount(themeButton);
})();
