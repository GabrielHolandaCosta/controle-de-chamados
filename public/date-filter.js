(() => {
  const from = document.getElementById('filterDate');
  const clear = document.getElementById('clearFilter');
  const today = [...document.querySelectorAll('.controls button')].find(button => button.textContent.trim() === 'Hoje');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'date-range-toggle';
  toggle.textContent = 'Período';
  toggle.setAttribute('aria-haspopup', 'dialog');
  (today || from.closest('.control-block')).after(toggle);

  const dialog = document.createElement('dialog');
  dialog.className = 'date-range-dialog';
  dialog.setAttribute('aria-labelledby', 'rangeTitle');
  dialog.innerHTML = '<div class="date-range-head"><div><p class="date-range-eyebrow">FILTRAR CHAMADOS</p><h2 id="rangeTitle">Escolher período</h2></div><button type="button" class="date-range-close" aria-label="Fechar">×</button></div><p class="date-range-description">Selecione as datas de início e fim para ver os atendimentos desse intervalo.</p><div class="date-range-fields"><label for="rangeStart">Data inicial<input id="rangeStart" type="date"></label><label for="rangeEnd">Data final<input id="rangeEnd" type="date"></label></div><div class="date-range-pin-box"><div><strong>Manter este filtro</strong><p>Deixe o período fixado na sua conta para encontrá-lo quando voltar.</p></div><button type="button" class="date-range-pin" aria-pressed="false">Fixar filtro</button></div><p class="date-range-status" role="status" aria-live="polite"></p><div class="date-range-actions"><button type="button" class="date-range-cancel">Cancelar</button><button type="button" class="date-range-apply">Aplicar período</button></div>';
  document.body.append(dialog);
  const start = dialog.querySelector('#rangeStart');
  const end = dialog.querySelector('#rangeEnd');
  const pin = dialog.querySelector('.date-range-pin');
  const status = dialog.querySelector('.date-range-status');
  let activeEnd = '', pinned = null, touched = false, busy = false;
  const refresh = () => {
    pin.textContent = pinned ? 'Desfixar filtro' : 'Fixar filtro';
    pin.setAttribute('aria-pressed', String(Boolean(pinned)));
    pin.disabled = busy;
  };
  const valid = () => {
    if (!start.value || !end.value || start.value > end.value) {
      status.textContent = 'Escolha as duas datas em ordem: início antes do fim.';
      return false;
    }
    return true;
  };
  const apply = () => { from.value = start.value; activeEnd = start.value === end.value ? '' : end.value; touched = true; render(); };
  days = () => Object.keys(records).filter(date => !from.value || (activeEnd ? date >= from.value && date <= activeEnd : date === from.value)).sort();
  from.addEventListener('change', () => { touched = true; activeEnd = ''; }, true);
  clear.addEventListener('click', () => { touched = true; activeEnd = ''; }, true);
  today?.addEventListener('click', () => { touched = true; activeEnd = ''; }, true);
  toggle.onclick = () => { start.value = from.value; end.value = activeEnd || from.value; status.textContent = pinned ? 'Há um filtro fixado na sua conta.' : ''; refresh(); dialog.showModal(); };
  dialog.querySelector('.date-range-close').onclick = () => dialog.close();
  dialog.querySelector('.date-range-cancel').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector('.date-range-apply').onclick = () => { if (!valid()) return; apply(); dialog.close(); };
  pin.onclick = async () => {
    if (busy || (!pinned && !valid())) return;
    touched = true; busy = true; refresh();
    try {
      const response = await fetch('/api/date-filter', { method: pinned ? 'DELETE' : 'PUT', headers: {'Content-Type':'application/json'}, ...(pinned ? {} : { body: JSON.stringify({from:start.value,to:end.value}) }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Não foi possível salvar o filtro.');
      pinned = result.pinned;
      if (pinned) { apply(); status.textContent = 'Período aplicado e fixado na sua conta.'; }
      else status.textContent = 'Filtro desfixado. O período continua aplicado nesta tela.';
    } catch (error) { status.textContent = error.message || 'Não foi possível salvar o filtro.'; }
    finally { busy = false; refresh(); }
  };
  fetch('/api/date-filter').then(response => { if (!response.ok) throw new Error(); return response.json(); }).then(result => {
    pinned = result.pinned;
    if (pinned && !touched) { from.value = pinned.from; activeEnd = pinned.from === pinned.to ? '' : pinned.to; render(); }
    refresh();
  }).catch(() => { status.textContent = 'Não foi possível carregar o filtro fixado.'; });
})();
