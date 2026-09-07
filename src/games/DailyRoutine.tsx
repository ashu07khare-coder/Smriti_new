import { useMemo, useState } from 'react';
import { Coffee, Hand, Sunrise, Users, Volume2 } from 'lucide-react';
import {
  CompletionScreen,
  GameActions,
  GameHeader,
  HintCard,
  InstructionsModal,
  shuffle,
} from './shared';

interface RoutineStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const routineSteps: RoutineStep[] = [
  { id: 'wake', label: 'Wake up', icon: <Sunrise size={26} />, color: '#F2B454' },
  { id: 'pray', label: 'Morning prayer', icon: <Hand size={26} />, color: '#299B78' },
  { id: 'tea', label: 'Have tea', icon: <Coffee size={26} />, color: '#E57B4F' },
  { id: 'visit', label: 'Visit neighbour', icon: <Users size={26} />, color: '#287d9e' },
];

const expectedOrder = ['wake', 'pray', 'tea', 'visit'];

export function DailyRoutine({ onBack }: { onBack: () => void }) {
  const [placed, setPlaced] = useState<string[]>([]);
  const [shuffledIds] = useState<string[]>(() => shuffle(routineSteps.map((s) => s.id)));
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  const shuffled = useMemo(
    () => shuffledIds.filter((id) => !placed.includes(id)),
    [shuffledIds, placed]
  );

  function handlePlace(id: string) {
    setPlaced([...placed, id]);
    setSpeakingId(id);
    setTimeout(() => setSpeakingId(null), 1200);
    if (placed.length + 1 >= routineSteps.length) {
      setTimeout(() => setCompleted(true), 1000);
    }
  }

  function handleRemove(id: string) {
    setPlaced(placed.filter((p) => p !== id));
  }

  function handleSkip() {
    setPlaced(routineSteps.map((s) => s.id));
    setTimeout(() => setCompleted(true), 800);
  }

  function handleHint() {
    setShowHint(true);
  }

  const hintStepId = useMemo(() => {
    for (const id of expectedOrder) {
      if (!placed.includes(id)) return id;
    }
    return null;
  }, [placed]);

  if (completed) {
    return <CompletionScreen message="Well done, that was lovely" onDone={onBack} />;
  }

  return (
    <div className="page game-page">
      <GameHeader eyebrow="Arrange your day" title="Daily Routine Order" onBack={onBack} onInstructions={() => setShowInstructions(true)} />

      <div className="progress-meta">
        <span>{placed.length} of {routineSteps.length} placed</span>
        <span>Any order is fine</span>
      </div>
      <div className="progress-track"><span style={{ width: `${(placed.length / routineSteps.length) * 100}%` }} /></div>

      {showHint && hintStepId && (
        <HintCard text={`Try placing "${routineSteps.find((s) => s.id === hintStepId)?.label}" next.`} onClose={() => setShowHint(false)} />
      )}

      <p className="routine-instruction">Tap cards in the order they happen in your day</p>

      <div className="routine-placed">
        {placed.length === 0 && <p className="routine-placed-label">Tap a card below to place it here</p>}
        {placed.map((id, i) => {
          const step = routineSteps.find((s) => s.id === id)!;
          return (
            <button
              key={id}
              className={`routine-card placed ${speakingId === id ? 'speaking' : ''}`}
              onClick={() => handleRemove(id)}
            >
              <span className="routine-order-num">{i + 1}</span>
              <div className="routine-card-icon" style={{ background: step.color + '22', color: step.color }}>
                {step.icon}
              </div>
              <span className="routine-card-label">{step.label}</span>
              {speakingId === id && <Volume2 size={14} className="speaking-icon" />}
            </button>
          );
        })}
      </div>

      <div className="routine-shuffled">
        {shuffled.map((id) => {
          const step = routineSteps.find((s) => s.id === id)!;
          const isHinted = showHint && id === hintStepId;
          return (
            <button
              key={id}
              className={`routine-card ${isHinted ? 'hint-glow' : ''}`}
              onClick={() => handlePlace(id)}
            >
              <div className="routine-card-icon" style={{ background: step.color + '22', color: step.color }}>
                {step.icon}
              </div>
              <span className="routine-card-label">{step.label}</span>
            </button>
          );
        })}
      </div>

      <GameActions onHint={handleHint} onSkip={handleSkip} />

      {showInstructions && (
        <InstructionsModal
          title="How to play"
          steps={[
            'Cards at the bottom show steps of a daily routine.',
            'Tap a card to move it to the row above.',
            'Place them in the order that feels right for your day.',
            'Tap a placed card to move it back. Any order is welcome.',
          ]}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </div>
  );
}
