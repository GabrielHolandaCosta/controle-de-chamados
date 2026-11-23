(() => {
  const launcher = document.getElementById('helpButton');
  if (!launcher) return;

  const admin = Boolean(document.querySelector('.admin-shell'));
  const slides = admin ? [
    {
      title: 'Criar um usuário',
      controls: ['#newUsername', '#newRole', '#formButton'],
      tips: ['Preencha o nome de usuário e a senha.', 'Escolha Usuário ou Administrador.', 'Clique em Criar usuário.']
    },
    {
      title: 'Gerenciar contas',
      controls: ['.user-table thead', 'Editar', 'Excluir'],
      tips: ['Localize a conta na lista.', 'Edite o nome, a senha ou a permissão.', 'Use Excluir para remover uma conta.']
    }
  ] : [
    {
      title: 'Registrar um chamado',
      controls: ['#newDate', '#addRowButton', '[data-field=service]'],
      tips: ['Escolha a data do atendimento.', 'Toque em Adicionar chamado.', 'Preencha os campos. As alterações são salvas automaticamente.']
    },
    {
      title: 'Editar ou proteger',
      controls: ['[data-field=service]', '.row-lock', '.delete-row'],
      tips: ['No celular, toque no cartão. No PC, edite direto na tabela.', 'Use o botão de bloqueio para proteger o registro.', 'O × remove o chamado após confirmação.']
    },
    {
      title: 'Vincular e organizar chamados',
      controls: ['.call-link-button', '.row-drag'],
      tips: ['Clique em Vincular e escolha outro usuário para compartilhar o atendimento.', 'Para encerrar o compartilhamento, abra novamente e clique em Desvincular. A cópia de cada pessoa será mantida, mas deixará de sincronizar.', 'Arraste pelo ícone ⠿ para organizar sua própria lista. Essa ordem não muda para o outro usuário.']
    },
    {
      title: 'Encontrar e organizar',
      controls: ['#filterDate', '@order', '@day'],
      tips: ['Escolha uma data ou toque em Ver todas as datas.', 'No celular, abra Filtros e ordenação. No PC, use os cabeçalhos da tabela.', 'Recolha uma data pela seta no celular ou pelo botão no PC.']
    },
    {
      title: 'Conferir tempos e planilhas',
      controls: ['.day-total', '@idle', '@excel'],
      tips: ['O sistema calcula a duração pelos horários informados.', 'Ative o tempo parado nos filtros do celular ou no cabeçalho Total do PC.', 'Exporte um dia ou todos os chamados, ou importe uma planilha.']
    },
    {
      title: 'Usar notas e mudar o tema',
      controls: ['#notesLauncher', '#newNote', '#themeToggle'],
      tips: ['Abra o ícone de Notas para acessar suas anotações pessoais.', 'Crie ou edite notas. Elas ficam salvas na conta.', 'Use o ícone de sol ou lua para trocar o tema.']
    }
  ];

  const dialog = document.createElement('dialog');
  dialog.className = 'help-dialog';
  dialog.setAttribute('aria-labelledby', 'helpTitle');
  dialog.innerHTML = '<div class="help-head"><h2 id="helpTitle">Guia rápido</h2>' +
    '<button type="button" class="help-close" aria-label="Fechar ajuda">×</button></div>' +
    '<h3 class="help-slide-title" tabindex="-1"></h3><div class="help-preview" aria-hidden="true"></div>' +
    '<ol class="help-instructions"></ol><div class="help-navigation">' +
    '<button type="button" class="help-prev">Voltar</button><span class="help-progress" aria-live="polite"></span>' +
    '<button type="button" class="help-next">Próximo</button></div>';
  document.body.append(dialog);

  const title = dialog.querySelector('.help-slide-title');
  const preview = dialog.querySelector('.help-preview');
  const instructions = dialog.querySelector('.help-instructions');
  const previous = dialog.querySelector('.help-prev');
  const next = dialog.querySelector('.help-next');
  const progress = dialog.querySelector('.help-progress');
  let index = 0;
  let opened = false;
  let seen = false;
  let account = null;
  let saving = false;

  const narrow = matchMedia('(max-width: 700px)');
  const templates = ['rowTemplate', 'dayTemplate']
    .map(id => document.getElementById(id)?.content)
    .filter(Boolean);

  function findControl(selector) {
    return document.querySelector(selector) ||
      templates.map(fragment => fragment.querySelector(selector)).find(Boolean);
  }

  function makePreview(selector) {
    const examples = {
      '@order': narrow.matches ? 'Filtros e ordenação ▾' : 'SOLICITANTE ↕  ·  SETOR ↕',
      '@day': narrow.matches ? 'Segunda-feira, 16 de novembro  ⌃' : 'Recolher dia',
      '@idle': narrow.matches ? '☐ Mostrar tempo parado' : 'TOTAL  ↕  ⌄',
      '@excel': 'Exportar Excel ↓   Importar Excel ↑',
      '.day-total': 'Total do dia  03:55',
      'Editar': 'Editar',
      'Excluir': 'Excluir'
    };
    const actual = {
      '@order': narrow.matches ? '.mobile-sort-bar summary' : 'th .sort-toggle',
      '@day': '.day-toggle',
      '@idle': narrow.matches ? '.mobile-idle-option' : '.idle-toggle',
      '@excel': '.day-summary .export-button'
    };
    const sourceSelector = actual[selector] || selector;
    const original = findControl(sourceSelector);
    if ((!original || selector === '.day-total') && examples[selector]) {
      const text = document.createElement('span');
      text.textContent = examples[selector];
      return text;
    }
    if (!original) return document.createElement('span');

    if (original.matches('input, select')) {
      const label = document.createElement('div');
      const caption = document.createElement('small');
      caption.textContent = original.labels?.[0]?.textContent.trim() ||
        original.getAttribute('aria-label') || original.placeholder;
      label.append(caption);
      if (original.type === 'date') {
        const date = document.createElement('time');
        date.className = 'help-preview-date';
        date.dateTime = '2026-11-16';
        date.textContent = '16 de nov. de 2026';
        label.append(date);
        return label;
      }
      const field = original.cloneNode(true);
      field.removeAttribute('id');
      field.removeAttribute('name');
      field.removeAttribute('data-field');
      field.value = selector === '[data-field=service]' ? 'Instalação de aplicativo' : '';
      label.append(field);
      return label;
    }

    if (original.matches('thead')) {
      const table = document.createElement('table');
      table.append(original.cloneNode(true));
      return table;
    }

    const control = original.cloneNode(true);
    control.removeAttribute('id');
    control.removeAttribute('style');
    if (selector === '#notesLauncher') control.className = 'help-preview-notes';
    if (selector === '@day') {
      control.className = narrow.matches ? 'help-preview-day-arrow' : 'help-preview-day';
      control.textContent = narrow.matches ? 'Segunda-feira, 16 de novembro  ⌃' : 'Recolher dia';
    }
    if (selector === '@excel') {
      const importButton = [...document.querySelectorAll('.controls .export-button')]
        .find(button => button.textContent.includes('Importar'));
      if (importButton) {
        const pair = document.createElement('div');
        const importPreview = importButton.cloneNode(true);
        importPreview.removeAttribute('style');
        pair.className = 'help-preview-actions';
        pair.append(control, importPreview);
        return pair;
      }
    }
    if (selector === '#themeToggle') control.classList.remove('theme-toggle-fixed');
    return control;
  }

  function render() {
    const slide = slides[index];
    title.textContent = slide.title;
    preview.replaceChildren(...slide.controls.map((selector, step) => {
      const row = document.createElement('div');
      row.className = 'help-preview-row';
      const pointer = document.createElement('span');
      pointer.className = 'help-pointer';
      pointer.textContent = String(step + 1) + '›';
      const control = document.createElement('span');
      control.className = 'help-preview-control';
      control.append(makePreview(selector));
      row.append(pointer, control);
      return row;
    }));
    instructions.replaceChildren(...slide.tips.map(tip => {
      const item = document.createElement('li');
      item.textContent = tip;
      return item;
    }));
    previous.disabled = index === 0;
    next.textContent = index === slides.length - 1 ? 'Concluir' : 'Próximo';
    progress.textContent = (index + 1) + ' de ' + slides.length;
  }

  function show() {
    if (dialog.open) return;
    index = 0;
    opened = true;
    render();
    dialog.showModal();
    title.focus();
  }

  async function remember() {
    if (!account || seen || saving) return;
    saving = true;
    try {
      const response = await fetch('/api/help/seen', { method: 'PUT' });
      seen = response.ok;
    } catch {
      // A próxima abertura pode tentar gravar novamente.
    } finally {
      saving = false;
    }
  }

  preview.inert = true;
  narrow.addEventListener('change', () => { if (dialog.open) render(); });
  launcher.onclick = show;
  dialog.querySelector('.help-close').onclick = () => dialog.close();
  dialog.addEventListener('close', () => {
    launcher.focus();
    remember();
  });
  previous.onclick = () => {
    index--;
    render();
    title.focus();
  };
  next.onclick = () => {
    if (index === slides.length - 1) {
      dialog.close();
      return;
    }
    index++;
    render();
    title.focus();
  };

  fetch('/api/session')
    .then(response => response.ok ? response.json() : null)
    .then(session => {
      account = session?.user;
      seen = session?.helpSeen === true;
      if (!account || (account.role === 'admin' && !admin) || seen) return;
      if (!opened) show();
      else if (!dialog.open) remember();
    })
    .catch(() => {});
})();
