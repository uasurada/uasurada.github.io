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
  initSmoothScroll();
  initProductModal();
  initReveal();
})();

// --- nav (mobile toggle + logo link stays solid) ---
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

// --- active menu ---
function setActiveLink(){
  const page = document.documentElement.getAttribute('data-page') || '';
  const map = { home:'index.html', about:'about.html', products:'products.html', technology:'technology.html', contact:'contact.html' };
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
  const closeBtn = modal.querySelector('.modal-close'); // ← 추가
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
    if (!fromPop && history.state && history.state.__j_modal){ try{ history.back(); }catch{} }
    card.style.transition = 'transform .2s'; card.style.transform = 'translateY(0)';
    modal.style.background = 'rgba(0,0,0,.45)';
  };

  // open buttons
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-src-desktop], [data-modal-src-mobile]');
    if (!btn) return;
    open(pickSrc(btn), btn.dataset.modalTitle || '');
  });

  // X 버튼 직접 닫기 (드래그 핸들 이벤트와 충돌 방지)
   if (closeBtn) {
    closeBtn.addEventListener('pointerdown', (e) => e.stopPropagation()); // 추가
    closeBtn.addEventListener('click', (e) => {
     e.stopPropagation();
     close();
    });
   }
  
  // close by bg or X
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

      // 닫기(X) 버튼 위에서 누른 경우 드래그 시작 금지
    if (e.target.closest('.modal-close')) return;

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
