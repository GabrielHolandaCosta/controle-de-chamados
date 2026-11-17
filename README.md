# Controle de Chamados

Sistema local para registrar chamados técnicos, organizar atendimentos por data e exportar relatórios em Excel.

## O que o sistema faz

- Registra atendimentos com solicitante, setor, OS, horários e status.
- Calcula a duração de cada chamado, o total diário e o tempo parado entre atendimentos.
- Filtra e ordena os chamados por data e colunas.
- Importa e exporta planilhas Excel.
- Possui login e painel administrativo para criar e gerenciar usuários.
- Salva os dados localmente no banco `data/chamados.db`.

## Como abrir

1. Instale o Node.js LTS pelo site [nodejs.org](https://nodejs.org/).
2. Dê dois cliques em `iniciar-servidor.bat`.
3. Abra `http://localhost:3000/loginadm` no navegador.

### Login de teste

- Usuário: `admin`
- Senha: `123456`

## Estrutura

```text
public/                 Telas, estilos e scripts do sistema
data/chamados.db        Banco de dados local
server.js               Servidor local
iniciar-servidor.bat    Iniciador para Windows
package.json            Configuração do Node.js
```

## Backup

Para guardar os dados, exporte os chamados em Excel e mantenha uma cópia do arquivo `data/chamados.db` com o servidor fechado.

## Licença

MIT.
