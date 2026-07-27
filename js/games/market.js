/* ═══════════════════════════════════════════════════
   GAME 04 · 물건을 사고 파는 가게 — 기획 : 이상한 사람들
   기획서 원문 규칙
   · 지역이 4개, 각 지역마다 특산물이 있다 (옷, 사과, 생선, 책)
   · 살 때는 그 물건을 파는 지역에 가서 살 수 있다
   · 물건을 팔면 돈을 버는데 지역마다 얻는 돈이 다르다
   · 승리 조건은 5000코인을 얻어야 된다
   · 시간이 지나면 물건이 썩고 코인이 5코인 깎인다
   · 20초마다 재고가 바뀐다, 7개씩 생긴다
   · 옆집에는 경쟁자가 있다
   · 시간 제한 400초 안에 30개를 팔아야 한다
   ═══════════════════════════════════════════════════ */

const MK_GOODS = {
  cloth: { ico: '👕', name: '옷',   base: 120 },
  apple: { ico: '🍎', name: '사과', base: 30 },
  fish:  { ico: '🐟', name: '생선', base: 60 },
  book:  { ico: '📖', name: '책',   base: 90 }
};
const MK_REGIONS = [
  { ico: '👕', name: '옷 마을',   good: 'cloth', col: 0 },
  { ico: '🍎', name: '사과 마을', good: 'apple', col: 0 },
  { ico: '🐟', name: '생선 마을', good: 'fish',  col: 0 },
  { ico: '📖', name: '책 마을',   good: 'book',  col: 1 }
];
const MK_KEYS = Object.keys(MK_GOODS);

class GameMarket extends GameBase {
  constructor() {
    super(4);
    this.paramSpec = [
      { key: 'goalCoin', label: '목표 코인 (승리 조건 ①)', orig: 5000, min: 100, max: 20000, step: 100, unit: '코인' },
      { key: 'goalSell', label: '팔아야 하는 개수 (승리 조건 ②)', orig: 30, min: 1, max: 100, step: 1, unit: '개' },
      { key: 'timeLimit', label: '제한 시간', orig: 400, min: 60, max: 900, step: 10, unit: '초' },
      { key: 'startCoin', label: '시작 코인', orig: 500, min: 0, max: 5000, step: 100, unit: '코인' },
      { key: 'restockEvery', label: '재고가 다시 생기는 간격', orig: 20, min: 5, max: 60, step: 1, unit: '초' },
      { key: 'restockQty', label: '한 번에 생기는 재고', orig: 7, min: 1, max: 30, step: 1, unit: '개' },
      { key: 'rotTime', label: '물건이 썩는 시간', orig: 30, min: 5, max: 180, step: 5, unit: '초' },
      { key: 'rotPenalty', label: '썩으면 깎이는 코인', orig: 5, min: 0, max: 100, step: 1, unit: '코인' },
      { key: 'rivalEvery', label: '경쟁자가 재고를 사 가는 간격', orig: 8, min: 2, max: 60, step: 1, unit: '초' }
    ];
    this.resetParams();
  }

  start() {
    this.coin = this.P('startCoin');
    this.sold = 0;
    this.rotted = 0;
    this.here = 1;                    // 사과 마을에서 시작
    this.bag = [];                    // { good, age }
    this.left = this.P('timeLimit');
    this.over = false;
    this.restockAcc = 0;
    this.rivalAcc = 0;
    this.priceAcc = 0;

    this.stock = MK_REGIONS.map(() => this.P('restockQty'));
    this.mult = MK_REGIONS.map(() => {
      const o = {};
      MK_KEYS.forEach((g) => { o[g] = rnd(1.0, 1.8); });
      return o;
    });

    this.buildScene();
    this.renderAll();
    this.every(100, () => this.step());
  }

  buildScene() {
    this.scene.innerHTML = `
      <div class="mk">
        <div class="mk-top">
          <div class="mk-clock big-timer" id="mk-clock">400.0</div>
          <div class="mk-rival" id="mk-rival">옆집 경쟁자가 재고를 노리고 있습니다</div>
        </div>
        <div class="mk-map">
          <div class="mk-col" id="mk-col-0"></div>
          <div class="mk-road"><div class="mk-me" id="mk-me">🧑</div></div>
          <div class="mk-col" id="mk-col-1"></div>
        </div>
        <div class="mk-bag" id="mk-bag"></div>
      </div>`;
  }

