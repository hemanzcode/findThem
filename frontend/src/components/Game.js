import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import io from 'socket.io-client';
import Inventory from './Inventory';
import './Game.css';

const Game = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const characterRef = useRef(null);
  const socketRef = useRef(null);
  const animationRef = useRef(null);
  
  const [inventoryVisible, setInventoryVisible] = useState(false);
  const [inventory, setInventory] = useState([]);
  const [gameState, setGameState] = useState({
    items: [],
    npcs: [],
    players: [],
    obstacles: []
  });

  // Configurações do jogo
  const gameConfig = {
    moveSpeed: 0.12,
    runMultiplier: 1.8,
    jumpVelocity: 0.15,
    gravity: 0.008,
    mouseSensitivity: 0.002,
    cameraDistance: 5,
    cameraHeight: 2,
    mapBoundary: 95
  };

  // Estado do jogador
  const playerState = useRef({
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    canJump: false,
    isJumping: false,
    running: false,
    velocity: new THREE.Vector3(),
    cameraRotation: { yaw: 0, pitch: 0 },
    isDragging: false,
    previousMouseX: 0,
    previousMouseY: 0
  });

  // Arrays de objetos do jogo
  const gameObjects = useRef({
    items: [],
    npcs: [],
    otherPlayers: [],
    obstacles: []
  });

  useEffect(() => {
    initGame();
    initSocket();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const initSocket = () => {
    socketRef.current = io('http://localhost:5000');
    
    socketRef.current.on('gameState', (state) => {
      setGameState(state);
      gameObjects.current = {
        items: state.items,
        npcs: state.npcs,
        otherPlayers: state.players,
        obstacles: state.obstacles
      };
      createGameObjects();
    });

    socketRef.current.on('playerUpdate', (data) => {
      updateOtherPlayer(data);
    });

    socketRef.current.on('playerDisconnected', (playerId) => {
      removeOtherPlayer(playerId);
    });

    socketRef.current.on('itemCollected', (data) => {
      if (data.playerId === socketRef.current.id) {
        setInventory(data.inventory);
      }
      removeItem(data.itemId);
    });

    socketRef.current.on('npcsUpdate', (npcs) => {
      updateNPCs(npcs);
    });
  };

  const initGame = () => {
    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 0, 150);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(50, 80, 50);
    dirLight.castShadow = true;
    dirLight.shadow.camera.left = -80;
    dirLight.shadow.camera.right = 80;
    dirLight.shadow.camera.top = 80;
    dirLight.shadow.camera.bottom = -80;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Ground
    createGround();
    
    // Character
    createCharacter();

    // Event listeners
    setupEventListeners();

    // Start animation loop
    animate();
  };

  const createGround = () => {
    const groundSize = 200;
    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 100, 100);
    const groundMat = new THREE.MeshStandardMaterial({ 
      color: 0x3a8c3a,
      roughness: 0.85,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    sceneRef.current.add(ground);

    // Add terrain variation
    const vertices = groundGeo.attributes.position.array;
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i + 2] = Math.sin(vertices[i] * 0.1) * Math.cos(vertices[i + 1] * 0.1) * 1.5;
    }
    groundGeo.attributes.position.needsUpdate = true;
    groundGeo.computeVertexNormals();
  };

  const createCharacter = () => {
    const character = new THREE.Group();
    
    const skinColor = 0xffd5a8;
    const shirtColor = 0x4a90e2;
    const pantsColor = 0x2c3e50;
    const shoeColor = 0x1a1a1a;
    const hairColor = 0x3d2817;
    
    const skinMat = new THREE.MeshStandardMaterial({ 
      color: skinColor,
      roughness: 0.7,
      metalness: 0.1
    });
    const shirtMat = new THREE.MeshStandardMaterial({ 
      color: shirtColor,
      roughness: 0.8
    });
    const pantsMat = new THREE.MeshStandardMaterial({ 
      color: pantsColor,
      roughness: 0.9
    });
    const shoeMat = new THREE.MeshStandardMaterial({ 
      color: shoeColor,
      roughness: 0.7
    });
    const hairMat = new THREE.MeshStandardMaterial({ 
      color: hairColor,
      roughness: 0.95
    });
    
    // Cabeça
    const headGeo = new THREE.SphereGeometry(0.35, 32, 32);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.5;
    head.scale.set(1, 1.1, 0.95);
    head.castShadow = true;
    character.add(head);
    character.head = head;
    
    // Cabelo
    const hairTopGeo = new THREE.SphereGeometry(0.36, 32, 32);
    const hairTop = new THREE.Mesh(hairTopGeo, hairMat);
    hairTop.position.y = 1.65;
    hairTop.scale.set(1, 0.6, 0.95);
    hairTop.castShadow = true;
    character.add(hairTop);
    
    // Olhos
    const eyeGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    
    const leftEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    leftEye.position.set(-0.13, 1.55, 0.3);
    leftEye.scale.set(0.8, 1, 0.4);
    character.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeWhiteMat);
    rightEye.position.set(0.13, 1.55, 0.3);
    rightEye.scale.set(0.8, 1, 0.4);
    character.add(rightEye);
    
    // Pupilas
    const pupilGeo = new THREE.SphereGeometry(0.04, 12, 12);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x0066cc });
    
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.13, 1.55, 0.33);
    character.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.13, 1.55, 0.33);
    character.add(rightPupil);
    
    // Nariz
    const noseGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const nose = new THREE.Mesh(noseGeo, skinMat);
    nose.position.set(0, 1.45, 0.33);
    nose.scale.set(0.7, 0.8, 1.2);
    character.add(nose);
    
    // Pescoço
    const neckGeo = new THREE.CylinderGeometry(0.16, 0.18, 0.25, 16);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.175;
    neck.castShadow = true;
    character.add(neck);
    
    // Torso
    const torsoGeo = new THREE.SphereGeometry(0.45, 32, 32);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 0.7;
    torso.scale.set(1, 1.3, 0.7);
    torso.castShadow = true;
    character.add(torso);
    
    // Braços
    for (let side = -1; side <= 1; side += 2) {
      const shoulderGeo = new THREE.SphereGeometry(0.16, 16, 16);
      const shoulder = new THREE.Mesh(shoulderGeo, shirtMat);
      shoulder.position.set(side * 0.48, 1.0, 0);
      shoulder.castShadow = true;
      character.add(shoulder);
      
      const armGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.95, 16);
      const arm = new THREE.Mesh(armGeo, shirtMat);
      arm.position.set(side * 0.48, 0.4, 0);
      arm.castShadow = true;
      character.add(arm);
      
      const handGeo = new THREE.SphereGeometry(0.1, 16, 16);
      const hand = new THREE.Mesh(handGeo, skinMat);
      hand.position.set(side * 0.48, -0.08, 0);
      hand.scale.set(1, 1.3, 0.8);
      hand.castShadow = true;
      character.add(hand);
    }
    
    // Quadril
    const hipGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const hip = new THREE.Mesh(hipGeo, pantsMat);
    hip.position.y = 0.22;
    hip.scale.set(1, 0.55, 0.85);
    hip.castShadow = true;
    character.add(hip);
    
    // Pernas
    for (let side = -1; side <= 1; side += 2) {
      const legGeo = new THREE.CylinderGeometry(0.13, 0.11, 1.1, 16);
      const leg = new THREE.Mesh(legGeo, pantsMat);
      leg.position.set(side * 0.15, -0.45, 0);
      leg.castShadow = true;
      character.add(leg);
      
      const footGeo = new THREE.SphereGeometry(0.13, 16, 16);
      const foot = new THREE.Mesh(footGeo, shoeMat);
      foot.position.set(side * 0.15, -1.01, 0.08);
      foot.scale.set(0.9, 0.6, 1.5);
      foot.castShadow = true;
      character.add(foot);
    }
    
    character.position.set(0, 1.1, 0);
    sceneRef.current.add(character);
    characterRef.current = character;
  };

  const createGameObjects = () => {
    // Criar itens
    gameObjects.current.items.forEach(item => {
      if (!item.collected) {
        createItem(item);
      }
    });

    // Criar NPCs
    gameObjects.current.npcs.forEach(npc => {
      createNPC(npc);
    });

    // Criar obstáculos
    gameObjects.current.obstacles.forEach(obstacle => {
      createObstacle(obstacle);
    });
  };

  const createItem = (itemData) => {
    const itemGroup = new THREE.Group();
    
    const baseGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);
    const baseMat = new THREE.MeshStandardMaterial({ 
      color: itemData.typeData.color,
      emissive: itemData.typeData.color,
      emissiveIntensity: 0.3
    });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.025;
    itemGroup.add(base);
    
    const sphereGeo = new THREE.SphereGeometry(0.25, 16, 16);
    const sphereMat = new THREE.MeshStandardMaterial({ 
      color: itemData.typeData.color,
      emissive: itemData.typeData.color,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.8
    });
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.position.y = 0.4;
    itemGroup.add(sphere);
    
    itemGroup.position.set(itemData.x, 0, itemData.z);
    itemGroup.userData = { id: itemData.id, type: itemData.type };
    sceneRef.current.add(itemGroup);
  };

  const createNPC = (npcData) => {
    const npc = new THREE.Group();
    
    const colors = [
      { skin: 0xffd5a8, shirt: 0xff6b6b, pants: 0x4a69bd },
      { skin: 0xffdbac, shirt: 0x00d2d3, pants: 0x2c3e50 },
      { skin: 0xf5c6aa, shirt: 0x48c9b0, pants: 0x34495e },
      { skin: 0xffd0a0, shirt: 0xe74c3c, pants: 0x7f8c8d }
    ];
    
    const colorSet = colors[Math.floor(Math.random() * colors.length)];
    
    const skinMat = new THREE.MeshStandardMaterial({ color: colorSet.skin });
    const shirtMat = new THREE.MeshStandardMaterial({ color: colorSet.shirt });
    const pantsMat = new THREE.MeshStandardMaterial({ color: colorSet.pants });
    
    // Cabeça
    const headGeo = new THREE.SphereGeometry(0.35, 16, 16);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.5;
    head.castShadow = true;
    npc.add(head);
    
    // Torso
    const torsoGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 0.7;
    torso.scale.set(1, 1.3, 0.7);
    torso.castShadow = true;
    npc.add(torso);
    
    // Braços
    for (let side = -1; side <= 1; side += 2) {
      const armGeo = new THREE.CylinderGeometry(0.1, 0.09, 0.8, 8);
      const arm = new THREE.Mesh(armGeo, shirtMat);
      arm.position.set(side * 0.4, 0.5, 0);
      arm.castShadow = true;
      npc.add(arm);
    }
    
    // Pernas
    for (let side = -1; side <= 1; side += 2) {
      const legGeo = new THREE.CylinderGeometry(0.12, 0.1, 1, 8);
      const leg = new THREE.Mesh(legGeo, pantsMat);
      leg.position.set(side * 0.15, -0.4, 0);
      leg.castShadow = true;
      npc.add(leg);
    }
    
    npc.position.set(npcData.x, 1.1, npcData.z);
    npc.userData = { id: npcData.id };
    sceneRef.current.add(npc);
  };

  const createObstacle = (obstacleData) => {
    // Implementar criação de obstáculos (árvores, pedras, prédios)
    // Por simplicidade, vou criar apenas esferas representativas
    const obstacleGeo = new THREE.SphereGeometry(obstacleData.radius, 8, 8);
    const obstacleMat = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513,
      roughness: 0.9
    });
    const obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);
    obstacle.position.set(obstacleData.x, obstacleData.radius, obstacleData.z);
    obstacle.castShadow = true;
    obstacle.receiveShadow = true;
    sceneRef.current.add(obstacle);
  };

  const setupEventListeners = () => {
    const canvas = rendererRef.current.domElement;
    
    // Mouse events
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseUp);
    
    // Touch events
    canvas.addEventListener('touchstart', onTouchStart);
    canvas.addEventListener('touchend', onTouchEnd);
    canvas.addEventListener('touchmove', onTouchMove);
    
    // Keyboard events
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    
    // Window resize
    window.addEventListener('resize', onWindowResize);
  };

  const onMouseDown = (e) => {
    playerState.current.isDragging = true;
    playerState.current.previousMouseX = e.clientX;
    playerState.current.previousMouseY = e.clientY;
    rendererRef.current.domElement.style.cursor = 'grabbing';
  };

  const onMouseUp = () => {
    playerState.current.isDragging = false;
    rendererRef.current.domElement.style.cursor = 'grab';
  };

  const onMouseMove = (e) => {
    if (!playerState.current.isDragging) return;
    
    const deltaX = e.clientX - playerState.current.previousMouseX;
    const deltaY = e.clientY - playerState.current.previousMouseY;
    
    playerState.current.cameraRotation.yaw -= deltaX * gameConfig.mouseSensitivity * 2;
    playerState.current.cameraRotation.pitch -= deltaY * gameConfig.mouseSensitivity * 2;
    
    playerState.current.cameraRotation.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, playerState.current.cameraRotation.pitch));
    
    playerState.current.previousMouseX = e.clientX;
    playerState.current.previousMouseY = e.clientY;
  };

  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      playerState.current.isDragging = true;
      playerState.current.previousMouseX = e.touches[0].clientX;
      playerState.current.previousMouseY = e.touches[0].clientY;
    }
  };

  const onTouchEnd = () => {
    playerState.current.isDragging = false;
  };

  const onTouchMove = (e) => {
    if (!playerState.current.isDragging || e.touches.length !== 1) return;
    
    const deltaX = e.touches[0].clientX - playerState.current.previousMouseX;
    const deltaY = e.touches[0].clientY - playerState.current.previousMouseY;
    
    playerState.current.cameraRotation.yaw -= deltaX * gameConfig.mouseSensitivity * 2;
    playerState.current.cameraRotation.pitch -= deltaY * gameConfig.mouseSensitivity * 2;
    
    playerState.current.cameraRotation.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, playerState.current.cameraRotation.pitch));
    
    playerState.current.previousMouseX = e.touches[0].clientX;
    playerState.current.previousMouseY = e.touches[0].clientY;
    
    e.preventDefault();
  };

  const onKeyDown = (e) => {
    switch(e.code) {
      case 'KeyW': playerState.current.moveForward = true; break;
      case 'KeyS': playerState.current.moveBackward = true; break;
      case 'KeyA': playerState.current.moveLeft = true; break;
      case 'KeyD': playerState.current.moveRight = true; break;
      case 'KeyI':
        setInventoryVisible(!inventoryVisible);
        break;
      case 'Space': 
        if (playerState.current.canJump) {
          playerState.current.velocity.y = gameConfig.jumpVelocity;
          playerState.current.isJumping = true;
          playerState.current.canJump = false;
        }
        break;
      case 'ShiftLeft':
      case 'ShiftRight': playerState.current.running = true; break;
    }
  };

  const onKeyUp = (e) => {
    switch(e.code) {
      case 'KeyW': playerState.current.moveForward = false; break;
      case 'KeyS': playerState.current.moveBackward = false; break;
      case 'KeyA': playerState.current.moveLeft = false; break;
      case 'KeyD': playerState.current.moveRight = false; break;
      case 'ShiftLeft':
      case 'ShiftRight': playerState.current.running = false; break;
    }
  };

  const onWindowResize = () => {
    cameraRef.current.aspect = window.innerWidth / window.innerHeight;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(window.innerWidth, window.innerHeight);
  };

  const updateCharacter = () => {
    const speed = gameConfig.moveSpeed * (playerState.current.running ? gameConfig.runMultiplier : 1);
    const direction = new THREE.Vector3();
    
    if (playerState.current.moveForward) direction.z -= 1;
    if (playerState.current.moveBackward) direction.z += 1;
    if (playerState.current.moveLeft) direction.x -= 1;
    if (playerState.current.moveRight) direction.x += 1;
    
    if (direction.length() > 0) {
      direction.normalize();
      direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerState.current.cameraRotation.yaw);
      
      const newX = characterRef.current.position.x + direction.x * speed;
      const newZ = characterRef.current.position.z + direction.z * speed;
      
      // Verificar limites do mapa
      let canMoveX = Math.abs(newX) < gameConfig.mapBoundary;
      let canMoveZ = Math.abs(newZ) < gameConfig.mapBoundary;
      
      // Verificar colisão com obstáculos
      for (let obstacle of gameObjects.current.obstacles) {
        const dx = newX - obstacle.x;
        const dz = newZ - obstacle.z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < obstacle.radius + 0.5) {
          canMoveX = false;
          canMoveZ = false;
          break;
        }
      }
      
      if (canMoveX) characterRef.current.position.x = newX;
      if (canMoveZ) characterRef.current.position.z = newZ;
      
      const targetAngle = Math.atan2(direction.x, direction.z);
      characterRef.current.rotation.y = targetAngle;
    }
    
    playerState.current.velocity.y -= gameConfig.gravity;
    characterRef.current.position.y += playerState.current.velocity.y;
    
    if (characterRef.current.position.y <= 1.1) {
      characterRef.current.position.y = 1.1;
      playerState.current.velocity.y = 0;
      playerState.current.canJump = true;
      playerState.current.isJumping = false;
    }

    // Enviar posição para o servidor
    if (socketRef.current) {
      socketRef.current.emit('playerMove', {
        x: characterRef.current.position.x,
        y: characterRef.current.position.y,
        z: characterRef.current.position.z,
        rotation: playerState.current.cameraRotation,
        isMoving: direction.length() > 0,
        running: playerState.current.running
      });
    }
  };

  const updateCamera = () => {
    const offset = new THREE.Vector3(
      Math.sin(playerState.current.cameraRotation.yaw) * Math.cos(playerState.current.cameraRotation.pitch) * gameConfig.cameraDistance,
      Math.sin(playerState.current.cameraRotation.pitch) * gameConfig.cameraDistance + gameConfig.cameraHeight,
      Math.cos(playerState.current.cameraRotation.yaw) * Math.cos(playerState.current.cameraRotation.pitch) * gameConfig.cameraDistance
    );
    
    cameraRef.current.position.copy(characterRef.current.position).add(offset);
    cameraRef.current.lookAt(characterRef.current.position.x, characterRef.current.position.y + 0.5, characterRef.current.position.z);
  };

  const updateOtherPlayer = (data) => {
    // Implementar atualização de outros jogadores
    // Por simplicidade, não implementado neste exemplo
  };

  const removeOtherPlayer = (playerId) => {
    // Implementar remoção de outros jogadores
    // Por simplicidade, não implementado neste exemplo
  };

  const removeItem = (itemId) => {
    // Remover item da cena
    sceneRef.current.traverse((child) => {
      if (child.userData && child.userData.id === itemId) {
        sceneRef.current.remove(child);
      }
    });
  };

  const updateNPCs = (npcs) => {
    // Atualizar posições dos NPCs
    sceneRef.current.traverse((child) => {
      if (child.userData && child.userData.id) {
        const npc = npcs.find(n => n.id === child.userData.id);
        if (npc) {
          child.position.x = npc.x;
          child.position.z = npc.z;
        }
      }
    });
  };

  const animate = () => {
    animationRef.current = requestAnimationFrame(animate);
    
    updateCharacter();
    updateCamera();
    
    // Animar itens
    const time = Date.now() * 0.001;
    sceneRef.current.traverse((child) => {
      if (child.userData && child.userData.type) {
        child.rotation.y = time;
        child.position.y = Math.sin(time * 2) * 0.1;
      }
    });
    
    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  return (
    <div className="game-container">
      <div ref={mountRef} className="game-canvas" />
      {inventoryVisible && (
        <Inventory 
          inventory={inventory}
          onClose={() => setInventoryVisible(false)}
        />
      )}
    </div>
  );
};

export default Game;
