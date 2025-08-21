// 간단한 HTML include 로더
async function include(selector, url) {
  const host = document.querySelector(selector);
  if (!host) return;
  const res = await fetch(url, { cache: "no-cache" });
  host.innerHTML = await res.text();
}

// 현재 페이지 키 (활성 메뉴 강조)
const pageKey = document.documentElement.getAttribute("data-page");

(async () => {
  // 파셜 주입
  await include('[data-include="header"]', 'partials/header.html');
  await include('[data-include="footer"]', 'partials/footer.html');

  // 모바일 메뉴 토글 + 배경 스크롤 잠금
  const t = document.querySelector('.nav-toggle');
  const m = document.querySelector('.nav-menu');

  const closeMenu = () => {
    if (!m) return;
    m.classList.remove('open');
    document.body.classList.remove('menu-open');
  };
  const openMenu = () => {
    if (!m) return;
    m.classList.add('open');
    document.body.classList.add('menu-open');
  };

  if (t && m){
    t.addEventListener('click', () => {
      m.classList.contains('open') ? closeMenu() : openMenu();
    });
    // 메뉴 항목 클릭 시 닫기
    m.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));
  }

  // 활성 메뉴 표시
  if (pageKey) {
    document.querySelectorAll('[data-nav] a').forEach(a => {
      if (a.dataset.navkey === pageKey) a.classList.add('active');
    });
  }

  // 스크롤 리빌
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: .15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // 제품 모달 (Products 페이지에서만 동작)
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-modal-src]');
    if (btn) {
      const src = btn.getAttribute('data-modal-src');
      const title = btn.getAttribute('data-modal-title') || '';
      const modal = document.querySelector('#productModal');
      if (modal) {
        modal.querySelector('img').src = src;
        modal.querySelector('.modal-title').textContent = title;
        modal.classList.add('active');
      }
    }
    if (e.target.matches('.modal, .modal-close')) {
      const box = e.target.closest('.modal');
      if (box) box.classList.remove('active');
    }
  });
})();

// ====== 제품 모달 (개선: ESC / 뒤로가기 / 스와이프-다운 / 스크롤잠금 + PointerEvents 보강) ======
(() => {
  const modal = document.querySelector('#productModal');
  if (!modal) return;

  const card    = modal.querySelector('.modal-card');
  const imgEl   = modal.querySelector('img');
  const titleEl = modal.querySelector('.modal-title');
  const header  = modal.querySelector('.modal-head'); // 드래그 핸들 지정

  const openModal = (src, title='') => {
    imgEl.src = src;
    titleEl.textContent = title;
    modal.classList.add('active');
    document.body.classList.add('modal-open');

    try { history.pushState({ __julietaModal: true }, ""); } catch(_) {}
  };

  const closeModal = (fromPop=false) => {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    imgEl.src = "";

    if (!fromPop && history.state && history.state.__julietaModal) {
      try { history.back(); } catch(_) {}
    }

    card.style.transition = 'transform .2s';
    card.style.transform = 'translateY(0)';
    modal.style.background = 'rgba(0,0,0,.5)';
  };

  // 버튼 클릭 → 모달 오픈
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-modal-src]');
    if (!btn) return;
    const src = btn.getAttribute('data-modal-src');
    const title = btn.getAttribute('data-modal-title') || '';
    openModal(src, title);
  });

  // 배경 클릭 또는 X 버튼(내부 아이콘 포함) 클릭 → 닫기
  modal.addEventListener('click', (e) => {
  // 배경(오버레이) 클릭
   if (e.target === modal) return closeModal();

// .modal-close 자체 또는 그 안의 아이콘/요소를 클릭한 경우
   const closeBtn = e.target.closest('.modal-close');
   if (closeBtn) {
     e.stopPropagation();
     return closeModal();
   }
  });

  // ESC 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });

  // 뒤로가기 닫기
  window.addEventListener('popstate', () => {
    if (modal.classList.contains('active')) closeModal(true);
  });

  // --- Pointer Events 기반 스와이프-다운 (헤더에서만 드래그 허용) ---
  let startY = 0, dy = 0, dragging = false;
  let activePointerId = null;
  const THRESHOLD = 120;
  const START_GAP = 8;

  const onPointerDown = (e) => {
    // X 버튼 위에서 시작한 포인터는 드래그로 취급하지 않음
    if (e.target.closest('.modal-close')) return;

    // 좌클릭만 허용
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    activePointerId = e.pointerId;
    header.setPointerCapture(activePointerId);

    startY = e.clientY;
    dy = 0;
    dragging = false;

    // 드래그 중에는 애니메이션 제거
    card.style.transition = 'none';
    };

  const onPointerMove = (e) => {
    if (activePointerId !== e.pointerId) return;
    dy = e.clientY - startY;
    const down = Math.max(0, dy);

    if (!dragging && down > START_GAP) dragging = true;

    if (dragging) {
      card.style.transform = `translateY(${down}px)`;
      const alpha = Math.max(0.15, 0.5 - down / 600);
      modal.style.background = `rgba(0,0,0,${alpha})`;
      e.preventDefault();
    }
  };

  const onPointerUp = (e) => {
    if (activePointerId !== e.pointerId) return;
    header.releasePointerCapture(activePointerId);
    activePointerId = null;

    card.style.transition = 'transform .2s';

    if (dragging && dy > THRESHOLD) {
      closeModal();
    } else {
      card.style.transform = 'translateY(0)';
      modal.style.background = 'rgba(0,0,0,.5)';
    }
    dragging = false;
    dy = 0;
  };

  
  // 바인딩 (헤더만 핸들)
  header.addEventListener('pointerdown', onPointerDown);
  header.addEventListener('pointermove', onPointerMove);
  header.addEventListener('pointerup', onPointerUp);
  header.addEventListener('pointercancel', onPointerUp);
})();

