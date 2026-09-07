import { useMemo, useState } from 'react';
import { CloudOff, Heart, Volume2 } from 'lucide-react';
import {
  BigMicButton,
  CompletionScreen,
  GameActions,
  GameHeader,
  HintCard,
  InstructionsModal,
  shuffle,
} from './shared';
import type { Language } from './shared';

interface FamilyMember {
  name: string;
  relation: string;
  hint: string;
  voiceNote: string;
}

const family: FamilyMember[] = [
  { name: 'Bina', relation: 'Your daughter', hint: 'She calls you every Sunday evening.', voiceNote: 'Bina loves to make your favourite pitha during Bihu.' },
  { name: 'Rohan', relation: 'Your grandson', hint: 'He visits during school holidays.', voiceNote: 'Rohan just started college in Guwahati this year.' },
  { name: 'Mohan', relation: 'Your son', hint: 'He lives two houses down the lane.', voiceNote: 'Mohan fixed the kitchen window last month.' },
  { name: 'Anjali', relation: 'Your granddaughter', hint: 'She draws you pictures.', voiceNote: 'Anjali won a drawing prize at school.' },
];

export function WhoIsThis({ language, onBack }: { language: Language; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [showVoiceNote, setShowVoiceNote] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [completed, setCompleted] = useState(false);

  const member = family[index];

  const shuffledOptions = useMemo(() => {
    const distractors = family.filter((_, i) => i !== index).slice(0, 2).map((f) => f.name);
    return shuffle([member.name, ...distractors]);
  }, [index, member.name]);

  function handleAnswer(name: string) {
    setSelected(name);
    setTimeout(() => {
      if (index + 1 < family.length) {
        setIndex(index + 1);
        setSelected(null);
        setShowVoiceNote(false);
      } else {
        setCompleted(true);
      }
    }, 1800);
  }

  function handleSkip() {
    if (index + 1 < family.length) {
      setIndex(index + 1);
      setSelected(null);
      setShowVoiceNote(false);
      setShowHint(false);
    } else {
      setCompleted(true);
    }
  }

  if (completed) {
    return <CompletionScreen message="Well done, that was lovely" onDone={onBack} />;
  }

  return (
    <div className="page game-page">
      <GameHeader eyebrow="Family faces" title="Who Is This?" onBack={onBack} onInstructions={() => setShowInstructions(true)} />

      <div className="progress-meta">
        <span>Person {index + 1} of {family.length}</span>
        <span>Take your time</span>
      </div>
      <div className="progress-track"><span style={{ width: `${(index / family.length) * 100}%` }} /></div>

      <section className="memory-card">
        <div className="memory-art" aria-label={`Illustration of ${member.name}`}>
          <div className="portrait-hair" />
          <div className="portrait-face">
            <span className="eye eye-left" />
            <span className="eye eye-right" />
            <span className="smile" />
          </div>
        </div>
        <p className="memory-caption"><CloudOff size={14} /> Family photo · stored only on this phone</p>
      </section>

      <div className="question-block">
        <p className="eyebrow">{member.relation}</p>
        <h2>Who is this?</h2>
        <p>You can say the name or tap below.</p>
      </div>

      {showHint && <HintCard text={member.hint} onClose={() => setShowHint(false)} />}

      {showVoiceNote && (
        <div className="voice-note-card">
          <Volume2 size={20} />
          <div>
            <strong>{member.voiceNote}</strong>
            <small>Recorded by family · played in {language}</small>
          </div>
        </div>
      )}

      <div className="answer-options">
        {shuffledOptions.map((name) => (
          <button
            key={name}
            className={`answer-option ${selected === name ? (name === member.name ? 'correct' : 'selected') : ''}`}
            onClick={() => handleAnswer(name)}
            disabled={selected !== null}
          >
            {name}
            {selected === name && name === member.name && <Heart size={18} fill="currentColor" />}
          </button>
        ))}
      </div>

      <BigMicButton label="Speak the name" sublabel="Or tap a name above" active={false} onClick={() => {}} />

      <button className="voice-note-trigger" onClick={() => setShowVoiceNote(!showVoiceNote)}>
        <Volume2 size={17} /> {showVoiceNote ? 'Hide voice note' : 'Tell me about them'}
      </button>

      <GameActions onHint={() => setShowHint(true)} onSkip={handleSkip} />

      <p className="encouragement"><Heart size={15} fill="currentColor" /> Every answer is welcome here</p>

      {showInstructions && (
        <InstructionsModal
          title="How to play"
          steps={[
            'Look at the family photo on screen.',
            'Tap the name you recognise, or speak it aloud.',
            'Tap "Tell me about them" to hear a voice note from family.',
            'There is no wrong answer — just take your time.',
          ]}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </div>
  );
}
