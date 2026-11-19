(() => {
  let pendingUnlock = null;
  let assigningIds = false;
  const dialog = document.getElementById('rowUnlockDialog');
  const label = document.getElementById('rowUnlockLabel');
  const confirmButton = document.getElementById('confirmRowUnlock');

  function newId() {
    return crypto.randomUUID?.() || 'call-' + Date.now() + '-' + Math.random().toString(16).slice(2);
  }

  function applyRowState(element, row) {
    const locked = Boolean(row._locked);
    element.classList.toggle('is-locked', locked);
    const button = element.querySelector('.row-lock');
    if (!button) return;
    button.classList.toggle('is-locked', locked);
    button.setAttribute('aria-pressed', String(locked));
    button.title = locked ? 'Desbloquear este chamado' : 'Bloquear este chamado';
    button.setAttribute('aria-label', button.title);
    button.querySelector('span').textContent = locked ? '●' : '○';
    element.querySelectorAll('input, select, .delete-row, .row-drag').forEach(control => {
      control.disabled = locked;
    });
  }

  function enhanceRows() {
    if (assigningIds || typeof days !== 'function' || typeof records === 'undefined') return;
    let addedId = false;
    const visibleDates = days();
    document.querySelectorAll('#days > .day-card').forEach((card, cardIndex) => {
      const date = card.dataset.date || visibleDates[cardIndex];
      const data = records[date] || [];
      card.querySelectorAll('tbody tr').forEach((element, rowIndex) => {
        const row = data[rowIndex];
        if (!row) return;
        if (!row._id) {
          row._id = newId();
          addedId = true;
        }
        element.dataset.callId = row._id;
        applyRowState(element, row);
      });
    });
    if (addedId) {
      assigningIds = true;
      persist().catch(() => {
        document.getElementById('saveStatus').textContent = 'Não foi possível preparar os bloqueios.';
      }).finally(() => { assigningIds = false; });
    }
  }

  function findRow(callId) {
    for (const [date, rows] of Object.entries(records)) {
      const index = rows.findIndex(row => row._id === callId);
      if (index !== -1) return { date, index, row: rows[index] };
    }
    return null;
  }

  async function setLocked(callId, locked) {
    const found = findRow(callId);
    if (!found) return;
    const previous = Boolean(found.row._locked);
    found.row._locked = locked;
    enhanceRows();
    try {
      await persist();
      document.getElementById('saveStatus').textContent = locked ? 'Chamado bloqueado ✓' : 'Chamado desbloqueado ✓';
    } catch {
      found.row._locked = previous;
      enhanceRows();
      document.getElementById('saveStatus').textContent = 'Não foi possível alterar o bloqueio.';
    }
  }

  document.addEventListener('click', event => {
    const clearButton = event.target.closest('.clear-day');
    if (clearButton) {
      const card = clearButton.closest('.day-card');
      const date = card?.dataset.date;
      if (date && records[date]?.some(row => row._locked)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.getElementById('saveStatus').textContent = 'Desbloqueie os chamados protegidos antes de apagar este dia.';
        card.querySelector('.row-lock.is-locked')?.focus();
        return;
      }
    }
    const actionButton = event.target.closest('button');
    if (actionButton?.textContent.includes('Importar Excel') && Object.values(records).flat().some(row => row._locked)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      document.getElementById('saveStatus').textContent = 'Desbloqueie os chamados protegidos antes de importar uma planilha.';
      return;
    }
    const button = event.target.closest('.row-lock');
    if (!button) return;
    const element = button.closest('tr');
    const callId = element?.dataset.callId;
    const found = callId ? findRow(callId) : null;
    if (!found) return;
    if (!found.row._locked) {
      setLocked(callId, true);
      return;
    }
    pendingUnlock = callId;
    label.textContent = found.row.service?.trim() ? `“${found.row.service.trim()}”` : 'selecionado';
    dialog.showModal();
  }, true);

  confirmButton.addEventListener('click', event => {
    event.preventDefault();
    const callId = pendingUnlock;
    pendingUnlock = null;
    dialog.close();
    if (callId) setLocked(callId, false);
  });

  dialog.addEventListener('close', () => { pendingUnlock = null; });

  const observer = new MutationObserver(enhanceRows);
  observer.observe(document.getElementById('days'), { childList: true, subtree: true });
  enhanceRows();
})();
