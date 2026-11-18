(() => {
  const highlightCommand = document.queryCommandSupported('hiliteColor') ? 'hiliteColor' : 'highlightColor';

  function editorRange(editor) {
    const selection = window.getSelection();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    return editor.contains(range.commonAncestorContainer) ? range : null;
  }

  function commandActive(button) {
    const command = button.dataset.command;
    if (command === 'formatBlock') {
      return String(document.queryCommandValue('formatBlock')).toLowerCase().replace(/[<>]/g, '') === 'h3';
    }
    if (command === 'hiliteColor') {
      const editor = button.closest('.note-card').querySelector('.note-body');
      const range = editorRange(editor);
      if (!range) return false;
      if (range.collapsed) return hasHighlight(range.startContainer, editor);

      const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
      let node = walker.currentNode.nodeType === Node.TEXT_NODE ? walker.currentNode : walker.nextNode();
      let hasText = false;
      for (; node; node = walker.nextNode()) {
        if (!node.length || !range.intersectsNode(node)) continue;
        if (node === range.startContainer && range.startOffset === node.length) continue;
        if (node === range.endContainer && range.endOffset === 0) continue;
        if (!hasHighlight(node, editor)) return false;
        hasText = true;
      }
      return hasText;
    }
    if (command === 'removeFormat') return false;
    return document.queryCommandState(command);
  }

  function hasHighlight(node, editor) {
    let element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    for (; element && element !== editor; element = element.parentElement) {
      if (element.style.backgroundColor === 'rgb(255, 241, 168)') return true;
    }
    return false;
  }

  function refresh(card) {
    const editor = card.querySelector('.note-body');
    if (!editorRange(editor)) return;

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

    let savedRange;
    editor.addEventListener('focusout', () => {
      savedRange = editorRange(editor)?.cloneRange();
    });

    const hint = document.createElement('p');
    hint.className = 'note-format-hint';
    hint.setAttribute('role', 'status');
    editor.before(hint);
    hint.hidden = true;

    card.querySelectorAll('.note-toolbar button').forEach(button => {
      button.type = 'button';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('mousedown', event => event.preventDefault());
      button.onclick = () => {
        const range = document.activeElement === editor ? editorRange(editor) : savedRange ?? editorRange(editor);
        editor.focus();
        if (range && editor.contains(range.commonAncestorContainer)) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        hint.hidden = true;
        const command = button.dataset.command;
        let value = button.dataset.value || null;
        if (command === 'hiliteColor') {
          const selected = editorRange(editor);
          if (!selected || selected.collapsed) {
            hint.textContent = 'Selecione o trecho que quer destacar.';
            hint.hidden = false;
            return;
          }
          value = commandActive(button) ? 'transparent' : value;
          const cssWasEnabled = document.queryCommandState('styleWithCSS');
          if (!cssWasEnabled) document.execCommand('styleWithCSS', false, 'true');
          try {
            if (!document.execCommand(highlightCommand, false, value)) {
              hint.textContent = 'Não foi possível aplicar o destaque neste navegador.';
              hint.hidden = false;
              return;
            }
          } finally {
            if (!cssWasEnabled) document.execCommand('styleWithCSS', false, 'false');
          }
        } else {
          if (command === 'formatBlock' && commandActive(button)) value = 'div';
          document.execCommand(command, false, value);
        }
        saveCard(card);
        refresh(card);
      };
    });

    ['focus', 'keyup', 'mouseup', 'input'].forEach(type => {
      editor.addEventListener(type, () => {
        if (type === 'input' || editorRange(editor)?.collapsed === false) hint.hidden = true;
        refresh(card);
      });
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
