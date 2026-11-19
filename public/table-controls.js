(() => {
  const sortStates = new Map();
  const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true });
  let draggedRow = null;
  let pointerDrag = null;

  const definitions = {
    requester: {
      title: 'Solicitante',
      initial: 'asc',
      value: row => row.requester?.trim() || null,
      labels: { asc: 'Solicitantes de A a Z', desc: 'Solicitantes de Z a A' }
    },
    department: {
      title: 'Setor',
      initial: 'asc',
      value: row => row.department?.trim() || null,
      labels: { asc: 'Setor solicitante de A a Z', desc: 'Setor solicitante de Z a A' }
    },
    opened: {
      title: 'Aberto',
      initial: 'asc',
      value: row => row.opened === 'SIM' ? 0 : 1,
      labels: { asc: 'Chamados SIM primeiro', desc: 'Chamados NÃO primeiro' }
    },
    start: {
      title: 'Início',
      initial: 'desc',
      value: row => clockValue(row.start),
      labels: { desc: 'Inícios mais recentes primeiro', asc: 'Inícios mais antigos primeiro' }
    },
    end: {
      title: 'Final',
      initial: 'desc',
      value: row => clockValue(row.end),
      labels: { desc: 'Finais mais recentes primeiro', asc: 'Finais mais antigos primeiro' }
    },
    duration: {
      title: 'Total',
      initial: 'desc',
      value: row => row.start && row.end ? mins(row) : null,
      labels: { desc: 'Atendimentos mais longos primeiro', asc: 'Atendimentos mais curtos primeiro' }
    }
  };

  function clockValue(value) {
    if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  }

  function compareValues(left, right, direction) {
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    const result = typeof left === 'string' ? collator.compare(left, right) : left - right;
    return direction === 'asc' ? result : -result;
  }

  async function saveOrder(date, nextRows, previousRows) {
    records[date] = nextRows;
    try {
      await persist();
      return true;
    } catch {
      records[date] = previousRows;
      document.getElementById('saveStatus').textContent = 'Não foi possível salvar a nova ordem.';
      return false;
    }
  }

  async function sortDay(date, key) {
    const definition = definitions[key];
    const current = sortStates.get(date);
    const previousRows = [...records[date]];
    const previousState = current || null;
    if (current?.key === key && current.direction !== definition.initial) {
      sortStates.delete(date);
      if (!await saveOrder(date, [...current.baseline], previousRows)) {
        sortStates.set(date, current);
      }
      render();
      return;
    }
    const direction = current?.key === key
      ? current.direction === 'asc' ? 'desc' : 'asc'
      : definition.initial;
    const baseline = current?.key === key ? current.baseline : previousRows;
    const nextRows = previousRows
      .map((row, index) => ({ row, index }))
      .sort((left, right) => {
        const compared = compareValues(
          definition.value(left.row),
          definition.value(right.row),
          direction
        );
        return compared || left.index - right.index;
      })
      .map(item => item.row);
    sortStates.set(date, { key, direction, baseline });
    if (!await saveOrder(date, nextRows, previousRows)) {
      if (previousState) sortStates.set(date, previousState);
      else sortStates.delete(date);
    }
    render();
  }

  function updateSortButtons(card, date) {
    const active = sortStates.get(date);
    card.querySelectorAll('.sort-toggle').forEach(button => {
      const definition = definitions[button.dataset.sort];
      const isActive = active?.key === button.dataset.sort;
      const direction = isActive ? active.direction : definition.initial;
      const nextDirection = isActive
        ? direction === 'asc' ? 'desc' : 'asc'
        : definition.initial;
      button.classList.toggle('is-active', isActive);
      button.querySelector('.sort-arrow').textContent = isActive
        ? direction === 'asc' ? '↑' : '↓'
        : '↕';
      button.setAttribute('aria-pressed', String(isActive));
      button.setAttribute('aria-label', 'Ordenar por ' + definition.labels[nextDirection]);
      button.title = isActive
        ? definition.labels[direction] + '. Clique para inverter.'
        : 'Ordenar por ' + definition.labels[definition.initial];
    });
  }

  function clearDropMarkers(card) {
    card.querySelectorAll('.drop-before, .drop-after').forEach(row => {
      row.classList.remove('drop-before', 'drop-after');
    });
  }

  function createMobileSortBar(card) {
    if (card.querySelector('.mobile-sort-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'mobile-sort-bar';
    bar.setAttribute('aria-label', 'Ordenar atendimentos');
    const caption = document.createElement('span');
    caption.className = 'mobile-sort-caption';
    caption.textContent = 'Ordenar';
    bar.append(caption);
    Object.entries(definitions).forEach(([key, definition]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sort-toggle mobile-sort-option';
      button.dataset.sort = key;
      button.innerHTML =
        '<span class="sort-label">' + definition.title + '</span>' +
        '<span class="sort-arrow" aria-hidden="true">↕</span>';
      bar.append(button);
    });
    card.querySelector('.table-scroll').prepend(bar);
  }

  async function moveRow(date, fromIndex, targetIndex, placeAfter) {
    let insertionIndex = targetIndex + (placeAfter ? 1 : 0);
    if (fromIndex < insertionIndex) insertionIndex -= 1;
    if (insertionIndex === fromIndex) return;
    const previousRows = [...records[date]];
    const previousState = sortStates.get(date) || null;
    const nextRows = [...previousRows];
    const [moved] = nextRows.splice(fromIndex, 1);
    nextRows.splice(insertionIndex, 0, moved);
    sortStates.delete(date);
    if (!await saveOrder(date, nextRows, previousRows) && previousState) {
      sortStates.set(date, previousState);
    }
    render();
  }

  function enhanceRow(row, card, date, index) {
    if (row.dataset.reorderReady) return;
    row.dataset.reorderReady = 'true';
    row.classList.add('call-row');
    const handle = row.querySelector('.row-drag');
    if (!handle) return;
    handle.draggable = true;
    handle.addEventListener('dragstart', event => {
      draggedRow = { date, index };
      row.classList.add('dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
    });
    handle.addEventListener('dragend', () => {
      draggedRow = null;
      row.classList.remove('dragging');
      clearDropMarkers(card);
    });
    handle.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse') return;
      event.preventDefault();
      pointerDrag = { date, index, row, card, targetIndex: null, placeAfter: false };
      draggedRow = { date, index };
      row.classList.add('dragging');
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!pointerDrag || pointerDrag.row !== row) return;
      event.preventDefault();
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('tbody tr');
      if (!target || !card.contains(target) || target === row) return;
      const rows = [...card.querySelectorAll('tbody tr')];
      const targetIndex = rows.indexOf(target);
      clearDropMarkers(card);
      const placeAfter = event.clientY > target.getBoundingClientRect().top + target.offsetHeight / 2;
      target.classList.add(placeAfter ? 'drop-after' : 'drop-before');
      pointerDrag.targetIndex = targetIndex;
      pointerDrag.placeAfter = placeAfter;
    });
    handle.addEventListener('pointerup', async event => {
      if (!pointerDrag || pointerDrag.row !== row) return;
      const current = pointerDrag;
      pointerDrag = null;
      draggedRow = null;
      row.classList.remove('dragging');
      clearDropMarkers(card);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
      if (current.targetIndex !== null) {
        await moveRow(date, index, current.targetIndex, current.placeAfter);
      }
    });
    handle.addEventListener('pointercancel', event => {
      if (!pointerDrag || pointerDrag.row !== row) return;
      pointerDrag = null;
      draggedRow = null;
      row.classList.remove('dragging');
      clearDropMarkers(card);
      if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
    });
    row.addEventListener('dragover', event => {
      if (!draggedRow || draggedRow.date !== date || draggedRow.index === index) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      clearDropMarkers(card);
      const placeAfter = event.clientY > row.getBoundingClientRect().top + row.offsetHeight / 2;
      row.classList.add(placeAfter ? 'drop-after' : 'drop-before');
    });
    row.addEventListener('dragleave', event => {
      if (!row.contains(event.relatedTarget)) row.classList.remove('drop-before', 'drop-after');
    });
    row.addEventListener('drop', async event => {
      event.preventDefault();
      if (!draggedRow || draggedRow.date !== date || draggedRow.index === index) return;
      const placeAfter = row.classList.contains('drop-after');
      const fromIndex = draggedRow.index;
      draggedRow = null;
      clearDropMarkers(card);
      await moveRow(date, fromIndex, index, placeAfter);
    });
  }

  function enhanceCard(card, date) {
    if (!date) return;
    card.dataset.date = date;
    createMobileSortBar(card);
    card.querySelectorAll('.sort-toggle').forEach(button => {
      if (button.dataset.sortReady) return;
      button.dataset.sortReady = 'true';
      button.addEventListener('click', () => sortDay(date, button.dataset.sort));
    });
    updateSortButtons(card, date);
    card.querySelectorAll('tbody tr').forEach((row, index) => enhanceRow(row, card, date, index));
  }

  function enhanceTables() {
    const root = document.getElementById('days');
    if (!root || typeof days !== 'function') return;
    const visibleDates = days();
    [...root.querySelectorAll(':scope > .day-card')].forEach((card, index) => {
      enhanceCard(card, visibleDates[index]);
    });
  }

  const root = document.getElementById('days');
  if (!root) return;
  new MutationObserver(enhanceTables).observe(root, { childList: true });
  enhanceTables();
})();
