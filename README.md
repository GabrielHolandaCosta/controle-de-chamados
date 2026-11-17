# Controle de Chamados

Sistema web para registrar e acompanhar chamados técnicos, com autenticação de usuários, área administrativa e exportação de planilhas Excel formatadas.

## Recursos

- Registro de atendimentos por data.
- Cálculo automático do tempo de cada chamado e dos totais diários.
- Filtro e ordenação dos registros.
- Importação e exportação de planilhas Excel.
- Área administrativa para criar, editar e excluir usuários.
- Dados vinculados ao usuário autenticado.

## Estrutura do projeto

```text
controle-de-chamados/
├── public/                 # Telas e arquivos visuais do sistema
│   ├── assets/css/          # Estilos
│   ├── assets/js/           # Scripts do navegador
│   ├── index.html           # Tela de chamados
│   ├── loginadm.html        # Tela de login
│   └── admin.html           # Painel administrativo
├── data/                    # Banco local (não enviado ao GitHub)
├── server.js                # Servidor e API
├── package.json             # Configuração do Node.js
└── iniciar-servidor.bat     # Iniciador para Windows
```

## Como executar localmente

1. Instale o Node.js 22.5 ou superior pelo [site oficial](https://nodejs.org/).
2. Execute `npm start` na pasta do projeto, ou abra `iniciar-servidor.bat`.
3. Acesse `http://localhost:3000/loginadm`.

### Acesso de teste

- Usuário: `admin`
- Senha: `123456`

O administrador é direcionado ao painel de contas. Usuários comuns acessam somente a área de chamados.

## GitHub e publicação na Vercel

Você pode enviar toda esta pasta ao GitHub. O arquivo `.gitignore` impede que o banco local e dados sensíveis sejam publicados.

A Vercel não mantém arquivos SQLite locais de forma persistente. Portanto, para publicar o sistema e permitir o acesso de qualquer computador, substitua o banco local por um banco hospedado, como Neon, Supabase ou Vercel Postgres.

Depois de configurar um banco hospedado e suas variáveis de ambiente, publique o repositório no GitHub e importe-o na Vercel. Não envie a pasta `data/` nem arquivos `.db` ao repositório.

> O banco atual funciona para uso local. Para funcionar na Vercel com dados permanentes e acesso por qualquer computador, a próxima etapa é conectar o projeto a um banco hospedado.

## Licença

Este projeto utiliza a licença MIT.
