(() => {
  const sortStates = new Map();
  const mobileFilters = new Map();
  const collapsedDays = new Set();
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
    os: {
      title: 'OS',
      initial: 'asc',
      value: row => row.os?.trim() || null,
      labels: { asc: 'OS do menor para o maior', desc: 'OS do maior para o menor' }
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
      const response = await fetch('/api/calls/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records })
      });
      if (response.status === 401) {
        location.href = '/loginadm';
        throw new Error('Sessão encerrada');
      }
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar a nova ordem.');
      document.getElementById('saveStatus').textContent = 'Ordem salva para você ✓';
      return true;
    } catch {
      records[date] = previousRows;
      document.getElementById('saveStatus').textContent = 'Não foi possível salvar a nova ordem.';
      return false;
    }
  }

  async function sortDay(date, key, requestedDirection) {
    const definition = definitions[key];
    const current = sortStates.get(date);
    const previousRows = [...records[date]];
    const previousState = current || null;
    if (current && (key === '' || (!requestedDirection && current.key === key && current.direction !== definition.initial))) {
      sortStates.delete(date);
      const restored = current.baseline.map(row => previousRows.find(item => item === row || item._id && item._id === row._id)).filter(Boolean);
      restored.push(...previousRows.filter(row => !restored.includes(row)));
      if (!await saveOrder(date, restored, previousRows)) {
        sortStates.set(date, current);
      }
      render();
      return;
    }
    if (!definition) return;
    const direction = requestedDirection || (current?.key === key
      ? current.direction === 'asc' ? 'desc' : 'asc'
      : definition.initial);
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

  function createMobileSortBar(card, date) {
    if (card.querySelector('.mobile-sort-bar')) return;
    const state = mobileFilters.get(date) || { open: false, status: '' };
    const panel = document.createElement('details');
    panel.className = 'mobile-sort-bar';
    panel.open = state.open;
    panel.innerHTML = '<summary>Filtros e ordenação</summary>' +
      '<div class="mobile-sort-fields">' +
      '<label>Chamado aberto<select><option value="">Todos</option><option value="SIM">Sim</option><option value="NÃO">Não</option></select></label>' +
      '<label>Ordenar por<select><option value="">Ordem original</option></select></label>' +
      '<label class="mobile-idle-option"><input type="checkbox"> Mostrar tempo parado</label>' +
      '</div><p class="mobile-filter-empty" hidden>Nenhum chamado com esse filtro.</p>';
    const [status, order] = panel.querySelectorAll('select');
    const idle = panel.querySelector('input');
    const idleToggle = card.querySelector('.idle-toggle');
    const empty = panel.querySelector('.mobile-filter-empty');

    function applyFilter() {
      let visible = 0;
      card.querySelectorAll('tbody tr').forEach(row => {
        const matches = !state.status || row.querySelector('[data-field="opened"]').value === state.status;
        row.classList.toggle('mobile-filtered-out', !matches);
        if (matches) visible++;
      });
      empty.hidden = !state.status || visible > 0;
      panel.querySelector('summary').textContent = state.status
        ? 'Filtros e ordenação · 1 filtro'
        : 'Filtros e ordenação';
    }

    status.value = state.status;
    status.onchange = () => {
      state.status = status.value;
      mobileFilters.set(date, state);
      applyFilter();
    };
    card.addEventListener('input', event => {
      if (event.target.matches('[data-field="opened"]')) applyFilter();
    });
    panel.ontoggle = () => {
      state.open = panel.open;
      mobileFilters.set(date, state);
    };

    Object.entries(definitions).forEach(([key, definition]) => {
      Object.entries(definition.labels).forEach(([direction, label]) => {
        order.add(new Option(label, key + ':' + direction));
      });
    });
    const active = sortStates.get(date);
    order.value = active ? active.key + ':' + active.direction : '';
    order.onchange = () => {
      const [key, direction] = order.value.split(':');
      order.disabled = true;
      sortDay(date, key, direction);
    };
    idle.checked = !card.querySelector('.idle-footer').hidden;
    idle.onchange = () => idleToggle.click();
    card.querySelector('.table-scroll').prepend(panel);
    applyFilter();
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

  function updateDayToggle(card, date) {
    const content = card.querySelector('.table-scroll');
    const button = card.querySelector('.day-toggle');
    if (!content || !button) return;
    const collapsed = collapsedDays.has(date);
    content.hidden = collapsed;
    const mobilePanel = card.querySelector('.mobile-sort-bar');
    if (mobilePanel) mobilePanel.hidden = collapsed;
    const label = button.querySelector('.day-toggle-label');
    label.textContent = collapsed ? 'Expandir dia' : 'Recolher dia';
    button.setAttribute('aria-label', label.textContent + ': ' + card.querySelector('.day-title').textContent);
    button.setAttribute('aria-expanded', String(!collapsed));
    if (collapsed) button.removeAttribute('aria-haspopup');
    else button.setAttribute('aria-haspopup', 'dialog');
  }

  function updateVisibleDays() {
    document.querySelectorAll('#days > .day-card').forEach(card => updateDayToggle(card, card.dataset.date));
  }

  const collapseDialog = document.createElement('dialog');
  collapseDialog.className = 'collapse-dialog';
  collapseDialog.setAttribute('aria-labelledby', 'collapseTitle');
  collapseDialog.setAttribute('aria-describedby', 'collapseDescription');
  collapseDialog.innerHTML = `<form class="collapse-form">
    <div class="collapse-head"><div><p class="collapse-kicker">ORGANIZAR DIAS</p><h2 id="collapseTitle">Quais dias recolher?</h2><p id="collapseDescription">Escolha como deseja organizar a visualização. Seus chamados continuam salvos.</p></div><button type="button" class="collapse-close" aria-label="Fechar">×</button></div>
    <fieldset class="collapse-options"><legend>Escolha uma opção</legend>
      <label><input type="radio" name="collapseChoice" value="one" checked><span><strong>Este dia</strong><small class="collapse-current"></small></span></label>
      <label><input type="radio" name="collapseChoice" value="all"><span><strong>Todos, exceto hoje</strong><small>Mantém hoje aberto e inclui dias fora do filtro atual.</small></span></label>
      <label><input type="radio" name="collapseChoice" value="selected"><span><strong>Escolher dias</strong><small>Selecione somente as datas que deseja recolher.</small></span></label>
    </fieldset>
    <section class="collapse-picker" hidden><label for="collapseSearch">Buscar data</label><input id="collapseSearch" type="search" inputmode="numeric" placeholder="Ex.: 26/11/2026" autocomplete="off" aria-controls="collapseDates"><p class="collapse-count" aria-live="polite"></p><div id="collapseDates" class="collapse-dates"></div></section>
    <p class="collapse-error" role="status" aria-live="polite"></p>
    <div class="collapse-actions"><button class="collapse-expand-all" type="button">Expandir todos</button><button class="collapse-cancel" type="button">Cancelar</button><button class="collapse-apply" type="submit">Recolher</button></div>
  </form>`;
  document.body.append(collapseDialog);
  const collapsePicker = collapseDialog.querySelector('.collapse-picker');
  const collapseSearch = collapseDialog.querySelector('#collapseSearch');
  const collapseList = collapseDialog.querySelector('#collapseDates');
  const collapseCount = collapseDialog.querySelector('.collapse-count');
  const collapseError = collapseDialog.querySelector('.collapse-error');
  const selectedDates = new Set();
  let currentCollapseDate = null;

  function allCallDates() { return Object.keys(records).filter(date => /^\d{4}-\d{2}-\d{2}$/.test(date)).sort().reverse(); }
  function dateLabel(date) { return new Intl.DateTimeFormat('pt-BR', {weekday:'long', day:'2-digit', month:'long', year:'numeric'}).format(new Date(date + 'T12:00:00')); }
  function updateCollapseCount() { collapseCount.textContent = `${selectedDates.size} ${selectedDates.size === 1 ? 'dia selecionado' : 'dias selecionados'}`; }
  function renderCollapseDates() {
    const query = collapseSearch.value.trim().toLocaleLowerCase('pt-BR');
    const digits = query.replace(/\D/g, '');
    const dates = allCallDates().filter(date => {
      const local = date.split('-').reverse().join('/');
      return !query || date.includes(query) || local.includes(query) || dateLabel(date).toLocaleLowerCase('pt-BR').includes(query) || (digits && local.replace(/\D/g, '').includes(digits));
    });
    collapseList.replaceChildren();
    if (!dates.length) { const empty = document.createElement('p'); empty.className = 'collapse-empty'; empty.textContent = 'Nenhuma data encontrada.'; collapseList.append(empty); }
    dates.forEach(date => {
      const label = document.createElement('label'); label.className = 'collapse-date';
      const check = document.createElement('input'); check.type = 'checkbox'; check.value = date; check.checked = selectedDates.has(date);
      check.addEventListener('change', () => { if (check.checked) selectedDates.add(date); else selectedDates.delete(date); collapseError.textContent = ''; updateCollapseCount(); });
      const text = document.createElement('span'); const name = document.createElement('strong'); name.textContent = dateLabel(date); const detail = document.createElement('small'); detail.textContent = collapsedDays.has(date) ? 'Já está recolhido' : 'Está aberto'; text.append(name, detail); label.append(check, text); collapseList.append(label);
    });
    updateCollapseCount();
  }
  function showCollapseDialog(date) {
    currentCollapseDate = date;
    collapseDialog.querySelector('.collapse-current').textContent = dateLabel(date);
    collapseDialog.querySelector('input[value="one"]').checked = true;
    selectedDates.clear(); collapseSearch.value = ''; collapsePicker.hidden = true; collapseError.textContent = '';
    collapseDialog.showModal();
    collapseDialog.querySelector('input[value="one"]').focus();
  }
  collapseDialog.querySelectorAll('input[name="collapseChoice"]').forEach(input => input.addEventListener('change', () => { collapsePicker.hidden = input.value !== 'selected'; collapseError.textContent = ''; if (!collapsePicker.hidden) renderCollapseDates(); }));
  collapseSearch.addEventListener('input', renderCollapseDates);
  collapseSearch.addEventListener('keydown', event => { if (event.key === 'Enter') event.preventDefault(); });
  collapseDialog.querySelector('.collapse-close').onclick = () => collapseDialog.close();
  collapseDialog.querySelector('.collapse-cancel').onclick = () => collapseDialog.close();
  collapseDialog.addEventListener('click', event => { if (event.target === collapseDialog) collapseDialog.close(); });
  collapseDialog.querySelector('.collapse-expand-all').onclick = () => { collapsedDays.clear(); updateVisibleDays(); collapseDialog.close(); };
  collapseDialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    const choice = collapseDialog.querySelector('input[name="collapseChoice"]:checked').value;
    if (choice === 'all') {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      collapsedDays.delete(today);
      allCallDates().forEach(date => { if (date !== today) collapsedDays.add(date); });
      updateVisibleDays(); collapseDialog.close(); return;
    }
    const dates = choice === 'selected' ? [...selectedDates] : [currentCollapseDate];
    if (!dates.length) { collapseError.textContent = 'Selecione pelo menos um dia para recolher.'; return; }
    const available = new Set(allCallDates()); dates.forEach(date => { if (available.has(date)) collapsedDays.add(date); });
    updateVisibleDays(); collapseDialog.close();
  });

  function mountDayToggle(card, date) {
    if (card.querySelector('.day-toggle')) return;
    const content = card.querySelector('.table-scroll');
    content.id = 'calls-' + date;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-toggle';
    const label = document.createElement('span');
    label.className = 'day-toggle-label';
    button.append(label);
    button.setAttribute('aria-controls', content.id);

    button.onclick = () => {
      if (collapsedDays.has(date)) { collapsedDays.delete(date); updateDayToggle(card, date); }
      else showCollapseDialog(date);
    };
    card.querySelector('.day-summary .export-button').before(button);
    updateDayToggle(card, date);
  }

  function enhanceCard(card, date) {
    if (!date) return;
    card.dataset.date = date;
    mountDayToggle(card, date);
    createMobileSortBar(card, date);
    updateDayToggle(card, date);
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
  document.getElementById('addRowButton').addEventListener('click', () => {
    collapsedDays.delete(document.getElementById('newDate').value);
  }, { capture: true });
  new MutationObserver(enhanceTables).observe(root, { childList: true });
  enhanceTables();
})();
