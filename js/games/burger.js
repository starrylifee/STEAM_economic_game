/* ═══════════════════════════════════════════════════
   GAME 02 · 햄버거 가게 — 기획 : 개미핥기
   기획서 원문 규칙
   · 삼촌이 농사해서 구한 재료를 빌리고, 정육점에서 고기를 산다
   · 빵 사이에 채소, 고기 패티를 쌓아 햄버거를 만든다
   · 손님에게 대접하기를 반복해서 월급을 받는다
   · 차를 타고 백화점에 가서 저녁 밥을 사고, 옷을 산다
   · 집에 돌아왔을 때 돈이 24776만원이 있으면 끝
   · 미션 종류 : 버거 만들기, 손님에게 대접, 쇼핑, 재료 구하기, 돈 확인하기
   ═══════════════════════════════════════════════════ */

const BURGER_MENUS = [
  { name: '햄버거',        mult: 1.0, extras: [] },
  { name: '햄버거 + 감튀', mult: 1.5, extras: ['fries'] },
  { name: '햄버거 + 콜라', mult: 1.4, extras: ['cola'] },
  { name: '햄버거 set',    mult: 2.0, extras: ['fries', 'cola'] }
];
const BURGER_ORDER = ['bunb', 'veg', 'patty', 'bun'];
const BURGER_LAYER = {
  bunb:  { ico: '🍞', name: '아래 빵' },
  veg:   { ico: '🥬', name: '채소' },
  patty: { ico: '🍖', name: '고기 패티' },
  bun:   { ico: '🍞', name: '위 빵' }
};

class GameBurger extends GameBase {
  constructor() {
    super(2);
    this.paramSpec = [
      { key: 'goal', label: '집에 돌아왔을 때 목표 금액', orig: 247760000, min: 10000, max: 300000000, step: 10000, fmt: 'won',
        note: '기획서 원문은 "24776만원"입니다.' },
      { key: 'burgerPrice', label: '햄버거 한 개 값', orig: 3000, min: 500, max: 5000000, step: 500, fmt: 'won',
        note: '세트·감튀·콜라 메뉴는 이 값에 배수가 곱해집니다.' },
      { key: 'meatCost', label: '정육점 고기 값 (3개)', orig: 2000, min: 0, max: 50000, step: 500, fmt: 'won' },
      { key: 'guestsPerDay', label: '하루에 오는 손님 수', orig: 5, min: 1, max: 20, step: 1, unit: '명' },
      { key: 'riceCost', label: '백화점 저녁 밥값', orig: 3000, min: 0, max: 100000, step: 1000, fmt: 'won' },
      { key: 'clothCost', label: '백화점 옷값', orig: 8000, min: 0, max: 200000, step: 1000, fmt: 'won' },
      { key: 'startMoney', label: '시작할 때 가진 돈', orig: 5000, min: 0, max: 1000000, step: 1000, fmt: 'won',
        note: '기획서에는 없는 값이라, 첫 고기를 살 수 있을 만큼만 넣었습니다.' }
    ];
    this.resetParams();
  }

  start() {
    this.money = this.P('startMoney');
    this.day = 1;
    this.served = 0;
    this.servedTotal = 0;
    this.veg = 0;
    this.meat = 0;
    this.stack = [];
    this.extrasDone = [];
    this.order = null;
    this.place = 'shop';      // shop | mall | home
    this.mall = { rice: false, cloth: false };
    this.buildScene();
    this.newOrder();
    this.render();
  }

  buildScene() {
    this.scene.innerHTML = `
      <div class="bs">
        <div class="bs-loc" id="bs-loc"></div>
        <div class="bs-main" id="bs-main"></div>
        <div class="bs-goal">
          <div class="bs-goal-bar"><div class="bs-goal-fill" id="bs-goal-fill" style="width:0%"></div></div>
          <div class="bs-goal-txt">
            <span id="bs-goal-now">0원</span>
            <span id="bs-goal-target">목표 0원</span>
          </div>
        </div>
      </div>`;
  }

  newOrder() {
    const m = pick(BURGER_MENUS);
    this.order = {
      menu: m,
      price: Math.round(this.P('burgerPrice') * m.mult / 100) * 100,
      guest: pick(['🧑', '👩', '🧒', '👴', '👨', '👵'])
    };
    this.stack = [];
    this.extrasDone = [];
  }

  /* ── 렌더 ─────────────────────────────────────── */
  render() {
    this.renderLoc();
    this.renderMain();
    this.renderControls();
    this.renderStatus();
  }

  renderLoc() {
    const places = [
      { k: 'shop', ico: '🍔', name: '햄버거 가게' },
      { k: 'mall', ico: '🏬', name: '백화점' },
      { k: 'home', ico: '🏠', name: '집' }
    ];
    $('#bs-loc').innerHTML = places
      .map((p) => `<div class="bs-loc-item ${p.k === this.place ? 'on' : ''}">${p.ico} ${p.name}</div>`)
      .join('<span class="bs-loc-sep">→</span>');
  }

