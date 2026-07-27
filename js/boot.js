/* ═══════════════════════════════════════════════════
   boot.js — 인스턴스 등록 및 전역 이벤트 연결
   ═══════════════════════════════════════════════════ */

gameInstances[1] = new GameChair();
gameInstances[2] = new GameBurger();
gameInstances[3] = new GameTycoon();
gameInstances[4] = new GameMarket();

renderDashboard();
showView('dashboard');

$('#brand-btn').onclick = () => { SFX.playSelect(); backToDashboard(); };
$('#btn-home').onclick  = () => { SFX.playSelect(); backToDashboard(); };
$('#ov-home').onclick   = () => { Overlay.hide(); SFX.playSelect(); backToDashboard(); };

$('#btn-sheet').onclick  = openSheet;
$('#sheet-close').onclick = () => { $('#sheet-modal').hidden = true; };
$('#sheet-modal').onclick = (e) => { if (e.target.id === 'sheet-modal') $('#sheet-modal').hidden = true; };

$('#btn-review').onclick   = openReview;
$('#review-close').onclick = () => { $('#review-modal').hidden = true; };
$('#review-modal').onclick = (e) => { if (e.target.id === 'review-modal') $('#review-modal').hidden = true; };

$('#btn-tuner').onclick    = openTuner;
$('#tuner-close').onclick  = closeTuner;
$('#drawer-scrim').onclick = closeTuner;
$('#tuner-apply').onclick  = applyTuner;
$('#tuner-reset').onclick  = resetTuner;

const soundBtn = $('#btn-sound');
soundBtn.onclick = () => {
  SFX.on = !SFX.on;
  soundBtn.setAttribute('aria-pressed', String(SFX.on));
  soundBtn.querySelector('span').textContent = SFX.on ? '🔊' : '🔇';
  if (SFX.on) SFX.playSelect();
};

/* ESC — 열려 있는 창을 순서대로 닫는다 */
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#sheet-modal').hidden) { $('#sheet-modal').hidden = true; return; }
  if (!$('#review-modal').hidden) { $('#review-modal').hidden = true; return; }
  if (!$('#tuner').hidden) { closeTuner(); return; }
  if (!$('#overlay').hidden) return;
  if (!$('#view-game').hidden) backToDashboard();
});

/* 첫 사용자 제스처에서 오디오 컨텍스트 해제 */
window.addEventListener('pointerdown', function once() {
  SFX._ac();
  window.removeEventListener('pointerdown', once);
}, { once: true });