  /* ── 시간 진행 ────────────────────────────────── */
  step() {
    if (this.over) return;
    const dt = 0.1;
    this.left -= dt;
    if (this.left <= 0) { this.left = 0; this.timeUp(); return; }

    /* 신선도 */
    let rotNow = 0;
    this.bag.forEach((it) => { it.age += dt; });
    const before = this.bag.length;
    this.bag = this.bag.filter((it) => {
      if (it.age >= this.P('rotTime')) { rotNow++; return false; }
      return true;
    });
    if (rotNow) {
      this.coin -= this.P('rotPenalty') * rotNow;
      this.rotted += rotNow;
      SFX.playFailure();
      toast(`물건 ${rotNow}개가 썩었습니다 · -${this.P('rotPenalty') * rotNow}코인`);
    }

    /* 재고 리필 */
    this.restockAcc += dt;
    if (this.restockAcc >= this.P('restockEvery')) {
      this.restockAcc = 0;
      this.stock = this.stock.map((s) => s + this.P('restockQty'));
      toast(`재고가 ${this.P('restockQty')}개씩 새로 들어왔습니다`);
      SFX.playSelect();
    }

    /* 경쟁자 */
    this.rivalAcc += dt;
    if (this.rivalAcc >= this.P('rivalEvery')) {
      this.rivalAcc = 0;
      const i = rndInt(0, 3);
      const take = Math.min(this.stock[i], rndInt(1, 3));
      if (take > 0) {
        this.stock[i] -= take;
        const r = MK_REGIONS[i];
        const rv = $('#mk-rival');
        if (rv) rv.textContent = `옆집 경쟁자가 ${r.name}에서 ${r.ico} ${take}개를 사 갔습니다`;
      }
    }

    /* 시세 변동 */
    this.priceAcc += dt;
    if (this.priceAcc >= 10) {
      this.priceAcc = 0;
      this.mult.forEach((m) => { MK_KEYS.forEach((g) => { m[g] = rnd(1.0, 1.8); }); });
    }

    if (before !== this.bag.length) this.renderAll();
    else this.renderLight();
  }

  /* ── 가격 ─────────────────────────────────────── */
  price(regionIdx, good) {
    const r = MK_REGIONS[regionIdx];
    const base = MK_GOODS[good].base;
    if (r.good === good) return Math.round(base * 0.5);
    return Math.round(base * this.mult[regionIdx][good]);
  }
  bestPriceFor(good) {
    let best = 0;
    MK_REGIONS.forEach((r, i) => { best = Math.max(best, this.price(i, good)); });
    return best;
  }

  /* ── 렌더 ─────────────────────────────────────── */
  renderLight() {
    const c = $('#mk-clock');
    if (c) {
      c.textContent = this.left.toFixed(1);
      c.classList.toggle('urgent', this.left < 30);
    }
    const bag = $('#mk-bag');
    if (bag) this.renderBag(bag);
  }

