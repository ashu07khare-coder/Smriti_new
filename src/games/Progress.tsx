export function Progress({ onBack }: { onBack: () => void }) {
  const history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
  return (
    <div className="page">
      <button onClick={onBack}>Back</button>
      <h2>Progress</h2>
      {history.length === 0 && <p>No games played yet — go play something!</p>}
      {history.map((s: any, i: number) => (
        <p key={i}>{s.gameName}: score {s.score} — {new Date(s.date).toLocaleDateString()}</p>
      ))}
    </div>
  );
}