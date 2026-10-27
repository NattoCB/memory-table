(() => {
  const home = document.getElementById('home');
  const gameView = document.getElementById('game-view');
  let cleanup = null;
  function showHome() {
    if (cleanup) cleanup();
    cleanup = null;
    gameView.replaceChildren();
    gameView.hidden = true;
    home.hidden = false;
    window.scrollTo(0, 0);
  }
  function openGame(name) {
    const game = name === 'nback' ? window.NBack : name === 'matrix' ? window.MemoryMatrix : null;
    if (!game) return;
    if (cleanup) cleanup();
    home.hidden = true;
    gameView.hidden = false;
    gameView.replaceChildren();
    cleanup = game.mount(gameView, { onExit: showHome });
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => openGame(button.dataset.game)));
  document.querySelector('[data-home]').addEventListener('click', showHome);
})();
