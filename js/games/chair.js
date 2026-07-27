/* ═══════════════════════════════════════════════════
   GAME 01 · 의자 팔기 — 기획 : 탕탕이
   기획서 원문 규칙
   · 신답초에서 의자를 만들어 트럭에 싣고 청량리역에 판다
   · 1000원이 넘으면 재료를 살 수 있다 (재료 1000원)
   · 이 과정을 3번 하면 성공
   · 2번째에 도둑이 들어와 의자를 1개까지 훔친다
   · 도둑은 5초 안에 잡아야 하고, 못 잡으면 처음부터
   · 도둑을 잡으면 5000원이 모인다
   ═══════════════════════════════════════════════════ */

class GameChair extends GameBase {
  constructor() {
    super(1);
    this.paramSpec = [
      { key: 'startMoney', label: '시작할 때 가진 돈', orig: 1000, min: 0, max: 20000, step: 500, fmt: 'won',
        note: '기획서에는 "1000원이 넘으면 재료를 살 수 있다"고 되어 있어요.' },
      { key: 'matCost', label: '의자 재료 값', orig: 1000, min: 0, max: 5000, step: 100, fmt: 'won',
        note: '기획서 그림에 "재료 1000원"이라고 적혀 있습니다.' },
      { key: 'sellPrice', label: '의자 판매 가격', orig: 1000, min: 0, max: 10000, step: 100, fmt: 'won',
        note: '청량리역에서 의자 하나를 팔 때 받는 돈입니다.' },
      { key: 'rounds', label: '반복 횟수 (승리 조건)', orig: 3, min: 1, max: 10, step: 1, unit: '회' },
      { key: 'hammer', label: '의자 하나 만드는 망치질', orig: 3, min: 1, max: 10, step: 1, unit: '번' },
      { key: 'buildTime', label: '의자 만들기 제한 시간', orig: 15, min: 5, max: 60, step: 1, unit: '초',
        note: '기획서 디자인2에 00:15 타이머가 그려져 있습니다.' },
      { key: 'thiefTime', label: '도둑 잡는 제한 시간', orig: 5, min: 1, max: 20, step: 1, unit: '초' },
      { key: 'thiefBonus', label: '도둑을 잡으면 받는 돈', orig: 5000, min: 0, max: 20000, step: 500, fmt: 'won' }
    ];
    this.resetParams();
  }

  /* ── 시작 ─────────────────────────────────────── */
  start() {
    this.money = this.P('startMoney');
    this.round = 1;
    this.sold = 0;
    this.hammers = 0;
    this.buildLeft = 0;
    this.thiefLeft = 0;
    this.thiefEl = null;
    this.buildScene();
    this.setPhase('buy');
  }

  buildScene() {
    this.scene.innerHTML = `
      <div class="cs">
        <div class="cs-sky"></div>
        <div class="cs-band">
          <div class="cs-place">
            <div class="cs-ico">🏫</div>
            <div class="cs-name">신답초 공장</div>
          </div>
          <div class="cs-road">
            <div class="cs-line"></div>
            <div class="cs-truck" id="cs-truck">🚚</div>
          </div>
          <div class="cs-place">
            <div class="cs-ico">🚉</div>
            <div class="cs-name">청량리역</div>
          </div>
        </div>
        <div class="cs-bench" id="cs-bench"></div>
        <div class="cs-phase" id="cs-phase"></div>
      </div>`;
  }

  /* ── 단계 전환 ─────────────────────────────────── */
  setPhase(p) {
    this.phase = p;
    this.clearTimers();
    this.removeThief();

    if (p === 'build') this.buildLeft = this.P('buildTime');
    if (p === 'thief') this.thiefLeft = this.P('thiefTime');

    this.renderBench();
    this.renderControls();
    this.update();

    if (p === 'build') {
      this.every(100, () => {
        this.buildLeft -= 0.1;
        if (this.buildLeft <= 0) { this.buildLeft = 0; this.failBuild(); return; }
        this.update();
      });
    }
    if (p === 'thief') this.startThief();
  }

