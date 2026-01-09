'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { calculateScore, getZoneClipPaths, ZONE_SIZE } from './lib/gameConfig';
import { getRandomPrompt } from './lib/prompts';

// Get clip paths for zone rendering
const zoneClipPaths = getZoneClipPaths(ZONE_SIZE);

type GamePhase = 'join' | 'waiting' | 'boss-input' | 'guessing' | 'revealed';

interface GameState {
  gameId: string;
  players: { id: string; name: string }[];
  round: number;
  scores: { [playerId: string]: number };
  bossId: string;
  targetAngle: number;
  scale: { left: string; right: string } | null;
  hint: string | null;
  needleAngle: number | null;
  phase: 'waiting' | 'boss-input' | 'guessing' | 'revealed';
  chat: { sender: string; message: string }[];
  lastUpdate: number;
}

export default function Home() {
  // Player state
  const [playerId] = useState(() => Math.random().toString(36).substring(2, 10));
  const [playerName, setPlayerName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  // Game state
  const [phase, setPhase] = useState<GamePhase>('join');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [needleAngle, setNeedleAngle] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Boss inputs
  const [scaleLeft, setScaleLeft] = useState('');
  const [scaleRight, setScaleRight] = useState('');
  const [hint, setHint] = useState('');

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const chatMessagesRef = useRef<HTMLDivElement>(null);

  // Dial ref
  const dialContainerRef = useRef<HTMLDivElement>(null);

  // Polling for game state
  useEffect(() => {
    if (!gameCode || phase === 'join') return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/game/${gameCode}`);
        if (res.ok) {
          const state: GameState = await res.json();
          setGameState(state);

          if (state.players.length < 2) {
            setPhase('waiting');
          } else if (state.phase === 'boss-input') {
            setPhase('boss-input');
          } else if (state.phase === 'guessing') {
            setPhase('guessing');
          } else if (state.phase === 'revealed') {
            setPhase('revealed');
          }
        }
      } catch (e) {
        console.error('Poll error:', e);
      }
    };

    poll();
    const interval = setInterval(poll, 1000);
    return () => clearInterval(interval);
  }, [gameCode, phase]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [gameState?.chat]);

  const createGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      const res = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setGameCode(data.gameId);
        setPhase('waiting');
      }
    } catch {
      setError('Failed to create game');
    }
  };

  const joinGame = async () => {
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!joinCode.trim()) {
      setError('Please enter a game code');
      return;
    }

    try {
      const res = await fetch(`/api/game/${joinCode.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setGameCode(joinCode.toUpperCase());
        setPhase('waiting');
      }
    } catch {
      setError('Failed to join game');
    }
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameCode);
  };

  const submitHint = async () => {
    if (!scaleLeft.trim() || !scaleRight.trim()) {
      alert('Please enter both ends of the scale');
      return;
    }
    if (!hint.trim()) {
      alert('Please enter a hint');
      return;
    }

    try {
      await fetch(`/api/game/${gameCode}/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          scale: { left: scaleLeft.trim(), right: scaleRight.trim() },
          hint: hint.trim(),
        }),
      });
    } catch (e) {
      console.error('Failed to submit hint:', e);
    }
  };

  const submitGuess = async () => {
    try {
      await fetch(`/api/game/${gameCode}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, needleAngle }),
      });
    } catch (e) {
      console.error('Failed to submit guess:', e);
    }
  };

  const nextRound = async () => {
    try {
      await fetch(`/api/game/${gameCode}/next`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      });
      setScaleLeft('');
      setScaleRight('');
      setHint('');
      setNeedleAngle(0);
    } catch (e) {
      console.error('Failed to start next round:', e);
    }
  };

  const sendChat = async () => {
    if (!chatMessage.trim()) return;

    try {
      await fetch(`/api/game/${gameCode}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, sender: playerName, message: chatMessage.trim() }),
      });
      setChatMessage('');
    } catch (e) {
      console.error('Failed to send chat:', e);
    }
  };

  // Needle drag handlers - improved tracking
  const updateNeedleFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!dialContainerRef.current) return;

    const rect = dialContainerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height; // Bottom center of the container

    const dx = clientX - centerX;
    const dy = centerY - clientY;

    // Calculate angle in degrees from vertical
    let angle = Math.atan2(dx, dy) * (180 / Math.PI);

    // Clamp to valid range (-90 to 90)
    angle = Math.max(-90, Math.min(90, angle));

    setNeedleAngle(angle);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (phase !== 'guessing' || isBoss) return;
    setIsDragging(true);
    updateNeedleFromEvent(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    updateNeedleFromEvent(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (phase !== 'guessing' || isBoss) return;
    e.preventDefault();
    setIsDragging(true);
    updateNeedleFromEvent(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    updateNeedleFromEvent(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Trigger confetti
  useEffect(() => {
    if (phase === 'revealed' && gameState?.needleAngle !== null && gameState?.needleAngle !== undefined) {
      const points = calculateScore(gameState.needleAngle, gameState.targetAngle);
      if (points > 0) {
        // More extreme particle counts: 2pts=30, 3pts=80, 4pts=200
        const particleCounts: Record<number, number> = { 2: 30, 3: 80, 4: 200 };

        confetti({
          particleCount: particleCounts[points] || 30,
          spread: 50 + points * 25,
          origin: { y: 0.6 },
        });

        if (points === 4) {
          // Two extra bursts for bullseye
          setTimeout(() => {
            confetti({
              particleCount: 150,
              spread: 120,
              origin: { x: 0.3, y: 0.5 },
            });
          }, 150);
          setTimeout(() => {
            confetti({
              particleCount: 150,
              spread: 120,
              origin: { x: 0.7, y: 0.5 },
            });
          }, 300);
        }
      }
    }
  }, [phase, gameState?.needleAngle, gameState?.targetAngle]);

  // Helpers
  const isBoss = gameState?.bossId === playerId;
  const opponent = gameState?.players.find(p => p.id !== playerId);
  const me = gameState?.players.find(p => p.id === playerId);

  // Only show needle to guesser during guessing, or to everyone during reveal
  const showNeedle = phase === 'revealed' || (phase === 'guessing' && !isBoss);
  const displayNeedleAngle = phase === 'revealed' && gameState?.needleAngle !== null
    ? gameState?.needleAngle ?? needleAngle
    : needleAngle;

  const showTarget = (isBoss && phase !== 'revealed') || phase === 'revealed';

  let points = 0;
  if (phase === 'revealed' && gameState?.needleAngle !== null && gameState?.needleAngle !== undefined) {
    points = calculateScore(gameState.needleAngle, gameState.targetAngle);
  }

  // Determine whose turn it is
  const isMyTurn = (phase === 'boss-input' && isBoss) || (phase === 'guessing' && !isBoss);

  return (
    <main className="container">
      {/* Join Screen */}
      {phase === 'join' && (
        <div className="screen active">
          <h1>Wavelength</h1>
          <div className="join-container">
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              onKeyPress={(e) => e.key === 'Enter' && createGame()}
            />
            <button onClick={createGame}>Create Game</button>
            <div className="divider">or</div>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter game code"
              maxLength={6}
              onKeyPress={(e) => e.key === 'Enter' && joinGame()}
            />
            <button onClick={joinGame}>Join Game</button>
          </div>
          <p className="error">{error}</p>
        </div>
      )}

      {/* Waiting Screen */}
      {phase === 'waiting' && (
        <div className="screen active">
          <h1>Wavelength</h1>
          <p>Waiting for another player...</p>
          <div className="game-code-display">
            <span>Game Code:</span>
            <strong>{gameCode}</strong>
            <button onClick={copyGameCode}>Copy</button>
          </div>
        </div>
      )}

      {/* Game Screen */}
      {(phase === 'boss-input' || phase === 'guessing' || phase === 'revealed') && gameState && (
        <div className="screen active game-screen">
          <div className="game-header">
            <div className="player-info">
              <span className={`player-name ${isMyTurn ? 'your-turn' : ''}`}>
                {me?.name || 'You'}
              </span>
              <span className="score">{gameState.scores[playerId] || 0}</span>
            </div>
            <div>Round {gameState.round}</div>
            <div className="player-info">
              <span className={`player-name ${!isMyTurn && phase !== 'revealed' ? 'your-turn' : ''}`}>
                {opponent?.name || 'Opponent'}
              </span>
              <span className="score">{opponent ? gameState.scores[opponent.id] || 0 : 0}</span>
            </div>
          </div>

          {/* Always show scale when available */}
          {gameState.scale && (
            <div className="scale-display">
              <span className="scale-label">{gameState.scale.left}</span>
              <span className="scale-label">{gameState.scale.right}</span>
            </div>
          )}

          <div
            ref={dialContainerRef}
            className="dial-container"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div className="dial">
              <div
                className={`target-zone ${showTarget ? '' : 'hidden'}`}
                style={{ transform: `rotate(${gameState.targetAngle}deg)` }}
              >
                <div className="zone zone-2-left" style={{ clipPath: zoneClipPaths.zone2Left }}></div>
                <div className="zone zone-3-left" style={{ clipPath: zoneClipPaths.zone3Left }}></div>
                <div className="zone zone-4" style={{ clipPath: zoneClipPaths.zone4 }}></div>
                <div className="zone zone-3-right" style={{ clipPath: zoneClipPaths.zone3Right }}></div>
                <div className="zone zone-2-right" style={{ clipPath: zoneClipPaths.zone2Right }}></div>
              </div>
            </div>
            <div
              className={`needle ${showNeedle ? '' : 'hidden'}`}
              style={{ transform: `translateX(-50%) rotate(${displayNeedleAngle}deg)` }}
            ></div>
            <div className="dial-center"></div>
          </div>

          {gameState.hint && (
            <div className="hint-display">
              <span>Hint: </span>
              <span className="hint-text">{gameState.hint}</span>
            </div>
          )}

          {/* Clue Giver Panel (boss-input, is boss) */}
          {phase === 'boss-input' && isBoss && (
            <div className="panel">
              <h3>Your Turn to Give Clues!</h3>
              <p>Create a scale and give a hint based on where the target is.</p>
              <button
                onClick={() => {
                  const prompt = getRandomPrompt();
                  setScaleLeft(prompt.left);
                  setScaleRight(prompt.right);
                }}
                style={{ fontSize: '14px', marginBottom: '10px', background: '#555', color: '#fff' }}
              >
                Random Scale 🎲
              </button>
              <div className="input-group">
                <input
                  type="text"
                  value={scaleLeft}
                  onChange={(e) => setScaleLeft(e.target.value)}
                  placeholder="Left (e.g. Cold)"
                />
                <span>↔</span>
                <input
                  type="text"
                  value={scaleRight}
                  onChange={(e) => setScaleRight(e.target.value)}
                  placeholder="Right (e.g. Hot)"
                />
              </div>
              <input
                type="text"
                className="hint-input"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
                placeholder="Your hint (e.g. Coffee)"
              />
              <button onClick={submitHint}>Submit</button>
            </div>
          )}

          {/* Waiting for Clue Giver */}
          {phase === 'boss-input' && !isBoss && (
            <div className="panel">
              <p>Waiting for {opponent?.name || 'opponent'} to give clues...</p>
            </div>
          )}

          {/* Guesser Panel */}
          {phase === 'guessing' && !isBoss && (
            <div className="panel">
              <h3>Your Turn to Guess!</h3>
              <p>Drag the needle to where you think the target is.</p>
              <button onClick={submitGuess}>Submit Guess</button>
            </div>
          )}

          {/* Waiting for Guesser */}
          {phase === 'guessing' && isBoss && (
            <div className="panel">
              <p>Waiting for {opponent?.name || 'opponent'} to guess...</p>
            </div>
          )}

          {/* Result Panel */}
          {phase === 'revealed' && (
            <div className="panel">
              <h3 className="result-title">
                {points === 4 ? 'Bullseye!' :
                  points === 3 ? 'Great guess!' :
                    points === 2 ? 'Not bad!' : 'Missed!'}
              </h3>
              <p className="result-points">+{points} points</p>
              <button onClick={nextRound}>Next Round</button>
            </div>
          )}
        </div>
      )}

      {/* Chat Toggle */}
      {phase !== 'join' && (
        <button className="chat-toggle" onClick={() => setChatOpen(!chatOpen)}>
          Chat
        </button>
      )}

      {/* Chat Modal */}
      {phase !== 'join' && (
        <div className={`chat-modal ${chatOpen ? '' : 'hidden'}`}>
          <div className="modal-header">
            <h3>Chat</h3>
            <button className="close-btn" onClick={() => setChatOpen(false)}>×</button>
          </div>
          <div className="chat-messages" ref={chatMessagesRef}>
            {gameState?.chat.map((msg, i) => (
              <div key={i} className="chat-message">
                <span className="sender" style={{ color: msg.sender === me?.name ? '#080' : '#0070f3' }}>
                  {msg.sender}:
                </span>
                {msg.message}
              </div>
            ))}
          </div>
          <div className="chat-input-container">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyPress={(e) => e.key === 'Enter' && sendChat()}
            />
            <button onClick={sendChat}>Send</button>
          </div>
        </div>
      )}
    </main>
  );
}
