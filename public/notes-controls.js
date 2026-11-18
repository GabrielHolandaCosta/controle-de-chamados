(() => {
  function commandActive(button) {
    const command = button.dataset.command;
    if (command === 'formatBlock') {
      return String(document.queryCommandValue('formatBlock')).toLowerCase().replace(/[<>]/g, '') === 'h3';
    }
    if (command === 'hiliteColor') {
      const color = String(document.queryCommandValue('hiliteColor')).toLowerCase().replace(/\s/g, '');
      return color.includes('255,241,168') || color === '#fff1a8';
    }
    if (command === 'removeFormat') return false;
    return document.queryCommandState(command);
  }

  function refresh(card) {
    const editor = card.querySelector('.note-body');
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || !editor.contains(selection.anchorNode)) return;

    card.querySelectorAll('.note-toolbar button').forEach(button => {
      let active = false;
      try { active = commandActive(button); } catch {}
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function saveCard(card) {
    const note = notes.find(item => item.id === card.dataset.id);
    if (!note) return;
    note.title = card.querySelector('.note-title').value.trim() || 'Sem título';
    note.body = card.querySelector('.note-body').innerHTML;
    note.updatedAt = Date.now();
    card.querySelector('.note-bottom > span').textContent = 'Atualizada às ' + formattedTime(note.updatedAt);
    scheduleSave();
  }

  function enhance(card) {
    if (card.dataset.controlsReady) return;
    card.dataset.controlsReady = 'true';
    card.draggable = false;

    const editor = card.querySelector('.note-body');
    const dragHandle = card.querySelector('.note-drag');
    if (dragHandle) dragHandle.draggable = true;

    card.querySelectorAll('.note-toolbar button').forEach(button => {
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('mousedown', event => event.preventDefault());
      button.onclick = () => {
        editor.focus();
        let value = button.dataset.value || null;
        if (button.dataset.command === 'formatBlock' && commandActive(button)) value = 'div';
        document.execCommand(button.dataset.command, false, value);
        saveCard(card);
        refresh(card);
      };
    });

    ['focus', 'keyup', 'mouseup', 'input'].forEach(type => {
      editor.addEventListener(type, () => refresh(card));
    });
  }

  const observer = new MutationObserver(() => {
    document.querySelectorAll('.note-card').forEach(enhance);
  });

  observer.observe(document.getElementById('notesList'), { childList: true });
  document.querySelectorAll('.note-card').forEach(enhance);
  document.addEventListener('selectionchange', () => {
    const selection = window.getSelection();
    const node = selection?.anchorNode;
    const card = (node?.nodeType === Node.TEXT_NODE ? node.parentElement : node)?.closest?.('.note-card');
    if (card) refresh(card);
  });
})();
