# FindThem Backend

Servidor Node.js para o jogo FindThem com comunicação em tempo real via Socket.io.

## Funcionalidades

- Gerenciamento de estado do jogo
- Sincronização de jogadores
- Sistema de itens e inventário
- NPCs com IA básica
- Comunicação WebSocket

## Instalação

```bash
npm install
```

## Execução

```bash
# Desenvolvimento
npm run dev

# Produção
npm start
```

## API

### WebSocket Events

#### Cliente → Servidor
- `playerMove`: Atualiza posição do jogador
- `inventoryUpdate`: Atualiza inventário do jogador

#### Servidor → Cliente
- `gameState`: Estado inicial do jogo
- `playerUpdate`: Atualização de outros jogadores
- `playerDisconnected`: Jogador desconectado
- `itemCollected`: Item coletado
- `npcsUpdate`: Atualização dos NPCs

## Estrutura

- `server.js`: Servidor principal
- `package.json`: Dependências e scripts