  /* ── 스테이지 표현 ─────────────────────────────── */
  renderBench() {
    const b = $('#cs-bench');
    const ph = $('#cs-phase');
    if (!b) return;
    const truck = $('#cs-truck');
    if (truck) truck.classList.toggle('at-dest', this.phase === 'sell' || this.phase === 'thief');

    const texts = {
      buy:   '1단계 · 신답초에서 재료 사기',
      build: '2단계 · 망치질해서 의자 만들기',
      drive: '3단계 · 트럭에 싣고 청량리역으로',
      sell:  '4단계 · 청량리역에서 의자 팔기',
      thief: '⚠ 도둑이 의자를 훔치러 왔다!',
      done:  '완료'
    };
    ph.textContent = texts[this.phase] || '';
    ph.classList.toggle('danger', this.phase === 'thief');

    if (this.phase === 'buy') {
      b.innerHTML = `<div class="cs-slot">
          <div class="cs-box">📦</div>
          <div class="cs-cap">재료 ${korWon(this.P('matCost'))}</div>
        </div>
        <div class="cs-arrow">→</div>
        <div class="cs-slot dim">
          <div class="cs-box">🪑</div><div class="cs-cap">의자</div>
        </div>`;
    } else if (this.phase === 'build') {
      const need = this.P('hammer');
      const pct = Math.round((this.hammers / need) * 100);
      b.innerHTML = `<div class="cs-slot">
          <div class="cs-box build" style="--p:${pct}%">🪑</div>
          <div class="cs-cap">망치질 ${this.hammers} / ${need}</div>
        </div>
        <div class="cs-hammer">🔨</div>`;
    } else if (this.phase === 'drive') {
      b.innerHTML = `<div class="cs-slot">
          <div class="cs-box">🪑</div><div class="cs-cap">의자 1개 완성</div>
        </div>
        <div class="cs-arrow">→</div>
        <div class="cs-slot"><div class="cs-box">🚚</div><div class="cs-cap">트럭에 싣기</div></div>`;
    } else if (this.phase === 'sell' || this.phase === 'thief') {
      b.innerHTML = `<div class="cs-slot">
          <div class="cs-box">🪑</div><div class="cs-cap">청량리역 도착</div>
        </div>
        <div class="cs-arrow">→</div>
        <div class="cs-slot"><div class="cs-box">💵</div><div class="cs-cap">${korWon(this.P('sellPrice'))}</div></div>`;
    } else {
      b.innerHTML = '';
    }
  }

  /* ── 컨트롤 패널 ───────────────────────────────── */
  renderControls() {
    const c = this.ctrl;
    c.innerHTML = '';
    const g = el('div', 'ctrl-group');
    g.appendChild(el('div', 'p-title', '할 수 있는 일'));

    const mk = (ico, title, sub, key, cls, fn, disabled) => {
      const b = el('button', 'abtn key ' + (cls || ''));
      b.type = 'button';
      b.dataset.key = key;
      b.innerHTML = `<span class="ab-ico">${ico}</span>
                     <span class="ab-body">${title}<span class="ab-sub">${sub}</span></span>`;
      b.disabled = !!disabled;
      b.onclick = fn;
      g.appendChild(b);
      return b;
    };

    if (this.phase === 'buy') {
      const can = this.money >= this.P('matCost');
      mk('📦', '재료 사기', korWon(this.P('matCost')) + ' 지불', 'Enter', 'accent',
        () => this.buyMaterial(), !can);
      if (!can) g.appendChild(el('div', 'hint',
        `돈이 <b>${korWon(this.money)}</b>뿐이라 재료(${korWon(this.P('matCost'))})를 살 수 없어요.
         🔧 조절실에서 재료값을 낮추거나 판매 가격을 올려 보세요.`));
      this.bindKeys((e) => { if (e.key === 'Enter' && can) this.buyMaterial(); });
    }

    if (this.phase === 'build') {
      mk('🔨', '망치질하기', `${this.P('hammer')}번 두드리면 완성`, 'Space', 'accent',
        () => this.hammerHit());
      this.bindKeys((e) => {
        if (e.code === 'Space' || e.key === 'Enter') { e.preventDefault(); this.hammerHit(); }
      });
    }

    if (this.phase === 'drive') {
      mk('🚚', '트럭 출발', '청량리역으로 이동', 'Enter', 'accent', () => this.drive());
      this.bindKeys((e) => { if (e.key === 'Enter') this.drive(); });
    }

    if (this.phase === 'sell') {
      mk('💵', '의자 팔기', korWon(this.P('sellPrice')) + ' 받기', 'Enter', 'accent', () => this.sell());
      this.bindKeys((e) => { if (e.key === 'Enter') this.sell(); });
    }

    if (this.phase === 'thief') {
      g.appendChild(el('div', 'hint',
        `화면에서 움직이는 <b>🥷 도둑</b>을 <b>${this.P('thiefTime')}초</b> 안에 눌러 잡으세요!<br>
         못 잡으면 의자를 빼앗기고 처음부터 다시 합니다.`));
      this.bindKeys(() => {});
    }

    c.appendChild(g);

    const g2 = el('div', 'ctrl-group');
    const restart = el('button', 'abtn');
    restart.type = 'button';
    restart.innerHTML = `<span class="ab-ico">↺</span><span class="ab-body">처음부터 다시</span>`;
    restart.onclick = () => { SFX.playSelect(); this.cleanup(); this.start(); };
    g2.appendChild(restart);
    c.appendChild(g2);
  }