  renderAll() {
    const cols = [$('#mk-col-0'), $('#mk-col-1')];
    if (!cols[0]) return;
    cols[0].innerHTML = '';
    cols[1].innerHTML = '';

    MK_REGIONS.forEach((r, i) => {
      const card = el('div', 'mk-shop' + (i === this.here ? ' here' : ''));
      const prices = MK_KEYS.map((g) => {
        const p = this.price(i, g);
        const isHome = r.good === g;
        const best = p >= this.bestPriceFor(g) - 1;
        const cls = isHome ? 'cheap' : (best ? 'pricey' : '');
        const stock = isHome ? `<span class="mp-stock">재고 ${this.stock[i]}</span>` : '<span class="mp-stock">&nbsp;</span>';
        return `<div class="mk-price ${cls}">
                  <span class="mp-ico">${MK_GOODS[g].ico}</span>
                  <span class="mp-val">${p}</span>${stock}
                </div>`;
      }).join('');
      card.innerHTML = `
        <div class="mk-shop-head">
          <span class="mk-shop-ico">${r.ico}</span>
          <span class="mk-shop-name">${r.name}</span>
          <span class="mk-shop-tag ${i === this.here ? 'here' : ''}">${i === this.here ? '지금 여기' : '이동 ' + (i + 1)}</span>
        </div>
        <div class="mk-prices">${prices}</div>`;
      card.onclick = () => this.moveTo(i);
      cols[r.col].appendChild(card);
    });

    const bank = el('div', 'mk-shop');
    bank.style.cursor = 'default';
    bank.innerHTML = `
      <div class="mk-shop-head">
        <span class="mk-shop-ico">🏦</span>
        <span class="mk-shop-name">은행</span>
        <span class="mk-shop-tag">${this.coin} 코인</span>
      </div>
      <div class="mk-prices" style="grid-template-columns:1fr">
        <div class="mk-price" style="text-align:left;padding:8px 10px">
          판매 ${this.sold} / ${this.P('goalSell')}개 · 목표 ${this.P('goalCoin')}코인<br>
          <span class="mp-stock">썩어서 버린 물건 ${this.rotted}개</span>
        </div>
      </div>`;
    cols[1].appendChild(bank);

    const me = $('#mk-me');
    if (me) me.style.top = (10 + this.here * 24) + '%';

    this.renderLight();
    this.renderStatus();
    this.renderControls();
  }

  renderBag(bag) {
    if (!this.bag.length) {
      bag.innerHTML = `<span class="mk-bag-title">가방</span><span class="mk-bag-empty">비어 있습니다 — 특산물 마을에서 물건을 사세요</span>`;
      return;
    }
    const rot = this.P('rotTime');
    bag.innerHTML = `<span class="mk-bag-title">가방 ${this.bag.length}개</span>` +
      this.bag.map((it) => {
        const remain = Math.max(0, rot - it.age);
        return `<span class="mk-bag-item ${remain < rot * 0.34 ? 'rotting' : ''}">
                  ${MK_GOODS[it.good].ico} ${MK_GOODS[it.good].name}
                  <span class="mb-fresh">${remain.toFixed(0)}s</span>
                </span>`;
      }).join('');
  }

  renderStatus() {
    this.renderStats([
      { label: '코인', value: num(this.coin), cls: 'c' },
      { label: '판 개수', value: `${this.sold} / ${this.P('goalSell')}개`, cls: 'sm' },
      { label: '가방', value: this.bag.length + '개', cls: 'sm' },
      { label: '썩어서 버림', value: this.rotted + '개', cls: this.rotted ? 'bad' : 'sm' },
      { gauge: true, label: '남은 시간', text: this.left.toFixed(0) + '초',
        pct: (this.left / this.P('timeLimit')) * 100,
        color: this.left < 60 ? 'var(--bad)' : 'var(--c)' },
      { gauge: true, label: '목표 코인', text: `${this.coin} / ${this.P('goalCoin')}`,
        pct: (this.coin / this.P('goalCoin')) * 100, color: 'var(--good)' }
    ]);
    this.addHint(`<b>초록색</b> 가격은 그 마을 특산물이라 싸게 살 수 있고,
      <b>노란색</b>은 지금 가장 비싸게 팔리는 곳입니다.`);
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

    const r = MK_REGIONS[this.here];
    const buyPrice = this.price(this.here, r.good);

    const g1 = grp('사기 (이 마을 특산물만)');
    mk(g1, r.ico, `${MK_GOODS[r.good].name} 사기`,
      `${buyPrice}코인 · 재고 ${this.stock[this.here]}개`, 'B', 'accent',
      () => this.buy(), this.stock[this.here] < 1 || this.coin < buyPrice);

    const have = {};
    this.bag.forEach((it) => { have[it.good] = (have[it.good] || 0) + 1; });
    const g2 = grp('팔기');
    if (!Object.keys(have).length) {
      g2.appendChild(el('div', 'hint', '가방이 비었습니다. 특산물 마을에서 싸게 사서 다른 마을에 파세요.'));
    } else {
      Object.keys(have).forEach((g) => {
        const p = this.price(this.here, g);
        mk(g2, MK_GOODS[g].ico, `${MK_GOODS[g].name} 팔기 (${have[g]}개)`,
          `여기서 ${p}코인`, '', '', () => this.sell(g));
      });
    }

    const g3 = grp('이동');
    MK_REGIONS.forEach((rr, i) => {
      mk(g3, rr.ico, rr.name, i === this.here ? '지금 여기' : '', String(i + 1), '',
        () => this.moveTo(i), i === this.here);
    });

    const g4 = el('div', 'ctrl-group');
    const rs = el('button', 'abtn');
    rs.type = 'button';
    rs.innerHTML = `<span class="ab-ico">↺</span><span class="ab-body">처음부터 다시</span>`;
    rs.onclick = () => { SFX.playSelect(); this.cleanup(); this.start(); };
    g4.appendChild(rs);
    c.appendChild(g4);

    this.bindKeys((e) => {
      if (this.over) return;
      const k = e.key.toLowerCase();
      if (['1', '2', '3', '4'].includes(k)) this.moveTo(Number(k) - 1);
      else if (k === 'b' || e.code === 'Space') { e.preventDefault(); this.buy(); }
      else if (e.key === 'Enter') this.sellBest();
    });
  }