  renderMain() {
    const m = $('#bs-main');
    if (this.place === 'shop') {
      const o = this.order;
      const layers = this.stack.map((k) => {
        const cls = k === 'bunb' ? 'bunb' : k === 'bun' ? 'bun' : k === 'veg' ? 'veg' : 'patty';
        return `<div class="bs-layer ${cls}">${BURGER_LAYER[k].name}</div>`;
      }).join('');
      const chips = BURGER_ORDER.map((k, i) =>
        `<span class="bs-chip ${this.stack[i] === k ? 'done' : ''}">${BURGER_LAYER[k].ico} ${BURGER_LAYER[k].name}</span>`).join('')
        + o.menu.extras.map((e) =>
          `<span class="bs-chip ${this.extrasDone.includes(e) ? 'done' : ''}">${e === 'fries' ? '🍟 감튀' : '🥤 콜라'}</span>`).join('');

      m.innerHTML = `
        <div class="bs-stack">${layers || '<div class="bs-chip">아래 빵부터 쌓으세요</div>'}</div>
        <div class="bs-order">
          <div class="bs-guest">${o.guest}</div>
          <h4>주문</h4>
          <div class="bs-menu">${o.menu.name}</div>
          <div class="bs-price">${korWon(o.price)}</div>
          <div class="bs-recipe">${chips}</div>
        </div>
        <div class="bs-shop">
          ${[0, 1, 2, 3].map((i) => `<div class="bs-table ${i < this.served ? 'busy' : ''}">🪑</div>`).join('')}
          <div class="bs-counter">카운터 · 계산기</div>
        </div>`;
    } else if (this.place === 'mall') {
      m.innerHTML = `
        <div class="bs-shelf">
          <div class="bs-item ${this.mall.rice ? 'bought' : ''}">
            <div class="bi-ico">🍚</div><div class="bi-name">저녁 밥</div>
            <div class="bi-price">${korWon(this.P('riceCost'))}</div>
          </div>
          <div class="bs-item ${this.mall.cloth ? 'bought' : ''}">
            <div class="bi-ico">👕</div><div class="bi-name">옷</div>
            <div class="bi-price">${korWon(this.P('clothCost'))}</div>
          </div>
          <div class="bs-item"><div class="bi-ico">🧺</div><div class="bi-name">세탁·건조기</div><div class="bi-price">구경만</div></div>
          <div class="bs-item"><div class="bi-ico">🛏️</div><div class="bi-name">침대</div><div class="bi-price">구경만</div></div>
        </div>
        <div class="bs-order">
          <div class="bs-guest">🚗</div>
          <h4>미션</h4>
          <div class="bs-menu">쇼핑하기</div>
          <div class="bs-recipe">
            <span class="bs-chip ${this.mall.rice ? 'done' : ''}">🍚 저녁 밥 사기</span>
            <span class="bs-chip ${this.mall.cloth ? 'done' : ''}">👕 옷 사기</span>
          </div>
        </div>`;
    } else {
      const reached = this.money >= this.P('goal');
      m.innerHTML = `
        <div class="bs-order" style="min-width:280px;text-align:center">
          <div class="bs-guest">🏠</div>
          <h4>${this.day}일차 · 돈 확인하기</h4>
          <div class="bs-menu">${korWon(this.money)}</div>
          <div class="bs-price">목표 ${korWon(this.P('goal'))}</div>
          <div class="bs-recipe" style="justify-content:center">
            <span class="bs-chip ${reached ? 'done' : ''}">${reached ? '목표 달성!' : '아직 부족해요'}</span>
          </div>
        </div>`;
    }

    const pct = clamp((this.money / this.P('goal')) * 100, 0, 100);
    $('#bs-goal-fill').style.width = pct + '%';
    $('#bs-goal-now').textContent = korWon(this.money) + ` (${pct.toFixed(pct < 1 ? 4 : 1)}%)`;
    $('#bs-goal-target').textContent = '목표 ' + korWon(this.P('goal'));
  }

  renderStatus() {
    this.renderStats([
      { label: '가진 돈', value: korWon(this.money), cls: 'c' },
      { label: '날짜', value: this.day + '일차', cls: 'sm' },
      { label: '오늘 손님', value: `${this.served} / ${this.P('guestsPerDay')}명`, cls: 'sm' },
      { label: '지금까지 대접', value: this.servedTotal + '명', cls: 'sm' },
      { label: '🥬 채소', value: this.veg + '개', cls: 'sm' },
      { label: '🥩 고기', value: this.meat + '개', cls: 'sm' }
    ]);
    const per = Math.round(this.P('burgerPrice') * 1.475);
    const need = Math.ceil(this.P('goal') / per);
    this.addHint(`평균 <b>${korWon(per)}</b>씩 벌면 목표까지 약 <b>${num(need)}명</b>을 대접해야 합니다.`);
  }

