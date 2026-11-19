(() => {
  let pendingUnlock = null;
  let pendingDelete = null;
  let pendingDayDelete = null;
  let assigningIds = false;
  const dialog = document.getElementById('rowUnlockDialog');
  const label = document.getElementById('rowUnlockLabel');
  const confirmButton = document.getElementById('confirmRowUnlock');
  const deleteDialog = document.getElementById('rowDeleteDialog');
  const deleteLabel = document.getElementById('rowDeleteLabel');
  const confirmDeleteButton = document.getElementById('confirmRowDelete');
  const dayDeleteDialog = document.getElementById('dayDeleteDialog');
  const dayDeleteLabel = document.getElementById('dayDeleteLabel');
  const dayDeleteCount = document.getElementById('dayDeleteCount');
  const confirmDayDeleteButton = document.getElementById('confirmDayDelete');

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
    const icon = button.querySelector('span');
    const nextIcon = locked ? '●' : '○';
    if (icon.textContent !== nextIcon) icon.textContent = nextIcon;
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
    const deleteButton = event.target.closest('.delete-row');
    if (deleteButton && !deleteButton.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const element = deleteButton.closest('tr');
      const callId = element?.dataset.callId;
      const found = callId ? findRow(callId) : null;
      if (!found) return;
      pendingDelete = callId;
      deleteLabel.textContent = found.row.service?.trim() ? `“${found.row.service.trim()}”` : 'sem descrição';
      deleteDialog.showModal();
      return;
    }
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
      if (date && records[date]) {
        event.preventDefault();
        event.stopImmediatePropagation();
        pendingDayDelete = date;
        const amount = records[date].length;
        dayDeleteCount.textContent = `${amount} ${amount === 1 ? 'chamado' : 'chamados'}`;
        dayDeleteLabel.textContent = card.querySelector('.day-title')?.textContent || date;
        dayDeleteDialog.showModal();
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

  confirmDeleteButton.addEventListener('click', async event => {
    event.preventDefault();
    const callId = pendingDelete;
    pendingDelete = null;
    deleteDialog.close();
    const found = callId ? findRow(callId) : null;
    if (!found) return;
    const removed = found.row;
    records[found.date].splice(found.index, 1);
    const removedDate = records[found.date].length === 0;
    if (removedDate) delete records[found.date];
    try {
      await persist();
      render();
      document.getElementById('saveStatus').textContent = 'Chamado excluído ✓';
    } catch {
      if (removedDate) records[found.date] = [];
      records[found.date].splice(found.index, 0, removed);
      render();
      document.getElementById('saveStatus').textContent = 'Não foi possível excluir o chamado.';
    }
  });

  confirmDayDeleteButton.addEventListener('click', async event => {
    event.preventDefault();
    const date = pendingDayDelete;
    pendingDayDelete = null;
    dayDeleteDialog.close();
    if (!date || !records[date]) return;
    const backup = records[date];
    delete records[date];
    try {
      await persist();
      render();
      document.getElementById('saveStatus').textContent = 'Chamados do dia excluídos ✓';
    } catch {
      records[date] = backup;
      render();
      document.getElementById('saveStatus').textContent = 'Não foi possível apagar os chamados deste dia.';
    }
  });

  dialog.addEventListener('close', () => { pendingUnlock = null; });
  deleteDialog.addEventListener('close', () => { pendingDelete = null; });
  dayDeleteDialog.addEventListener('close', () => { pendingDayDelete = null; });

  const observer = new MutationObserver(enhanceRows);
  observer.observe(document.getElementById('days'), { childList: true });
  enhanceRows();
})();