  /* ── 상태 패널 ─────────────────────────────────── */
  update() {
    const rows = [
      { label: '가진 돈', value: korWon(this.money), cls: 'c' },
      { label: '회차', value: `${Math.min(this.round, this.P('rounds'))} / ${this.P('rounds')}`, cls: 'sm' },
      { label: '판 의자', value: this.sold + '개', cls: 'sm' }
    ];
    if (this.phase === 'build') {
      rows.push({
        gauge: true, label: '남은 시간',
        text: this.buildLeft.toFixed(1) + '초',
        pct: (this.buildLeft / this.P('buildTime')) * 100,
        color: this.buildLeft < 4 ? 'var(--bad)' : 'var(--warn)'
      });
    }
    if (this.phase === 'thief') {
      rows.push({
        gauge: true, label: '도둑 잡기',
        text: this.thiefLeft.toFixed(1) + '초',
        pct: (this.thiefLeft / this.P('thiefTime')) * 100,
        color: 'var(--bad)'
      });
    }
    this.renderStats(rows);

    const profit = this.P('sellPrice') - this.P('matCost');
    const cls = profit > 0 ? 'good' : profit < 0 ? 'bad' : 'warn';
    const word = profit > 0 ? `한 개 팔 때마다 ${korWon(profit)} 남아요.`
      : profit === 0 ? '한 개 팔아도 <b>남는 돈이 0원</b>이에요.'
        : `한 개 팔 때마다 <b>${korWon(-profit)} 손해</b>예요.`;
    this.addHint(`<span class="stat-value sm ${cls}">재료 ${korWon(this.P('matCost'))} → 판매 ${korWon(this.P('sellPrice'))}</span><br>${word}`);
  }

  /* ── 동작 ─────────────────────────────────────── */
  buyMaterial() {
    if (this.phase !== 'buy') return;
    if (this.money < this.P('matCost')) { SFX.playFailure(); return; }
    this.money -= this.P('matCost');
    SFX.playBuy();
    toast('재료를 샀습니다 · ' + korWon(-this.P('matCost')));
    this.hammers = 0;
    this.setPhase('build');
  }

  hammerHit() {
    if (this.phase !== 'build') return;
    this.hammers++;
    SFX.playHammer();
    if (this.hammers >= this.P('hammer')) {
      toast('의자 완성!');
      this.setPhase('drive');
    } else {
      this.renderBench();
      this.update();
    }
  }

  failBuild() {
    this.clearTimers();
    SFX.playFailure();
    Overlay.show(false, '시간 초과',
      `제한 시간 <b>${this.P('buildTime')}초</b> 안에 의자를 만들지 못했어요.<br>재료값 ${korWon(this.P('matCost'))}은 그대로 날아갑니다.`,
      () => this.setPhase('buy'), '재료 다시 사기');
  }

