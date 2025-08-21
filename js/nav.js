// Mobile nav toggle
const toggle = document.querySelector('.nav-toggle');
const menu = document.querySelector('.nav-menu');
if (toggle) toggle.addEventListener('click', () => menu.classList.toggle('open'));
if (menu) menu.querySelectorAll('a').forEach(a => a.addEventListener('click',()=>menu.classList.remove('open')));

// Active link (by pathname)
const path = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav-menu a').forEach(a=>{
  const href = a.getAttribute('href');
  if (href.endsWith(path)) a.classList.add('active');
});

// Reveal on scroll
const io = new IntersectionObserver(entries=>{
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
},{threshold: .15});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Product modal (optional)
document.addEventListener('click', e=>{
  const btn = e.target.closest('[data-modal-src]');
  if (btn) {
    const src = btn.getAttribute('data-modal-src');
    const title = btn.getAttribute('data-modal-title') || '';
    const modal = document.querySelector('#productModal');
    modal.querySelector('img').src = src;
    modal.querySelector('.modal-title').textContent = title;
    modal.classList.add('active');
  }
  if (e.target.matches('.modal, .modal-close')) {
    e.target.closest('.modal').classList.remove('active');
  }
});
