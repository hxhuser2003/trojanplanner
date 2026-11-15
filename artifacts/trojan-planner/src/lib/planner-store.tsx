import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  useGetCatalog,
  useSolvePlanner,
  type Catalog,
  type Constraint,
  type PlannerInput,
  type Schedule,
  type SolveResult,
} from '@workspace/api-client-react';
import { errMessage } from './format';

const KEY = 'trojanplanner.v5';
const SOLVE_TIMEOUT_MS = 20000;

export type SolveState = 'idle' | 'solving' | 'done' | 'timeout' | 'error';

interface Persisted {
  input: PlannerInput | null;
  result: SolveResult | null;
  chosenScheduleId: string | null;
  checklist: Record<string, boolean>;
  solvedInputJson: string | null;
  onboarded: boolean;
}

interface Ctx {
  catalog?: Catalog;
  catalogLoading: boolean;
  catalogError: unknown;
  refetchCatalog: () => void;
  input: PlannerInput | null;
  setInput: (i: PlannerInput) => void;
  updateConstraints: (fn: (c: Constraint[]) => Constraint[]) => void;
  result: SolveResult | null;
  solveState: SolveState;
  solveError: string | null;
  solve: (i?: PlannerInput) => Promise<void>;
  dirty: boolean;
  /** The exact input the current result was solved with; explanations use this, not unsaved edits. */
  solvedInput: PlannerInput | null;
  chosen: Schedule | null;
  chooseSchedule: (id: string) => void;
  checklist: Record<string, boolean>;
  toggleCheck: (k: string) => void;
  reset: () => void;
  storageError: string | null;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
}

const EMPTY: Persisted = { input: null, result: null, chosenScheduleId: null, checklist: {}, solvedInputJson: null, onboarded: false };

const PlannerCtx = createContext<Ctx | null>(null);

function load(): Persisted {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw) as Persisted & { lastChange?: unknown };
      delete saved.lastChange;
      return { ...EMPTY, ...saved };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return EMPTY;
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const catalogQ = useGetCatalog();
  const solveM = useSolvePlanner();
  const [state, setState] = useState<Persisted>(load);
  const [solveState, setSolveState] = useState<SolveState>(state.result ? 'done' : 'idle');
  const [solveError, setSolveError] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const mutateRef = useRef(solveM.mutateAsync);
  mutateRef.current = solveM.mutateAsync;
  const reqId = useRef(0);
  const booted = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      setStorageError(null);
    } catch (e) {
      setStorageError(`Couldn't save to this browser (${errMessage(e)}). Changes will be lost on reload.`);
    }
  }, [state]);

  const solve = useCallback(async (override?: PlannerInput) => {
    const input = override ?? state.input;
    if (!input) return;
    const id = ++reqId.current;
    setSolveState('solving');
    setSolveError(null);
    try {
      const res = await Promise.race([
        mutateRef.current({ data: input }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('__timeout__')), SOLVE_TIMEOUT_MS)),
      ]);
      if (id !== reqId.current) return;
      setState((s) => {
        const after = res.schedules[0] ?? null;
        return { ...s, input, result: res, chosenScheduleId: after?.id ?? null, solvedInputJson: JSON.stringify(input) };
      });
      setSolveState(res.status === 'unknown' ? 'timeout' : 'done');
    } catch (e) {
      if (id !== reqId.current) return;
      const msg = errMessage(e);
      if (msg === '__timeout__') {
        setSolveState('timeout');
        setSolveError(`The solver did not answer within ${SOLVE_TIMEOUT_MS / 1000}s. Your inputs are unchanged.`);
      } else {
        setSolveState('error');
        setSolveError(msg);
      }
    }
  }, [state.input, catalogQ.data]);

  const solveRef = useRef(solve);
  solveRef.current = solve;

  // Auto-solve once on first load (never invokes AI).
  useEffect(() => {
    if (booted.current || !catalogQ.data) return;
    booted.current = true;
    if (!state.input) {
      const input = catalogQ.data.defaultInput;
      setState((s) => ({ ...s, input }));
      void solveRef.current(input);
    } else if (!state.result) {
      void solveRef.current(state.input);
    }
  }, [catalogQ.data, state.input, state.result]);

  // Any edit invalidates an in-flight solve so it can't overwrite newer inputs.
  const invalidatePending = useCallback(() => {
    reqId.current++;
    setSolveState((st) => (st === 'solving' ? 'idle' : st));
  }, []);
  const setInput = useCallback((input: PlannerInput) => { invalidatePending(); setState((s) => ({ ...s, input })); }, [invalidatePending]);
  const updateConstraints = useCallback((fn: (c: Constraint[]) => Constraint[]) => {
    invalidatePending();
    setState((s) => (s.input ? { ...s, input: { ...s.input, constraints: fn(s.input.constraints) } } : s));
  }, [invalidatePending]);

  const reset = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch { /* storage blocked */ }
    const input = catalogQ.data?.defaultInput ?? null;
    setState({ ...EMPTY, input });
    setSolveState('idle');
    if (input) void solveRef.current(input);
  }, [catalogQ.data]);

  const chosen = useMemo(() => {
    const r = state.result;
    if (!r) return null;
    return r.schedules.find((s) => s.id === state.chosenScheduleId) ?? r.schedules[0] ?? null;
  }, [state.result, state.chosenScheduleId]);

  const solvedInput = useMemo<PlannerInput | null>(() => {
    try { return state.solvedInputJson ? JSON.parse(state.solvedInputJson) : null; } catch { return null; }
  }, [state.solvedInputJson]);

  const value: Ctx = {
    catalog: catalogQ.data,
    catalogLoading: catalogQ.isLoading,
    catalogError: catalogQ.error,
    refetchCatalog: () => void catalogQ.refetch(),
    input: state.input,
    setInput,
    updateConstraints,
    result: state.result,
    solveState,
    solveError,
    solve,
    dirty: !!state.input && JSON.stringify(state.input) !== state.solvedInputJson,
    solvedInput,
    chosen,
    chooseSchedule: (id) => setState((s) => ({ ...s, chosenScheduleId: id })),
    checklist: state.checklist,
    toggleCheck: (k) => setState((s) => ({ ...s, checklist: { ...s.checklist, [k]: !s.checklist[k] } })),
    reset,
    storageError,
    onboarded: state.onboarded,
    setOnboarded: (v) => setState((s) => ({ ...s, onboarded: v })),
  };

  return <PlannerCtx.Provider value={value}>{children}</PlannerCtx.Provider>;
}

export function usePlanner() {
  const c = useContext(PlannerCtx);
  if (!c) throw new Error('usePlanner outside provider');
  return c;
}
