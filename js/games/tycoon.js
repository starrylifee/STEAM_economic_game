/* ═══════════════════════════════════════════════════
   GAME 03 · 타이쿤 — 기획 : 에라이!!
   기획서 원문 규칙
   · 신답 지역에서 자동차를 만들고, 나는 그 자동차를 판다
   · 자동차 수리도 하는데 부속 사는 돈은 자동차 판 돈으로 낸다
   · 자동차 판 돈으로 살림살이에 필요한 것을 사기도 한다
   · 다른 지역에 가서 여행도 한다
   · 밑에 배고픔 게이지가 있고, 밥을 안 먹고 버티면 다 닳아서 죽는다
   · 1억을 모으면 끝이 난다
   · 겨울에 반팔, 여름에 패딩을 입으면 너무 춥거나 더워서 잠을 못 잔다
   · 밥은 마트에서 식재료를 사거나 식당에서 사 먹는다
   ═══════════════════════════════════════════════════ */

const TY_SEASONS = [
  { name: '봄', ico: '🌸', fit: ['tee', 'padding'] },
  { name: '여름', ico: '☀️', fit: ['tee'] },
  { name: '가을', ico: '🍁', fit: ['tee', 'padding'] },
  { name: '겨울', ico: '❄️', fit: ['padding'] }
];
const TY_WEAR = { tee: { ico: '👕', name: '반팔' }, padding: { ico: '🧥', name: '패딩' } };

class GameTycoon extends GameBase {
  constructor() {
    super(3);
    this.paramSpec = [
      { key: 'goal', label: '목표 금액 (승리 조건)', orig: 100000000, min: 100000, max: 200000000, step: 100000, fmt: 'won',
        note: '기획서 원문은 "1억을 모으면 끝이 난다"입니다.' },
      { key: 'carPrice', label: '자동차 한 대 판매 가격', orig: 500000, min: 10000, max: 20000000, step: 10000, fmt: 'won' },
      { key: 'partCost', label: '자동차 부속 값', orig: 100000, min: 0, max: 2000000, step: 10000, fmt: 'won' },
      { key: 'repairPay', label: '수리하고 받는 돈', orig: 200000, min: 0, max: 5000000, step: 10000, fmt: 'won' },
      { key: 'carSpawn', label: '신답 공장에서 차가 들어오는 간격', orig: 4, min: 1, max: 20, step: 1, unit: '초' },
      { key: 'hungerRate', label: '배고픔이 줄어드는 속도', orig: 2, min: 0, max: 10, step: 1, unit: '/초',
        note: '0으로 하면 배가 고파지지 않습니다.' },
      { key: 'foodCost', label: '마트 식재료 값', orig: 8000, min: 0, max: 200000, step: 1000, fmt: 'won' },
      { key: 'restaurantCost', label: '식당 밥값', orig: 15000, min: 0, max: 300000, step: 1000, fmt: 'won' },
      { key: 'travelCost', label: '여행 비용', orig: 300000, min: 0, max: 5000000, step: 10000, fmt: 'won' },
      { key: 'startMoney', label: '시작할 때 가진 돈', orig: 0, min: 0, max: 10000000, step: 100000, fmt: 'won' }
    ];
    this.resetParams();
  }

  start() {
    this.money = this.P('startMoney');
    this.hunger = 100;
    this.sleep = 100;
    this.day = 1;
    this.seasonIdx = 0;
    this.wear = 'tee';
    this.cars = 1;
    this.broken = 0;
    this.sold = 0;
    this.place = 'village';
    this.over = false;
    this.tick = 0;
    this.spawnAcc = 0;

    this.buildScene();
    this.renderAll();

    /* 0.5초 틱 */
    this.every(500, () => this.step());
  }

  buildScene() {
    this.scene.innerHTML = `
      <div class="ty">
        <div class="ty-world">
          <div class="ty-season" id="ty-season"></div>
          <div class="ty-half village" id="ty-village">
            <h4>신답 마을</h4>
            <div class="ty-scene-ico">🏘️</div>
            <div class="ty-sub" id="ty-village-sub"></div>
            <div class="ty-cars" id="ty-cars"></div>
          </div>
          <div class="ty-half travel off" id="ty-travel">
            <h4>여행지</h4>
            <div class="ty-scene-ico">✈️</div>
            <div class="ty-sub" id="ty-travel-sub">비행기를 타고 갈 수 있어요</div>
          </div>
        </div>
        <div class="ty-gauges" id="ty-gauges"></div>
      </div>`;
  }

