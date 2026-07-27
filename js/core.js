/* ═══════════════════════════════════════════════════
   core.js — 사운드 / 데이터 / 라우터 / 오버레이 / 평가서
   ═══════════════════════════════════════════════════ */

/* ── 1. 효과음 (Web Audio, 외부 음원 없음) ────────── */
class SoundSynth {
  constructor() {
    this.ctx = null;
    this.on = true;
  }
  _ac() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }
  _tone(freq, dur, type = 'sine', vol = 0.14, delay = 0) {
    if (!this.on) return;
    const ac = this._ac();
    if (!ac) return;
    const t0 = ac.currentTime + delay;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  _sweep(f1, f2, dur, type = 'sawtooth', vol = 0.1) {
    if (!this.on) return;
    const ac = this._ac();
    if (!ac) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(f1, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  _noise(dur = 0.12, vol = 0.12) {
    if (!this.on) return;
    const ac = this._ac();
    if (!ac) return;
    const len = Math.floor(ac.sampleRate * dur);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    const g = ac.createGain();
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(g).connect(ac.destination);
    src.start();
  }

  playSelect()  { this._tone(660, 0.09, 'triangle', 0.11); }
  playMove()    { this._tone(420, 0.06, 'square', 0.06); }
  playCoin()    { this._tone(988, 0.08, 'square', 0.09); this._tone(1319, 0.12, 'square', 0.08, 0.06); }
  playBuy()     { this._tone(300, 0.1, 'triangle', 0.1); this._tone(220, 0.14, 'triangle', 0.08, 0.06); }
  playHammer()  { this._noise(0.08, 0.16); this._tone(180, 0.06, 'square', 0.08); }
  playTruck()   { this._sweep(90, 180, 0.5, 'sawtooth', 0.06); }
  playSuccess() { [523, 659, 784].forEach((f, i) => this._tone(f, 0.22, 'triangle', 0.12, i * 0.08)); }
  playFailure() { this._sweep(320, 90, 0.4, 'sawtooth', 0.1); }
  playWin()     { [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.36, 'triangle', 0.13, i * 0.1)); }
  playLose()    { [392, 330, 262].forEach((f, i) => this._tone(f, 0.3, 'sine', 0.12, i * 0.14)); }
  playAlert()   { this._tone(880, 0.1, 'square', 0.11); this._tone(880, 0.1, 'square', 0.11, 0.16); }
  playTick()    { this._tone(1200, 0.03, 'square', 0.05); }
  playEat()     { this._tone(240, 0.07, 'triangle', 0.1); this._tone(200, 0.09, 'triangle', 0.08, 0.07); }
  playPlane()   { this._sweep(160, 620, 0.7, 'sawtooth', 0.05); }
}
const SFX = new SoundSynth();

/* ── 2. 유틸 ─────────────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

/** 한국식 금액 표기: 247760000 → "2억 4,776만 원" */
function korWon(n) {
  n = Math.round(n);
  const neg = n < 0;
  n = Math.abs(n);
  if (n < 10000) return (neg ? '-' : '') + n.toLocaleString('ko-KR') + '원';
  const eok = Math.floor(n / 100000000);
  const man = Math.floor((n % 100000000) / 10000);
  const rest = n % 10000;
  let s = '';
  if (eok) s += eok.toLocaleString('ko-KR') + '억 ';
  if (man) s += man.toLocaleString('ko-KR') + '만 ';
  if (rest) s += rest.toLocaleString('ko-KR') + ' ';
  return (neg ? '-' : '') + s.trim() + '원';
}
const num = (n) => Math.round(n).toLocaleString('ko-KR');

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function rnd(a, b) { return a + Math.random() * (b - a); }
function rndInt(a, b) { return Math.floor(rnd(a, b + 1)); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

/** 스테이지 위에 잠깐 뜨는 안내 */
let _toastTimer = null;
function toast(msg, ms = 1600) {
  const scene = $('#scene');
  if (!scene) return;
  const old = scene.querySelector('.toast');
  if (old) old.remove();
  const t = el('div', 'toast', msg);
  scene.appendChild(t);
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.remove(), ms);
}

/** 클릭 지점에서 떠오르는 숫자 */
function floatNum(x, y, text, color) {
  const scene = $('#scene');
  if (!scene) return;
  const n = el('div', 'float-num', text);
  n.style.left = x + 'px';
  n.style.top = y + 'px';
  n.style.color = color || 'var(--good)';
  scene.appendChild(n);
  setTimeout(() => n.remove(), 1000);
}

/* ── 3. 게임 메타 데이터 ─────────────────────────── */
const gamesData = {
  1: {
    title: '의자 팔기',
    student: '탕탕이',
    concept: '생산 → 판매 → 재투자',
    emoji: '🪑',
    color: '#e8a33d',
    desc: '신답초에서 의자를 만들어 트럭에 싣고 청량리역에 팝니다. 번 돈으로 재료를 다시 사서 또 만들기를 3번. 2번째에는 도둑이 나타납니다.',
    aiReview: '재료값 1,000원과 의자 판매가 1,000원이 <b>똑같아서</b> 아무리 열심히 팔아도 돈이 늘지 않아요. 판매 가격과 재료값 중 어느 쪽을 고쳐야 할까요?',
    sheets: [
      { src: 'source_images/page_01.png', cap: '1. 규칙 설명' },
      { src: 'source_images/page_02.png', cap: '2. 배운 내용' },
      { src: 'source_images/page_03.png', cap: '3. 디자인' },
      { src: 'source_images/page_04.png', cap: '4. 디자인 2' }
    ]
  },
  2: {
    title: '햄버거 가게',
    student: '개미핥기',
    concept: '재료 → 생산 → 서비스 → 월급 → 소비',
    emoji: '🍔',
    color: '#e4572e',
    desc: '삼촌 농장에서 채소를 빌리고 정육점에서 고기를 사서 버거를 쌓습니다. 손님에게 대접하고 월급을 받은 뒤, 백화점에서 밥과 옷을 사고 집으로 돌아옵니다.',
    aiReview: '목표가 <b>2억 4,776만 원</b>인데 버거 하나 팔면 3,000원이에요. 약 <b>8만 개</b>를 팔아야 끝납니다. 목표 금액과 버거 값 중 무엇을 얼마로 정할까요?',
    sheets: [
      { src: 'source_images/page_05.png', cap: '1. 규칙 설명' },
      { src: 'source_images/page_06.png', cap: '2. 배운 내용' },
      { src: 'source_images/page_07.png', cap: '3. 디자인' },
      { src: 'source_images/page_08.png', cap: '4. 디자인 2' }
    ]
  },
  3: {
    title: '타이쿤',
    student: '에라이!!',
    concept: '판매 수익과 생활비, 계절에 맞는 소비',
    emoji: '🚗',
    color: '#2ec4a6',
    desc: '신답 마을에서 만든 자동차를 팔고 수리합니다. 배고픔 게이지를 채우고 계절에 맞는 옷을 입어야 살아남습니다. 목표는 1억 원.',
    aiReview: '자동차를 한 대 팔면 <b>50만 원</b>인데 목표가 <b>1억 원</b>이라 200대를 팔아야 해요. 그동안 배고픔 게이지는 계속 줄어듭니다. 목표와 자동차 값 중 무엇을 얼마로 정할까요?',
    sheets: [
      { src: 'source_images/page_09.png', cap: '1. 규칙 설명' },
      { src: 'source_images/page_10.png', cap: '2. 배운 내용' },
      { src: 'source_images/page_11.png', cap: '3. 디자인' },
      { src: 'source_images/page_12.png', cap: '4. 디자인 2' }
    ]
  },
  4: {
    title: '물건을 사고 파는 가게',
    student: '이상한 사람들',
    concept: '지역별 특산물과 시세 차이',
    emoji: '🏪',
    color: '#7c6bf5',
    desc: '옷·사과·생선·책 네 마을을 오가며 싼 곳에서 사고 비싼 곳에서 팝니다. 물건은 시간이 지나면 썩고, 옆집 경쟁자가 재고를 사 갑니다. 400초 안에 30개 판매와 5,000코인.',
    aiReview: '사과만 사고팔면 한 번에 <b>20코인쯤</b> 남아서 5,000코인은 어림도 없어요. 옷(👕)처럼 비싼 특산물을 노려야 5,000코인에 닿습니다.',
    sheets: [
      { src: 'source_images/page_13.png', cap: '1. 규칙 설명' },
      { src: 'source_images/page_14.png', cap: '2. 배운 내용' },
      { src: 'source_images/page_15.png', cap: '3. 디자인' },
      { src: 'source_images/page_16.png', cap: '4. 디자인 2' }
    ]
  }
};

/* ── 4. 게임 베이스 클래스 ───────────────────────── */
class GameBase {
  constructor(id) {
    this.id = id;
    this._timers = new Set();
    this._raf = null;
    this.keyHandler = null;
    this.params = {};
    this.paramSpec = [];
  }
  get scene() { return $('#scene'); }
  get ctrl() { return $('#interactive-controls-container'); }
  get statPanel() { return $('#stat-panel'); }
  P(k) { return this.params[k]; }

  /** 키보드 핸들러 재등록 (누적 방지) */
  bindKeys(fn) {
    if (this.keyHandler) window.removeEventListener('keydown', this.keyHandler);
    this.keyHandler = fn;
    window.addEventListener('keydown', this.keyHandler);
  }
  every(ms, fn) { const t = setInterval(fn, ms); this._timers.add(t); return t; }
  after(ms, fn) {
    const t = setTimeout(() => { this._timers.delete(t); fn(); }, ms);
    this._timers.add(t);
    return t;
  }
  clearTimers() {
    this._timers.forEach((t) => { clearInterval(t); clearTimeout(t); });
    this._timers.clear();
  }
  loop(fn) {
    const step = () => { fn(); this._raf = requestAnimationFrame(step); };
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(step);
  }
  cleanup() {
    this.clearTimers();
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; }
    if (this.keyHandler) { window.removeEventListener('keydown', this.keyHandler); this.keyHandler = null; }
    if (this.scene) this.scene.innerHTML = '';
    if (this.ctrl) this.ctrl.innerHTML = '';
    if (this.statPanel) this.statPanel.innerHTML = '';
  }
  /** paramSpec 의 기본값으로 params 초기화 */
  resetParams() {
    this.params = {};
    this.paramSpec.forEach((p) => { this.params[p.key] = p.orig; });
  }
  /** 상태 패널 렌더 헬퍼 */
  renderStats(rows) {
    const p = this.statPanel;
    p.innerHTML = '';
    p.appendChild(el('div', 'p-title', '현재 상태'));
    rows.forEach((r) => {
      if (r.gauge) {
        const g = el('div', 'gauge');
        g.innerHTML =
          `<div class="gauge-top"><span>${r.label}</span><span>${r.text}</span></div>
           <div class="gauge-bar"><div class="gauge-fill" style="width:${clamp(r.pct, 0, 100)}%;background:${r.color}"></div></div>`;
        p.appendChild(g);
        return;
      }
      const s = el('div', 'stat');
      s.innerHTML = `<span class="stat-label">${r.label}</span>
                     <span class="stat-value ${r.cls || ''}">${r.value}</span>`;
      p.appendChild(s);
    });
  }
  addHint(html) {
    this.statPanel.appendChild(el('div', 'hint', html));
  }
}