  drive() {
    if (this.phase !== 'drive') return;
    this.phase = 'moving';
    SFX.playTruck();
    const truck = $('#cs-truck');
    if (truck) truck.classList.add('at-dest');
    this.renderControls();
    this.after(1100, () => this.setPhase('sell'));
  }

  sell() {
    if (this.phase !== 'sell') return;
    this.money += this.P('sellPrice');
    this.sold++;
    SFX.playCoin();
    toast('의자를 팔았습니다 · +' + korWon(this.P('sellPrice')));

    /* 기획서 원문 : 2번째 회차에 도둑이 들어온다 */
    if (this.round === 2 && this.P('rounds') >= 2) {
      this.setPhase('thief');
      return;
    }
    this.nextRound();
  }

  nextRound() {
    this.round++;
    if (this.round > this.P('rounds')) { this.win(); return; }
    const truck = $('#cs-truck');
    if (truck) truck.classList.remove('at-dest');
    this.setPhase('buy');
  }

  /* ── 도둑 ─────────────────────────────────────── */
  startThief() {
    SFX.playAlert();
    const s = this.scene;
    const t = el('button', 'cs-thief', '🥷');
    t.type = 'button';
    t.setAttribute('aria-label', '도둑 잡기');
    t.onclick = () => this.catchThief();
    s.appendChild(t);
    this.thiefEl = t;
    this.moveThief();

    this.every(620, () => this.moveThief());
    this.every(100, () => {
      this.thiefLeft -= 0.1;
      if (this.thiefLeft <= 0.05) { this.loseThief(); return; }
      if (this.thiefLeft < 2) SFX.playTick();
      this.update();
    });
  }

  moveThief() {
    if (!this.thiefEl || !this.scene) return;
    const w = this.scene.clientWidth, h = this.scene.clientHeight;
    this.thiefEl.style.left = rndInt(20, Math.max(40, w - 90)) + 'px';
    this.thiefEl.style.top = rndInt(70, Math.max(100, h - 90)) + 'px';
  }

  removeThief() {
    if (this.thiefEl) { this.thiefEl.remove(); this.thiefEl = null; }
  }

  catchThief() {
    if (this.phase !== 'thief') return;
    this.clearTimers();
    this.removeThief();
    this.money += this.P('thiefBonus');
    SFX.playWin();
    Overlay.show(true, '도둑을 잡았다!',
      `도둑을 잡아서 <b>${korWon(this.P('thiefBonus'))}</b>을 받았습니다.<br>가진 돈 : <b>${korWon(this.money)}</b>`,
      () => this.nextRound(), '다음 회차로');
  }

  loseThief() {
    this.clearTimers();
    this.removeThief();
    this.phase = 'lost';
    SFX.playLose();
    Overlay.show(false, '의자를 도둑맞았다',
      `<b>${this.P('thiefTime')}초</b> 안에 도둑을 잡지 못했습니다.<br>기획서 규칙대로 <b>처음부터</b> 다시 시작합니다.`,
      () => { this.cleanup(); this.start(); }, '처음부터 다시');
  }

  /* ── 승리 ─────────────────────────────────────── */
  win() {
    this.clearTimers();
    this.phase = 'done';
    this.renderBench();
    this.renderControls();
    this.update();
    const start = this.P('startMoney');
    const diff = this.money - start;
    SFX.playWin();
    Overlay.show(true, `${this.P('rounds')}회 반복 성공!`,
      `의자를 <b>${this.sold}개</b> 팔았습니다.<br>
       시작 ${korWon(start)} → 지금 <b>${korWon(this.money)}</b>
       (${diff >= 0 ? '+' : ''}${korWon(diff)})<br><br>
       ${diff <= 0
        ? '열심히 만들었는데 돈이 안 늘었죠? 🔧 <b>조절실</b>에서 재료값과 판매 가격을 고쳐 보세요.'
        : '재료값보다 판매 가격이 높으면 이렇게 돈이 쌓입니다.'}`,
      () => backToDashboard(), '대시보드로');
  }

  cleanup() {
    this.removeThief();
    super.cleanup();
  }
}
