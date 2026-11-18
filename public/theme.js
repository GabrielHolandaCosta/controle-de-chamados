(() => {
  const key = 'chamados-theme';
  const saved = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const preferred = () => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const button = document.getElementById('themeToggle');
    if (!button) return;
    const dark = theme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute('aria-label', dark ? 'Ativar tema claro' : 'Ativar tema escuro');
    button.title = dark ? 'Ativar tema claro' : 'Ativar tema escuro';
    button.querySelector('.theme-toggle-label').textContent = dark ? 'Claro' : 'Escuro';
    button.querySelector('.theme-toggle-icon').innerHTML = dark
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20.5 15.2A8.5 8.5 0 0 1 8.8 3.5 8.5 8.5 0 1 0 20.5 15.2Z"/></svg>';
  }

  const initial = saved() || preferred();
  apply(initial);

  function mount() {
    const button = document.createElement('button');
    button.id = 'themeToggle';
    button.className = 'theme-toggle';
    button.type = 'button';
    button.innerHTML = '<span class="theme-toggle-icon"></span><span class="theme-toggle-label"></span>';
    button.onclick = () => {
      const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(key, next); } catch {}
      apply(next);
    };
    const header = document.querySelector('header');
    if (header) {
      const actions = document.createElement('div');
      actions.className = 'header-actions';
      [...header.children].slice(1).forEach(item => actions.append(item));
      actions.append(button);
      header.append(actions);
    } else {
      button.classList.add('theme-toggle-fixed');
      document.body.append(button);
    }
    apply(document.documentElement.dataset.theme || initial);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (!saved()) apply(event.matches ? 'dark' : 'light');
  });
})();
