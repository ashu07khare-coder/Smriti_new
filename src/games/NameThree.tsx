import { useEffect, useRef, useState } from 'react';
import { Apple, Check, Heart, PartyPopper, Send, Users } from 'lucide-react';
import {
  BigMicButton,
  CompletionScreen,
  GameActions,
  GameHeader,
  HintCard,
  InstructionsModal,
} from './shared';
import type { Language } from './shared';

interface Category {
  prompt: string;
  cueIcon: React.ReactNode;
  cueLabel: string;
  suggestions: string[];
}

const categories: Category[] = [
  {
    prompt: 'Can you name three fruits?',
    cueIcon: <Apple size={32} />,
    cueLabel: 'Think of something sweet that grows on a tree',
    suggestions: ['Mango', 'Banana', 'Guava', 'Pineapple', 'Papaya', 'Litchi'],
  },
  {
    prompt: 'Name three family members',
    cueIcon: <Users size={32} />,
    cueLabel: 'Think of people who live with you or near you',
    suggestions: ['Mother', 'Father', 'Sister', 'Brother', 'Son', 'Daughter'],
  },
  {
    prompt: 'Name three festivals you celebrate',
    cueIcon: <PartyPopper size={32} />,
    cueLabel: 'Think of a time when there was music and good food',
    suggestions: ['Bihu', 'Durga Puja', 'Diwali', 'Christmas', 'Wangala', 'Chapchar Kut'],
  },
];

const acknowledgments = ['Good one!', 'Lovely!', 'That is wonderful!', 'Yes, nice!', 'Beautiful!'];

export function NameThree({ language: _language, onBack }: { language: Language; onBack: () => void }) {
  void _language;
  const [categoryIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [showCue, setShowCue] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [acknowledgment, setAcknowledgment] = useState<string | null>(null);
  const cueTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const category = categories[categoryIndex];

  useEffect(() => {
    return () => {
      if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);
    };
  }, []);

  function handleMicToggle() {
    if (listening) {
      setListening(false);
      if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);
    } else {
      setListening(true);
      cueTimeoutRef.current = setTimeout(() => setShowCue(true), 3000);
    }
  }

  function submitAnswer(answer: string) {
    const trimmed = answer.trim();
    if (!trimmed) return;
    setAnswers([...answers, trimmed]);
    setListening(false);
    setShowCue(false);
    setTextInput('');
    if (cueTimeoutRef.current) clearTimeout(cueTimeoutRef.current);
    const ack = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
    setAcknowledgment(ack);
    setTimeout(() => setAcknowledgment(null), 2000);
    if (answers.length + 1 >= 3) {
      setTimeout(() => setCompleted(true), 1200);
    }
  }

  function handleSkip() {
    setCompleted(true);
  }

  function handleHint() {
    setShowHint(true);
  }

  if (completed) {
    return <CompletionScreen message="Well done, that was lovely" onDone={onBack} />;
  }

  return (
    <div className="page game-page">
      <GameHeader eyebrow="Say and remember" title="Name Three Things" onBack={onBack} onInstructions={() => setShowInstructions(true)} />

      <div className="progress-meta">
        <span>{answers.length} of 3 named</span>
        <span>No wrong answers</span>
      </div>
      <div className="progress-track"><span style={{ width: `${(answers.length / 3) * 100}%` }} /></div>

      <section className="category-prompt-card">
        <h2>{category.prompt}</h2>
        <p>Speak, type, or tap a word below</p>
      </section>

      {acknowledgment && <p className="warm-acknowledgment"><Heart size={16} fill="currentColor" /> {acknowledgment}</p>}

      <div className="answer-tags">
        {answers.map((ans, i) => (
          <span key={i} className="answer-tag">
            <Check size={14} /> {ans}
          </span>
        ))}
      </div>

      <BigMicButton
        label={listening ? 'I am listening' : 'Speak your answer'}
        sublabel={listening ? 'Take your time' : 'Or type / tap below'}
        active={listening}
        onClick={handleMicToggle}
      />

      {showCue && (
        <div className="category-cue">
          <div className="cue-icon">{category.cueIcon}</div>
          <span>{category.cueLabel}</span>
        </div>
      )}

      {showHint && <HintCard text={category.cueLabel} onClose={() => setShowHint(false)} />}

      <div className="name-input-row">
        <input
          className="name-input"
          type="text"
          placeholder="or type your answer"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitAnswer(textInput); }}
        />
        <button className="name-submit" onClick={() => submitAnswer(textInput)} aria-label="Submit answer">
          <Send size={18} />
        </button>
      </div>

      <div className="suggestion-chips">
        {category.suggestions.map((word) => (
          <button key={word} className="suggestion-chip" onClick={() => submitAnswer(word)}>
            {word}
          </button>
        ))}
      </div>

      <GameActions onHint={handleHint} onSkip={handleSkip} />

      {showInstructions && (
        <InstructionsModal
          title="How to play"
          steps={[
            'The app asks you to name three things from a category.',
            'Speak your answer, type it, or tap a word from the list.',
            'Each answer is welcomed warmly. There are no wrong answers.',
            'If you pause, a gentle picture cue will appear to help.',
          ]}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </div>
  );
}
