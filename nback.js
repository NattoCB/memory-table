(function (root) {
  'use strict';

  const SUITS = [
    { id: 'spades', symbol: '♠', name: '黑桃' },
    { id: 'hearts', symbol: '♥', name: '红桃' },
    { id: 'clubs', symbol: '♣', name: '梅花' },
    { id: 'diamonds', symbol: '♦', name: '方块' }
  ];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  function createSession(n, questions = 20, random = Math.random) {
    if (!Number.isInteger(n) || n < 1 || n > 30) throw new RangeError('N must be an integer from 1 to 30');
    if (!Number.isInteger(questions) || questions < 1) throw new RangeError('questions must be a positive integer');
    const state = { n, questions, cards: [], phase: 'warmup', answered: 0, suitCorrect: 0, rankCorrect: 0, exact: 0, target: null, lastResult: null };
    function draw() {
      const index = Math.min(51, Math.max(0, Math.floor(random() * 52)));
      state.cards.push({ suit: SUITS[Math.floor(index / 13)].id, rank: RANKS[index % 13] });
      state.target = state.cards.length > n ? state.cards[state.cards.length - 1 - n] : null;
      state.phase = state.target ? 'answer' : 'warmup';
    }
    function advance() {
      if (state.phase !== 'warmup' && state.phase !== 'feedback') return;
      draw();
    }
    function submit(suit, rank) {
      if (state.phase !== 'answer') return;
      if (!SUITS.some(item => item.id === suit) || !RANKS.includes(rank)) throw new RangeError('Choose a suit and rank');
      const suitCorrect = suit === state.target.suit;
      const rankCorrect = rank === state.target.rank;
      state.suitCorrect += Number(suitCorrect);
      state.rankCorrect += Number(rankCorrect);
      state.exact += Number(suitCorrect && rankCorrect);
      state.answered++;
      state.lastResult = { suitCorrect, rankCorrect, target: state.target };
      state.phase = state.answered === questions ? 'complete' : 'feedback';
    }
    draw();
    return { state, advance, submit };
  }

  function cardMarkup(card, small = false) {
    const suit = SUITS.find(item => item.id === card.suit);
    return `<div class="nb-card ${small ? 'nb-card--small' : ''} ${card.suit === 'hearts' || card.suit === 'diamonds' ? 'nb-card--red' : ''}" aria-label="${suit.name} ${card.rank}"><span class="nb-card-corner">${card.rank}<br>${suit.symbol}</span><span class="nb-card-symbol">${suit.symbol}</span><span class="nb-card-corner nb-card-corner--bottom">${card.rank}<br>${suit.symbol}</span></div>`;
  }

  function mount(container, { onExit = () => {} } = {}) {
    let game = null;
    let selectedSuit = null;
    let selectedRank = null;
    let n = 2;
    let disposed = false;

    function renderSetup() {
      container.innerHTML = `<section class="nb-shell nb-setup">
        <div class="nb-top"><button class="nb-back" data-action="exit">← 返回主菜单</button><span class="nb-kicker">01 / N-BACK POKER</span></div>
        <div class="nb-setup-grid"><div><p class="nb-eyebrow">专注，记住，然后回想</p><h1>记忆的<br><em>上一手。</em></h1><p class="nb-lead">每出现一张新牌，回想 <strong>N 张之前</strong>的牌是什么。花色和点数都要记住。</p>
        <div class="nb-rule"><span>如何开始</span><p>先依次记住前 N 张热身牌。之后每轮选择对应的花色与点数，提交后查看答案，按自己的节奏继续。</p></div></div>
        <div class="nb-config"><div class="nb-config-top"><span>训练设置</span><span>01 — 30</span></div><label for="nb-n">回溯距离 <span>N-BACK</span></label><div class="nb-number"><button data-action="minus" aria-label="减少 N">−</button><input id="nb-n" type="number" min="1" max="30" step="1" value="${n}" inputmode="numeric"><button data-action="plus" aria-label="增加 N">+</button></div><input class="nb-range" aria-label="回溯距离滑块" type="range" min="1" max="30" value="${n}"><div class="nb-range-labels"><span>1 · 入门</span><span>30 · 极限</span></div><div class="nb-config-note">每次训练 20 题，热身牌不计分。<br>没有倒计时，按自己的节奏来。</div><button class="nb-primary" data-action="start">开始训练 <span>↗</span></button></div></div></section>`;
    }

    function renderGame() {
      const s = game.state;
      const card = s.cards[s.cards.length - 1];
      const isWarmup = s.phase === 'warmup';
      const isFeedback = s.phase === 'feedback';
      const score = s.answered ? Math.round(s.exact / s.answered * 100) : 0;
      if (s.phase === 'complete') {
        const last = s.lastResult;
        const lastSuit = SUITS.find(item => item.id === last.target.suit);
        container.innerHTML = `<section class="nb-shell nb-result"><div class="nb-top"><button class="nb-back" data-action="exit">← 返回主菜单</button><span class="nb-kicker">SESSION COMPLETE</span></div><div class="nb-result-content"><p class="nb-eyebrow">一次专注的练习</p><h1>这一手，<em>完成了。</em></h1><p class="nb-lead">${s.n}-back · 共 ${s.questions} 题。最后一题的答案是 ${lastSuit.symbol} ${last.target.rank}。</p><div class="nb-results"><div><strong>${s.exact}<small> / ${s.questions}</small></strong><span>完全正确</span></div><div><strong>${s.suitCorrect}<small> / ${s.questions}</small></strong><span>花色正确</span></div><div><strong>${s.rankCorrect}<small> / ${s.questions}</small></strong><span>点数正确</span></div><div><strong>${score}<small>%</small></strong><span>完全正确率</span></div></div><p class="nb-result-note">把成绩当作一次练习记录，允许状态有起伏。</p><div class="nb-result-actions"><button class="nb-primary" data-action="restart">再练一次 <span>↗</span></button><button class="nb-secondary" data-action="setup">调整难度</button></div></div></section>`;
        return;
      }
      const progress = isWarmup ? `热身 ${s.cards.length} / ${s.n}` : `第 ${s.answered + (isFeedback ? 0 : 1)} / ${s.questions} 题`;
      const prompt = isWarmup ? `记住这张牌` : `回想 ${s.n} 张之前的牌`;
      let answer = '';
      if (isWarmup) {
        answer = `<div class="nb-instruction"><span class="nb-step-tag">WARM UP</span><h2>先把这张牌记下来。</h2><p>热身阶段不会提问。准备好后，进入下一张。</p><button class="nb-primary" data-action="advance">${s.cards.length === s.n ? '开始第一题' : '下一张牌'} <span>→</span></button></div>`;
      } else if (isFeedback) {
        const last = s.lastResult;
        const targetSuit = SUITS.find(item => item.id === last.target.suit);
        answer = `<div class="nb-instruction nb-feedback"><span class="nb-step-tag">${last.suitCorrect && last.rankCorrect ? 'EXACT MATCH' : 'KEEP GOING'}</span><h2>${last.suitCorrect && last.rankCorrect ? '漂亮，完全正确。' : '答案揭晓。'}</h2><p>${s.n} 张之前是 <strong>${targetSuit.symbol} ${last.target.rank}</strong>。花色${last.suitCorrect ? '正确' : '有误'}，点数${last.rankCorrect ? '正确' : '有误'}。</p><button class="nb-primary" data-action="advance">下一题 <span>→</span></button></div>`;
      } else {
        answer = `<div class="nb-answer"><div class="nb-answer-heading"><span class="nb-step-tag">YOUR ANSWER</span><h2>${prompt}</h2><p>选择花色和点数，然后确认答案。</p></div><fieldset><legend>花色</legend><div class="nb-suits">${SUITS.map(suit => `<button class="nb-choice nb-suit ${suit.id === 'hearts' || suit.id === 'diamonds' ? 'nb-red' : ''} ${selectedSuit === suit.id ? 'is-selected' : ''}" data-suit="${suit.id}" aria-pressed="${selectedSuit === suit.id}"><span>${suit.symbol}</span><small>${suit.name}</small></button>`).join('')}</div></fieldset><fieldset><legend>点数</legend><div class="nb-ranks">${RANKS.map(rank => `<button class="nb-choice ${selectedRank === rank ? 'is-selected' : ''}" data-rank="${rank}" aria-pressed="${selectedRank === rank}">${rank}</button>`).join('')}</div></fieldset><button class="nb-primary" data-action="submit" ${selectedSuit && selectedRank ? '' : 'disabled'}>确认答案 <span>↗</span></button></div>`;
      }
      container.innerHTML = `<section class="nb-shell nb-play"><div class="nb-top"><button class="nb-back" data-action="exit">← 返回主菜单</button><span class="nb-kicker">${s.n}-BACK / ${progress}</span></div><div class="nb-progress"><span style="width:${isWarmup ? 0 : s.answered / s.questions * 100}%"></span></div><div class="nb-play-grid"><div class="nb-stage"><div class="nb-stage-heading"><span>当前牌</span><span>${String(s.cards.length).padStart(2, '0')} / ${String(s.n + s.questions).padStart(2, '0')}</span></div>${cardMarkup(card)}<p>${isWarmup ? '仔细观察，准备下一张' : '记住当前牌，稍后还会用到'}</p></div>${answer}</div><div class="nb-footer"><span>慢一点，专注每一张。</span><span>完全正确 ${s.exact} / ${s.answered}</span></div></section>`;
    }

    function setN(value) {
      const number = Number(value);
      if (!Number.isFinite(number)) return;
      n = Math.max(1, Math.min(30, Math.round(number)));
      const input = container.querySelector('#nb-n');
      const range = container.querySelector('.nb-range');
      if (input) input.value = n;
      if (range) range.value = n;
    }
    function click(event) {
      const button = event.target.closest('button');
      if (!button || !container.contains(button)) return;
      if (button.dataset.suit || button.dataset.rank) {
        if (button.dataset.suit) selectedSuit = button.dataset.suit;
        if (button.dataset.rank) selectedRank = button.dataset.rank;
        container.querySelectorAll('[data-suit], [data-rank]').forEach(choice => {
          const chosen = choice.dataset.suit ? choice.dataset.suit === selectedSuit : choice.dataset.rank === selectedRank;
          choice.classList.toggle('is-selected', chosen);
          choice.setAttribute('aria-pressed', String(chosen));
        });
        container.querySelector('[data-action=submit]').disabled = !(selectedSuit && selectedRank);
        return;
      }
      switch (button.dataset.action) {
        case 'exit': onExit(); break;
        case 'minus': setN(n - 1); break;
        case 'plus': setN(n + 1); break;
        case 'start': case 'restart': game = createSession(n); selectedSuit = selectedRank = null; renderGame(); break;
        case 'setup': game = null; renderSetup(); break;
        case 'advance': game.advance(); selectedSuit = selectedRank = null; renderGame(); break;
        case 'submit': if (selectedSuit && selectedRank) { game.submit(selectedSuit, selectedRank); renderGame(); } break;
      }
    }
    function input(event) {
      if (event.target.matches('.nb-range')) setN(event.target.value);
    }
    function change(event) {
      if (event.target.matches('#nb-n')) setN(event.target.value || n);
    }
    container.addEventListener('click', click);
    container.addEventListener('input', input);
    container.addEventListener('change', change);
    renderSetup();
    return function cleanup() {
      if (disposed) return;
      disposed = true;
      container.removeEventListener('click', click);
      container.removeEventListener('input', input);
      container.removeEventListener('change', change);
    };
  }

  const api = { mount, createSession };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.NBack = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
