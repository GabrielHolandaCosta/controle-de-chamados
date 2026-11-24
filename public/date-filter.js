(() => {
  const from = document.getElementById('filterDate');
  const clear = document.getElementById('clearFilter');
  const block = from.closest('.control-block');
  const range = document.createElement('section');
  range.className = 'date-range';
  range.innerHTML = '<div class="date-range-header"><span>Filtrar por período</span><button type="button" class="date-range-toggle" aria-expanded="false">Escolher intervalo</button></div><div class="date-range-content" hidden><label for="rangeEnd">Até</label><input type="date" id="rangeEnd"><button type="button" class="date-range-apply">Aplicar período</button></div><div class="date-range-footer"><button type="button" class="date-range-pin" aria-pressed="false">Fixar filtro</button><span class="date-range-status" role="status" aria-live="polite"></span></div>';
  block.after(range);
  const toggle = range.querySelector('.date-range-toggle');
  const content = range.querySelector('.date-range-content');
  const end = range.querySelector('#rangeEnd');
  const pin = range.querySelector('.date-range-pin');
  const status = range.querySelector('.date-range-status');
  let activeEnd = '', pinned = null, touched = false, busy = false;
  const open = value => { content.hidden = !value; toggle.setAttribute('aria-expanded', String(value)); toggle.textContent = value ? 'Fechar intervalo' : 'Escolher intervalo'; };
  const refresh = () => {
    const active = pinned && pinned.from === from.value && pinned.to === (activeEnd || from.value);
    pin.textContent = pinned ? 'Desfixar filtro' : 'Fixar filtro';
    pin.setAttribute('aria-pressed', String(Boolean(pinned)));
    pin.disabled = busy;
    status.textContent = pinned ? (active ? 'Filtro fixado na sua conta' : 'Existe outro filtro fixado') : '';
  };
  days = () => Object.keys(records).filter(date => !from.value || (activeEnd ? date >= from.value && date <= activeEnd : date === from.value)).sort();
  from.addEventListener('change', () => { touched = true; activeEnd = ''; end.value = ''; refresh(); }, true);
  clear.addEventListener('click', () => { touched = true; activeEnd = ''; end.value = ''; refresh(); }, true);
  const today = [...document.querySelectorAll('.controls button')].find(button => button.textContent.trim() === 'Hoje');
  today?.addEventListener('click', () => { touched = true; activeEnd = ''; end.value = ''; refresh(); }, true);
  toggle.onclick = () => open(content.hidden);
  range.querySelector('.date-range-apply').onclick = () => {
    touched = true;
    if (!from.value || !end.value || end.value < from.value) { status.textContent = 'Escolha as duas datas em ordem.'; return; }
    activeEnd = end.value;
    refresh();
    if (!pinned) status.textContent = 'Período aplicado';
    render();
  };
  pin.onclick = async () => {
    touched = true;
    if (!pinned && !from.value) { status.textContent = 'Escolha uma data ou período antes de fixar.'; return; }
    busy = true; pin.disabled = true;
    try {
      const response = await fetch('/api/date-filter', { method: pinned ? 'DELETE' : 'PUT', headers: {'Content-Type':'application/json'}, ...(pinned ? {} : { body: JSON.stringify({from:from.value,to:activeEnd || from.value}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar o filtro.');
      pinned = result.pinned;
      refresh();
      if (!pinned) status.textContent = 'Filtro desfixado';
    } catch (error) { status.textContent = error.message || 'Não foi possível salvar o filtro.'; }
    finally { busy = false; pin.disabled = false; }
  };
  fetch('/api/date-filter').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(result => {
    pinned = result.pinned;
    if (pinned && !touched) { from.value = pinned.from; activeEnd = pinned.from === pinned.to ? '' : pinned.to; end.value = activeEnd; open(Boolean(activeEnd)); render(); }
    refresh();
  }).catch(() => { status.textContent = 'Não foi possível carregar o filtro fixado.'; });
})();
