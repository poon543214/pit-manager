import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { friendlyError } from './chain/errors';
import type { GameService } from './services/gameService';
import type { PracticeReport } from './sim/practice';
import type { Loadout, PlayerState, RaceResult } from './shared/types';

export type Page = 'home' | 'market' | 'garage' | 'practice' | 'race' | 'results';

/** One practice run and the setup it was run with, so runs can be compared after changing the setup. */
export interface PracticeRun {
  round: number;
  loadout: Loadout;
  report: PracticeReport;
}

interface GameCtx {
  service: GameService;
  state: PlayerState;
  page: Page;
  go: (p: Page) => void;
  lastRace: RaceResult | null;
  setLastRace: (r: RaceResult | null) => void;
  /** a page the player tried to open without a wallet; the connect popup is showing for it */
  gate: Page | null;
  closeGate: () => void;
  /** connect the wallet, then open the page that was waiting for it (if any) */
  connectWallet: () => Promise<void>;
  /** a race is playing on screen (the header shows that race, not the next one) */
  racing: boolean;
  setRacing: (on: boolean) => void;
  /** practice runs for the next round, newest first */
  practiceLog: PracticeRun[];
  addPractice: (run: PracticeRun) => void;
  /** drop the last race and practice log, after a new game */
  forget: () => void;
  toast: string | null;
  /** demo mode opens every action regardless of the weekday */
  demo: boolean;
  setDemo: (on: boolean) => void;
  /** whether a page is open today (always true in demo mode) */
  isOpen: (p: Page) => boolean;
  notify: (msg: string) => void;
  /** run a service call and surface its error as a toast */
  attempt: <T>(fn: () => Promise<T>) => Promise<T | undefined>;
}

const Ctx = createContext<GameCtx | null>(null);
const DEMO_KEY = 'pit-manager:demo';
// v2: races with multi-stop plans and fatigue; saves in the older shape are left behind
const LAST_RACE_KEY = 'pit-manager:last-race:v2';
const PRACTICE_KEY = 'pit-manager:practice:v2';
const RUNS_KEPT = 6;

/** Per-browser memory of the last race and practice runs; the game works without it. */
function recall<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function remember(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
/** pages that only open on their own day of the week */
const DAY_GATED = { market: 'market', practice: 'practice', race: 'race' } as const;

export function GameProvider({ service, children }: { service: GameService; children: ReactNode }) {
  const [state, setState] = useState(service.getState());
  const [page, setPage] = useState<Page>('home');
  const [demo, setDemoState] = useState(() => {
    const on = localStorage.getItem(DEMO_KEY) !== 'off';
    service.setDemo(on); // before the first render so prices are free from the start
    return on;
  });
  const [lastRace, setLastRaceState] = useState<RaceResult | null>(() => recall(LAST_RACE_KEY, null));
  const [racing, setRacing] = useState(false);
  const [gate, setGate] = useState<Page | null>(null);

  // the wallet is the player's identity: without one only Home is open (also after a disconnect or account switch)
  useEffect(() => {
    if (!state.wallet && page !== 'home') setPage('home');
  }, [state.wallet, page]);
  const [practiceLog, setPracticeLog] = useState<PracticeRun[]>(() => recall(PRACTICE_KEY, []));
  const setLastRace = (r: RaceResult | null) => {
    setLastRaceState(r);
    remember(LAST_RACE_KEY, r);
  };
  const savePractice = (log: PracticeRun[]) => {
    setPracticeLog(log);
    remember(PRACTICE_KEY, log.length ? log : null);
  };
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const off = service.subscribe(setState);
    return () => void off();
  }, [service]);

  useEffect(() => {
    if (!toast) return;
    // longer messages (errors) stay up long enough to read
    const id = setTimeout(() => setToast(null), toast.length > 60 ? 5200 : 2600);
    return () => clearTimeout(id);
  }, [toast]);

  const value = useMemo<GameCtx>(
    () => ({
      service,
      state,
      page,
      go: (p) => {
        if (p !== 'home' && !state.wallet) {
          setGate(p);
          return;
        }
        setPage(p);
        window.scrollTo(0, 0);
      },
      gate,
      closeGate: () => setGate(null),
      connectWallet: async () => {
        try {
          const address = await service.connectWallet();
          setToast(`Connected ${address.slice(0, 6)}…${address.slice(-4)}: your NFTs are loaded`);
          if (gate) setPage(gate);
          setGate(null);
        } catch (e) {
          setToast(friendlyError(e));
        }
      },
      lastRace,
      setLastRace,
      racing,
      setRacing,
      practiceLog,
      // keep only this round's runs: older rounds raced on another track
      addPractice: (run) =>
        savePractice([run, ...practiceLog.filter((r) => r.round === run.round)].slice(0, RUNS_KEPT)),
      forget: () => {
        setLastRace(null);
        savePractice([]);
      },
      toast,
      demo,
      setDemo: (on) => {
        service.setDemo(on);
        setDemoState(on);
        try {
          localStorage.setItem(DEMO_KEY, on ? 'on' : 'off');
        } catch {
          /* ignore */
        }
      },
      isOpen: (p) => {
        if (demo || !(p in DAY_GATED)) return true;
        const today = service.schedule().find((d) => d.today);
        return today?.kind === DAY_GATED[p as keyof typeof DAY_GATED];
      },
      notify: setToast,
      attempt: async (fn) => {
        try {
          return await fn();
        } catch (e) {
          setToast(friendlyError(e));
          return undefined;
        }
      },
    }),
    [service, state, page, gate, lastRace, racing, practiceLog, toast, demo],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useGame() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useGame outside GameProvider');
  return ctx;
}
