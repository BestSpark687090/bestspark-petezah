const sidebar = document.querySelector('.sidebar'),
  sidebarToggler = document.querySelector('.sidebar-toggler'),
  menuToggler = document.querySelector('.menu-toggler'),
  mainContent = document.querySelector('.main-content'),
  navLinks = document.querySelectorAll('.sidebar-nav .nav-link'),
  mainFrame = document.getElementById('mainFrame'),
  widgetButton = document.querySelector('.widget-button'),
  widgetPopup = document.querySelector('.widget-popup'),
  widgetOptions = document.querySelectorAll('.widget-option');

if ((location.pathname.endsWith('index.html') && '#blank' === location.hash) || location.href.endsWith('#blank')) {
  const e = window.open(),
    t = e.document.createElement('iframe');
  ((t.src = location.origin + location.pathname.replace('index.html', '') + '/'),
    (t.style = 'border:none; width:100%; height:100vh; position:fixed; top:0; left:0;'),
    (t.allow = 'fullscreen'),
    (t.referrerpolicy = 'no-referrer'),
    (e.document.body.style.margin = '0'),
    e.document.body.appendChild(t),
    (window.location = 'about:blank'));
}

sidebar.classList.add('collapsed');
mainContent.classList.remove('sidebar-expanded');

sidebarToggler.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
  mainContent.classList.toggle('sidebar-expanded');
});

function updateActiveNavLink(src) {
  navLinks.forEach((link) => {
    const linkSrc = link.getAttribute('data-src');
    if (linkSrc === src) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'src') {
      updateActiveNavLink(mainFrame.src.replace(window.location.origin, ''));
    }
  });
});

observer.observe(mainFrame, {
  attributes: true,
  attributeFilter: ['src']
});

mainFrame.addEventListener('load', () => {
  try {
    const iframeSrc = mainFrame.src.replace(window.location.origin, '');
    updateActiveNavLink(iframeSrc);
  } catch (e) {
  }
});

class TxtType {
  constructor(e, t, i) {
    ((this.toRotate = t),
      (this.el = e),
      (this.loopNum = 0),
      (this.period = Number.parseInt(i, 10) || 2e3),
      (this.txt = ''),
      this.tick(),
      (this.isDeleting = !1));
  }
  tick() {
    const e = this.loopNum % this.toRotate.length,
      t = this.toRotate[e];
    (this.isDeleting ? (this.txt = t.substring(0, this.txt.length - 1)) : (this.txt = t.substring(0, this.txt.length + 1)),
      (this.el.innerHTML = '<span class="wrap">' + this.txt + '</span>'));
    let i = 200 - 100 * Math.random();
    (this.isDeleting && (i /= 2),
      this.isDeleting || this.txt !== t
        ? this.isDeleting && '' === this.txt && ((this.isDeleting = !1), this.loopNum++, (i = 500))
        : ((i = this.period), (this.isDeleting = !0)),
      setTimeout(() => this.tick(), i));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const e = document.getElementsByClassName('typewrite');
  for (let t = 0; t < e.length; t++) {
    const i = e[t].getAttribute('data-type'),
      s = e[t].getAttribute('data-period');
    i && new TxtType(e[t], JSON.parse(i), s);
  }
  const t = document.createElement('style');
  ((t.innerHTML = '.typewrite > .wrap { border-right: 0.06em solid #a04cff}'),
    document.body.appendChild(t),
    navLinks.length > 0 && navLinks[0].classList.add('active'));
});

navLinks.forEach((e) => {
  e.addEventListener('click', (t) => {
    t.preventDefault();
    const i = e.getAttribute('data-src');
    if (i) {
      mainFrame.src = i;
      navLinks.forEach((link) => link.classList.remove('active'));
      e.classList.add('active');
    }
  });
});

widgetButton.addEventListener('click', () => {
  widgetPopup.classList.toggle('show');
});

widgetOptions.forEach((e) => {
  e.addEventListener('click', () => {
    const t = e.getAttribute('data-src');
    if (t) {
      mainFrame.src = t;
      updateActiveNavLink(t);
    }
    widgetPopup.classList.remove('show');
  });
});

document.addEventListener('click', (e) => {
  widgetButton.contains(e.target) || widgetPopup.contains(e.target) || widgetPopup.classList.remove('show');
});

window.addEventListener('message', (e) => {
  e.origin === window.location.origin &&
    (('login_success' !== e.data.type && 'signup_success' !== e.data.type) || (mainFrame.src = 'pages/settings/p2.html'),
    'logout' === e.data.type && (mainFrame.src = 'pages/settings/p.html'));
});
