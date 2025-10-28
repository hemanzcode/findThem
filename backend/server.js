const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Estado do jogo
const gameState = {
  players: new Map(),
  items: [],
  npcs: [],
  obstacles: [],
  mapBoundary: 95
};

// Tipos de itens
const itemTypes = {
  weapon: { emoji: '🔫', name: 'Arma', color: 0xff4444 },
  sword: { emoji: '⚔️', name: 'Espada', color: 0xcccccc },
  food: { emoji: '🍎', name: 'Comida', color: 0xff0000 },
  medkit: { emoji: '💊', name: 'Kit Médico', color: 0x00ff00 },
  bandage: { emoji: '🩹', name: 'Bandagem', color: 0xffcccc },
  tool: { emoji: '🔧', name: 'Ferramenta', color: 0x0088ff },
  axe: { emoji: '🪓', name: 'Machado', color: 0x8B4513 },
  pickaxe: { emoji: '⛏️', name: 'Picareta', color: 0x666666 }
};

// Inicializar itens
function initializeItems() {
  const itemTypesArray = Object.keys(itemTypes);
  const numItems = 30;
  
  for (let i = 0; i < numItems; i++) {
    const typeKey = itemTypesArray[Math.floor(Math.random() * itemTypesArray.length)];
    const itemType = itemTypes[typeKey];
    
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    
    // Verificar se não está muito perto de obstáculos
    let tooClose = false;
    for (let obs of gameState.obstacles) {
      const dist = Math.sqrt((x - obs.x) ** 2 + (z - obs.z) ** 2);
      if (dist < 3) {
        tooClose = true;
        break;
      }
    }
    
    if (tooClose) {
      i--;
      continue;
    }
    
    gameState.items.push({
      id: uuidv4(),
      type: typeKey,
      typeData: itemType,
      x: x,
      z: z,
      collected: false
    });
  }
}

// Inicializar NPCs
function initializeNPCs() {
  const npcPositions = [
    { x: -20, z: 15 },
    { x: 30, z: -30 },
    { x: -45, z: -10 },
    { x: 25, z: 40 },
    { x: -35, z: 45 },
    { x: 50, z: 10 },
    { x: -15, z: -40 },
    { x: 40, z: -20 }
  ];
  
  for (let pos of npcPositions) {
    gameState.npcs.push({
      id: uuidv4(),
      x: pos.x,
      z: pos.z,
      targetX: pos.x,
      targetZ: pos.z,
      speed: 0.02 + Math.random() * 0.03,
      changeDirectionTimer: Math.random() * 200
    });
  }
}

// Inicializar obstáculos
function initializeObstacles() {
  // Árvores
  for (let i = 0; i < 50; i++) {
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    gameState.obstacles.push({ x: x, z: z, radius: 0.8 });
  }
  
  // Pedras
  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    const rockSize = 0.5 + Math.random() * 0.8;
    gameState.obstacles.push({ x: x, z: z, radius: rockSize });
  }
  
  // Prédios
  const buildings = [
    { x: 5, z: 10, radius: 4 },
    { x: -30, z: -20, radius: 7 },
    { x: 35, z: -15, radius: 7 },
    { x: -40, z: 25, radius: 9 },
    { x: 40, z: 30, radius: 7 },
    { x: -25, z: -50, radius: 8 },
    { x: 50, z: -45, radius: 10 },
    { x: -50, z: 50, radius: 7 },
    { x: 60, z: 20, radius: 8 },
    { x: -60, z: -30, radius: 8 }
  ];
  
  gameState.obstacles.push(...buildings);
}

