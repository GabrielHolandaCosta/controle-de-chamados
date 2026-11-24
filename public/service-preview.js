(() => {
  const root = document.getElementById('days');
  const dialog = document.createElement('dialog');
  dialog.className = 'service-preview-dialog';
  dialog.setAttribute('aria-labelledby', 'service-preview-title');
  dialog.innerHTML = '<div class="service-preview-head"><h2 id="service-preview-title">Atendimento completo</h2><button type="button" class="service-preview-copy" aria-label="Copiar texto do atendimento" title="Copiar texto"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"/></svg></button></div><p class="service-preview-text"></p><div class="service-preview-actions"><span class="service-preview-status" role="status" aria-live="polite"></span><button type="button" class="service-preview-close">Fechar</button></div>';
  document.body.append(dialog);
  const copy = dialog.querySelector('.service-preview-copy');
  const status = dialog.querySelector('.service-preview-status');
  dialog.querySelector('.service-preview-close').onclick = () => dialog.close();
  copy.onclick = async () => {
    try {
      await navigator.clipboard.writeText(dialog.querySelector('.service-preview-text').textContent);
      status.textContent = 'Texto copiado ✓';
    } catch {
      status.textContent = 'Não foi possível copiar. Selecione o texto e copie manualmente.';
    }
  };
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  function enhance() {
    root.querySelectorAll('tbody tr').forEach(row => {
      const field = row.querySelector('[data-field="service"]');
      if (!field || row.querySelector('.service-preview-button')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'service-preview-button';
      button.setAttribute('aria-label', 'Ver atendimento completo');
      button.title = 'Ver atendimento completo';
      button.textContent = '⋯';
      const update = () => { button.hidden = !field.value.trim(); };
      button.onclick = () => { status.textContent = ''; dialog.querySelector('.service-preview-text').textContent = field.value; dialog.showModal(); };
      field.addEventListener('input', update);
      field.after(button);
      update();
    });
  }
  new MutationObserver(enhance).observe(root, { childList: true, subtree: true });
  enhance();
})();
