(() => {
  const originalFetch = window.fetch.bind(window);
  const draftTypes = {
    '/api/calls': { key: 'chamados-pending-calls:', property: 'records', extras: ['changedCallIds'] },
    '/api/notes': { key: 'chamados-pending-notes:', property: 'notes' }
  };
  let activeUsername = null;
  let knownInstance = null;
  let checking = false;
  let restoring = false;
  let redirecting = false;
  let overlayElement = null;
  let draftSequence = 0;
  const inFlightDrafts = new Set();

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch {}
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  function draftKey(type, username) {
    return type.key + username;
  }

  function requestDetails(input, options = {}) {
    const url = new URL(typeof input === 'string' ? input : input.url, location.origin);
    const method = String(options.method || input?.method || 'GET').toUpperCase();
    return { url, method };
  }

  function currentUsername() {
    if (activeUsername) return activeUsername;
    try {
      return typeof currentUser !== 'undefined' ? currentUser?.username : null;
    } catch {
      return null;
    }
  }

  function rememberDraft(pathname, options) {
    const type = draftTypes[pathname];
    const username = currentUsername();
    if (!type || !username || typeof options.body !== 'string') return null;
    try {
      const body = JSON.parse(options.body);
      if (!(type.property in body)) return null;
      const requestId = Date.now() + '-' + ++draftSequence;
      storageSet(draftKey(type, username), JSON.stringify({
        value: body[type.property],
        extras: Object.fromEntries((type.extras || []).map(key => [key, body[key]])),
        savedAt: Date.now(),
        requestId
      }));
      return requestId;
    } catch { return null; }
  }

  function removeDraft(pathname, requestId) {
    const type = draftTypes[pathname];
    const username = currentUsername();
    if (!type || !username || !requestId) return;
    const key = draftKey(type, username);
    try {
      const current = JSON.parse(storageGet(key));
      if (current.requestId === requestId) storageRemove(key);
    } catch {}
  }

  function getOverlay() {
    if (overlayElement || !document.body) return overlayElement;
    overlayElement = document.createElement('div');
    overlayElement.className = 'system-update-overlay';
    overlayElement.innerHTML =
      '<div class="system-update-card" role="status" aria-live="assertive">' +
        '<span class="system-update-spinner" aria-hidden="true"></span>' +
        '<div><strong>Atualizando o sistema</strong>' +
        '<p>Protegendo seus dados e verificando a conexão…</p></div>' +
      '</div>';
    document.body.append(overlayElement);
    return overlayElement;
  }

  function showOverlay(message) {
    const overlay = getOverlay();
    if (!overlay) {
      document.addEventListener('DOMContentLoaded', () => showOverlay(message), { once: true });
      return;
    }
    if (message) overlay.querySelector('p').textContent = message;
    overlay.classList.add('is-visible');
  }

  function hideOverlay() {
    overlayElement?.classList.remove('is-visible');
  }

  function redirectToLogin() {
    if (redirecting) return;
    redirecting = true;
    showOverlay('O site foi atualizado. Redirecionando para um novo login…');
    setTimeout(() => location.replace('/loginadm?reason=updated'), 250);
  }

  async function restorePending(username) {
    if (restoring) return false;
    const pending = Object.entries(draftTypes)
      .map(([pathname, type]) => {
        const raw = storageGet(draftKey(type, username));
        if (!raw) return null;
        try { return { pathname, type, draft: JSON.parse(raw) }; } catch { return null; }
      })
      .filter(item => item && !inFlightDrafts.has(item.draft.requestId));
    if (!pending.length) return false;

    restoring = true;
    showOverlay('Recuperando e salvando o que você digitou antes da atualização…');
    try {
      for (const item of pending) {
        const response = await originalFetch(item.pathname, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [item.type.property]: item.draft.value, ...(item.draft.extras || {}) })
        });
        if (response.status === 401) {
          redirectToLogin();
          return true;
        }
        if (!response.ok) throw new Error('Falha ao recuperar rascunho');
        storageRemove(draftKey(item.type, username));
      }
      hideOverlay();
      return false;
    } catch {
      showOverlay('A atualização ainda está terminando. Seus dados continuam protegidos.');
      restoring = false;
      return true;
    }
  }

  async function checkSession() {
    if (checking || restoring || redirecting) return;
    checking = true;
    try {
      const response = await originalFetch('/api/session', { cache: 'no-store' });
      if (!response.ok) throw new Error('Servidor indisponível');
      const session = await response.json();
      if (!session.user) {
        redirectToLogin();
        return;
      }
      activeUsername = session.user.username;
      if (knownInstance && session.instanceId !== knownInstance) {
        redirectToLogin();
        return;
      }
      knownInstance = session.instanceId;
      if (await restorePending(activeUsername)) return;
      hideOverlay();
    } catch {
      showOverlay('O sistema está sendo atualizado. Aguarde para continuar.');
    } finally {
      checking = false;
    }
  }

  window.fetch = async (input, options = {}) => {
    const { url, method } = requestDetails(input, options);
    const protectedRequest = url.origin === location.origin && draftTypes[url.pathname] && method === 'PUT';
    const draftRequestId = protectedRequest ? rememberDraft(url.pathname, options) : null;
    if (draftRequestId) inFlightDrafts.add(draftRequestId);
    try {
      const response = await originalFetch(input, options);
      if (response.status === 401 && url.origin === location.origin && url.pathname.startsWith('/api/')) {
        redirectToLogin();
      } else if (protectedRequest && (response.ok || response.status === 423)) {
        removeDraft(url.pathname, draftRequestId);
      }
      return response;
    } catch (error) {
      if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
        showOverlay('A conexão com o sistema caiu. Seus dados digitados estão protegidos.');
        setTimeout(checkSession, 700);
      }
      throw error;
    } finally {
      if (draftRequestId) inFlightDrafts.delete(draftRequestId);
    }
  };

  checkSession();
  setInterval(checkSession, 3000);
  addEventListener('focus', checkSession);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) checkSession();
  });
})();