/* ── 5. 오버레이 ─────────────────────────────────── */
const Overlay = {
  show(win, title, descHtml, onContinue, btnText) {
    $('#ov-icon').textContent = win ? '🎉' : '💥';
    $('#ov-title').textContent = title;
    $('#ov-desc').innerHTML = descHtml || '';
    const btn = $('#ov-btn');
    btn.textContent = btnText || (win ? '계속하기' : '다시 하기');
    btn.onclick = () => { Overlay.hide(); SFX.playSelect(); if (onContinue) onContinue(); };
    $('#overlay').hidden = false;
    win ? SFX.playSuccess() : SFX.playFailure();
  },
  hide() { $('#overlay').hidden = true; }
};

/* ── 6. 라우터 ───────────────────────────────────── */
const gameInstances = {};
let currentGame = null;
let currentId = null;

function showView(name) {
  $('#view-dashboard').hidden = name !== 'dashboard';
  $('#view-game').hidden = name !== 'game';
  const inGame = name === 'game';
  $('#btn-home').hidden = !inGame;
  $('#btn-sheet').hidden = !inGame;
  $('#btn-review').hidden = !inGame;
}

/* AI 기획 평가서 모달 */
function openReview() {
  if (!currentId) return;
  const d = gamesData[currentId];
  $('#review-title').textContent = `AI 기획 평가서 — ${d.title}`;
  $('#review-scroll').innerHTML = reviewHTML(currentId);
  $('#review-scroll').scrollTop = 0;
  $('#review-modal').hidden = false;
  SFX.playSelect();
}

