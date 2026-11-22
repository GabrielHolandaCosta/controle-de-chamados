(() => {
  const launcher = document.getElementById('helpButton');
  if (!launcher) return;

  const admin = Boolean(document.querySelector('.admin-shell'));
  const slides = admin ? [
    {
      title: 'Criar um usuário',
      controls: ['Usuário e senha', 'Permissão', 'Criar usuário'],
      tips: ['Preencha o nome de usuário e a senha.', 'Escolha Usuário ou Administrador.', 'Clique em Criar usuário.']
    },
    {
      title: 'Gerenciar contas',
      controls: ['Contas criadas', 'Editar', 'Excluir'],
      tips: ['Localize a conta na lista.', 'Edite o nome, a senha ou a permissão.', 'Use Excluir para remover uma conta.']
    }
  ] : [
    {
      title: 'Registrar um chamado',
      controls: ['Registrar atendimento para · 22/11/2026', '+ Adicionar chamado', 'Descrição, solicitante, setor, horários e OS'],
      tips: ['Escolha a data do atendimento.', 'Toque em Adicionar chamado.', 'Preencha os campos. As alterações são salvas automaticamente.']
    },
    {
      title: 'Editar ou proteger',
      controls: ['Instalação de aplicativo  ⌄', 'Bloquear chamado  ○', 'Remover atendimento  ×'],
      tips: ['No celular, toque no cartão. No PC, edite direto na tabela.', 'Use o botão de bloqueio para proteger o registro.', 'O × remove o chamado após confirmação.']
    },
    {
      title: 'Encontrar e organizar',
      controls: ['Filtrar por data', 'Filtros e ordenação  ▾', 'Recolher dia  ⌃'],
      tips: ['Escolha uma data ou toque em Ver todas as datas.', 'No celular, abra Filtros e ordenação. No PC, use os cabeçalhos da tabela.', 'Recolha uma data pela seta no celular ou pelo botão no PC.']
    },
    {
      title: 'Conferir tempos e planilhas',
      controls: ['Total do dia · 03:55', 'Mostrar tempo parado', 'Exportar Excel ↓   Importar Excel ↑'],
      tips: ['O sistema calcula a duração pelos horários informados.', 'Ative o tempo parado nos filtros do celular ou no cabeçalho Total do PC.', 'Exporte um dia ou todos os chamados, ou importe uma planilha.']
    },
    {
      title: 'Usar notas e mudar o tema',
      controls: ['Notas', '+ Nova nota', 'Tema claro ou escuro  ☾'],
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

  function render() {
    const slide = slides[index];
    title.textContent = slide.title;
    preview.replaceChildren(...slide.controls.map((text, step) => {
      const row = document.createElement('div');
      row.className = 'help-preview-row';
      const pointer = document.createElement('span');
      pointer.className = 'help-pointer';
      pointer.textContent = String(step + 1) + '›';
      const control = document.createElement('span');
      control.className = 'help-preview-control' + (step === 1 ? ' is-primary' : '');
      control.textContent = text;
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