  /* ── 컨트롤 ───────────────────────────────────── */
  renderControls() {
    const c = this.ctrl;
    c.innerHTML = '';
    const grp = (title) => { const g = el('div', 'ctrl-group'); if (title) g.appendChild(el('div', 'p-title', title)); c.appendChild(g); return g; };
    const mk = (g, ico, title, sub, key, cls, fn, disabled) => {
      const b = el('button', 'abtn ' + (key ? 'key ' : '') + (cls || ''));
      b.type = 'button';
      if (key) b.dataset.key = key;
      b.innerHTML = `<span class="ab-ico">${ico}</span>
                     <span class="ab-body">${title}${sub ? `<span class="ab-sub">${sub}</span>` : ''}</span>`;
      b.disabled = !!disabled;
      b.onclick = fn;
      g.appendChild(b);
      return b;
    };

    if (this.place === 'shop') {
      const gi = grp('재료 구하기');
      mk(gi, '🌽', '삼촌 농장에서 채소 빌리기', '공짜로 3개', 'Q', '', () => this.getVeg());
      mk(gi, '🥩', '정육점에서 고기 사기', `${korWon(this.P('meatCost'))}에 3개`, 'W', '',
        () => this.buyMeat(), this.money < this.P('meatCost'));

      const gb = grp('버거 만들기');
      const nextIdx = this.stack.length;
      BURGER_ORDER.forEach((k, i) => {
        const L = BURGER_LAYER[k];
        const done = this.stack[i] === k;
        const lack = (k === 'veg' && this.veg < 1) || (k === 'patty' && this.meat < 1);
        mk(gb, L.ico, L.name, done ? '올림' : (lack ? '재료가 없어요' : `${i + 1}번째`), String(i + 1),
          i === nextIdx ? 'accent' : '', () => this.putLayer(k), done || lack);
      });

      const o = this.order;
      if (o.menu.extras.length) {
        const ge = grp('세트 담기');
        o.menu.extras.forEach((e) => {
          mk(ge, e === 'fries' ? '🍟' : '🥤', e === 'fries' ? '감튀 담기' : '콜라 담기', '',
            e === 'fries' ? 'F' : 'C', '', () => this.addExtra(e), this.extrasDone.includes(e));
        });
      }

      const gs = grp('대접하기');
      const ready = this.stack.length === 4 && o.menu.extras.every((e) => this.extrasDone.includes(e));
      mk(gs, '🍽️', '손님에게 대접', korWon(o.price) + ' 받기', 'Enter', 'accent', () => this.serve(), !ready);

      this.bindKeys((e) => {
        const k = e.key.toLowerCase();
        if (k === 'q') this.getVeg();
        else if (k === 'w') this.buyMeat();
        else if (['1', '2', '3', '4'].includes(k)) this.putLayer(BURGER_ORDER[Number(k) - 1]);
        else if (k === 'f') this.addExtra('fries');
        else if (k === 'c') this.addExtra('cola');
        else if (e.key === 'Enter') this.serve();
      });
    }

    if (this.place === 'mall') {
      const g = grp('쇼핑 미션');
      mk(g, '🍚', '저녁 밥 사기', korWon(this.P('riceCost')), '1',
        this.mall.rice ? '' : 'accent', () => this.buyMall('rice'),
        this.mall.rice || this.money < this.P('riceCost'));
      mk(g, '👕', '옷 사기', korWon(this.P('clothCost')), '2',
        this.mall.cloth ? '' : 'accent', () => this.buyMall('cloth'),
        this.mall.cloth || this.money < this.P('clothCost'));
      const done = this.mall.rice && this.mall.cloth;
      const canBuyAny = (!this.mall.rice && this.money >= this.P('riceCost')) ||
                        (!this.mall.cloth && this.money >= this.P('clothCost'));
      const canGoHome = done || !canBuyAny;
      mk(g, '🏠', '집으로 돌아가기',
        done ? '돈 확인하기' : (canGoHome ? '못 산 것이 있지만 그냥 귀가' : '미션을 먼저 끝내세요'),
        'Enter', canGoHome ? 'accent' : '', () => this.goHome(), !canGoHome);

      if (!done && !canBuyAny) {
        g.appendChild(el('div', 'hint',
          `돈이 부족해서 쇼핑을 못 합니다. <b>밥값·옷값</b>과 <b>햄버거 값</b> 중 무엇을 고쳐야 할까요?`));
      }
      this.bindKeys((e) => {
        if (e.key === '1') this.buyMall('rice');
        else if (e.key === '2') this.buyMall('cloth');
        else if (e.key === 'Enter') this.goHome();
      });
    }

    if (this.place === 'home') {
      const g = grp('돈 확인하기');
      mk(g, '🍔', '다음 날 가게로 출근', `${this.day + 1}일차 시작`, 'Enter', 'accent', () => this.nextDay());
      this.bindKeys((e) => { if (e.key === 'Enter') this.nextDay(); });
    }

    const g2 = el('div', 'ctrl-group');
    const r = el('button', 'abtn');
    r.type = 'button';
    r.innerHTML = `<span class="ab-ico">↺</span><span class="ab-body">처음부터 다시</span>`;
    r.onclick = () => { SFX.playSelect(); this.cleanup(); this.start(); };
    g2.appendChild(r);
    c.appendChild(g2);
  }