  /* ── 시간 진행 ────────────────────────────────── */
  step() {
    if (this.over) return;
    this.tick++;

    const rate = this.P('hungerRate') * 0.5;
    this.hunger = clamp(this.hunger - rate, 0, 100);

    const season = TY_SEASONS[this.seasonIdx];
    const fits = season.fit.includes(this.wear);
    this.sleep = clamp(this.sleep - (fits ? 0.4 : 1.2), 0, 100);

    if (this.tick % 4 === 0) {
      this.day++;
      if (this.day % 8 === 1) {
        this.seasonIdx = (this.seasonIdx + 1) % 4;
        const s = TY_SEASONS[this.seasonIdx];
        toast(`계절이 바뀌었습니다 · ${s.ico} ${s.name}`);
        SFX.playAlert();
      }
    }

    this.spawnAcc += 0.5;
    if (this.spawnAcc >= this.P('carSpawn')) {
      this.spawnAcc = 0;
      if (this.cars + this.broken < 8) {
        if (Math.random() < 0.25) this.broken++; else this.cars++;
      }
    }

    if (this.hunger <= 0) { this.die('배고픔'); return; }
    if (this.sleep <= 0) { this.die('잠'); return; }
    this.renderAll();
  }

  /* ── 렌더 ─────────────────────────────────────── */
  renderAll() {
    const season = TY_SEASONS[this.seasonIdx];
    const fits = season.fit.includes(this.wear);

    const sEl = $('#ty-season');
    if (sEl) {
      sEl.innerHTML = `<span>${season.ico} ${season.name}</span>
        <span class="ts-day">${this.day}일차</span>
        <span class="ty-wear ${fits ? 'good' : 'bad'}">${TY_WEAR[this.wear].ico} ${TY_WEAR[this.wear].name}${fits ? '' : ' · 안 맞아요'}</span>`;
    }

    const carsEl = $('#ty-cars');
    if (carsEl) {
      let html = '';
      for (let i = 0; i < this.cars; i++) html += `<div class="ty-car">🚗</div>`;
      for (let i = 0; i < this.broken; i++) html += `<div class="ty-car broken">🛠️</div>`;
      carsEl.innerHTML = html || `<div class="ty-sub">공장에서 차가 오는 중…</div>`;
    }
    const vSub = $('#ty-village-sub');
    if (vSub) vSub.textContent = `팔 수 있는 차 ${this.cars}대 · 고장 난 차 ${this.broken}대`;

    $('#ty-village').classList.toggle('off', this.place !== 'village');
    $('#ty-travel').classList.toggle('off', this.place !== 'travel');

    const g = $('#ty-gauges');
    if (g) {
      const goalPct = clamp((this.money / this.P('goal')) * 100, 0, 100);
      const bar = (label, txt, pct, color) =>
        `<div><div class="ty-g-label"><span>${label}</span><span>${txt}</span></div>
          <div class="ty-g-bar"><div class="ty-g-fill" style="width:${pct}%;background:${color}"></div></div></div>`;
      g.innerHTML =
        bar('🍚 배고픔', Math.round(this.hunger) + '%', this.hunger,
          this.hunger < 25 ? 'var(--bad)' : this.hunger < 55 ? 'var(--warn)' : 'var(--good)') +
        bar('😴 잠', Math.round(this.sleep) + '%', this.sleep,
          this.sleep < 25 ? 'var(--bad)' : this.sleep < 55 ? 'var(--warn)' : '#8aa0ff') +
        bar('🎯 목표', goalPct.toFixed(goalPct < 1 ? 3 : 1) + '%', goalPct, 'var(--c)');
    }

    this.renderStats([
      { label: '가진 돈', value: korWon(this.money), cls: 'c' },
      { label: '목표', value: korWon(this.P('goal')), cls: 'sm' },
      { label: '판 자동차', value: this.sold + '대', cls: 'sm' },
      { label: '배고픔', value: Math.round(this.hunger) + '%', cls: this.hunger < 25 ? 'bad' : 'sm' },
      { label: '잠', value: Math.round(this.sleep) + '%', cls: this.sleep < 25 ? 'bad' : 'sm' }
    ]);
    const need = Math.ceil((this.P('goal') - this.money) / Math.max(1, this.P('carPrice')));
    this.addHint(`목표까지 자동차 <b>${num(Math.max(0, need))}대</b>를 더 팔아야 합니다.<br>
      잠이 30% 아래면 자동차를 <b>반값</b>에 팔게 됩니다.`);

    this.renderControls();
  }