function enterGame(id) {
  if (currentGame && currentGame.cleanup) currentGame.cleanup();
  Overlay.hide();
  currentId = id;
  const d = gamesData[id];

  $('#view-game').style.setProperty('--c', d.color);
  $('#gh-num').textContent = String(id).padStart(2, '0');
  $('#gh-title').textContent = d.title;
  $('#gh-student').textContent = '기획 : ' + d.student;
  $('#gh-concept').textContent = d.concept;
  $('#gh-review-text').innerHTML = d.aiReview;

  $('#scene').innerHTML = '';
  $('#interactive-controls-container').innerHTML = '';
  $('#stat-panel').innerHTML = '';

  showView('game');
  currentGame = gameInstances[id];
  currentGame.start();
}

function backToDashboard() {
  if (currentGame && currentGame.cleanup) currentGame.cleanup();
  currentGame = null;
  currentId = null;
  Overlay.hide();
  $('#sheet-modal').hidden = true;
  $('#review-modal').hidden = true;
  showView('dashboard');
}

/* ── 7. 대시보드 렌더 ────────────────────────────── */
function renderDashboard() {
  const grid = $('#card-grid');
  grid.innerHTML = '';
  Object.keys(gamesData).forEach((k) => {
    const id = Number(k);
    const d = gamesData[id];
    const card = el('button', 'gcard');
    card.type = 'button';
    card.style.setProperty('--c', d.color);
    card.innerHTML = `
      <div class="gcard-top">
        <span class="gcard-num">GAME ${String(id).padStart(2, '0')}</span>
        <span class="gcard-emoji" aria-hidden="true">${d.emoji}</span>
      </div>
      <h3>${d.title}</h3>
      <div class="gcard-student">기획 : ${d.student}</div>
      <p class="gcard-desc">${d.desc}</p>
      <div class="gcard-foot">
        <span class="badge">${d.concept}</span>
        <span class="gcard-play">플레이 →</span>
      </div>`;
    card.onclick = () => { SFX.playSelect(); enterGame(id); };
    grid.appendChild(card);
  });
}