  /* ── 동작 ─────────────────────────────────────── */
  getVeg() {
    if (this.place !== 'shop') return;
    this.veg += 3;
    SFX.playSelect();
    toast('삼촌에게 채소 3개를 빌렸습니다');
    this.render();
  }

  buyMeat() {
    if (this.place !== 'shop') return;
    if (this.money < this.P('meatCost')) { SFX.playFailure(); return; }
    this.money -= this.P('meatCost');
    this.meat += 3;
    SFX.playBuy();
    toast('정육점에서 고기 3개 · ' + korWon(-this.P('meatCost')));
    this.render();
  }

  putLayer(k) {
    if (this.place !== 'shop' || !k) return;
    const need = BURGER_ORDER[this.stack.length];
    if (!need) return;
    if (k !== need) {
      SFX.playFailure();
      toast(`순서가 달라요 · 다음은 ${BURGER_LAYER[need].name}`);
      this.stack = [];
      this.render();
      return;
    }
    if (k === 'veg') { if (this.veg < 1) { SFX.playFailure(); toast('채소가 없어요'); return; } this.veg--; }
    if (k === 'patty') { if (this.meat < 1) { SFX.playFailure(); toast('고기가 없어요'); return; } this.meat--; }
    this.stack.push(k);
    SFX.playMove();
    this.render();
  }

  addExtra(e) {
    if (this.place !== 'shop') return;
    if (!this.order.menu.extras.includes(e) || this.extrasDone.includes(e)) return;
    this.extrasDone.push(e);
    SFX.playSelect();
    this.render();
  }

  serve() {
    if (this.place !== 'shop') return;
    const o = this.order;
    if (this.stack.length !== 4) return;
    if (!o.menu.extras.every((e) => this.extrasDone.includes(e))) return;

    this.money += o.price;
    this.served++;
    this.servedTotal++;
    SFX.playCoin();
    toast(`${o.menu.name} 대접 완료 · +${korWon(o.price)}`);

    if (this.served >= this.P('guestsPerDay')) {
      this.place = 'mall';
      this.mall = { rice: false, cloth: false };
      SFX.playTruck();
      this.after(200, () => toast('차를 타고 백화점으로 갑니다'));
    } else {
      this.newOrder();
    }
    this.render();
  }

  buyMall(kind) {
    if (this.place !== 'mall' || this.mall[kind]) return;
    const cost = kind === 'rice' ? this.P('riceCost') : this.P('clothCost');
    if (this.money < cost) { SFX.playFailure(); return; }
    this.money -= cost;
    this.mall[kind] = true;
    SFX.playBuy();
    toast((kind === 'rice' ? '저녁 밥' : '옷') + ' 구매 · ' + korWon(-cost));
    this.render();
  }

  goHome() {
    if (this.place !== 'mall') return;
    const done = this.mall.rice && this.mall.cloth;
    const canBuyAny = (!this.mall.rice && this.money >= this.P('riceCost')) ||
                      (!this.mall.cloth && this.money >= this.P('clothCost'));
    if (!done && canBuyAny) return;
    this.place = 'home';
    SFX.playSelect();
    this.render();
    if (this.money >= this.P('goal')) this.win();
  }

  nextDay() {
    if (this.place !== 'home') return;
    if (this.money >= this.P('goal')) { this.win(); return; }
    this.day++;
    this.served = 0;
    this.place = 'shop';
    this.newOrder();
    SFX.playSelect();
    this.render();
  }

  win() {
    SFX.playWin();
    Overlay.show(true, '집에 돌아왔더니 목표 달성!',
      `${this.day}일 동안 손님 <b>${this.servedTotal}명</b>을 대접했습니다.<br>
       가진 돈 <b>${korWon(this.money)}</b> (목표 ${korWon(this.P('goal'))})<br><br>
       기획서 원래 목표는 <b>24776만원</b>이었어요. 📋 기획 평가에서 왜 그 숫자가 문제였는지 확인해 보세요.`,
      () => backToDashboard(), '대시보드로');
  }
}
