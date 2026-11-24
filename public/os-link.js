(() => {
  const root = document.getElementById('days');
  if (!root) return;
  const dialog = document.createElement('dialog');
  dialog.className = 'os-error-dialog';
  dialog.setAttribute('aria-labelledby', 'os-error-title');
  dialog.innerHTML = '<div class="os-error-header"><span class="os-error-icon" aria-hidden="true">!</span><div><p class="os-error-kicker">ABRIR CHAMADO</p><h2 id="os-error-title">Não foi possível abrir</h2></div></div><p class="os-error-message"></p><button type="button" class="os-error-close">Entendi</button>';
  document.body.append(dialog);
  const message = dialog.querySelector('.os-error-message');
  dialog.querySelector('.os-error-close').onclick = () => dialog.close();
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  function showError(text) { message.textContent = text; if (!dialog.open) dialog.showModal(); }

  function enhance() {
    root.querySelectorAll('td[data-label="OS"]').forEach(cell => {
      if (cell.querySelector('.os-open')) return;
      const field = cell.querySelector('[data-field="os"]');
      if (!field) return;
      cell.classList.add('os-link-cell');
      field.inputMode = 'numeric';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'os-open';
      button.title = 'Abrir chamado no Verdana';
      button.setAttribute('aria-label', 'Abrir OS no Verdana em outra aba');
      button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 5h6v6M19 5l-9 9"/><path d="M19 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4"/></svg>';
      button.onclick = () => {
        const number = field.value.trim();
        if (!/^\d{10}$/.test(number)) {
          showError(number ? 'O número da OS precisa conter exatamente 10 dígitos, apenas números. Confira e tente novamente.' : 'Informe o número da OS com 10 dígitos para abrir o chamado.');
          return;
        }
        const link = document.createElement('a');
        link.href = 'https://medradius.verdanadesk.com/front/ticket.form.php?id=' + number;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.append(link);
        link.click();
        link.remove();
      };
      field.after(button);
    });
  }
  new MutationObserver(enhance).observe(root, { childList:true, subtree:true });
  enhance();
})();
