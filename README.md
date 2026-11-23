# Controle de Chamados

Sistema web para registrar chamados técnicos, acompanhar os atendimentos por data e exportar relatórios em Excel.

**[Acessar o Controle de Chamados no Railway](https://chamados-ti.up.railway.app/)**

Entre com sua conta para consultar e registrar atendimentos. No celular, toque em um cartão para abrir os campos de edição. No computador, os chamados aparecem em tabela.

## Funcionalidades

- Registro de atendimentos com solicitante, setor, OS, horários e status.
- Cálculo de duração, total diário e tempo parado entre atendimentos.
- Filtro por data, ordenação e bloqueio de chamados contra alterações.
- Importação e exportação de planilhas Excel.
- Notas pessoais e gerenciamento de usuários pelo painel administrativo.
- Vinculação de chamados entre usuários, com a mesma linha sincronizada em tempo quase real.

## Executar localmente

1. Instale o Node.js 22.5 ou superior.
2. Na pasta do projeto, execute `npm start`. No Windows, também é possível abrir `iniciar-servidor.bat`.
3. Acesse [http://localhost:3000/loginadm](http://localhost:3000/loginadm).

O servidor usa SQLite. Na execução local, o banco fica em `data/chamados.db`. Para fazer um backup completo local, copie esse arquivo com o servidor desligado. A exportação em Excel contém os chamados.

## Licença

MIT.
