import { useMemo, useState } from 'react';
import {
  CompletionScreen,
  GameActions,
  GameHeader,
  HintCard,
  InstructionsModal,
  shuffle,
} from './shared';
import type { Language } from './shared';
import { smritiApi } from '@/services/api';
import { queueOfflineMutation } from '@/services/offlineSync';

interface DominoData {
  id: string;
  left: number;
  right: number;
}

// TODO: wire to backend — replace with GET /api/domino-sets
const dominoSet: DominoData[] = [
  { id: 'd1', left: 3, right: 5 },
  { id: 'd2', left: 0, right: 2 },
  { id: 'd3', left: 4, right: 6 },
  { id: 'd4', left: 1, right: 3 },
  { id: 'd5', left: 2, right: 4 },
  { id: 'd6', left: 5, right: 1 },
];

function DominoTile({ left, right, size = 'normal' }: { left: number; right: number; size?: 'normal' | 'small' }) {
  const dotPositions: Record<number, number[]> = {
    0: [],
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };

  function renderHalf(value: number) {
    return (
      <div className={`domino-half ${size === 'small' ? 'small' : ''}`}>
        <div className="domino-dots">
          {dotPositions[value].map((pos) => (
            <span key={pos} className={`domino-dot dot-${pos}`} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`domino-tile ${size === 'small' ? 'small' : ''}`}>
      {renderHalf(left)}
      <div className="domino-divider" />
      {renderHalf(right)}
    </div>
  );
}

export function Dominoes({ language: _language, onBack }: { language: Language; onBack: () => void }) {
  void _language;
  const [hand, setHand] = useState<DominoData[]>(() => shuffle(dominoSet));
  const [board, setBoard] = useState<DominoData[]>([]);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [startTime] = useState(() => Date.now());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongMoves, setWrongMoves] = useState(0);

  const leftEnd = board.length > 0 ? board[0].left : null;
  const rightEnd = board.length > 0 ? board[board.length - 1].right : null;

  const canPlaceLeft = useMemo(() => {
    if (!selectedTile) return false;
    const tile = hand.find((t) => t.id === selectedTile);
    if (!tile) return false;
    if (board.length === 0) return true;
    return tile.left === leftEnd || tile.right === leftEnd;
  }, [selectedTile, hand, board.length, leftEnd]);

  const canPlaceRight = useMemo(() => {
    if (!selectedTile) return false;
    const tile = hand.find((t) => t.id === selectedTile);
    if (!tile) return false;
    if (board.length === 0) return true;
    return tile.left === rightEnd || tile.right === rightEnd;
  }, [selectedTile, hand, board.length, rightEnd]);

  function placeOnLeft(tileId: string) {
    const tile = hand.find((t) => t.id === tileId);
    if (!tile) return;
    let placed = tile;
    if (board.length > 0) {
      if (tile.right === leftEnd) {
        placed = tile;
      } else if (tile.left === leftEnd) {
        placed = { ...tile, left: tile.right, right: tile.left };
      }
    }
    setBoard((prev) => [placed, ...prev]);
    setHand((prev) => prev.filter((t) => t.id !== tileId));
    setSelectedTile(null);
    checkCompletion(hand.length - 1);
  }

  function placeOnRight(tileId: string) {
    const tile = hand.find((t) => t.id === tileId);
    if (!tile) return;
    let placed = tile;
    if (board.length > 0) {
      if (tile.left === rightEnd) {
        placed = tile;
      } else if (tile.right === rightEnd) {
        placed = { ...tile, left: tile.right, right: tile.left };
      }
    }
    setBoard((prev) => [...prev, placed]);
    setHand((prev) => prev.filter((t) => t.id !== tileId));
    setSelectedTile(null);
    checkCompletion(hand.length - 1);
  }

  function checkCompletion(remaining: number) {
    if (remaining <= 0) {
      const timeTakenMs = Date.now() - startTime;
      const score = Math.max(0, 100 - wrongMoves * 10 - hintsUsed * 5 - Math.floor(timeTakenMs / 10000));
      console.log('Round finished:', { gameName: 'Dominoes', score, timeTakenMs, hintsUsed, wrongMoves });
      
      const payload = {
        gameName: 'Dominoes',
        score,
        timeTakenMs,
        hintsUsed,
        wrongMoves,
        completed: true,
      };

      smritiApi.recordGameSession(payload).catch(() => {
        queueOfflineMutation({
          table: 'exercise_sessions',
          id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          action: 'UPSERT',
          data: payload,
        });
      });

      setTimeout(() => setCompleted(true), 800);
    }
  }

  function handlePlace(tileId: string, side: 'left' | 'right') {
    const isValid = side === 'left' ? canPlaceLeft : canPlaceRight;
    if (!isValid && board.length > 0) setWrongMoves((n) => n + 1);
    if (side === 'left') placeOnLeft(tileId);
    else placeOnRight(tileId);
  }

  function handleHint() {
    setHintsUsed((n) => n + 1);
    if (hand.length === 0) {
      setHintText('Your hand is empty — well done!');
      return;
    }
    if (board.length === 0) {
      setHintText('Pick any tile and place it to start the board.');
      return;
    }
    const matchLeft = hand.find((t) => t.left === leftEnd || t.right === leftEnd);
    const matchRight = hand.find((t) => t.left === rightEnd || t.right === rightEnd);
    if (matchLeft) {
      setHintText(`Try tile [${matchLeft.left}|${matchLeft.right}] on the left end (shows ${leftEnd}).`);
      setSelectedTile(matchLeft.id);
    } else if (matchRight) {
      setHintText(`Try tile [${matchRight.left}|${matchRight.right}] on the right end (shows ${rightEnd}).`);
      setSelectedTile(matchRight.id);
    } else {
      setHintText('No exact match — place any tile gently. Take your time.');
    }
  }

  function handleSkip() {
    if (hand.length === 0) {
      setCompleted(true);
      return;
    }
    const tile = hand[0];
    if (board.length === 0) {
      placeOnRight(tile.id);
    } else {
      const matchLeft = hand.find((t) => t.left === leftEnd || t.right === leftEnd);
      const matchRight = hand.find((t) => t.left === rightEnd || t.right === rightEnd);
      if (matchLeft) placeOnLeft(matchLeft.id);
      else if (matchRight) placeOnRight(matchRight.id);
      else placeOnRight(tile.id);
    }
  }

  if (completed) {
    const timeTakenMs = Date.now() - startTime;
    const score = Math.max(0, 100 - wrongMoves * 10 - hintsUsed * 5 - Math.floor(timeTakenMs / 10000));
    return <CompletionScreen message="All matched, well done" onDone={onBack} />;
  }

  return (
    <div className="page game-page">
      <GameHeader eyebrow="Match the tiles" title="Dominoes" onBack={onBack} onInstructions={() => setShowInstructions(true)} />

      <div className="progress-meta">
        <span>{board.length} of {dominoSet.length} placed</span>
        <span>Take your time</span>
      </div>
      <div className="progress-track"><span style={{ width: `${(board.length / dominoSet.length) * 100}%` }} /></div>

      {hintText && <HintCard text={hintText} onClose={() => setHintText(null)} />}

      <p className="routine-instruction">
        {selectedTile
          ? 'Tap the left or right end of the board to place your tile'
          : 'Pick a tile from your hand below'}
      </p>

      <div className="domino-board">
        {board.length === 0 && <p className="domino-board-empty">Place your first tile here</p>}
        {board.map((tile) => (
          <div key={tile.id} className="domino-board-tile">
            <DominoTile left={tile.left} right={tile.right} />
          </div>
        ))}
      </div>

      {selectedTile && (
        <div className="domino-place-actions">
          <button
            className={`domino-place-btn ${!canPlaceLeft && board.length > 0 ? 'mismatch' : ''}`}
            onClick={() => handlePlace(selectedTile, 'left')}
          >
            Place on left
          </button>
          <button
            className={`domino-place-btn ${!canPlaceRight && board.length > 0 ? 'mismatch' : ''}`}
            onClick={() => handlePlace(selectedTile, 'right')}
          >
            Place on right
          </button>
        </div>
      )}

      <div className="domino-hand">
        {hand.map((tile) => (
          <button
            key={tile.id}
            className={`domino-hand-tile ${selectedTile === tile.id ? 'selected' : ''}`}
            onClick={() => setSelectedTile(tile.id === selectedTile ? null : tile.id)}
          >
            <DominoTile left={tile.left} right={tile.right} size="small" />
          </button>
        ))}
      </div>

      <GameActions onHint={handleHint} onSkip={handleSkip} />

      {showInstructions && (
        <InstructionsModal
          title="How to play"
          steps={[
            'Pick a tile from your hand.',
            'Tap the end of the board where the dots match.',
            'Keep placing until your hand is empty.',
            'Take your time, there is no rush.',
          ]}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </div>
  );
}