  renderControls() {
    const c = this.ctrl;
    c.innerHTML = '';
    const grp = (t) => { const g = el('div', 'ctrl-group'); if (t) g.appendChild(el('div', 'p-title', t)); c.appendChild(g); return g; };
    const mk = (g, ico, title, sub, key, cls, fn, dis) => {
      const b = el('button', 'abtn ' + (key ? 'key ' : '') + (cls || ''));
      b.type = 'button';
      if (key) b.dataset.key = key;
      b.innerHTML = `<span class="ab-ico">${ico}</span>
                     <span class="ab-body">${title}${sub ? `<span class="ab-sub">${sub}</span>` : ''}</span>`;
      b.disabled = !!dis;
      b.onclick = fn;
      g.appendChild(b);
    };

    const traveling = this.place === 'travel';

    const g1 = grp('자동차 사업');
    mk(g1, '🚗', '자동차 팔기', korWon(this.sellPrice()) + ' 받기', '1', 'accent',
      () => this.sellCar(), traveling || this.cars < 1);
    mk(g1, '🔧', '자동차 수리', `부속 ${korWon(this.P('partCost'))} → ${korWon(this.P('repairPay'))}`, '2', '',
      () => this.repairCar(), traveling || this.broken < 1 || this.money < this.P('partCost'));

    const g2 = grp('살림살이');
    mk(g2, '🛒', '마트에서 식재료 사기', `${korWon(this.P('foodCost'))} · 배고픔 +40`, '3', '',
      () => this.eat('mart'), traveling || this.money < this.P('foodCost'));
    mk(g2, '🍚', '식당에서 사 먹기', `${korWon(this.P('restaurantCost'))} · 배고픔 +75`, '4', '',
      () => this.eat('rest'), traveling || this.money < this.P('restaurantCost'));
    mk(g2, TY_WEAR[this.wear === 'tee' ? 'padding' : 'tee'].ico,
      `${TY_WEAR[this.wear === 'tee' ? 'padding' : 'tee'].name}(으)로 갈아입기`,
      `지금은 ${TY_WEAR[this.wear].name}`, '5', '', () => this.changeWear(), traveling);
    mk(g2, '😴', '잠자기', '잠 회복 (옷이 안 맞으면 조금만)', '6', '', () => this.doSleep(), traveling);

    const g3 = grp('여행');
    mk(g3, '✈️', traveling ? '여행 중…' : '다른 지역으로 여행',
      korWon(this.P('travelCost')) + ' · 잠 가득 회복', '7', '',
      () => this.travel(), traveling || this.money < this.P('travelCost'));

    const g4 = el('div', 'ctrl-group');
    const r = el('button', 'abtn');
    r.type = 'button';
    r.innerHTML = `<span class="ab-ico">↺</span><span class="ab-body">처음부터 다시</span>`;
    r.onclick = () => { SFX.playSelect(); this.cleanup(); this.start(); };
    g4.appendChild(r);
    c.appendChild(g4);

    this.bindKeys((e) => {
      if (this.over) return;
      switch (e.key) {
        case '1': this.sellCar(); break;
        case '2': this.repairCar(); break;
        case '3': this.eat('mart'); break;
        case '4': this.eat('rest'); break;
        case '5': this.changeWear(); break;
        case '6': this.doSleep(); break;
        case '7': this.travel(); break;
      }
    });
  }

  /* ── 동작 ─────────────────────────────────────── */
  sellPrice() {
    return this.sleep < 30 ? Math.round(this.P('carPrice') / 2) : this.P('carPrice');
  }

  sellCar() {
    if (this.over || this.place !== 'village' || this.cars < 1) return;
    const p = this.sellPrice();
    this.cars--;
    this.money += p;
    this.sold++;
    SFX.playCoin();
    toast(`자동차 판매 · +${korWon(p)}${this.sleep < 30 ? ' (잠이 부족해 반값)' : ''}`);
    this.checkWin();
    this.renderAll();
  }

