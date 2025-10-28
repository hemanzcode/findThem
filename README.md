# FindThem - Jogo 3D Multiplayer

Um jogo 3D multiplayer desenvolvido com Node.js (backend) e React (frontend), utilizando Three.js para renderização 3D e Socket.io para comunicação em tempo real.

## Funcionalidades

- **Personagem 3D Realista**: Modelo 3D detalhado com animações
- **Movimento**: Controles WASD, pulo (espaço), corrida (shift)
- **Câmera**: Sistema de câmera com mouse/touch para olhar ao redor
- **Mapa**: Mundo 3D com obstáculos, árvores, pedras e prédios
- **Sistema de Inventário**: Coleta e gerenciamento de itens
- **NPCs**: Personagens não-jogadores que se movem pelo mapa
- **Multiplayer**: Suporte para múltiplos jogadores simultâneos
- **Comunicação em Tempo Real**: Sincronização de estado via WebSocket

## Estrutura do Projeto

```
findThem/
├── backend/                 # Servidor Node.js
│   ├── package.json
│   └── server.js           # Servidor principal com Socket.io
├── frontend/               # Cliente React
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Game.js     # Componente principal do jogo
│   │   │   ├── Game.css
│   │   │   ├── Inventory.js
│   │   │   └── Inventory.css
│   │   ├── App.js
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
└── README.md
```

## Tecnologias Utilizadas

### Backend
- **Node.js**: Runtime JavaScript
- **Express**: Framework web
- **Socket.io**: Comunicação em tempo real
- **UUID**: Geração de IDs únicos

### Frontend
- **React**: Biblioteca para interface de usuário
- **Three.js**: Biblioteca 3D para WebGL
- **Socket.io-client**: Cliente para comunicação em tempo real

## Instalação e Execução

### Pré-requisitos
- Node.js (versão 14 ou superior)
- npm ou yarn

### Backend

1. Navegue para a pasta do backend:
```bash
cd backend
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o servidor:
```bash
npm start
# ou para desenvolvimento
npm run dev
```

O servidor estará rodando em `http://localhost:5000`

### Frontend

1. Navegue para a pasta do frontend:
```bash
cd frontend
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o cliente:
```bash
npm start
```

O cliente estará rodando em `http://localhost:3000`

## Controles

- **W, A, S, D**: Movimento do personagem
- **Mouse/Touch**: Olhar ao redor (clique e arraste)
- **Shift**: Correr
- **Espaço**: Pular
- **I**: Abrir/fechar inventário

## Arquitetura

### Backend (Node.js)
- **Gerenciamento de Estado**: Mantém o estado global do jogo
- **Sincronização**: Sincroniza posições e ações dos jogadores
- **Lógica do Jogo**: Gerencia NPCs, itens e colisões
- **Comunicação**: WebSocket para comunicação em tempo real

### Frontend (React)
- **Renderização 3D**: Three.js para renderização do mundo 3D
- **Interface**: Componentes React para UI
- **Controles**: Captura de input do usuário
- **Comunicação**: Cliente Socket.io para comunicação com servidor

## Funcionalidades Implementadas

### ✅ Completas
- Estrutura básica do jogo
- Personagem 3D com animações
- Sistema de movimento e câmera
- Inventário funcional
- Comunicação cliente-servidor
- Sistema de itens
- NPCs básicos

### 🔄 Em Desenvolvimento
- Sistema de colisão mais robusto
- Múltiplos jogadores simultâneos
- Prédios detalhados
- Sistema de missões
- Chat entre jogadores

## Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.