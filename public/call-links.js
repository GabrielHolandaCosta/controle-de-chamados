(() => {
  const picker = document.getElementById('callLinkDialog');
  const pickerUsers = document.getElementById('callLinkUsers');
  const confirmDialog = document.getElementById('callLinkConfirmDialog');
  const confirmName = document.getElementById('callLinkConfirmName');
  const confirmKicker = document.getElementById('callLinkConfirmKicker');
  const confirmTitle = document.getElementById('callLinkConfirmTitle');
  const confirmText = document.getElementById('callLinkConfirmText');
  const confirmButton = document.getElementById('confirmCallLink');
  if (!picker || !confirmDialog) return;

  let users = [];
  let links = {};
  let selectedCallId = null;
  let selectedUser = null;
  let selectedAction = 'link';
  let callsVersion = null;
  let checking = false;

  function linkedTo(callId) {
    return Array.isArray(links[callId]) ? links[callId] : [];
  }

  async function loadMetadata() {
    const data = await api('/api/call-links');
    users = data.users || [];
    links = data.links || {};
    enhanceRows();
  }

  function enhanceRows() {
    document.querySelectorAll('#days tbody tr').forEach(rowElement => {
      const button = rowElement.querySelector('.call-link-button');
      if (!button) return;
      const callId = rowElement.dataset.callId;
      const people = callId ? linkedTo(callId) : [];
      button.classList.toggle('is-linked', people.length > 0);
      const icon = people.length ? '✓' : '＋';
      const label = people.length
        ? `${people.length} ${people.length === 1 ? 'pessoa' : 'pessoas'}`
        : 'Vincular';
      if (button.querySelector('span').textContent !== icon) button.querySelector('span').textContent = icon;
      if (button.querySelector('b').textContent !== label) button.querySelector('b').textContent = label;
      button.title = people.length
        ? `Vinculado com ${people.map(person => person.username).join(', ')}. Clique para gerenciar ou desvincular.`
        : 'Vincular chamado a outro usuário';
      button.disabled = !callId;
    });
  }

  function renderUsers() {
    const connected = linkedTo(selectedCallId);
    const connectedIds = new Set(connected.map(user => user.id));
    if (!users.length) {
      pickerUsers.innerHTML = '<div class="call-link-empty"><b>Nenhum outro usuário disponível</b><span>Crie uma conta no painel administrativo para poder vincular.</span></div>';
      return;
    }
    pickerUsers.innerHTML = '';
    users.forEach(user => {
      const alreadyLinked = connectedIds.has(user.id);
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'call-link-user' + (alreadyLinked ? ' is-linked' : '');
      item.innerHTML = `<span class="call-link-avatar">${escapeUser(user.username.charAt(0).toUpperCase())}</span><span><b>${escapeUser(user.username)}</b><small>${alreadyLinked ? 'Recebe e sincroniza este chamado' : 'Clique para vincular'}</small></span><i>${alreadyLinked ? 'Desvincular' : 'Vincular →'}</i>`;
      item.addEventListener('click', () => {
        selectedUser = user;
        selectedAction = alreadyLinked ? 'unlink' : 'link';
        renderConfirmation();
        picker.close();
        confirmDialog.showModal();
      });
      pickerUsers.append(item);
    });
  }

  function escapeUser(value) {
    return String(value || '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  }

  function renderConfirmation() {
    const unlinking = selectedAction === 'unlink';
    const linkedPerson = unlinking ? linkedTo(selectedCallId).find(person => person.id === selectedUser.id) : null;
    const removesRecipientCopy = Boolean(linkedPerson?.canRemoveCopy);
    confirmDialog.classList.toggle('is-unlinking', unlinking);
    confirmKicker.textContent = unlinking ? 'CONFIRMAR DESVINCULAÇÃO' : 'CONFIRMAR VINCULAÇÃO';
    confirmTitle.textContent = unlinking ? 'Desvincular este chamado?' : 'Vincular este chamado?';
    confirmName.textContent = `“${selectedUser.username}”`;
    confirmText.firstChild.textContent = unlinking ? 'Quer desvincular este chamado de ' : 'Quer vincular este chamado a ';
    confirmText.lastChild.textContent = unlinking
      ? removesRecipientCopy
        ? '? O chamado continuará na sua conta e será removido da conta dessa pessoa.'
        : '? Cada pessoa continuará com sua cópia, mas as próximas alterações não serão mais sincronizadas.'
      : '? A pessoa receberá a linha completamente preenchida e as alterações ficarão sincronizadas.';
    confirmButton.textContent = unlinking ? 'Sim, desvincular' : 'Sim, vincular';
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.call-link-button');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const rowElement = button.closest('tr');
    if (!rowElement?.dataset.callId) return;
    selectedCallId = rowElement.dataset.callId;
    selectedUser = null;
    renderUsers();
    picker.showModal();
  }, true);

  confirmButton.addEventListener('click', async event => {
    event.preventDefault();
    if (!selectedCallId || !selectedUser) return;
    confirmButton.disabled = true;
    const unlinking = selectedAction === 'unlink';
    confirmButton.textContent = unlinking ? 'Desvinculando…' : 'Vinculando…';
    try {
      const result = await api('/api/call-links', {
        method: unlinking ? 'DELETE' : 'POST',
        body: JSON.stringify({ callId: selectedCallId, targetUserId: selectedUser.id })
      });
      links = result.links || links;
      confirmDialog.close();
      enhanceRows();
      document.getElementById('saveStatus').textContent = unlinking
        ? result.removedCopy
          ? `Chamado removido da conta de ${result.username} ✓`
          : `Sincronização com ${result.username} encerrada ✓`
        : `Chamado vinculado a ${result.username} ✓`;
    } catch (error) {
      document.getElementById('saveStatus').textContent = error.message;
    } finally {
      confirmButton.disabled = false;
      confirmButton.textContent = unlinking ? 'Sim, desvincular' : 'Sim, vincular';
      selectedUser = null;
      selectedAction = 'link';
    }
  });

  picker.addEventListener('close', () => {
    if (!confirmDialog.open) selectedCallId = null;
  });
  confirmDialog.addEventListener('close', () => {
    selectedUser = null;
    selectedAction = 'link';
    confirmDialog.classList.remove('is-unlinking');
    selectedCallId = null;
  });

  function editingNow() {
    const active = document.activeElement;
    return Boolean(active?.closest('#days') && active.matches('input,select,textarea')) ||
      document.getElementById('saveStatus')?.textContent.includes('Salvando');
  }

  async function checkSharedUpdates() {
    if (checking || !currentUser || currentUser.role === 'admin') return;
    checking = true;
    try {
      const data = await api('/api/calls');
      const recordsDiffer = JSON.stringify(data.records || {}) !== JSON.stringify(records);
      if (callsVersion === null && !recordsDiffer) callsVersion = data.updatedAt || null;
      else if ((recordsDiffer || data.updatedAt && data.updatedAt !== callsVersion) && !editingNow()) {
        const scrollPosition = window.scrollY;
        records = data.records || {};
        callsVersion = data.updatedAt;
        render();
        requestAnimationFrame(() => window.scrollTo({ top: scrollPosition, behavior: 'auto' }));
        document.getElementById('saveStatus').textContent = 'Atualização compartilhada recebida ✓';
      }
      const metadata = await api('/api/call-links');
      users = metadata.users || [];
      links = metadata.links || {};
      enhanceRows();
    } catch {
      // O protetor de sessão já informa quedas e atualizações do servidor.
    } finally {
      checking = false;
    }
  }

  window.addEventListener('calls:saved', event => {
    if (event.detail?.updatedAt) callsVersion = event.detail.updatedAt;
  });

  const observer = new MutationObserver(enhanceRows);
  observer.observe(document.getElementById('days'), { childList: true, subtree: true });
  loadMetadata().catch(() => {
    document.getElementById('saveStatus').textContent = 'Não foi possível carregar as vinculações.';
  });
  checkSharedUpdates();
  setInterval(checkSharedUpdates, 3000);
  addEventListener('focus', checkSharedUpdates);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkSharedUpdates();
  });
})();