  repairCar() {
    if (this.over || this.place !== 'village' || this.broken < 1) return;
    if (this.money < this.P('partCost')) { SFX.playFailure(); return; }
    this.money -= this.P('partCost');
    this.money += this.P('repairPay');
    this.broken--;
    this.cars++;
    SFX.playHammer();
    toast(`수리 완료 · ${korWon(this.P('repairPay') - this.P('partCost'))} 남음`);
    this.checkWin();
    this.renderAll();
  }

  eat(kind) {
    if (this.over || this.place !== 'village') return;
    const cost = kind === 'mart' ? this.P('foodCost') : this.P('restaurantCost');
    if (this.money < cost) { SFX.playFailure(); return; }
    this.money -= cost;
    this.hunger = clamp(this.hunger + (kind === 'mart' ? 40 : 75), 0, 100);
    SFX.playEat();
    toast(kind === 'mart' ? '마트 식재료로 밥을 지었습니다' : '식당에서 배부르게 먹었습니다');
    this.renderAll();
  }

  changeWear() {
    if (this.over || this.place !== 'village') return;
    this.wear = this.wear === 'tee' ? 'padding' : 'tee';
    const s = TY_SEASONS[this.seasonIdx];
    const fits = s.fit.includes(this.wear);
    SFX.playSelect();
    toast(`${TY_WEAR[this.wear].name}으로 갈아입었습니다 · ${s.name}에 ${fits ? '알맞아요' : '안 맞아요'}`);
    this.renderAll();
  }

  doSleep() {
    if (this.over || this.place !== 'village') return;
    const s = TY_SEASONS[this.seasonIdx];
    const fits = s.fit.includes(this.wear);
    this.sleep = clamp(this.sleep + (fits ? 55 : 12), 0, 100);
    this.hunger = clamp(this.hunger - 8, 0, 100);
    SFX.playSelect();
    toast(fits ? '푹 잤습니다' : `${s.name}에 ${TY_WEAR[this.wear].name}이라 잠을 설쳤습니다`);
    this.renderAll();
  }

  travel() {
    if (this.over || this.place !== 'village') return;
    if (this.money < this.P('travelCost')) { SFX.playFailure(); return; }
    this.money -= this.P('travelCost');
    this.place = 'travel';
    SFX.playPlane();
    toast('다른 지역으로 여행을 떠났습니다');
    this.renderAll();
    this.after(3000, () => {
      this.place = 'village';
      this.sleep = 100;
      this.hunger = clamp(this.hunger - 10, 0, 100);
      SFX.playSuccess();
      toast('여행에서 돌아왔습니다 · 잠 가득 회복');
      this.renderAll();
    });
  }

  checkWin() {
    if (this.money >= this.P('goal') && !this.over) {
      this.over = true;
      this.clearTimers();
      SFX.playWin();
      Overlay.show(true, `${korWon(this.P('goal'))} 달성!`,
        `${this.day}일 만에 자동차 <b>${this.sold}대</b>를 팔아 목표를 채웠습니다.<br>
         가진 돈 <b>${korWon(this.money)}</b><br><br>
         기획서 원래 목표는 <b>1억 원</b>이었어요.`,
        () => backToDashboard(), '대시보드로');
    }
  }

  die(cause) {
    if (this.over) return;
    this.over = true;
    this.clearTimers();
    SFX.playLose();
    const msg = cause === '배고픔'
      ? '배고픔 게이지가 다 닳았습니다. 기획서 규칙대로 캐릭터가 쓰러졌어요.'
      : `잠 게이지가 다 닳았습니다. 계절에 안 맞는 옷을 입으면 잠을 못 잡니다.`;
    Overlay.show(false, '게임 오버',
      `${msg}<br><br>${this.day}일 동안 <b>${korWon(this.money)}</b>을 벌었습니다.
       (목표 ${korWon(this.P('goal'))})<br>
       📋 기획 평가를 열어 <b>목표 금액</b>이 왜 문제인지 확인해 보세요.`,
      () => { this.cleanup(); this.start(); }, '다시 시작');
  }
}
