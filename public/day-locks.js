(() => {
  let lockedDates = new Set();
  let pendingUnlock = null;
  const dialog = document.getElementById('unlockDialog');
  const label = document.getElementById('unlockDateLabel');
  const confirmButton = document.getElementById('confirmUnlock');

  async function lockApi(dates) {
    const response = await fetch('/api/call-locks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dates })
    });
    if (!response.ok) throw new Error('Não foi possível salvar o bloqueio.');
  }

  function applyCardState(card) {
    const date = card.dataset.date;
    if (!date) return;
    const locked = lockedDates.has(date);
    card.classList.toggle('is-locked', locked);
    const button = card.querySelector('.day-lock');
    if (!button) return;
    button.classList.toggle('is-locked', locked);
    button.setAttribute('aria-pressed', String(locked));
    button.title = locked ? 'Clique para desbloquear a edição deste dia' : 'Bloquear a edição deste dia';
    button.querySelector('.day-lock-icon').textContent = locked ? '●' : '○';
    button.querySelector('.day-lock-label').textContent = locked ? 'Bloqueado' : 'Bloquear';
    card.querySelectorAll('tbody input, tbody select, .delete-row, .row-drag, .sort-toggle, .clear-day').forEach(control => {
      control.disabled = locked;
    });
  }

  function applyAllCards() {
    document.querySelectorAll('.day-card').forEach(applyCardState);
  }

  async function setLocked(date, locked) {
    const previous = new Set(lockedDates);
    locked ? lockedDates.add(date) : lockedDates.delete(date);
    applyAllCards();
    try {
      if (typeof persist === 'function') await persist();
      await lockApi([...lockedDates]);
      document.getElementById('saveStatus').textContent = locked ? 'Dia bloqueado ✓' : 'Dia desbloqueado ✓';
    } catch {
      lockedDates = previous;
      applyAllCards();
      document.getElementById('saveStatus').textContent = 'Não foi possível alterar o bloqueio.';
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.day-lock');
    if (!button) return;
    const card = button.closest('.day-card');
    const date = card?.dataset.date;
    if (!date) return;
    if (!lockedDates.has(date)) {
      setLocked(date, true);
      return;
    }
    pendingUnlock = date;
    label.textContent = card.querySelector('.day-title')?.textContent || date;
    dialog.showModal();
  });

  document.getElementById('addRowButton').addEventListener('click', event => {
    const date = document.getElementById('newDate').value;
    if (!lockedDates.has(date)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    document.getElementById('saveStatus').textContent = 'Este dia está bloqueado. Desbloqueie para adicionar um chamado.';
    document.querySelector(`.day-card[data-date="${date}"] .day-lock`)?.focus();
  }, true);

  confirmButton.addEventListener('click', event => {
    event.preventDefault();
    const date = pendingUnlock;
    pendingUnlock = null;
    dialog.close();
    if (date) setLocked(date, false);
  });

  dialog.addEventListener('close', () => { pendingUnlock = null; });

  const observer = new MutationObserver(applyAllCards);
  observer.observe(document.getElementById('days'), { childList: true });

  fetch('/api/call-locks')
    .then(response => response.ok ? response.json() : Promise.reject())
    .then(data => {
      lockedDates = new Set(Array.isArray(data.dates) ? data.dates : []);
      applyAllCards();
    })
    .catch(() => {
      document.getElementById('saveStatus').textContent = 'Não foi possível carregar os bloqueios.';
    });
})();
