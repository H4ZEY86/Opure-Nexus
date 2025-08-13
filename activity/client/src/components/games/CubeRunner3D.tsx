import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, extend, useThree } from '@react-three/fiber';
import { Box, Sphere } from '@react-three/drei';
import * as THREE from 'three';

// Extend Three.js with custom materials
extend({ BoxGeometry: THREE.BoxGeometry, MeshBasicMaterial: THREE.MeshBasicMaterial });

// Player cube component
function PlayerCube({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <Box ref={meshRef} position={position} args={[1, 1, 1]}>
      <meshStandardMaterial color="#00ff88" />
    </Box>
  );
}

// Obstacle component
function Obstacle({ position, color = "#ff4444" }: { position: [number, number, number], color?: string }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.z += 0.2; // Move towards player
    }
  });

  return (
    <Box ref={meshRef} position={position} args={[2, 2, 1]}>
      <meshStandardMaterial color={color} />
    </Box>
  );
}

// Collectible coin component
function Coin({ position, onCollect }: { position: [number, number, number], onCollect: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.z += 0.2;
      meshRef.current.rotation.y += 0.1;
      
      // Check if coin went past player
      if (meshRef.current.position.z > 5) {
        meshRef.current.position.z = -50;
        meshRef.current.position.x = (Math.random() - 0.5) * 10;
      }
    }
  });

  return (
    <Sphere ref={meshRef} position={position} args={[0.5, 16, 16]} onClick={onCollect}>
      <meshStandardMaterial color="#ffff00" />
    </Sphere>
  );
}

// Game scene component
function GameScene({ 
  playerX, 
  playerY, 
  obstacles, 
  coins,
  onCoinCollect,
  gameSpeed 
}: { 
  playerX: number;
  playerY: number;
  obstacles: Array<{id: number, x: number, y: number, z: number}>;
  coins: Array<{id: number, x: number, y: number, z: number}>;
  onCoinCollect: (id: number) => void;
  gameSpeed: number;
}) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} />
      <directionalLight position={[0, 10, 5]} intensity={1} />
      
      {/* Player */}
      <PlayerCube position={[playerX, playerY, 0]} />
      
      {/* Obstacles */}
      {obstacles.map((obs) => (
        <Obstacle key={obs.id} position={[obs.x, obs.y, obs.z]} />
      ))}
      
      {/* Coins */}
      {coins.map((coin) => (
        <Coin 
          key={coin.id} 
          position={[coin.x, coin.y, coin.z]} 
          onCollect={() => onCoinCollect(coin.id)}
        />
      ))}
      
      {/* Ground plane */}
      <mesh position={[0, -3, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[50, 100]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      
      {/* Sky box */}
      <mesh position={[0, 20, -20]}>
        <sphereGeometry args={[50, 32, 32]} />
        <meshBasicMaterial color="#001144" side={THREE.BackSide} />
      </mesh>
    </>
  );
}

// Main game component
export default function CubeRunner3D({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [playerX, setPlayerX] = useState(0);
  const [playerY, setPlayerY] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameSpeed, setGameSpeed] = useState(1);
  const [gameActive, setGameActive] = useState(true);
  const [obstacles, setObstacles] = useState<Array<{id: number, x: number, y: number, z: number}>>([]);
  const [coins, setCoins] = useState<Array<{id: number, x: number, y: number, z: number}>>([]);

  // Game controls
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!gameActive) return;
      
      switch(event.key.toLowerCase()) {
        case 'a':
        case 'arrowleft':
          setPlayerX(prev => Math.max(prev - 1.5, -6));
          break;
        case 'd':
        case 'arrowright':
          setPlayerX(prev => Math.min(prev + 1.5, 6));
          break;
        case 'w':
        case 'arrowup':
          setPlayerY(prev => Math.min(prev + 1.5, 4));
          break;
        case 's':
        case 'arrowdown':
          setPlayerY(prev => Math.max(prev - 1.5, -2));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameActive]);

  // Spawn obstacles and coins
  useEffect(() => {
    if (!gameActive) return;

    const spawnInterval = setInterval(() => {
      // Spawn obstacles
      if (Math.random() < 0.7) {
        setObstacles(prev => [...prev, {
          id: Date.now() + Math.random(),
          x: (Math.random() - 0.5) * 12,
          y: (Math.random() - 0.5) * 4,
          z: -30
        }]);
      }

      // Spawn coins
      if (Math.random() < 0.4) {
        setCoins(prev => [...prev, {
          id: Date.now() + Math.random(),
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 3,
          z: -25
        }]);
      }
    }, 1000 / gameSpeed);

    return () => clearInterval(spawnInterval);
  }, [gameActive, gameSpeed]);

  // Game loop - move objects and check collisions
  useEffect(() => {
    if (!gameActive) return;

    const gameLoop = setInterval(() => {
      // Move obstacles
      setObstacles(prev => prev.map(obs => ({
        ...obs,
        z: obs.z + 0.3 * gameSpeed
      })).filter(obs => obs.z < 10));

      // Move coins  
      setCoins(prev => prev.map(coin => ({
        ...coin,
        z: coin.z + 0.3 * gameSpeed
      })).filter(coin => coin.z < 10));

      // Check collisions with obstacles
      setObstacles(prev => {
        const collisions = prev.filter(obs => 
          Math.abs(obs.x - playerX) < 1.5 && 
          Math.abs(obs.y - playerY) < 1.5 && 
          obs.z > -1 && obs.z < 2
        );

        if (collisions.length > 0) {
          setLives(prevLives => {
            const newLives = prevLives - 1;
            if (newLives <= 0) {
              setGameActive(false);
              onGameEnd(score);
            }
            return newLives;
          });
          return prev.filter(obs => !collisions.includes(obs));
        }
        return prev;
      });

      // Increase game speed over time
      setGameSpeed(prev => prev + 0.001);
      setScore(prev => prev + 1);
    }, 50);

    return () => clearInterval(gameLoop);
  }, [gameActive, playerX, playerY, score, gameSpeed, onGameEnd]);

  const handleCoinCollect = (coinId: number) => {
    setCoins(prev => prev.filter(coin => coin.id !== coinId));
    setScore(prev => prev + 50);
  };

  if (!gameActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-4xl font-bold mb-4">🎯 GAME OVER!</h2>
          <div className="text-2xl mb-4">Final Score: {score}</div>
          <div className="text-lg mb-8">You survived {Math.floor(score/100)} seconds!</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-purple-500 text-white px-8 py-4 rounded-lg font-bold hover:scale-105"
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* HUD */}
      <div className="absolute top-4 left-4 text-white z-10 bg-black/50 p-4 rounded-lg">
        <div className="text-xl font-bold">Score: {score}</div>
        <div className="text-lg">Lives: {'❤️'.repeat(lives)}</div>
        <div className="text-sm">Speed: {gameSpeed.toFixed(1)}x</div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 text-white z-10 bg-black/50 p-4 rounded-lg text-sm">
        <div>🎮 CONTROLS:</div>
        <div>WASD or Arrow Keys</div>
        <div>Avoid red cubes!</div>
        <div>Collect yellow coins!</div>
      </div>

      {/* 3D Game Canvas */}
      <Canvas camera={{ position: [0, 2, 8], fov: 75 }}>
        <GameScene 
          playerX={playerX}
          playerY={playerY}
          obstacles={obstacles}
          coins={coins}
          onCoinCollect={handleCoinCollect}
          gameSpeed={gameSpeed}
        />
      </Canvas>
    </div>
  );
}