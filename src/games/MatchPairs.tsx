import { useState } from 'react';
import { Bird, Check, Coffee, Flower2, Leaf, Mountain, Soup, Umbrella } from 'lucide-react';
import {
  CompletionScreen,
  GameActions,
  GameHeader,
  HintCard,
  InstructionsModal,
  shuffle,
} from './shared';

const iconMap = {
  coffee: { icon: <Coffee size={36} />, label: 'Tea cup' },
  umbrella: { icon: <Umbrella size={36} />, label: 'Umbrella' },
  soup: { icon: <Soup size={36} />, label: 'Rice bowl' },
  mountain: { icon: <Mountain size={36} />, label: 'Mountain' },
  leaf: { icon: <Leaf size={36} />, label: 'Betel leaf' },
  bird: { icon: <Bird size={36} />, label: 'Rooster' },
} as const;

type IconKey = keyof typeof iconMap;
const allIconKeys = Object.keys(iconMap) as IconKey[];

interface Card {
  id: number;
  iconKey: IconKey;
  matched: boolean;
  flipped: boolean;
}

function createCards(pairCount: number): Card[] {
  const keys = allIconKeys.slice(0, pairCount);
  const cards: Card[] = [];
  keys.forEach((key, i) => {
    cards.push({ id: i * 2, iconKey: key, matched: false, flipped: false });
    cards.push({ id: i * 2 + 1, iconKey: key, matched: false, flipped: false });
  });
  return shuffle(cards);
}

export function MatchPairs({ onBack }: { onBack: () => void }) {
  const [pairCount, setPairCount] = useState(2);
  const [cards, setCards] = useState<Card[]>(() => createCards(2));
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [checking, setChecking] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [hintText, setHintText] = useState<string | null>(null);

  function handleCardClick(cardIndex: number) {
    if (checking || completed) return;
    const card = cards[cardIndex];
    if (card.flipped || card.matched) return;

    const newCards = cards.map((c, i) => (i === cardIndex ? { ...c, flipped: true } : c));
    setCards(newCards);
    const newFlipped = [...flippedIndices, cardIndex];
    setFlippedIndices(newFlipped);

    if (newFlipped.length === 2) {
      setChecking(true);
      const [first, second] = newFlipped;
      const isMatch = newCards[first].iconKey === newCards[second].iconKey;

      if (isMatch) {
        setTimeout(() => {
          setCards((prev) => {
            const updated = prev.map((c, i) =>
              i === first || i === second ? { ...c, matched: true } : c
            );
            if (updated.every((c) => c.matched)) setCompleted(true);
            return updated;
          });
          setFlippedIndices([]);
          setChecking(false);
        }, 600);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c, i) =>
              i === first || i === second ? { ...c, flipped: false } : c
            )
          );
          setFlippedIndices([]);
          setChecking(false);
        }, 1500);
      }
    }
  }

  function handleSkip() {
    setCards((prev) => prev.map((c) => ({ ...c, flipped: true, matched: true })));
    setTimeout(() => setCompleted(true), 800);
  }

  function handlePlayAgain() {
    const newPairCount = Math.min(pairCount + 1, 4);
    setPairCount(newPairCount);
    setCards(createCards(newPairCount));
    setFlippedIndices([]);
    setChecking(false);
    setCompleted(false);
  }

  function handleHint() {
    const unflipped = cards.filter((c) => !c.matched && !c.flipped);
    if (unflipped.length < 2) {
      setHintText('Almost done — just a couple more to find.');
      return;
    }
    const firstKey = unflipped[0].iconKey;
    const partner = unflipped.find((c) => c.iconKey === firstKey);
    if (partner) {
      setHintText(`Try looking for another ${iconMap[firstKey].label}.`);
    } else {
      setHintText('Take your time — there is no rush.');
    }
  }

  if (completed) {
    return (
      <CompletionScreen
        message="Well done, that was lovely"
        onDone={onBack}
        secondaryLabel={pairCount < 4 ? 'Play again with more cards' : 'Play again'}
        onSecondary={pairCount < 4 ? handlePlayAgain : () => {
          setCards(createCards(pairCount));
          setFlippedIndices([]);
          setCompleted(false);
        }}
      />
    );
  }

  const matchedCount = cards.filter((c) => c.matched).length;

  return (
    <div className="page game-page">
      <GameHeader eyebrow="Picture matching" title="Match the Pairs" onBack={onBack} onInstructions={() => setShowInstructions(true)} />

      <div className="progress-meta">
        <span>{matchedCount / 2} of {pairCount} pairs found</span>
        <span>Take your time</span>
      </div>
      <div className="progress-track"><span style={{ width: `${(matchedCount / cards.length) * 100}%` }} /></div>

      {hintText && <HintCard text={hintText} onClose={() => setHintText(null)} />}

      <div className="match-grid">
        {cards.map((card, i) => (
          <div
            key={card.id}
            className={`match-card ${card.flipped || card.matched ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`}
            onClick={() => handleCardClick(i)}
          >
            <div className="match-card-inner">
              <div className="match-card-back">
                <Flower2 size={32} />
              </div>
              <div className="match-card-face">
                {iconMap[card.iconKey].icon}
                {card.matched && <span className="match-check"><Check size={18} fill="currentColor" /></span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <GameActions onHint={handleHint} onSkip={handleSkip} />

      {showInstructions && (
        <InstructionsModal
          title="How to play"
          steps={[
            'Tap a card to flip it and see the picture.',
            'Tap another card to find its matching pair.',
            'A match stays open. If not, both cards flip back gently.',
            'Find all the pairs — there is no timer and no score.',
          ]}
          onClose={() => setShowInstructions(false)}
        />
      )}
    </div>
  );
}
