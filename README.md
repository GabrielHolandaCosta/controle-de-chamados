# Controle de Chamados

Sistema web para registrar e acompanhar chamados técnicos, com autenticação de usuários, área administrativa e exportação de planilhas Excel formatadas.

## Recursos

- Registro de atendimentos por data, com cálculo de duração e tempo parado.
- Filtros, ordenação, importação e exportação de Excel.
- Área administrativa para criar, editar e excluir usuários.
- Dados vinculados ao usuário autenticado.

## Executar localmente

1. Instale o Node.js 22.5 ou superior.
2. Execute `npm install` e depois `npm start`.
3. Acesse `http://localhost:3000/loginadm`.

### Acesso de teste

- Usuário: `admin`
- Senha: `123456`

## Publicação

O projeto está configurado para Vercel com Neon Postgres. Na Vercel, conecte uma integração Neon e defina `DATABASE_URL`, `SESSION_SECRET` e `ADMIN_PASSWORD` nas variáveis de ambiente.

## Licença

MIT.
