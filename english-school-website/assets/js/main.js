// ===== Mobile nav toggle =====
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle?.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(open));
  navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
});

// Close mobile menu when a link is tapped
mainNav?.querySelectorAll('a').forEach((a) =>
  a.addEventListener('click', () => {
    mainNav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  })
);

// ===== Header shadow on scroll =====
const header = document.querySelector('.site-header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
onScroll();
window.addEventListener('scroll', onScroll, { passive: true });

// ===== Reveal on scroll =====
const revealEls = document.querySelectorAll('[data-reveal]');
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

// ===== Animated stat counters =====
const counters = document.querySelectorAll('[data-count]');
const runCounter = (el) => {
  const target = +el.dataset.count;
  const dur = 1400;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased).toLocaleString();
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
if ('IntersectionObserver' in window) {
  const cio = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          runCounter(entry.target);
          cio.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.6 }
  );
  counters.forEach((c) => cio.observe(c));
}

// ===== Contact form validation =====
const form = document.getElementById('trial-form');
const note = document.getElementById('form-note');

const setError = (input, msg) => {
  const field = input.closest('.field');
  const err = field.querySelector('.error');
  field.classList.toggle('invalid', !!msg);
  if (err) err.textContent = msg || '';
};

const validators = {
  name: (v) => (v.trim().length >= 2 ? '' : 'Please enter your name.'),
  email: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? '' : 'Enter a valid email address.'),
  program: (v) => (v ? '' : 'Please choose a program.'),
};

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  let ok = true;
  Object.keys(validators).forEach((name) => {
    const input = form.elements[name];
    const msg = validators[name](input.value);
    setError(input, msg);
    if (msg) ok = false;
  });

  if (!ok) {
    note.textContent = '';
    note.className = 'form-note';
    return;
  }

  const name = form.elements['name'].value.trim().split(' ')[0];
  note.textContent = `Thanks, ${name}! 🎉 We'll email you within one business day to schedule your free trial.`;
  note.className = 'form-note ok';
  form.reset();
});

// Clear error as the user fixes a field
['name', 'email', 'program'].forEach((name) => {
  const input = form?.elements[name];
  input?.addEventListener('input', () => setError(input, ''));
});

// ===== Footer year =====
const yearEl = document.getElementById('year');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());