// Atualizar NPCs
function updateNPCs() {
  for (let npc of gameState.npcs) {
    npc.changeDirectionTimer--;
    
    if (npc.changeDirectionTimer <= 0) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 10 + Math.random() * 20;
      npc.targetX = npc.x + Math.cos(angle) * distance;
      npc.targetZ = npc.z + Math.sin(angle) * distance;
      
      npc.targetX = Math.max(-gameState.mapBoundary + 10, Math.min(gameState.mapBoundary - 10, npc.targetX));
      npc.targetZ = Math.max(-gameState.mapBoundary + 10, Math.min(gameState.mapBoundary - 10, npc.targetZ));
      
      npc.changeDirectionTimer = 100 + Math.random() * 200;
    }
    
    const dx = npc.targetX - npc.x;
    const dz = npc.targetZ - npc.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance > 0.5) {
      const moveX = (dx / distance) * npc.speed;
      const moveZ = (dz / distance) * npc.speed;
      
      npc.x += moveX;
      npc.z += moveZ;
    }
  }
}

// Verificar coleta de itens
function checkItemCollection(playerId) {
  const player = gameState.players.get(playerId);
  if (!player) return;
  
  for (let item of gameState.items) {
    if (item.collected) continue;
    
    const dx = player.x - item.x;
    const dz = player.z - item.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    
    if (distance < 1.5) {
      collectItem(playerId, item);
    }
  }
}

// Coletar item
function collectItem(playerId, item) {
  item.collected = true;
  
  const player = gameState.players.get(playerId);
  if (!player) return;
  
  // Adicionar ao inventário do jogador
  let added = false;
  for (let i = 0; i < 8; i++) {
    if (!player.inventory[i]) {
      player.inventory[i] = {
        type: item.type,
        data: item.typeData,
        count: 1
      };
      added = true;
      break;
    } else if (player.inventory[i].type === item.type && player.inventory[i].count < 99) {
      player.inventory[i].count++;
      added = true;
      break;
    }
  }
  
  if (added) {
    // Notificar todos os clientes sobre a coleta
    io.emit('itemCollected', {
      itemId: item.id,
      playerId: playerId,
      inventory: player.inventory
    });
  }
}

// Inicializar jogo
initializeObstacles();
initializeItems();
initializeNPCs();

// Socket.io events
io.on('connection', (socket) => {
  console.log('Jogador conectado:', socket.id);
  
  // Adicionar jogador
  const playerId = socket.id;
  gameState.players.set(playerId, {
    id: playerId,
    x: 0,
    y: 1.1,
    z: 0,
    rotation: { yaw: 0, pitch: 0 },
    inventory: [],
    isMoving: false,
    running: false
  });
  
  // Enviar estado inicial do jogo
  socket.emit('gameState', {
    items: gameState.items,
    npcs: gameState.npcs,
    obstacles: gameState.obstacles,
    players: Array.from(gameState.players.values())
  });
  
  // Atualizar posição do jogador
  socket.on('playerMove', (data) => {
    const player = gameState.players.get(playerId);
    if (player) {
      player.x = data.x;
      player.y = data.y;
      player.z = data.z;
      player.rotation = data.rotation;
      player.isMoving = data.isMoving;
      player.running = data.running;
      
      // Verificar coleta de itens
      checkItemCollection(playerId);
      
      // Broadcast para outros jogadores
      socket.broadcast.emit('playerUpdate', {
        playerId: playerId,
        x: data.x,
        y: data.y,
        z: data.z,
        rotation: data.rotation,
        isMoving: data.isMoving,
        running: data.running
      });
    }
  });
  
  // Atualizar inventário
  socket.on('inventoryUpdate', (inventory) => {
    const player = gameState.players.get(playerId);
    if (player) {
      player.inventory = inventory;
    }
  });
  
  // Desconexão
  socket.on('disconnect', () => {
    console.log('Jogador desconectado:', socket.id);
    gameState.players.delete(playerId);
    io.emit('playerDisconnected', playerId);
  });
});

// Loop de atualização do jogo
setInterval(() => {
  updateNPCs();
  
  // Broadcast estado dos NPCs
  io.emit('npcsUpdate', gameState.npcs);
}, 50); // 20 FPS

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
