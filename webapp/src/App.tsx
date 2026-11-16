import { StatusBar } from './components/StatusBar';
import { WalletGate } from './components/WalletGate';
import { TrackBackdrop } from './components/TrackBackdrop';
import { buildCar, fitOf } from './game/carBuild';
import { Garage } from './pages/Garage';
import { Home } from './pages/Home';
import { Market } from './pages/Market';
import { Practice } from './pages/Practice';
import { Race } from './pages/Race';
import { Results } from './pages/Results';
import { useGame, type Page } from './useGame';

const NAV: { id: Page; label: string }[] = [
  { id: 'garage', label: 'Garage' },
  { id: 'market', label: 'Market' },
  { id: 'practice', label: 'Practice' },
  { id: 'race', label: 'Race' },
  { id: 'results', label: 'Results' },
];

export default function App() {
  const { page, go, toast, service, isOpen, state } = useGame();
  const car = buildCar(fitOf(state.loadout.parts));
  const next = service.nextRace();
  const toastEl = toast && (
    <div className="toast glass" role="status">
      {toast}
    </div>
  );

  if (page === 'home') {
    return (
      <>
        <Home />
        <WalletGate />
        {toastEl}
      </>
    );
  }

  return (
    <div className={`app page-${page}`}>
      {page !== 'race' && (
        <div className="app-scene" aria-hidden>
          <TrackBackdrop track={next.track} weather={next.weather} car={car} />
        </div>
      )}
      <header className="top">
        <button className="brand" onClick={() => go('home')} aria-label="Pit Manager home">
          <span className="flag" aria-hidden />
          PIT MANAGER
        </button>
        <nav className="tabs" aria-label="Pages">
          {NAV.filter((n) => isOpen(n.id) || n.id === page).map((n) => (
            <button
              key={n.id}
              className={page === n.id ? 'active' : ''}
              aria-current={page === n.id ? 'page' : undefined}
              onClick={() => go(n.id)}
            >
              {n.label}
            </button>
          ))}
        </nav>
        <StatusBar />
      </header>
      <main>
        {page === 'market' && <Market />}
        {page === 'garage' && <Garage />}
        {page === 'practice' && <Practice />}
        {page === 'race' && <Race />}
        {page === 'results' && <Results />}
      </main>
      {toastEl}
    </div>
  );
}
