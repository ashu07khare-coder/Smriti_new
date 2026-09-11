import { useCallback, useEffect, useState } from 'react';
import { Bird, Check, Coffee, Leaf, Mountain, Soup, Umbrella, Volume2, type LucideIcon } from 'lucide-react';
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

interface PictureItem {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

// TODO: wire to backend — replace with GET /api/picture-sets/:id/call-sequence
const pictureSet: PictureItem[] = [
  { id: 'tea', icon: Coffee, label: 'Tea cup', color: '#E57B4F' },
  { id: 'umbrella', icon: Umbrella, label: 'Umbrella', color: '#287d9e' },
  { id: 'bowl', icon: Soup, label: 'Rice bowl', color: '#F2B454' },
  { id: 'mountain', icon: Mountain, label: 'Mountain', color: '#299B78' },
  { id: 'leaf', icon: Leaf, label: 'Betel leaf', color: '#299B78' },
  { id: 'bird', icon: Bird, label: 'Rooster', color: '#bc6b43' },
];

const languageCodeMap: Record<Language, string> = {
  Assamese: 'as-IN',
  Bodo: 'brx-IN',
  Khasi: 'en-IN',
  Mizo: 'en-IN',
  Manipuri: 'en-IN',
  Nagamese: 'en-IN',
  Hindi: 'hi-IN',
  English: 'en-US',
};

export function PictureBingo({ language, onBack }: { language: Language; onBack: () => void }) {
  const [grid] = useState<PictureItem[]>(() => shuffle(pictureSet));
  const [callOrder] = useState<PictureItem[]>(() => shuffle(pictureSet));
  const [callIndex, setCallIndex] = useState(0);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [showInstructions, setShowInstructions] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);
  const [completed, setCompleted] = useState(false);
  const [wrongId, setWrongId] = useState<string | null>(null);

  const currentCall = callOrder[callIndex];

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCodeMap[language] || 'en-US';
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }, [language]);

  useEffect(() => {
    if (currentCall && !completed) {
      speak(currentCall.label);
    }
  }, [callIndex, currentCall, completed, speak]);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  function handleCardClick(item: PictureItem) {
    if (completed || !currentCall) return;
    if (marked.has(item.id)) return;

    if (item.id === currentCall.id) {
      const next = new Set(marked);
      next.add(item.id);
      setMarked(next);
      setWrongId(null);
      if (next.size >= grid.length) {
        const sessionPayload = {
          gameName: 'Picture Bingo',
          score: 100,
          timeTakenMs: 60000,
          hintsUsed: 0,
          wrongMoves: wrongId ? 1 : 0,
          completed: true,
        };
        smritiApi.recordGameSession(sessionPayload).catch(() => {
          queueOfflineMutation({
            table: 'exercise_sessions',
            id: `sess-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            action: 'UPSERT',
            data: sessionPayload,
          });
        });
        setTimeout(() => setCompleted(true), 800);
      } else {
        setCallIndex((i) => i + 1);
      }
    } else {
      setWrongId(item.id);
      setTimeout(() => setWrongId(null), 1000);
    }
  }

  function handleCallNext() {
    if (callIndex + 1 < callOrder.length) {
      setCallIndex((i) => i + 1);
    }
  }

  function handleSpeak() {
    if (currentCall) speak(currentCall.label);
  }

  function handleHint() {
    if (!currentCall) return;
    setHintText(`The picture is "${currentCall.label}". Tap it on your card.`);
    speak(currentCall.label);
  }

  function handleSkip() {
    if (!currentCall) return;
    const next = new Set(marked);
    next.add(currentCall.id);
    setMarked(next);
    setWrongId(null);
    if (next.size >= grid.length) {
      setTimeout(() => setCompleted(true), 800);
    } else {
      setCallIndex((i) => i + 1);
    }
  }

  if (completed) {
    return <CompletionScreen message="Bingo! You found them all" onDone={onBack} />;
  }

  return (
    <div className="page game-page">
      <GameHeader eyebrow="Picture lotto" title="Picture Bingo" onBack={onBack} onInstructions={() => setShowInstructions(true)} />

      <div className="progress-meta">
        <span>{marked.size} of {grid.length} found</span>
        <span>Take your time</span>
      </div>
      <div className="progress-track"><span style={{ width: `${(marked.size / grid.length) * 100}%` }} /></div>

      {hintText && <HintCard text={hintText} onClose={() => setHintText(null)} />}

      <section className="bingo-call-card">
        <p className="eyebrow">Now calling</p>
        <div className="bingo-call-display">
          <div className="bingo-call-icon" style={{ background: currentCall ? currentCall.color + '22' : '#e8efeb', color: currentCall ? currentCall.color : '#6c867e' }}>
            {currentCall && <currentCall.icon size={40} />}
          </div>
          <h2 className="bingo-call-label">{currentCall?.label ?? 'All done!'}</h2>
          <button className="bingo-speak-btn" onClick={handleSpeak} aria-label="Read the picture name aloud">
            <Volume2 size={20} />
          </button>
        </div>
      </section>

      <div className="bingo-grid">
        {grid.map((item) => {
          const isMarked = marked.has(item.id);
          const isWrong = wrongId === item.id;
          return (
            <button
              key={item.id}
              className={`bingo-card ${isMarked ? 'marked' : ''} ${isWrong ? 'wrong' : ''}`}
              onClick={() => handleCardClick(item)}
              disabled={isMarked}
            >
              <div className="bingo-card-icon" style={{ background: item.color + '22', color: item.color }}>
                <item.icon size={32} />
              </div>
              <span className="bingo-card-label">{item.label}</span>
              {isMarked && <span className="bingo-check"><Check size={18} fill="currentColor" /></span>}
            </button>
          );
        })}
      </div>

      <div className="exercise-actions">
        <button onClick={handleCallNext} disabled={callIndex + 1 >= callOrder.length}>
          Call next picture
        </button>
        <GameActions onHint={handleHint} onSkip={handleSkip} />
      </div>

      {showInstructions && (
        <InstructionsModal
          title="How to play"
          steps={[
            'Listen to the picture being called.',
            'Find it on your card and tap it.',
            'Keep going until your card is full.',
            'Tap the speaker any time to hear it again.',
          ]}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </div>
  );
}
