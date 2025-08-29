// --- include header/footer ---
(async () => {
  const chunks = document.querySelectorAll('[data-include]');
  for (const el of chunks) {
    const name = el.getAttribute('data-include');
    const res = await fetch(`partials/${name}.html`);
    el.innerHTML = await res.text();
  }

  // after include: init nav, active link, smooth scroll, modal, reveal
  initNav();
  setActiveLink();
  initSmoothScroll(); // 같은 페이지 내 앵커용(페이지 분리 구조여도 안전)
  initProductModal();
  initReveal();

  // products.html?product=M|H 로 진입 시 모달 자동 오픈 (선택 기능)
  autoOpenProductDetailFromQuery();

  initContactChannel();   // Contact 페이지 채널 탭/분기
})();

// --- nav (mobile toggle) ---
function initNav(){
  const toggle = document.querySelector('.nav-toggle');
  const menu = document.querySelector('.nav-menu');

  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    const open = menu.classList.toggle('show');
    toggle.setAttribute('aria-expanded', String(open));
  });

  // 메뉴 클릭 후 자동 닫힘
  menu.addEventListener('click', e => {
    if (e.target.matches('a')) menu.classList.remove('show');
  });
}

// --- active menu (by data-page attr) ---
function setActiveLink(){
  const page = document.documentElement.getAttribute('data-page') || '';
  const map = {
    home:'index.html',
    about:'about.html',
    products:'products.html',
    technology:'technology.html',
    contact:'contact.html'
  };
  const currentHref = map[page];

  document.querySelectorAll('.nav-menu a').forEach(a => {
    if (a.getAttribute('href') === currentHref) a.classList.add('active');
  });
}

// --- smooth scroll for same-page anchors (if any) ---
function initSmoothScroll(){
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('href');
    const el = document.querySelector(id);
    if (el) el.scrollIntoView({ behavior:'smooth', block:'start' });
  });
}

// --- Intersection reveal ---
function initReveal(){
  const els = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window)) {
    els.forEach(x => x.classList.add('show')); return;
  }
  const io = new IntersectionObserver(entries=>{
    entries.forEach(en => { if (en.isIntersecting){ en.target.classList.add('show'); io.unobserve(en.target); }});
  }, {threshold: .15});
  els.forEach(x => io.observe(x));
}

// --- Product Modal (sheet, mql-aware images, esc/close/back/drag) ---
function initProductModal(){
  const modal = document.querySelector('#productModal');
  if (!modal) return;

  const card   = modal.querySelector('.modal-card');
  const imgEl  = modal.querySelector('img');
  const titleEl= modal.querySelector('.modal-title');
  const header = modal.querySelector('[data-modal-drag-handle]');
  const closeBtn = modal.querySelector('.modal-close');
  const mql    = window.matchMedia('(max-width: 768px)');

  const pickSrc = (btn) =>
    mql.matches ? (btn.dataset.modalSrcMobile || btn.dataset.modalSrcDesktop)
                : (btn.dataset.modalSrcDesktop || btn.dataset.modalSrcMobile);

  const open = (src, title='') => {
    imgEl.src = src;
    titleEl.textContent = title;
    modal.classList.add('active');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('modal-open');
    try{ history.pushState({__j_modal:true}, ''); }catch{}
  };

  const close = (fromPop=false) => {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden','true');
    document.body.classList.remove('modal-open');
    imgEl.src = '';
    //if (!fromPop && history.state && history.state.__j_modal){ try{ history.back(); }catch{} }
    card.style.transition = 'transform .2s'; card.style.transform = 'translateY(0)';
    modal.style.background = 'rgba(0,0,0,.45)';
  };

  // open buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-src-desktop], [data-modal-src-mobile]');
    if (!btn) return;
    open(pickSrc(btn), btn.dataset.modalTitle || '');
  });

  // X 버튼
  if (closeBtn) {
    closeBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
  }

  // close by bg / X
  modal.addEventListener('click', (e) => {
    if (e.target.matches('.modal, .modal-close')) close();
  });

  // ESC
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) close();
  });

  // Back button
  window.addEventListener('popstate', () => {
    if (modal.classList.contains('active')) close(true);
  });

  // Drag down to close (pointer events, header only)
  let startY=0, dy=0, dragging=false, pid=null;
  const threshold = 120;

  const onDown = (e) => {
    if (e.target.closest('.modal-close')) return; // close 버튼에서 드래그 금지
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    dragging = true; pid = e.pointerId; startY = e.clientY; dy = 0;
    header.setPointerCapture && header.setPointerCapture(pid);
    card.style.transition = 'none';
  };
  const onMove = (e) => {
    if (!dragging || (pid!=null && e.pointerId!==pid)) return;
    dy = Math.max(0, e.clientY - startY);
    card.style.transform = `translateY(${dy}px)`;
    const alpha = Math.max(0.15, 0.45 - dy/600);
    modal.style.background = `rgba(0,0,0,${alpha})`;
  };
  const onUp = (e) => {
    if (!dragging || (pid!=null && e.pointerId!==pid)) return;
    dragging = false; pid = null;
    card.style.transition = 'transform .2s';
    if (dy > threshold) close();
    else { card.style.transform = 'translateY(0)'; modal.style.background = 'rgba(0,0,0,.45)'; }
  };

  header.addEventListener('pointerdown', onDown);
  header.addEventListener('pointermove', onMove);
  header.addEventListener('pointerup', onUp);
  header.addEventListener('pointercancel', onUp);
}

