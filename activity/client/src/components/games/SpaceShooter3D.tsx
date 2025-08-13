import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Sphere, Cylinder } from '@react-three/drei';
import * as THREE from 'three';

// Player spaceship component
function PlayerShip({ position, rotation }: { position: [number, number, number], rotation: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.set(position[0], position[1], position[2]);
      meshRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  });

  return (
    <group ref={meshRef}>
      {/* Ship body */}
      <Cylinder position={[0, 0, 0]} args={[0.2, 0.5, 2, 8]} rotation={[Math.PI/2, 0, 0]}>
        <meshStandardMaterial color="#00aaff" />
      </Cylinder>
      {/* Ship wings */}
      <Box position={[-0.8, 0, -0.5]} args={[0.3, 0.1, 0.8]}>
        <meshStandardMaterial color="#0088cc" />
      </Box>
      <Box position={[0.8, 0, -0.5]} args={[0.3, 0.1, 0.8]}>
        <meshStandardMaterial color="#0088cc" />
      </Box>
      {/* Engine glow */}
      <Sphere position={[0, 0, -1.2]} args={[0.15, 8, 8]}>
        <meshBasicMaterial color="#ff4400" />
      </Sphere>
    </group>
  );
}

// Enemy ship component
function EnemyShip({ 
  position, 
  onDestroy, 
  id 
}: { 
  position: [number, number, number];
  onDestroy: (id: number) => void;
  id: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [health, setHealth] = useState(1);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.z += 0.15; // Move towards player
      meshRef.current.rotation.y += 0.05; // Spin for effect
      
      // Remove if too close to player
      if (meshRef.current.position.z > 8) {
        onDestroy(id);
      }
    }
  });

  const handleHit = () => {
    setHealth(prev => {
      const newHealth = prev - 1;
      if (newHealth <= 0) {
        onDestroy(id);
      }
      return newHealth;
    });
  };

  return (
    <group ref={meshRef} position={position}>
      {/* Enemy body */}
      <Box args={[1, 0.5, 1.5]} onClick={handleHit}>
        <meshStandardMaterial color="#ff4444" />
      </Box>
      {/* Enemy weapons */}
      <Cylinder position={[-0.4, 0, 0.8]} args={[0.05, 0.05, 0.8]} rotation={[Math.PI/2, 0, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Cylinder>
      <Cylinder position={[0.4, 0, 0.8]} args={[0.05, 0.05, 0.8]} rotation={[Math.PI/2, 0, 0]}>
        <meshStandardMaterial color="#ffffff" />
      </Cylinder>
    </group>
  );
}

// Laser bullet component
function LaserBullet({ 
  position, 
  direction, 
  onHitEnemy,
  id 
}: { 
  position: [number, number, number];
  direction: [number, number, number];
  onHitEnemy: (bulletId: number) => void;
  id: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.x += direction[0] * 0.8;
      meshRef.current.position.y += direction[1] * 0.8;
      meshRef.current.position.z += direction[2] * 0.8;
      
      // Remove if too far
      if (Math.abs(meshRef.current.position.z) > 50) {
        onHitEnemy(id);
      }
    }
  });

  return (
    <Cylinder ref={meshRef} position={position} args={[0.05, 0.05, 0.5]} rotation={[Math.PI/2, 0, 0]}>
      <meshBasicMaterial color="#00ff00" />
    </Cylinder>
  );
}

// Power-up component
function PowerUp({ 
  position, 
  type,
  onCollect,
  id 
}: { 
  position: [number, number, number];
  type: 'health' | 'weapon' | 'speed';
  onCollect: (id: number, type: string) => void;
  id: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const colors = {
    health: '#ff0080',
    weapon: '#ffaa00', 
    speed: '#00ffaa'
  };
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.z += 0.1;
      meshRef.current.rotation.x += 0.1;
      meshRef.current.rotation.y += 0.1;
      
      if (meshRef.current.position.z > 5) {
        onCollect(id, 'expired');
      }
    }
  });

  return (
    <Sphere 
      ref={meshRef} 
      position={position} 
      args={[0.5, 16, 16]} 
      onClick={() => onCollect(id, type)}
    >
      <meshBasicMaterial color={colors[type]} />
    </Sphere>
  );
}

