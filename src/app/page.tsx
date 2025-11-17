'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Position {
  x: number;
  y: number;
}

interface Bullet extends Position {
  id: number;
}

interface Invader extends Position {
  id: number;
  type: number;
}

interface Particle extends Position {
  id: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 30;
const INVADER_WIDTH = 30;
const INVADER_HEIGHT = 20;
const BULLET_WIDTH = 4;
const BULLET_HEIGHT = 10;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 8;
const INVADER_SPEED = 0.5;

export default function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(3);

  const playerRef = useRef<Position>({ x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2, y: GAME_HEIGHT - 60 });
  const bulletsRef = useRef<Bullet[]>([]);
  const invaderBulletsRef = useRef<Bullet[]>([]);
  const invadersRef = useRef<Invader[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const invaderDirectionRef = useRef(1);
  const invaderDropDistanceRef = useRef(0);
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const bulletIdRef = useRef(0);
  const invaderBulletIdRef = useRef(0);
  const lastInvaderShotRef = useRef(0);
  const animationIdRef = useRef<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'square') => {
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, []);

  const createParticles = (x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 10; i++) {
      newParticles.push({
        id: Date.now() + i,
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1,
        color
      });
    }
    particlesRef.current = [...particlesRef.current, ...newParticles];
  };

  const initializeInvaders = () => {
    const newInvaders: Invader[] = [];
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 11; col++) {
        newInvaders.push({
          id: row * 11 + col,
          x: col * 50 + 100,
          y: row * 40 + 50,
          type: row < 1 ? 3 : row < 3 ? 2 : 1
        });
      }
    }
    invadersRef.current = newInvaders;
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setLives(3);
    playerRef.current = { x: GAME_WIDTH / 2 - PLAYER_WIDTH / 2, y: GAME_HEIGHT - 60 };
    bulletsRef.current = [];
    invaderBulletsRef.current = [];
    particlesRef.current = [];
    invaderDirectionRef.current = 1;
    invaderDropDistanceRef.current = 0;
    initializeInvaders();
    playSound(440, 0.1, 'sine'); // Start sound
  };

  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with cyberpunk background
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Draw grid effect
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < GAME_WIDTH; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, GAME_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i < GAME_HEIGHT; i += 40) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(GAME_WIDTH, i);
      ctx.stroke();
    }

    // Update player position
    if (keysRef.current['ArrowLeft'] && playerRef.current.x > 0) {
      playerRef.current.x -= PLAYER_SPEED;
    }
    if (keysRef.current['ArrowRight'] && playerRef.current.x < GAME_WIDTH - PLAYER_WIDTH) {
      playerRef.current.x += PLAYER_SPEED;
    }

    // Draw player (cyberpunk spaceship)
    ctx.fillStyle = '#00ffff';
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 10;
    ctx.fillRect(playerRef.current.x, playerRef.current.y, PLAYER_WIDTH, PLAYER_HEIGHT);

    // Draw player details
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(playerRef.current.x + 15, playerRef.current.y - 5, 10, 5);
    ctx.shadowBlur = 0;

    // Update and draw bullets
    bulletsRef.current = bulletsRef.current.filter(bullet => {
      bullet.y -= BULLET_SPEED;

      if (bullet.y < 0) return false;

      // Draw bullet with cyberpunk effect
      ctx.fillStyle = '#00ff00';
      ctx.shadowColor = '#00ff00';
      ctx.shadowBlur = 5;
      ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
      ctx.shadowBlur = 0;

      // Check collision with invaders
      for (let i = invadersRef.current.length - 1; i >= 0; i--) {
        const invader = invadersRef.current[i];
        if (
          bullet.x < invader.x + INVADER_WIDTH &&
          bullet.x + BULLET_WIDTH > invader.x &&
          bullet.y < invader.y + INVADER_HEIGHT &&
          bullet.y + BULLET_HEIGHT > invader.y
        ) {
          createParticles(invader.x + INVADER_WIDTH / 2, invader.y + INVADER_HEIGHT / 2, '#ff00ff');
          invadersRef.current.splice(i, 1);
          setScore(prev => prev + invader.type * 10);
          playSound(200 + invader.type * 100, 0.1, 'sawtooth'); // Hit sound
          return false;
        }
      }

      return true;
    });

    // Update invaders
    let shouldDrop = false;
    invadersRef.current.forEach(invader => {
      invader.x += INVADER_SPEED * invaderDirectionRef.current;

      if (invader.x <= 0 || invader.x >= GAME_WIDTH - INVADER_WIDTH) {
        shouldDrop = true;
      }
    });

    if (shouldDrop && invaderDropDistanceRef.current === 0) {
      invaderDirectionRef.current *= -1;
      invaderDropDistanceRef.current = 20;
    }

    if (invaderDropDistanceRef.current > 0) {
      invadersRef.current.forEach(invader => {
        invader.y += 1;
      });
      invaderDropDistanceRef.current--;
    }

    // Draw invaders with cyberpunk styling
    invadersRef.current.forEach(invader => {
      const colors = ['#ff0080', '#8000ff', '#00ff80'];
      ctx.fillStyle = colors[invader.type - 1];
      ctx.shadowColor = colors[invader.type - 1];
      ctx.shadowBlur = 8;

      // Draw invader body
      ctx.fillRect(invader.x, invader.y, INVADER_WIDTH, INVADER_HEIGHT);

      // Draw invader details
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(invader.x + 5, invader.y + 5, 5, 5);
      ctx.fillRect(invader.x + 20, invader.y + 5, 5, 5);
      ctx.shadowBlur = 0;
    });

    // Invader shooting
    const now = Date.now();
    if (now - lastInvaderShotRef.current > 2000 && invadersRef.current.length > 0) {
      const randomInvader = invadersRef.current[Math.floor(Math.random() * invadersRef.current.length)];
      invaderBulletsRef.current.push({
        id: invaderBulletIdRef.current++,
        x: randomInvader.x + INVADER_WIDTH / 2 - BULLET_WIDTH / 2,
        y: randomInvader.y + INVADER_HEIGHT
      });
      lastInvaderShotRef.current = now;
    }

    // Update invader bullets
    invaderBulletsRef.current = invaderBulletsRef.current.filter(bullet => {
      bullet.y += BULLET_SPEED / 2;

      if (bullet.y > GAME_HEIGHT) return false;

      // Draw invader bullet
      ctx.fillStyle = '#ff0000';
      ctx.shadowColor = '#ff0000';
      ctx.shadowBlur = 5;
      ctx.fillRect(bullet.x, bullet.y, BULLET_WIDTH, BULLET_HEIGHT);
      ctx.shadowBlur = 0;

      // Check collision with player
      if (
        bullet.x < playerRef.current.x + PLAYER_WIDTH &&
        bullet.x + BULLET_WIDTH > playerRef.current.x &&
        bullet.y < playerRef.current.y + PLAYER_HEIGHT &&
        bullet.y + BULLET_HEIGHT > playerRef.current.y
      ) {
        createParticles(playerRef.current.x + PLAYER_WIDTH / 2, playerRef.current.y + PLAYER_HEIGHT / 2, '#00ffff');
        setLives(prev => {
          const newLives = prev - 1;
          if (newLives <= 0) {
            setGameState('gameOver');
            setHighScore(prevHigh => Math.max(prevHigh, score));
          }
          return newLives;
        });
        playSound(100, 0.3, 'triangle'); // Player hit sound
        return false;
      }

      return true;
    });

    // Update and draw particles
    particlesRef.current = particlesRef.current.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.life -= 0.02;
      particle.vx *= 0.98;
      particle.vy *= 0.98;

      if (particle.life <= 0) return false;

      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.fillRect(particle.x, particle.y, 3, 3);
      ctx.globalAlpha = 1;

      return true;
    });

    // Check win condition
    if (invadersRef.current.length === 0) {
      initializeInvaders();
      invaderDirectionRef.current *= 1.2; // Speed up next wave
      playSound(600, 0.2, 'sine'); // Wave complete sound
    }

    // Check game over (invaders reach player)
    invadersRef.current.forEach(invader => {
      if (invader.y + INVADER_HEIGHT >= playerRef.current.y) {
        setGameState('gameOver');
        setHighScore(prevHigh => Math.max(prevHigh, score));
        playSound(50, 0.5, 'sawtooth'); // Game over sound
      }
    });

    animationIdRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, playSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key] = true;

      if (e.key === ' ' && gameState === 'playing') {
        e.preventDefault();
        bulletsRef.current.push({
          id: bulletIdRef.current++,
          x: playerRef.current.x + PLAYER_WIDTH / 2 - BULLET_WIDTH / 2,
          y: playerRef.current.y
        });
        playSound(800, 0.05, 'square'); // Shoot sound
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'playing') {
      animationIdRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [gameState, gameLoop]);

  return (
    <div className="min-h-screen bg-black text-cyan-400 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-pink-600">
            SPACE INVADERS
          </h1>
          <p className="text-xl text-pink-500">CYBERPUNK EDITION</p>
        </div>

        <div className="flex justify-between mb-4 text-lg">
          <div className="text-cyan-400">SCORE: {score}</div>
          <div className="text-yellow-400">HIGH SCORE: {highScore}</div>
          <div className="text-red-400">LIVES: {lives}</div>
        </div>

        <Card className="border-cyan-500 border-2 bg-black/50 backdrop-blur-sm">
          <div className="p-4">
            <canvas
              ref={canvasRef}
              width={GAME_WIDTH}
              height={GAME_HEIGHT}
              className="w-full border border-cyan-500/30"
            />
          </div>
        </Card>

        {gameState === 'start' && (
          <div className="text-center mt-8">
            <Button
              onClick={startGame}
              className="bg-gradient-to-r from-cyan-500 to-pink-600 hover:from-cyan-600 hover:to-pink-700 text-white font-bold py-4 px-8 text-xl"
            >
              START GAME
            </Button>
            <div className="mt-4 text-sm text-cyan-300">
              <p>USE ARROW KEYS TO MOVE</p>
              <p>PRESS SPACE TO SHOOT</p>
            </div>
          </div>
        )}

        {gameState === 'gameOver' && (
          <div className="text-center mt-8">
            <h2 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h2>
            <p className="text-2xl text-cyan-400 mb-4">FINAL SCORE: {score}</p>
            <Button
              onClick={startGame}
              className="bg-gradient-to-r from-cyan-500 to-pink-600 hover:from-cyan-600 hover:to-pink-700 text-white font-bold py-4 px-8 text-xl"
            >
              PLAY AGAIN
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}