/* ── 8. 기획안 뷰어 ──────────────────────────────── */
function openSheet() {
  if (!currentId) return;
  const d = gamesData[currentId];
  $('#sheet-title').textContent = `${d.title} — 기획 : ${d.student}`;
  const box = $('#sheet-scroll');
  box.innerHTML = '';
  d.sheets.forEach((s) => {
    box.appendChild(el('div', 'sheet-cap', s.cap));
    const img = el('img');
    img.src = s.src;
    img.alt = `${d.title} ${s.cap}`;
    img.loading = 'lazy';
    box.appendChild(img);
  });
  $('#sheet-modal').hidden = false;
  SFX.playSelect();
}

/* ── 9. 조절실 (밸런스 튜너) — 보류 ─────────────────
   학생이 만든 게임은 기획 학생이 정한 값 하나로만 돌아가야 한다고 판단해서 뺐습니다.
   각 게임의 paramSpec 은 그대로 두었고(resetParams 가 기본값을 읽습니다),
   활동지에서 정한 값을 paramSpec 의 orig 에 반영해 다시 배포하는 방식으로 씁니다.
   되살리려면 아래 블록 주석과 index.html·boot.js 의 조절실 블록을 함께 푸세요.

function fmtParam(spec, v) {
  if (spec.fmt === 'won') return korWon(v);
  return num(v) + (spec.unit || '');
}

function openTuner() {
  if (!currentGame) return;
  const body = $('#tuner-body');
  body.innerHTML = '';

  const d = gamesData[currentId];
  const rev = el('div', 'tuner-review');
  rev.innerHTML = `<span class="tr-tag">AI 한줄평</span>${d.aiReview}`;
  body.appendChild(rev);

  currentGame.paramSpec.forEach((spec) => {
    const cur = currentGame.params[spec.key];
    const row = el('div', 'tune');
    row.innerHTML = `
      <div class="tune-top">
        <span class="tune-label">${spec.label}</span>
        <span class="tune-val" data-val>${fmtParam(spec, cur)}</span>
      </div>
      ${spec.note ? `<div class="tune-note">${spec.note}</div>` : ''}
      <input type="range" min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${cur}">
      <div class="tune-orig" data-orig>기획서 원래 값 : ${fmtParam(spec, spec.orig)}</div>`;
    const range = row.querySelector('input');
    const valEl = row.querySelector('[data-val]');
    const origEl = row.querySelector('[data-orig]');
    const sync = () => {
      const v = Number(range.value);
      valEl.textContent = fmtParam(spec, v);
      origEl.classList.toggle('changed', v !== spec.orig);
      currentGame.params[spec.key] = v;
    };
    origEl.classList.toggle('changed', cur !== spec.orig);
    range.oninput = sync;
    body.appendChild(row);
  });

  $('#tuner').hidden = false;
  $('#drawer-scrim').hidden = false;
  SFX.playSelect();
}
function closeTuner() {
  $('#tuner').hidden = true;
  $('#drawer-scrim').hidden = true;
}
function applyTuner() {
  closeTuner();
  Overlay.hide();
  if (!currentGame) return;
  currentGame.cleanup();
  currentGame.start();
  toast('바뀐 규칙으로 다시 시작합니다');
}
function resetTuner() {
  if (!currentGame) return;
  currentGame.resetParams();
  openTuner();
  toast('기획서 원래 값으로 되돌렸습니다');
}
─────────────────────────────────────────────────── */