// Explosion effect
function Explosion({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [scale, setScale] = useState(0.1);
  
  useFrame(() => {
    setScale(prev => prev + 0.3);
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <Sphere ref={meshRef} position={position} args={[1, 8, 8]}>
      <meshBasicMaterial color="#ffaa00" transparent opacity={Math.max(0, 1 - scale * 0.2)} />
    </Sphere>
  );
}

// Starfield background
function Starfield() {
  const starsRef = useRef<THREE.Points>(null);
  
  const stars = React.useMemo(() => {
    const positions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    return positions;
  }, []);

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={stars.length / 3}
          array={stars}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial color="white" size={0.5} />
    </points>
  );
}

// Main game scene
function GameScene({
  playerPos,
  playerRotation,
  enemies,
  bullets,
  powerUps,
  explosions,
  onEnemyDestroy,
  onBulletHit,
  onPowerUpCollect
}: any) {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} />
      <directionalLight position={[0, 0, 10]} intensity={1} />
      
      {/* Background */}
      <Starfield />
      
      {/* Player */}
      <PlayerShip position={playerPos} rotation={playerRotation} />
      
      {/* Enemies */}
      {enemies.map((enemy: any) => (
        <EnemyShip 
          key={enemy.id} 
          id={enemy.id}
          position={[enemy.x, enemy.y, enemy.z]} 
          onDestroy={onEnemyDestroy}
        />
      ))}
      
      {/* Bullets */}
      {bullets.map((bullet: any) => (
        <LaserBullet 
          key={bullet.id} 
          id={bullet.id}
          position={[bullet.x, bullet.y, bullet.z]}
          direction={[bullet.dx, bullet.dy, bullet.dz]}
          onHitEnemy={onBulletHit}
        />
      ))}
      
      {/* Power-ups */}
      {powerUps.map((powerUp: any) => (
        <PowerUp 
          key={powerUp.id}
          id={powerUp.id} 
          position={[powerUp.x, powerUp.y, powerUp.z]}
          type={powerUp.type}
          onCollect={onPowerUpCollect}
        />
      ))}
      
      {/* Explosions */}
      {explosions.map((explosion: any) => (
        <Explosion 
          key={explosion.id}
          position={[explosion.x, explosion.y, explosion.z]}
        />
      ))}
    </>
  );
}