// --- Auto-open product modal by query (?product=M|H) ---
function autoOpenProductDetailFromQuery(){
  const page = document.documentElement.getAttribute('data-page') || '';
  if (page !== 'products') return;

  const params = new URLSearchParams(location.search);
  const code = (params.get('product') || '').toUpperCase(); // 'M' or 'H'
  if (!code) return;

  // 대상 버튼/카드 찾기
  const btn = Array.from(document.querySelectorAll('[data-modal-title]'))
              .find(b => (b.dataset.modalTitle || '').toUpperCase().endsWith(' ' + code));
  if (!btn) return;

  // ✨ 카드 위치로 먼저 스크롤 (고정 헤더 고려해 center가 안정적)
  const card = btn.closest('.prod-card') || btn;
  card.scrollIntoView({ behavior:'instant', block:'center' });

  // 이미지 소스 고르기 (모바일/데스크톱) – 기존 로직 재사용
  const mql = window.matchMedia('(max-width: 768px)');
  const src = mql.matches
    ? (btn.dataset.modalSrcMobile || btn.dataset.modalSrcDesktop)
    : (btn.dataset.modalSrcDesktop || btn.dataset.modalSrcMobile);

  const modal = document.querySelector('#productModal');
  if (!modal) return;

  const imgEl   = modal.querySelector('img');
  const titleEl = modal.querySelector('.modal-title'); // 이미 initProductModal에서 기대하는 클래스명:contentReference[oaicite:2]{index=2}

  imgEl.src = src;
  titleEl && (titleEl.textContent = btn.dataset.modalTitle || '');
  modal.classList.add('active');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
}

// --- Disable right-click context menu ---
document.addEventListener('contextmenu', function(e) {
  e.preventDefault();
}, false);

// --- (선택) 특정 키 조합도 막을 수 있음 (예: Ctrl+U, Ctrl+C) ---
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && (e.key === 'u' || e.key === 'U' || e.key === 'c' || e.key === 'C')) {
    e.preventDefault();
  }
});

function initContactChannel(){
  const page = document.documentElement.getAttribute('data-page') || '';
  if (page !== 'contact') return; // contact 페이지에서만 동작

  const form = document.getElementById('contactForm');
  if (!form) return;

  const emailAction   = form.dataset.emailAction || form.getAttribute('action');
  const whatsappLink  = form.dataset.whatsappLink || ''; // 나중에 번호 세팅
  const channelInput  = document.getElementById('channel');
  const submitBtn     = document.getElementById('submitBtn');
  const waHint        = document.getElementById('waHint');

  // 탭 토글
  const tabs = document.querySelectorAll('.channel-tab');
  tabs.forEach(tab=>{
    tab.addEventListener('click', ()=>{
      tabs.forEach(t => { t.classList.remove('active'); t.setAttribute('aria-pressed','false'); });
      tab.classList.add('active'); tab.setAttribute('aria-pressed','true');

      const method = tab.dataset.method;  // 'email' | 'whatsapp'
      channelInput.value = method;

      if (method === 'email'){
        submitBtn.textContent = 'Send via Email';
        form.setAttribute('action', emailAction);
        waHint.hidden = true;
      } else {
        submitBtn.textContent = 'Start WhatsApp';
        // 폼 action 은 임시로 막아두고, submit 시 JS가 처리
        form.setAttribute('action', '#');
        waHint.hidden = whatsappLink ? true : false;
      }
    });
  });

  // 제출 분기
  form.addEventListener('submit', (e)=>{
    const method = channelInput.value;
    if (method === 'email'){
      // 기본 메일 폼 전송 (Formspree 등) → 그대로 진행
      return;
    }
    // WhatsApp 분기
    e.preventDefault();
    if (!whatsappLink){
      alert('WhatsApp 번호가 아직 설정되지 않았습니다. 설정 후 자동 연결됩니다.');
      return;
    }
    const msg = form.message ? form.message.value : '';
    const encoded = encodeURIComponent(msg || 'Hello Julieta team!');
    const url = `${whatsappLink}?text=${encoded}`;
    window.open(url, '_blank', 'noopener');
  });
}


// include.js 맨 아래 근처에 추가 (옵션)
(function initFloatingWA(){
  const el = document.querySelector('.fab-whatsapp');
  if (!el) return;
  const link = el.getAttribute('data-link'); // 예: "https://wa.me/821012345678"
  if (!link){ el.hidden = true; return; }
  el.hidden = false;
  el.addEventListener('click', (e)=>{
    e.preventDefault();
    window.open(link, '_blank', 'noopener');
  });
})();
