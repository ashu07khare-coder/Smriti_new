import { useEffect, useState } from 'react';
import { Activity, BookOpen, Fish, Play, RotateCcw, Users, UserRound } from 'lucide-react';
import {
  BigMicButton,
  CompletionScreen,
  GameActions,
  GameHeader,
  HintCard,
  InstructionsModal,
} from './shared';
import type { Language } from './shared';

interface RecallOption {
  label: string;
  icon: React.ReactNode;
  color: string;
  correct: boolean;
}

interface RecallQuestion {
  question: string;
  options: RecallOption[];
}

const storyText = 'Aita went to the morning market. She bought fresh fish and vegetables for lunch. On the way home, she met her old friend Lakhi at the tea stall. They sat together, had a cup of tea, and talked about old times.';

const questions: RecallQuestion[] = [
  {
    question: 'What did Aita buy at the market?',
    options: [
      { label: 'Fish and vegetables', icon: <Fish size={26} />, color: '#299B78', correct: true },
      { label: 'New clothes', icon: <BookOpen size={26} />, color: '#F2B454', correct: false },
      { label: 'A book', icon: <Activity size={26} />, color: '#E57B4F', correct: false },
    ],
  },
  {
    question: 'Who did Aita meet on the way home?',
    options: [
      { label: 'Her friend Lakhi', icon: <Users size={26} />, color: '#299B78', correct: true },
      { label: 'Her grandson', icon: <UserRound size={26} />, color: '#F2B454', correct: false },
      { label: 'The doctor', icon: <Activity size={26} />, color: '#E57B4F', correct: false },
    ],
  },
];

export function StoryRecall({ language: _language, onBack }: { language: Language; onBack: () => void }) {
  void _language;
  const [storyPlayed, setStoryPlayed] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const startTime = Date.now();
    const duration = 5000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setPlaying(false);
        setStoryPlayed(true);
      }
    }, 50);
    return () => clearInterval(interval);
  }, [playing]);

  function handlePlay() {
    setPlaying(true);
    setProgress(0);
  }

  function handleReplay() {
    setStoryPlayed(false);
    setProgress(0);
    setPlaying(true);
  }

  function handleAnswer(optionIndex: number) {
    setSelectedAnswer(optionIndex);
    setTimeout(() => {
      if (currentQuestion + 1 < questions.length) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setCompleted(true);
      }
    }, 1800);
  }

  function handleSkip() {
    if (currentQuestion + 1 < questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      setCompleted(true);
    }
  }

  if (completed) {
    return <CompletionScreen message="Well done, that was lovely" onDone={onBack} />;
  }

  const question = questions[currentQuestion];

  return (
    <div className="page game-page">
      <GameHeader eyebrow="Listen and remember" title="Story Time Recall" onBack={onBack} onInstructions={() => setShowInstructions(true)} />

      {!storyPlayed && (
        <>
          <div className="progress-meta">
            <span>A short family story</span>
            <span>~ 1 minute</span>
          </div>

          <section className="story-card">
            <div className="story-illustration">
              <BookOpen size={56} />
            </div>
            <p className="story-text">{storyText}</p>
            <button className="story-play-button" onClick={handlePlay} disabled={playing}>
              {playing ? <><RotateCcw size={20} /> Playing...</> : <><Play size={20} fill="currentColor" /> Play the story</>}
            </button>
            {playing && (
              <div className="story-progress"><span style={{ width: `${progress}%` }} /></div>
            )}
          </section>

          <GameActions onHint={() => setShowHint(true)} onSkip={handleReplay} hintLabel="Show a hint" skipLabel="Play it again" />
        </>
      )}

      {storyPlayed && (
        <>
          <div className="progress-meta">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>Take your time</span>
          </div>
          <div className="progress-track"><span style={{ width: `${((currentQuestion) / questions.length) * 100}%` }} /></div>

          <button className="story-replay" onClick={handleReplay}>
            <RotateCcw size={17} /> Play the story again
          </button>

          <div className="recall-question">
            <p className="eyebrow">A kind question</p>
            <h2>{question.question}</h2>
            <p>You can speak your answer or tap below.</p>
          </div>

          {showHint && <HintCard text="Think about what happened in the story." onClose={() => setShowHint(false)} />}

          <div className="recall-options">
            {question.options.map((opt, i) => (
              <button
                key={i}
                className={`recall-option ${selectedAnswer === i ? (opt.correct ? 'correct' : 'selected') : ''}`}
                onClick={() => handleAnswer(i)}
                disabled={selectedAnswer !== null}
              >
                <div className="recall-option-icon" style={{ background: opt.color + '22', color: opt.color }}>
                  {opt.icon}
                </div>
                <span className="recall-option-label">{opt.label}</span>
              </button>
            ))}
          </div>

          <BigMicButton label="Speak your answer" sublabel="Or tap a picture above" active={false} onClick={() => {}} />

          <GameActions onHint={() => setShowHint(true)} onSkip={handleSkip} />
        </>
      )}

      {showInstructions && (
        <InstructionsModal
          title="How to play"
          steps={[
            'Listen to a short story recorded by your family.',
            'You can play it as many times as you like.',
            'After the story, a kind question will appear.',
            'Speak your answer or tap a picture. There is no wrong answer.',
          ]}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </div>
  );
}
