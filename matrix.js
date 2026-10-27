(function (root) {
  'use strict';

  const LEVELS = [
    { name: '初见', note: '从容热身', rows: 4, cols: 4, mistakes: 12, seconds: 150, previewSeconds: 10, suits: 1 },
    { name: '专注', note: '找到节奏', rows: 4, cols: 5, mistakes: 11, seconds: 165, previewSeconds: 12, suits: 1 },
    { name: '进阶', note: '保持耐心', rows: 4, cols: 6, mistakes: 10, seconds: 180, previewSeconds: 14, suits: 1 },
    { name: '挑战', note: '两种花色', rows: 6, cols: 6, mistakes: 9, seconds: 195, previewSeconds: 18, suits: 2 },
    { name: '专家', note: '记住更多位置', rows: 6, cols: 8, mistakes: 8, seconds: 210, previewSeconds: 22, suits: 2 },
    { name: '极限', note: '四种花色 · 高压', rows: 8, cols: 8, mistakes: 7, seconds: 225, previewSeconds: 30, suits: 4 }
  ];
  const SUITS = [
    { symbol: '♠', name: '黑桃', red: false },
    { symbol: '♥', name: '红桃', red: true },
    { symbol: '♣', name: '梅花', red: false },
    { symbol: '♦', name: '方块', red: true }
  ];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function createDeck(level, random = Math.random) {
    const pairs = level.rows * level.cols / 2;
    const unique = [];
    // Interleave suits so each advertised suit appears as the board grows.
    for (let rank = 0; unique.length < pairs; rank++) {
      for (let suit = 0; suit < level.suits && unique.length < pairs; suit++) {
        unique.push({ id: `${suit}-${rank}`, rank: RANKS[rank], ...SUITS[suit] });
      }
    }
    const cards = unique.flatMap(card => [{ ...card }, { ...card }]);
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  function timeRemaining(deadline, now) {
    return Math.max(0, Math.ceil((deadline - now) / 1000));
  }

  function createState(deck, allowance) {
    return { deck, allowance, matched: new Set(), first: null, mistakes: 0, ended: false, phase: 'playing', previewDeadline: 0 };
  }

  function startPreview(game, seconds, now) {
    game.phase = 'preview';
    game.previewDeadline = now + seconds * 1000;
  }

  function finishPreview(game) {
    game.phase = 'playing';
    game.previewDeadline = 0;
  }

  function flip(game, index) {
    if (game.phase !== 'playing' || game.ended || !Number.isInteger(index) || index < 0 || index >= game.deck.length || game.matched.has(index) || game.first === index) return { type: 'ignored' };
    if (game.first === null) {
      game.first = index;
      return { type: 'first' };
    }
    const first = game.first;
    game.first = null;
    if (game.deck[first].id === game.deck[index].id) {
      game.matched.add(first);
      game.matched.add(index);
      if (game.matched.size === game.deck.length) {
        game.ended = true;
        return { type: 'win', first };
      }
      return { type: 'match', first };
    }
    game.mistakes++;
    if (game.mistakes >= game.allowance) {
      game.ended = true;
      return { type: 'lose', first };
    }
    return { type: 'mismatch', first };
  }

  function mount(container, options = {}) {
    let timer = null;
    let previewTimer = null;
    let pending = null;
    let disposed = false;
    let levelIndex = 0;
    let state = null;
    let boardLocked = false;
    let deadline = 0;
    let remaining = 0;

    function stop() {
      if (timer !== null) clearInterval(timer);
      if (previewTimer !== null) clearInterval(previewTimer);
      if (pending !== null) clearTimeout(pending);
      timer = null;
      previewTimer = null;
      pending = null;
    }
    function cleanup() { disposed = true; stop(); container.innerHTML = ''; }
    function exit() { cleanup(); if (options.onExit) options.onExit(); }
    function clock(seconds) { return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`; }
    function drawSetup() {
      stop();
      const chosen = LEVELS[levelIndex];
      container.innerHTML = `<section class="matrix-view"><div class="matrix-top"><button type="button" class="matrix-back">← 返回主菜单</button><span class="matrix-eyebrow">MEMORY MATCH / 02</span></div><div class="matrix-intro"><div><p class="matrix-kicker">PATTERN & POSITION</p><h1>矩阵翻牌<span>。</span></h1><p>翻开两张牌，找到相同的花色和点数。记住位置，直到所有牌配对。</p></div><div class="matrix-intro-icon" aria-hidden="true">♠<i>♥</i></div></div><div class="matrix-setup"><div class="matrix-section-title"><div><span>01 / 选择难度</span><h2>找到你的节奏</h2></div><p>先从轻松的一档开始。</p></div><div class="matrix-levels" role="radiogroup" aria-label="选择难度">${LEVELS.map((level, index) => `<button type="button" role="radio" aria-checked="${index === levelIndex}" class="matrix-level ${index === levelIndex ? 'is-selected' : ''}" data-level="${index}"><span class="matrix-level-number">0${index + 1}</span><strong>${level.name}</strong><small>${level.note}</small><span class="matrix-level-grid">${level.rows} × ${level.cols}</span></button>`).join('')}</div><div class="matrix-brief"><div><span>牌阵</span><strong>${chosen.rows} × ${chosen.cols}</strong></div><div><span>花色</span><strong>${chosen.suits} 种</strong></div><div><span>容错</span><strong>${chosen.mistakes} 次</strong></div><div><span>限时</span><strong>${clock(chosen.seconds)}</strong></div></div><p class="matrix-hint">开局先明牌浏览 ${chosen.previewSeconds} 秒，不占用配对时间；每翻错一组消耗 1 次容错。配对倒计时从第一次翻牌开始。</p><button type="button" class="matrix-start">开始这一局 <span>↗</span></button></div></section>`;
      container.querySelector('.matrix-back').addEventListener('click', exit);
      container.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => { levelIndex = Number(button.dataset.level); drawSetup(); }));
      container.querySelector('.matrix-start').addEventListener('click', start);
    }
    function start() {
      stop();
      const level = LEVELS[levelIndex];
      state = createState(createDeck(level), level.mistakes);
      remaining = level.seconds;
      deadline = 0;
      boardLocked = true;
      startPreview(state, level.previewSeconds, Date.now());
      container.innerHTML = `<section class="matrix-view matrix-playing matrix-previewing" style="--preview-board-width:calc(${75 * level.cols / level.rows}vh - ${165 * level.cols / level.rows}px)"><div class="matrix-top"><button type="button" class="matrix-back">← 退出这一局</button><span class="matrix-eyebrow">MEMORY MATCH / ${level.name}</span></div><div class="matrix-game-heading"><div><p class="matrix-kicker">KEEP THE PATTERN IN MIND</p><h1>找出每一对<span>。</span></h1></div><p>相同花色与点数才算配对</p></div><div class="matrix-stats"><div><span>已配对</span><strong class="matrix-pairs">0 / ${state.deck.length / 2}</strong></div><div><span>剩余容错</span><strong class="matrix-lives">${level.mistakes} 次</strong></div><div><span>剩余时间</span><strong class="matrix-clock">${clock(remaining)}</strong></div><div class="matrix-round-note">首次翻牌开始计时 <span>✳</span></div></div><div class="matrix-preview-banner"><div><strong>记住所有牌的位置</strong><span>明牌浏览 <b class="matrix-preview-clock">${level.previewSeconds}</b> 秒后自动盖牌，配对计时尚未开始</span></div><button type="button" class="matrix-preview-skip">记好了，开始配对 ↗</button></div><p class="matrix-scroll-hint">牌阵较宽时，可左右滑动查看。</p><div class="matrix-board-wrap"><div class="matrix-board" style="--matrix-cols:${level.cols}">${state.deck.map((card, index) => `<button type="button" class="matrix-card" data-index="${index}" aria-label="第 ${index + 1} 张，未翻开"><span class="matrix-card-inner"><span class="matrix-card-back" aria-hidden="true"><i>✦</i></span><span class="matrix-card-face ${card.red ? 'is-red' : ''}" aria-hidden="true"><b>${card.rank}</b><em>${card.symbol}</em></span></span></button>`).join('')}</div></div><p class="matrix-status" aria-live="polite">观察牌面，记住每一对的位置。</p></section>`;
      container.querySelector('.matrix-back').addEventListener('click', exit);
      container.querySelectorAll('.matrix-card').forEach((button, index) => {
        reveal(index);
        button.addEventListener('click', () => choose(Number(button.dataset.index)));
      });
      container.querySelector('.matrix-preview-skip').addEventListener('click', endPreview);
      previewTimer = setInterval(() => {
        const seconds = timeRemaining(state.previewDeadline, Date.now());
        container.querySelector('.matrix-preview-clock').textContent = seconds;
        if (seconds === 0) endPreview();
      }, 200);
      container.querySelector('.matrix-stats').scrollIntoView({ block: 'start', behavior: 'instant' });
    }
    function endPreview() {
      if (disposed || state.phase !== 'preview') return;
      clearInterval(previewTimer);
      previewTimer = null;
      finishPreview(state);
      container.querySelectorAll('.matrix-card').forEach((button, index) => hide(index));
      container.querySelector('.matrix-preview-banner').remove();
      container.querySelector('.matrix-playing').classList.remove('matrix-previewing');
      container.querySelector('.matrix-status').textContent = '准备好时，翻开第一张牌。';
      boardLocked = false;
    }
    function updateStats() {
      container.querySelector('.matrix-pairs').textContent = `${state.matched.size / 2} / ${state.deck.length / 2}`;
      container.querySelector('.matrix-lives').textContent = `${state.allowance - state.mistakes} 次`;
      container.querySelector('.matrix-clock').textContent = clock(remaining);
      container.querySelector('.matrix-clock').classList.toggle('is-low', remaining <= 20);
    }
    function beginTimer() {
      deadline = Date.now() + remaining * 1000;
      container.querySelector('.matrix-round-note').innerHTML = '专注当下 <span>✳</span>';
      timer = setInterval(() => {
        remaining = timeRemaining(deadline, Date.now());
        updateStats();
        if (remaining === 0) { state.ended = true; finish(false, '时间到啦'); }
      }, 200);
    }
    function reveal(index) {
      const button = container.querySelector(`[data-index="${index}"]`);
      const card = state.deck[index];
      button.classList.add('is-up');
      button.setAttribute('aria-label', `第 ${index + 1} 张，${card.name} ${card.rank}`);
    }
    function hide(index) {
      const button = container.querySelector(`[data-index="${index}"]`);
      button.classList.remove('is-up');
      button.setAttribute('aria-label', `第 ${index + 1} 张，未翻开`);
    }
    function choose(index) {
      if (disposed || boardLocked || state.ended) return;
      if (deadline) {
        remaining = timeRemaining(deadline, Date.now());
        updateStats();
        if (remaining === 0) { state.ended = true; finish(false, '时间到啦'); return; }
      }
      const result = flip(state, index);
      if (result.type === 'ignored') return;
      if (!deadline) beginTimer();
      reveal(index);
      const status = container.querySelector('.matrix-status');
      if (result.type === 'first') { status.textContent = '再翻开一张，寻找相同的牌。'; return; }
      updateStats();
      if (result.type === 'match' || result.type === 'win') {
        for (const matchedIndex of [result.first, index]) {
          const button = container.querySelector(`[data-index="${matchedIndex}"]`);
          button.classList.add('is-matched');
          button.disabled = true;
        }
        status.textContent = '配对成功！';
        if (result.type === 'win') { stop(); pending = setTimeout(() => finish(true, '全部配对成功'), 500); }
      } else {
        boardLocked = true;
        if (result.type === 'lose') stop();
        status.textContent = result.type === 'lose' ? '容错次数用完了。' : '这一组不同，记住它们的位置。';
        pending = setTimeout(() => {
          pending = null;
          if (result.type === 'lose') { finish(false, '容错次数用完'); return; }
          hide(result.first);
          hide(index);
          boardLocked = false;
        }, 850);
      }
    }
    function finish(won, title) {
      stop();
      boardLocked = true;
      const playing = container.querySelector('.matrix-playing');
      if (!playing) return;
      const panel = document.createElement('div');
      panel.className = 'matrix-result-overlay';
      panel.innerHTML = `<div class="matrix-result" role="dialog" aria-modal="true" aria-labelledby="matrix-result-title"><span class="matrix-result-symbol">${won ? '✦' : '◌'}</span><p class="matrix-kicker">${won ? 'ROUND COMPLETE' : 'TAKE A BREATH'}</p><h2 id="matrix-result-title">${title}<span>。</span></h2><p>${won ? '漂亮的一局。每一次专注，都是值得记录的练习。' : '休息一下，再试一次。记忆训练不必急于求成。'}</p><div class="matrix-result-stats"><div><span>完成配对</span><strong>${state.matched.size / 2} / ${state.deck.length / 2}</strong></div><div><span>翻错</span><strong>${state.mistakes} 次</strong></div><div><span>剩余时间</span><strong>${clock(remaining)}</strong></div></div><div class="matrix-result-actions"><button type="button" class="matrix-result-again">再试一次 ↗</button><button type="button" class="matrix-result-setup">选择难度</button></div></div>`;
      Array.from(playing.children).forEach(child => { child.inert = true; });
      playing.appendChild(panel);
      panel.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const buttons = Array.from(panel.querySelectorAll('button'));
        if (event.shiftKey && document.activeElement === buttons[0]) { event.preventDefault(); buttons[buttons.length - 1].focus(); }
        else if (!event.shiftKey && document.activeElement === buttons[buttons.length - 1]) { event.preventDefault(); buttons[0].focus(); }
      });
      panel.querySelector('.matrix-result-again').addEventListener('click', start);
      panel.querySelector('.matrix-result-setup').addEventListener('click', drawSetup);
      panel.querySelector('.matrix-result-again').focus();
    }
    drawSetup();
    return cleanup;
  }
  const api = { LEVELS, createDeck, createState, startPreview, finishPreview, flip, timeRemaining, mount };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.MemoryMatrix = api;
})(typeof window !== 'undefined' ? window : null);