  /* ── 동작 ─────────────────────────────────────── */
  moveTo(i) {
    if (this.over || i === this.here) return;
    this.here = i;
    SFX.playMove();
    this.renderAll();
  }

  buy() {
    if (this.over) return;
    const r = MK_REGIONS[this.here];
    const p = this.price(this.here, r.good);
    if (this.stock[this.here] < 1) { SFX.playFailure(); toast('재고가 없습니다'); return; }
    if (this.coin < p) { SFX.playFailure(); toast('코인이 부족합니다'); return; }
    this.coin -= p;
    this.stock[this.here]--;
    this.bag.push({ good: r.good, age: 0 });
    SFX.playBuy();
    toast(`${MK_GOODS[r.good].name} 구매 · -${p}코인`);
    this.renderAll();
  }

  sell(good) {
    if (this.over) return;
    const idx = this.bag.findIndex((it) => it.good === good);
    if (idx < 0) return;
    const p = this.price(this.here, good);
    this.bag.splice(idx, 1);
    this.coin += p;
    this.sold++;
    SFX.playCoin();
    toast(`${MK_GOODS[good].name} 판매 · +${p}코인`);
    this.renderAll();
    this.checkWin();
  }

  sellBest() {
    if (!this.bag.length) return;
    let best = null, bestP = -1;
    this.bag.forEach((it) => {
      const p = this.price(this.here, it.good);
      if (p > bestP) { bestP = p; best = it.good; }
    });
    if (best) this.sell(best);
  }

  checkWin() {
    if (this.over) return;
    if (this.sold >= this.P('goalSell') && this.coin >= this.P('goalCoin')) {
      this.over = true;
      this.clearTimers();
      SFX.playWin();
      Overlay.show(true, '두 가지 승리 조건 달성!',
        `<b>${this.sold}개</b>를 팔고 <b>${num(this.coin)}코인</b>을 모았습니다.<br>
         남은 시간 <b>${this.left.toFixed(0)}초</b> · 썩어서 버린 물건 ${this.rotted}개`,
        () => backToDashboard(), '대시보드로');
    }
  }

  timeUp() {
    if (this.over) return;
    this.over = true;
    this.clearTimers();
    const okSell = this.sold >= this.P('goalSell');
    const okCoin = this.coin >= this.P('goalCoin');
    SFX.playLose();
    Overlay.show(false, '시간 종료',
      `제한 시간 <b>${this.P('timeLimit')}초</b>가 끝났습니다.<br><br>
       판매 <b>${this.sold} / ${this.P('goalSell')}개</b> ${okSell ? '✅' : '❌'}<br>
       코인 <b>${num(this.coin)} / ${this.P('goalCoin')}</b> ${okCoin ? '✅' : '❌'}<br><br>
       승리 조건이 두 개라 둘 다 채워야 합니다. 📋 기획 평가에서 어떤 물건을 노려야 하는지 확인해 보세요.`,
      () => { this.cleanup(); this.start(); }, '다시 시작');
  }
}
