import { ArrowRight, Bird, BookOpen, CalendarDays, Grid3x3, Heart, LayoutGrid, MessageCircle, Users } from 'lucide-react';
import type { GameId, GameInfo, Language } from './shared';

export const gamesList: GameInfo[] = [
  {
    id: 'who-is-this',
    name: 'Who Is This?',
    description: 'Recognise family faces',
    time: '5 minutes',
    icon: <Users size={24} />,
    accent: '#299B78',
  },
  {
    id: 'match-pairs',
    name: 'Match the Pairs',
    description: 'Find matching pictures',
    time: '4 minutes',
    icon: <Bird size={24} />,
    accent: '#F2B454',
  },
  {
    id: 'daily-routine',
    name: 'Daily Routine Order',
    description: 'Arrange your day in order',
    time: '3 minutes',
    icon: <CalendarDays size={24} />,
    accent: '#E57B4F',
  },
  {
    id: 'name-three',
    name: 'Name Three Things',
    description: 'Say three from a category',
    time: '4 minutes',
    icon: <MessageCircle size={24} />,
    accent: '#299B78',
  },
  {
    id: 'story-recall',
    name: 'Story Time Recall',
    description: 'Listen and remember',
    time: '5 minutes',
    icon: <BookOpen size={24} />,
    accent: '#F2B454',
  },
  {
    id: 'picture-bingo',
    name: 'Picture Bingo',
    description: 'Listen and find the picture',
    time: '5 minutes',
    icon: <Grid3x3 size={24} />,
    accent: '#F2B454',
  },
  {
    id: 'dominoes',
    name: 'Dominoes',
    description: 'Match the matching tiles',
    time: '5 minutes',
    icon: <LayoutGrid size={24} />,
    accent: '#287d9e',
  },
];

export function GamesHub({
  language: _language,
  onOpenGame,
}: {
  language: Language;
  onOpenGame: (id: GameId) => void;
}) {
  void _language;
  return (
    <div className="page games-hub">
      <div className="exercise-heading">
        <p className="eyebrow">Gentle brain games</p>
        <h1>Today's games</h1>
      </div>
      <p className="games-intro">Pick one to begin. Each game is short, calm, and at your pace.</p>
      <div className="games-list">
        {gamesList.map((game) => (
          <button key={game.id} className="game-card" onClick={() => onOpenGame(game.id)}>
            <div className="game-card-icon" style={{ background: `${game.accent}22`, color: game.accent }}>
              {game.icon}
            </div>
            <div className="game-card-copy">
              <h3>{game.name}</h3>
              <p>{game.description}</p>
              <span className="game-time">{game.time}</span>
            </div>
            <ArrowRight size={20} className="game-card-arrow" />
          </button>
        ))}
      </div>
      <p className="encouragement" style={{ marginTop: '24px' }}>
        <Heart size={15} fill="currentColor" /> No scores, no timers — just gentle play
      </p>
    </div>
  );
}
