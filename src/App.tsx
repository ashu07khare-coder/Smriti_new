import { useEffect, useState, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleHelp,
  CloudOff,
  Gamepad2,
  Heart,
  Home,
  Languages,
  Lightbulb,
  Mic,
  Moon,
  Phone,
  Play,
  Share2,
  Sparkles,
  Sun,
  UserRound,
  Volume2,
  X,
} from 'lucide-react';
import { GamesHub } from '@/games/GamesHub';
import { WhoIsThis } from '@/games/WhoIsThis';
import { MatchPairs } from '@/games/MatchPairs';
import { DailyRoutine } from '@/games/DailyRoutine';
import { NameThree } from '@/games/NameThree';
import { StoryRecall } from '@/games/StoryRecall';
import type { GameId, Language } from '@/games/shared';

type View = 'home' | 'exercise' | 'circle' | 'games';
type GameView = GameId | null;

const languages: Language[] = ['Assamese', 'Bodo', 'Khasi', 'Mizo', 'Manipuri', 'Nagamese', 'Hindi', 'English'];

function App() {
  const [view, setView] = useState<View>('home');
  const [activeGame, setActiveGame] = useState<GameView>(null);
  const [language, setLanguage] = useState<Language>('Assamese');
  const [languageOpen, setLanguageOpen] = useState(false);
  const [medicineDone, setMedicineDone] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('smriti-dark-mode') === 'true');

  useEffect(() => {
    localStorage.setItem('smriti-dark-mode', String(darkMode));
  }, [darkMode]);

  const navigate = (nextView: View) => {
    setView(nextView);
    setActiveGame(null);
    setHintVisible(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGame = (id: GameId) => {
    setActiveGame(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const backToGames = () => {
    setActiveGame(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main className={`app-shell ${darkMode ? 'dark-mode' : ''}`}>
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <button className="brand" onClick={() => navigate('home')} aria-label="Go to Smriti home">
          <span className="brand-mark"><img src="/smriti-mark.png" alt="" /></span>
          <span>smriti</span>
        </button>
        <div className="topbar-actions">
          <div className="language-wrap">
            <button className="language-button" onClick={() => setLanguageOpen((open) => !open)} aria-expanded={languageOpen}>
              <Languages size={17} />
              <span>{language}</span>
              <ChevronDown size={15} />
            </button>
            {languageOpen && (
              <div className="language-menu">
                {languages.map((option) => (
                  <button key={option} className={option === language ? 'selected' : ''} onClick={() => { setLanguage(option); setLanguageOpen(false); }}>
                    {option}<span>{option === language ? '✓' : ''}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="theme-toggle" onClick={() => setDarkMode((enabled) => !enabled)} aria-label={darkMode ? 'Use light mode' : 'Use dark mode'} aria-pressed={darkMode}>
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="circle-avatar" aria-label="Profile"><UserRound size={18} /></button>
        </div>
      </header>

      <section className="content-wrap">
        {view === 'home' && (
          <HomeView
            language={language}
            medicineDone={medicineDone}
            setMedicineDone={setMedicineDone}
            isListening={isListening}
            setIsListening={setIsListening}
            onExercise={() => navigate('exercise')}
            onGames={() => navigate('games')}
          />
        )}
        {view === 'exercise' && <ExerciseView hintVisible={hintVisible} setHintVisible={setHintVisible} onBack={() => navigate('home')} />}
        {view === 'circle' && <CareCircleView />}

        {view === 'games' && !activeGame && (
          <GamesHub language={language} onOpenGame={openGame} />
        )}
        {view === 'games' && activeGame === 'who-is-this' && <WhoIsThis language={language} onBack={backToGames} />}
        {view === 'games' && activeGame === 'match-pairs' && <MatchPairs onBack={backToGames} />}
        {view === 'games' && activeGame === 'daily-routine' && <DailyRoutine onBack={backToGames} />}
        {view === 'games' && activeGame === 'name-three' && <NameThree language={language} onBack={backToGames} />}
        {view === 'games' && activeGame === 'story-recall' && <StoryRecall language={language} onBack={backToGames} />}
      </section>

      <nav className="bottom-nav" aria-label="Main navigation">
        <NavButton active={view === 'home'} icon={<Home size={20} />} label="Today" onClick={() => navigate('home')} />
        <NavButton active={view === 'games'} icon={<Gamepad2 size={20} />} label="Games" onClick={() => navigate('games')} />
        <NavButton active={view === 'exercise'} icon={<Sparkles size={20} />} label="Exercise" onClick={() => navigate('exercise')} />
        <NavButton active={view === 'circle'} icon={<Heart size={20} />} label="Care Circle" onClick={() => navigate('circle')} />
      </nav>
    </main>
  );
}

function HomeView({ language, medicineDone, setMedicineDone, isListening, setIsListening, onExercise, onGames }: {
  language: Language;
  medicineDone: boolean;
  setMedicineDone: (done: boolean) => void;
  isListening: boolean;
  setIsListening: (listening: boolean) => void;
  onExercise: () => void;
  onGames: () => void;
}) {
  return (
    <div className="page home-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Friday, 4 September 2026</p>
          <h1>Namaskar, Aita</h1>
        </div>
        <div className="offline-pill"><span className="status-dot" /> Offline</div>
      </div>

      <section className="welcome-card">
        <div className="welcome-icon"><Volume2 size={27} /></div>
        <div className="welcome-copy">
          <p className="card-kicker">A gentle start</p>
          <h2>Good morning!</h2>
          <p>Ready for a little time together?</p>
          <button className="listen-button" onClick={() => setIsListening(!isListening)}>
            {isListening ? <><Volume2 size={16} /> Playing in {language}</> : <><Play size={14} fill="currentColor" /> Listen in {language}</>}
          </button>
        </div>
        <div className="sun-doodle" />
      </section>

      <div className="section-title-row"><h2>Today's simple plan</h2><button className="quiet-button" aria-label="Help"><CircleHelp size={20} /></button></div>
      <div className="plan-list">
        <section className={`plan-card ${medicineDone ? 'completed-card' : ''}`}>
          <div className="plan-icon medicine-icon">+</div>
          <div className="plan-copy"><h3>Medicine reminder</h3><p>{medicineDone ? 'Taken just now' : 'BP tablet · 9:30 AM'}</p></div>
          <button className={`check-button ${medicineDone ? 'is-done' : ''}`} onClick={() => setMedicineDone(!medicineDone)} aria-label="Mark medicine as taken"><Check size={21} /></button>
        </section>
        <section className="plan-card exercise-card">
          <div className="plan-icon wave-icon"><Sparkles size={21} /></div>
          <div className="plan-copy"><h3>Brain exercise</h3><p>5 minutes · memory and focus</p><button className="inline-action" onClick={onExercise}>Start with voice <ArrowRight size={14} /></button></div>
        </section>
        <section className="plan-card exercise-card" style={{ cursor: 'pointer' }} onClick={onGames}>
          <div className="plan-icon games-icon"><Gamepad2 size={21} /></div>
          <div className="plan-copy"><h3>Today's games</h3><p>5 gentle brain games · tap to play</p><button className="inline-action" onClick={onGames}>Choose a game <ArrowRight size={14} /></button></div>
        </section>
      </div>

      <button className="speak-card" onClick={() => setIsListening(!isListening)}>
        <span className={`mic-orb ${isListening ? 'listening' : ''}`}><Mic size={28} /></span>
        <span className="speak-copy"><strong>{isListening ? 'I am listening' : 'Tap and speak'}</strong><small>{isListening ? 'Take your time. I’m here.' : 'What would you like help with?'}</small></span>
        <span className="speak-pulse" />
      </button>
      <div className="privacy-note"><CloudOff size={14} /> Your memories stay on this phone</div>
    </div>
  );
}

function ExerciseView({ hintVisible, setHintVisible, onBack }: { hintVisible: boolean; setHintVisible: (visible: boolean) => void; onBack: () => void }) {
  return (
    <div className="page exercise-page">
      <button className="back-button" onClick={onBack}><ArrowLeft size={18} /> Back to today</button>
      <div className="exercise-heading"><p className="eyebrow">A calm, voice-guided exercise</p><h1>Remember the family</h1></div>
      <div className="progress-meta"><span>Question 3 of 5</span><span>Almost there</span></div>
      <div className="progress-track"><span /></div>
      <section className="memory-card">
        <div className="memory-art" aria-label="Illustration of a family member">
          <div className="portrait-hair" /><div className="portrait-face"><span className="eye eye-left" /><span className="eye eye-right" /><span className="smile" /></div><div className="portrait-body" />
        </div>
        <p className="memory-caption"><CloudOff size={14} /> Family photo · stored only on this phone</p>
      </section>
      <div className="question-block"><p className="eyebrow">Take your time</p><h2>Who is this?</h2><p>You can say the answer out loud.</p></div>
      {hintVisible && <div className="hint-card"><Lightbulb size={19} /><span>This is someone who visits you on Sundays.</span><button onClick={() => setHintVisible(false)} aria-label="Close hint"><X size={16} /></button></div>}
      <button className="voice-answer"><span className="answer-mic"><Mic size={23} /></span> Speak your answer</button>
      <div className="exercise-actions"><button onClick={() => setHintVisible(true)}><Lightbulb size={17} /> Show a hint</button><button onClick={onBack}>Skip <ArrowRight size={16} /></button></div>
      <p className="encouragement"><Heart size={15} fill="currentColor" /> There is no right or wrong here</p>
    </div>
  );
}

function CareCircleView() {
  return (
    <div className="page circle-page">
      <div className="page-heading"><div><p className="eyebrow">For family, near or far</p><h1>Care Circle</h1><p className="circle-person">Aita · updated today at 10:12 AM</p></div><div className="updated-time"><span className="live-dot" /> Synced today<br /><strong>at 10:12 AM</strong></div></div>
      <section className="alert-card"><div className="alert-icon">!</div><div><h3>Gentle check-in suggested</h3><p>Aita's routine changed a little this week.</p></div><Bell size={19} /></section>
      <section className="trend-section"><div className="section-title-row"><div><h2>Cognitive trend</h2><p>Personal baseline, not a diagnosis</p></div><button className="quiet-button"><CircleHelp size={20} /></button></div><div className="chart-card"><div className="chart-labels"><span>80</span><span>60</span><span>40</span></div><svg viewBox="0 0 500 190" className="trend-chart" role="img" aria-label="Gentle trend line over recent weeks"><path d="M0 42 H500 M0 96 H500 M0 150 H500" className="grid-line" /><path d="M18 57 C70 44 92 27 137 41 S205 61 252 57 S321 49 364 81 S411 132 480 119" className="trend-line" /><circle cx="480" cy="119" r="6" className="trend-point" /></svg><div className="chart-months"><span>JUL</span><span>AUG</span><span>THIS WEEK</span></div></div></section>
      <section className="today-section"><div className="section-title-row"><h2>Today</h2><span className="day-chip">Friday</span></div><div className="today-card"><div className="today-check"><Check size={20} /></div><div><h3>Exercise completed</h3><p>4 of 5 activities · 6 min</p></div><ArrowRight size={18} /></div></section>
      <div className="circle-actions"><button className="call-button"><Phone size={18} fill="currentColor" /> Call Aita</button><button className="share-button"><Share2 size={18} /> Share with ASHA</button></div>
      <p className="human-note"><Heart size={15} fill="currentColor" /> Smriti helps you notice patterns. People make care decisions.</p>
    </div>
  );
}

function NavButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

export default App;
