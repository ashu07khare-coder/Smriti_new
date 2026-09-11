import { type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, Check, Heart, Info, Lightbulb, Mic, SkipForward, X } from 'lucide-react';
import { useEffect } from 'react';

export type Language = 'Assamese' | 'Bodo' | 'Khasi' | 'Mizo' | 'Manipuri' | 'Nagamese' | 'Hindi' | 'English';

export const languages: Language[] = ['Assamese', 'Bodo', 'Khasi', 'Mizo', 'Manipuri', 'Nagamese', 'Hindi', 'English'];

export type GameId = 'who-is-this' | 'match-pairs' | 'daily-routine' | 'name-three' | 'story-recall' | 'picture-bingo' | 'dominoes';

export interface GameInfo {
  id: GameId;
  name: string;
  description: string;
  time: string;
  icon: ReactNode;
  accent: string;
}

export function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function GameHeader({
  eyebrow,
  title,
  onBack,
  onInstructions,
}: {
  eyebrow: string;
  title: string;
  onBack: () => void;
  onInstructions: () => void;
}) {
  return (
    <>
      <div className="game-header-row">
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={18} /> Back to games
        </button>
        <button className="instructions-button" onClick={onInstructions}>
          <Info size={17} /> How to play
        </button>
      </div>
      <div className="exercise-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
    </>
  );
}

export function GameActions({
  onHint,
  onSkip,
  hintLabel = 'Show a hint',
  skipLabel = 'Skip',
}: {
  onHint: () => void;
  onSkip: () => void;
  hintLabel?: string;
  skipLabel?: string;
}) {
  return (
    <div className="exercise-actions">
      <button onClick={onHint}>
        <Lightbulb size={17} /> {hintLabel}
      </button>
      <button onClick={onSkip}>
        {skipLabel} <SkipForward size={16} />
      </button>
    </div>
  );
}

export function HintCard({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <div className="hint-card">
      <Lightbulb size={19} />
      <span>{text}</span>
      <button onClick={onClose} aria-label="Close hint">
        <X size={16} />
      </button>
    </div>
  );
}

export function BigMicButton({
  label,
  sublabel,
  active,
  onClick,
}: {
  label: string;
  sublabel?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`voice-answer ${active ? 'listening' : ''}`} onClick={onClick}>
      <span className="answer-mic">
        <Mic size={23} />
      </span>
      <span className="mic-label-stack">
        <strong>{label}</strong>
        {sublabel && <small>{sublabel}</small>}
      </span>
    </button>
  );
}

export function CompletionScreen({
  message,
  onDone,
  secondaryLabel,
  onSecondary,
  gameName,
  score,
  timeTakenMs,
}: {
  message: string;
  onDone: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  gameName?: string;
  score?: number;
  timeTakenMs?: number;
}) {
  useEffect(() => {
    console.log('Round finished:', { gameName, score, timeTakenMs });
  }, []);

  return (
    <div className="completion-screen">
      <div className="bloom-flower">
        <div className="bloom-center" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="bloom-petal" style={{ '--i': i } as CSSProperties} />
        ))}
      </div>
      <h2 className="completion-title">{message}</h2>
      <p className="completion-subtitle">That was a lovely moment together.</p>
      <button className="done-button" onClick={onDone}>
        <Check size={20} /> Back to games
      </button>
      {secondaryLabel && onSecondary && (
        <button className="secondary-action" onClick={onSecondary}>
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}


export function InstructionsModal({
  title,
  steps,
  onClose,
}: {
  title: string;
  steps: string[];
  onClose: () => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="modal-steps">
          {steps.map((step, i) => (
            <div key={i} className="modal-step">
              <span className="step-number">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
        <button className="modal-got-it" onClick={onClose}>
          <Heart size={16} fill="currentColor" /> Got it
        </button>
      </div>
    </div>
  );
}