// Main component
export default function SpaceShooter3D({ onGameEnd }: { onGameEnd: (score: number) => void }) {
  const [playerPos, setPlayerPos] = useState<[number, number, number]>([0, 0, 0]);
  const [playerRotation, setPlayerRotation] = useState<[number, number, number]>([0, 0, 0]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameActive, setGameActive] = useState(true);
  const [enemies, setEnemies] = useState<any[]>([]);
  const [bullets, setBullets] = useState<any[]>([]);
  const [powerUps, setPowerUps] = useState<any[]>([]);
  const [explosions, setExplosions] = useState<any[]>([]);
  const [weaponLevel, setWeaponLevel] = useState(1);
  const [gameSpeed, setGameSpeed] = useState(1);

  // Controls
  useEffect(() => {
    const keys: { [key: string]: boolean } = {};
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      
      // Shooting
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        shoot();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };

    const updateMovement = () => {
      if (!gameActive) return;
      
      setPlayerPos(prev => {
        let [x, y, z] = prev;
        
        if (keys['a'] || keys['arrowleft']) x -= 0.3;
        if (keys['d'] || keys['arrowright']) x += 0.3;
        if (keys['w'] || keys['arrowup']) y += 0.3;
        if (keys['s'] || keys['arrowdown']) y -= 0.3;
        
        // Boundaries
        x = Math.max(-8, Math.min(8, x));
        y = Math.max(-4, Math.min(4, y));
        
        return [x, y, z];
      });
      
      // Update rotation for movement feel
      setPlayerRotation(prev => {
        let [rx, ry, rz] = prev;
        
        if (keys['a'] || keys['arrowleft']) rz = 0.3;
        else if (keys['d'] || keys['arrowright']) rz = -0.3;
        else rz *= 0.9;
        
        if (keys['w'] || keys['arrowup']) rx = 0.2;
        else if (keys['s'] || keys['arrowdown']) rx = -0.2;
        else rx *= 0.9;
        
        return [rx, ry, rz];
      });
    };

    const interval = setInterval(updateMovement, 16);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameActive]);

  const shoot = useCallback(() => {
    if (!gameActive) return;
    
    const bulletId = Date.now() + Math.random();
    const [x, y, z] = playerPos;
    
    setBullets(prev => [...prev, {
      id: bulletId,
      x,
      y,
      z: z - 1,
      dx: 0,
      dy: 0,
      dz: -1
    }]);
    
    // Multi-shot for higher weapon levels
    if (weaponLevel >= 2) {
      setBullets(prev => [...prev, 
        {
          id: bulletId + 0.1,
          x: x - 0.5,
          y,
          z: z - 1,
          dx: -0.2,
          dy: 0,
          dz: -1
        },
        {
          id: bulletId + 0.2,
          x: x + 0.5,
          y,
          z: z - 1,
          dx: 0.2,
          dy: 0,
          dz: -1
        }
      ]);
    }
  }, [gameActive, playerPos, weaponLevel]);

  // Spawn enemies
  useEffect(() => {
    if (!gameActive) return;
    
    const interval = setInterval(() => {
      const enemyId = Date.now() + Math.random();
      
      setEnemies(prev => [...prev, {
        id: enemyId,
        x: (Math.random() - 0.5) * 15,
        y: (Math.random() - 0.5) * 6,
        z: -30,
        health: 1
      }]);
    }, 2000 / gameSpeed);
    
    return () => clearInterval(interval);
  }, [gameActive, gameSpeed]);

  // Spawn power-ups
  useEffect(() => {
    if (!gameActive) return;
    
    const interval = setInterval(() => {
      if (Math.random() < 0.3) {
        const types = ['health', 'weapon', 'speed'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        setPowerUps(prev => [...prev, {
          id: Date.now() + Math.random(),
          x: (Math.random() - 0.5) * 12,
          y: (Math.random() - 0.5) * 5,
          z: -25,
          type
        }]);
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [gameActive]);

  // Clean up expired objects
  useEffect(() => {
    const interval = setInterval(() => {
      setBullets(prev => prev.filter(bullet => Math.abs(bullet.z) < 50));
      setEnemies(prev => prev.filter(enemy => enemy.z < 10));
      setPowerUps(prev => prev.filter(powerUp => powerUp.z < 10));
      setExplosions(prev => prev.slice(-10)); // Keep only recent explosions
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Game progression
  useEffect(() => {
    const interval = setInterval(() => {
      if (gameActive) {
        setScore(prev => prev + 10);
        setGameSpeed(prev => Math.min(prev + 0.01, 3));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [gameActive]);

  const handleEnemyDestroy = useCallback((enemyId: number) => {
    setEnemies(prev => {
      const enemy = prev.find(e => e.id === enemyId);
      if (enemy) {
        // Add explosion
        setExplosions(prevExp => [...prevExp, {
          id: Date.now() + Math.random(),
          x: enemy.x,
          y: enemy.y,
          z: enemy.z
        }]);
        setScore(prevScore => prevScore + 100);
      }
      return prev.filter(e => e.id !== enemyId);
    });
  }, []);

  const handleBulletHit = useCallback((bulletId: number) => {
    setBullets(prev => prev.filter(b => b.id !== bulletId));
  }, []);

  const handlePowerUpCollect = useCallback((powerUpId: number, type: string) => {
    if (type === 'expired') {
      setPowerUps(prev => prev.filter(p => p.id !== powerUpId));
      return;
    }
    
    setPowerUps(prev => prev.filter(p => p.id !== powerUpId));
    
    switch (type) {
      case 'health':
        setLives(prev => Math.min(prev + 1, 5));
        break;
      case 'weapon':
        setWeaponLevel(prev => Math.min(prev + 1, 3));
        break;
      case 'speed':
        setGameSpeed(prev => Math.min(prev + 0.5, 5));
        break;
    }
    
    setScore(prev => prev + 50);
  }, []);

  if (!gameActive) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-4xl font-bold mb-4">🚀 MISSION COMPLETE!</h2>
          <div className="text-2xl mb-4">Final Score: {score.toLocaleString()}</div>
          <div className="text-lg mb-8">Speed Level: {gameSpeed.toFixed(1)}x</div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-500 text-white px-8 py-4 rounded-lg font-bold hover:scale-105"
          >
            New Mission
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* HUD */}
      <div className="absolute top-4 left-4 text-white z-10 bg-black/70 p-4 rounded-lg">
        <div className="text-xl font-bold">Score: {score.toLocaleString()}</div>
        <div className="text-lg">Lives: {'🛡️'.repeat(lives)}</div>
        <div className="text-sm">Weapon Level: {weaponLevel}</div>
        <div className="text-sm">Speed: {gameSpeed.toFixed(1)}x</div>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 text-white z-10 bg-black/70 p-4 rounded-lg text-sm">
        <div className="font-bold">🚀 SPACE COMBAT</div>
        <div>WASD/Arrows: Move</div>
        <div>SPACE/Enter: Shoot</div>
        <div>🔴 Destroy red ships</div>
        <div>🟡 Collect power-ups</div>
      </div>

      {/* 3D Game Canvas */}
      <Canvas camera={{ position: [0, 0, 8], fov: 75 }}>
        <GameScene 
          playerPos={playerPos}
          playerRotation={playerRotation}
          enemies={enemies}
          bullets={bullets}
          powerUps={powerUps}
          explosions={explosions}
          onEnemyDestroy={handleEnemyDestroy}
          onBulletHit={handleBulletHit}
          onPowerUpCollect={handlePowerUpCollect}
        />
      </Canvas>
    </div>
  );
}