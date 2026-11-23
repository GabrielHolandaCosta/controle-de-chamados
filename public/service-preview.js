(() => {
  const root = document.getElementById('days');
  const dialog = document.createElement('dialog');
  dialog.className = 'service-preview-dialog';
  dialog.setAttribute('aria-labelledby', 'service-preview-title');
  dialog.innerHTML = '<h2 id="service-preview-title">Atendimento completo</h2><p class="service-preview-text"></p><button type="button" class="service-preview-close">Fechar</button>';
  document.body.append(dialog);
  dialog.querySelector('button').onclick = () => dialog.close();
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
      button.onclick = () => { dialog.querySelector('.service-preview-text').textContent = field.value; dialog.showModal(); };
      field.addEventListener('input', update);
      field.after(button);
      update();
    });
  }
  new MutationObserver(enhance).observe(root, { childList: true, subtree: true });
  enhance();
})();
