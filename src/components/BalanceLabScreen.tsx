import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ClipboardCopy, Play, Square, X } from 'lucide-react';
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  DifficultyId,
  LEVEL_ORDER,
  LEVELS,
  LevelId,
} from '../data/level1';
import {
  DEFAULT_DIFFICULTY_DIAL_ROW,
  DifficultyDials,
} from '../lib/metrics';
import {
  formatLabResultsPlainText,
  isTargetCell,
  LAB_ACCURACIES,
  LabCellResult,
  LabWorkerMessage,
  LevelLabResult,
  TargetStatus,
} from '../balance/labTypes';
import { ReadingAccuracy, SimDials } from '../balance/sim';

interface BalanceLabScreenProps {
  defaultLevelId: LevelId;
  difficultyDials: DifficultyDials;
  onClose: () => void;
}

type SelectionValue = 'all' | LevelId;

function fmtPct(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

function fmtScale(val: number): string {
  return Number(val.toFixed(2)).toString();
}

function targetCellClasses(status?: TargetStatus): string {
  if (status === 'green') {
    return 'bg-emerald-950/55 ring-1 ring-inset ring-emerald-500/45';
  }
  if (status === 'yellow') {
    return 'bg-amber-950/50 ring-1 ring-inset ring-amber-400/45';
  }
  if (status === 'red') {
    return 'bg-rose-950/55 ring-1 ring-inset ring-rose-500/50';
  }
  return 'bg-slate-900/60 ring-1 ring-inset ring-slate-700/70';
}

function targetLabelClasses(status?: TargetStatus): string {
  if (status === 'green') return 'text-emerald-300';
  if (status === 'yellow') return 'text-amber-300';
  if (status === 'red') return 'text-rose-300';
  return 'text-slate-400';
}

export const BalanceLabScreen: React.FC<BalanceLabScreenProps> = ({
  defaultLevelId,
  difficultyDials,
  onClose,
}) => {
  const playableLevels = useMemo(
    () => LEVEL_ORDER.filter((id) => Boolean(LEVELS[id] && !LEVELS[id].comingSoon)),
    []
  );

  const initialSelection: SelectionValue = playableLevels.includes(defaultLevelId)
    ? defaultLevelId
    : playableLevels[0] || 'w1-l1';

  const [selection, setSelection] = useState<SelectionValue>(initialSelection);
  const [applyCustomDials, setApplyCustomDials] = useState(false);
  const [running, setRunning] = useState(false);
  const [runLevelIds, setRunLevelIds] = useState<LevelId[]>([]);
  const [resultsByLevel, setResultsByLevel] = useState<
    Partial<Record<LevelId, LevelLabResult>>
  >({});
  const [progress, setProgress] = useState<{
    completedUnits: number;
    totalUnits: number;
    levelId?: LevelId;
    difficulty?: DifficultyId;
    readingAccuracy?: ReadingAccuracy;
    phase: 'idle' | 'sim' | 'suggest' | 'done' | 'stopped';
  }>({ completedUnits: 0, totalUnits: 1, phase: 'idle' });
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const runIdRef = useRef(0);
  const startedAtRef = useRef(0);

  const customDialsActive = useMemo(() => {
    return DIFFICULTY_ORDER.some((d) => {
      const row = difficultyDials[d];
      return (
        row.healthPct !== DEFAULT_DIFFICULTY_DIAL_ROW.healthPct ||
        row.speedPct !== DEFAULT_DIFFICULTY_DIAL_ROW.speedPct ||
        row.countPct !== DEFAULT_DIFFICULTY_DIAL_ROW.countPct ||
        row.extraWords !== DEFAULT_DIFFICULTY_DIAL_ROW.extraWords
      );
    });
  }, [difficultyDials]);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      terminateWorker();
    };
  }, [terminateWorker]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 200);
    return () => window.clearInterval(id);
  }, [running]);

  const handleStop = useCallback(() => {
    terminateWorker();
    setRunning(false);
    setProgress((prev) => ({ ...prev, phase: 'stopped' }));
  }, [terminateWorker]);

  const handleRun = useCallback(() => {
    terminateWorker();
    setErrorMsg(null);
    setCopied(false);

    const targetIds: LevelId[] =
      selection === 'all' ? playableLevels : [selection];
    if (targetIds.length === 0) return;

    const nextRunId = runIdRef.current + 1;
    runIdRef.current = nextRunId;

    const initialMap: Partial<Record<LevelId, LevelLabResult>> = {};
    for (const id of targetIds) {
      initialMap[id] = {
        levelId: id,
        cells: {},
        suggestions: [],
        completed: false,
      };
    }

    setRunLevelIds(targetIds);
    setResultsByLevel(initialMap);
    setProgress({
      completedUnits: 0,
      totalUnits: Math.max(1, targetIds.length * 16 * 380),
      levelId: targetIds[0],
      difficulty: 'easy',
      readingAccuracy: 0.4,
      phase: 'sim',
    });
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setRunning(true);

    const worker = new Worker(
      new URL('../balance/labWorker.ts', import.meta.url),
      { type: 'module' }
    );
    workerRef.current = worker;

    worker.onmessage = (event: MessageEvent<LabWorkerMessage>) => {
      const msg = event.data;
      if (!msg || msg.runId !== runIdRef.current) return;

      if (msg.type === 'progress') {
        setProgress({
          completedUnits: msg.completedUnits,
          totalUnits: msg.totalUnits,
          levelId: msg.levelId,
          difficulty: msg.difficulty,
          readingAccuracy: msg.readingAccuracy,
          phase: msg.phase,
        });
      } else if (msg.type === 'cell') {
        const cell: LabCellResult = msg.cell;
        setResultsByLevel((prev) => {
          const existing = prev[cell.levelId] || {
            levelId: cell.levelId,
            cells: {},
            suggestions: [],
            completed: false,
          };
          const diffRow = {
            ...(existing.cells[cell.difficulty] || {}),
            [cell.readingAccuracy]: cell,
          };
          return {
            ...prev,
            [cell.levelId]: {
              ...existing,
              cells: {
                ...existing.cells,
                [cell.difficulty]: diffRow,
              },
            },
          };
        });
      } else if (msg.type === 'level_probing') {
        setResultsByLevel((prev) => {
          const existing = prev[msg.levelId];
          if (!existing) return prev;
          return {
            ...prev,
            [msg.levelId]: { ...existing, probingSuggestions: true },
          };
        });
      } else if (msg.type === 'level_done') {
        setResultsByLevel((prev) => {
          const existing = prev[msg.levelId];
          if (!existing) return prev;
          return {
            ...prev,
            [msg.levelId]: {
              ...existing,
              suggestions: msg.suggestions,
              recommendedStartCrystals: msg.recommendedStartCrystals,
              recommendedBalance: msg.recommendedBalance,
              probingSuggestions: false,
              completed: true,
            },
          };
        });
      } else if (msg.type === 'done') {
        setElapsedMs(msg.elapsedMs);
        setProgress((prev) => ({
          ...prev,
          completedUnits: prev.totalUnits,
          phase: 'done',
        }));
        setRunning(false);
        terminateWorker();
      } else if (msg.type === 'error') {
        setErrorMsg(msg.message);
        setRunning(false);
        setProgress((prev) => ({ ...prev, phase: 'stopped' }));
        terminateWorker();
      }
    };

    worker.onerror = (err) => {
      setErrorMsg(err.message || 'Balance worker encountered an error.');
      setRunning(false);
      setProgress((prev) => ({ ...prev, phase: 'stopped' }));
      terminateWorker();
    };

    const dialsByDifficulty: Partial<Record<DifficultyId, SimDials>> | undefined =
      customDialsActive && applyCustomDials ? difficultyDials : undefined;

    worker.postMessage({
      type: 'run',
      runId: nextRunId,
      levelIds: targetIds,
      dialsByDifficulty,
      seed: 101,
    });
  }, [
    applyCustomDials,
    customDialsActive,
    difficultyDials,
    playableLevels,
    selection,
    terminateWorker,
  ]);

  const hasAnyCell = useMemo(() => {
    return runLevelIds.some((id) => {
      const res = resultsByLevel[id];
      if (!res) return false;
      return DIFFICULTY_ORDER.some((d) => {
        const row = res.cells[d];
        return row && LAB_ACCURACIES.some((acc) => Boolean(row[acc]));
      });
    });
  }, [resultsByLevel, runLevelIds]);

  const handleCopyResults = useCallback(async () => {
    if (!hasAnyCell) return;
    const text = formatLabResultsPlainText(runLevelIds, resultsByLevel);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  }, [hasAnyCell, resultsByLevel, runLevelIds]);

  const pctRatio =
    progress.totalUnits > 0
      ? Math.min(1, Math.max(0, progress.completedUnits / progress.totalUnits))
      : 0;
  const pctDisplay = Math.round(pctRatio * 100);

  const statusLine = useMemo(() => {
    if (progress.phase === 'idle') return '';
    if (progress.phase === 'done') {
      return `Finished ${runLevelIds.length} ${runLevelIds.length === 1 ? 'level' : 'levels'}`;
    }
    if (progress.phase === 'stopped') {
      return 'Stopped early. Partial results are shown below.';
    }
    const lv = progress.levelId ? LEVELS[progress.levelId] : null;
    const lvLabel = lv ? `${lv.id.toUpperCase()} (${lv.name})` : '';
    if (progress.phase === 'suggest') {
      const dLabel = progress.difficulty
        ? ` · ${DIFFICULTIES[progress.difficulty].label}`
        : '';
      return `Finding green settings for ${lvLabel}${dLabel}`;
    }
    const dLabel = progress.difficulty
      ? DIFFICULTIES[progress.difficulty].label
      : '';
    const aLabel =
      progress.readingAccuracy !== undefined
        ? `${fmtPct(progress.readingAccuracy)} reading`
        : '';
    return `Testing ${lvLabel} · ${dLabel} · ${aLabel}`;
  }, [progress, runLevelIds.length]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f1a] text-slate-100 select-text">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-4 border-b border-slate-800 px-6 py-3.5 shrink-0">
        <div className="flex items-baseline gap-3 min-w-0">
          <h1 className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
            Balance Lab
          </h1>
          <span className="text-xs text-slate-400 whitespace-nowrap">
            Builder Mode only · Good (75th pct) to Optimal target average
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            terminateWorker();
            onClose();
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white transition-colors cursor-pointer shrink-0"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>
      </header>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0f1524] px-6 py-3 shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300">
            <span className="font-medium text-slate-400">Level</span>
            <select
              value={selection}
              disabled={running}
              onChange={(e) => setSelection(e.target.value as SelectionValue)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-100 focus:border-cyan-400 focus:outline-none disabled:opacity-50"
            >
              <option value="all">
                All levels ({playableLevels.length})
              </option>
              {playableLevels.map((id) => {
                const lv = LEVELS[id];
                return (
                  <option key={id} value={id}>
                    {lv.id.toUpperCase()} · {lv.worldName} L{lv.num}: {lv.name}
                  </option>
                );
              })}
            </select>
          </label>

          {!running ? (
            <button
              type="button"
              onClick={handleRun}
              className="inline-flex items-center gap-1.5 rounded-md bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Run
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStop}
              className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/70 bg-rose-500/15 px-3.5 py-1.5 text-xs font-semibold text-rose-200 hover:bg-rose-500/25 transition-colors cursor-pointer"
            >
              <Square className="h-3 w-3 fill-current" />
              Stop
            </button>
          )}

          <button
            type="button"
            disabled={!hasAnyCell}
            onClick={handleCopyResults}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-cyan-400/70 hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                Copied
              </>
            ) : (
              <>
                <ClipboardCopy className="h-3.5 w-3.5" />
                Copy results
              </>
            )}
          </button>

          {customDialsActive && (
            <label className="inline-flex items-center gap-2 text-xs text-amber-300 cursor-pointer">
              <input
                type="checkbox"
                checked={applyCustomDials}
                disabled={running}
                onChange={(e) => setApplyCustomDials(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900 accent-amber-400"
              />
              <span>Apply active Builder difficulty dials</span>
            </label>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span>Target diagonal: Easy 40% · Normal 60% · Hard 80% · Expert 100%</span>
          <span className="text-emerald-300">Green: Win, 30% to 70% Anchor</span>
          <span className="text-amber-300">Yellow: Close</span>
          <span className="text-rose-300">Red: Lost or &gt;85% Anchor</span>
        </div>
      </div>

      {/* Progress Strip */}
      {progress.phase !== 'idle' && (
        <div className="border-b border-slate-800 bg-[#0d1220] px-6 py-2.5 shrink-0">
          <div className="flex items-center justify-between gap-4 text-xs mb-1.5">
            <span className="text-slate-200 truncate">{statusLine}</span>
            <div className="flex items-center gap-3 font-mono tabular-nums text-slate-300 shrink-0">
              <span>{pctDisplay}%</span>
              <span className="text-slate-500">
                {(elapsedMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-sm bg-slate-800">
            <div
              className={`h-full w-full origin-left transition-transform duration-150 ${
                progress.phase === 'done'
                  ? 'bg-emerald-400'
                  : progress.phase === 'stopped'
                    ? 'bg-amber-400'
                    : 'bg-cyan-400'
              }`}
              style={{ transform: `scaleX(${pctRatio})` }}
            />
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="border-b border-rose-500/40 bg-rose-950/50 px-6 py-2.5 text-xs text-rose-200 shrink-0">
          {errorMsg}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {runLevelIds.length === 0 ? (
          <div className="max-w-2xl rounded-lg border border-slate-800 bg-[#131929] p-6">
            <h2 className="text-sm font-semibold text-white">
              Ready to test level balance
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
              Pick a single level or All levels above and press Run. Each cell runs
              the headless robot player in a background Web Worker across 200 random
              plans plus 3 refinement rounds on the top 20, then reports the average
              of the good (75th percentile) and optimal plans. Any red target cell
              receives tested startCrystals and balance suggestions.
            </p>
          </div>
        ) : (
          runLevelIds.map((levelId) => {
            const level = LEVELS[levelId];
            const res = resultsByLevel[levelId];
            if (!level || !res) return null;

            const bal = level.balance;
            const balSummary = bal
              ? `E ${fmtScale(bal.easy)} / N ${fmtScale(bal.normal)} / H ${fmtScale(bal.hard)} / X ${fmtScale(bal.expert)}`
              : '1.0 default';

            return (
              <section
                key={levelId}
                className="rounded-lg border border-slate-800 bg-[#131929] overflow-hidden"
              >
                {/* Level Header */}
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-800 px-4 py-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="font-mono text-xs font-semibold text-cyan-300">
                      {level.id.toUpperCase()}
                    </span>
                    <h2 className="text-sm font-semibold text-white">
                      {level.worldName} Level {level.num}: {level.name}
                    </h2>
                  </div>
                  <div className="font-mono tabular-nums text-[11px] text-slate-400">
                    startCrystals {level.startCrystals} · anchor {level.anchor} · waves{' '}
                    {level.waves.length} · balance {balSummary}
                  </div>
                </div>

                {/* 4x4 Results Table */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-800 text-[11px] font-medium text-slate-400">
                        <th className="py-2.5 pl-4 pr-3 w-32">Difficulty</th>
                        {LAB_ACCURACIES.map((acc) => (
                          <th key={acc} className="px-3 py-2.5 font-mono tabular-nums">
                            Reading {fmtPct(acc)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {DIFFICULTY_ORDER.map((diff) => {
                        const diffCfg = DIFFICULTIES[diff];
                        return (
                          <tr key={diff}>
                            <th className="py-3 pl-4 pr-3 align-top">
                              <div className="text-xs font-semibold text-slate-100">
                                {diffCfg.label}
                              </div>
                              <div className="mt-0.5 font-mono tabular-nums text-[11px] text-slate-500">
                                scale {fmtScale(level.balance?.[diff] ?? 1)}
                              </div>
                            </th>
                            {LAB_ACCURACIES.map((acc) => {
                              const cell = res.cells[diff]?.[acc];
                              const target = isTargetCell(diff, acc);
                              const isCurrent =
                                running &&
                                progress.phase === 'sim' &&
                                progress.levelId === levelId &&
                                progress.difficulty === diff &&
                                progress.readingAccuracy === acc;

                              if (!cell) {
                                return (
                                  <td
                                    key={acc}
                                    className={`px-3 py-3 align-top ${
                                      target ? 'bg-slate-900/50' : ''
                                    }`}
                                  >
                                    <div className="font-mono text-xs text-slate-500">
                                      {isCurrent ? 'Running...' : 'Waiting'}
                                    </div>
                                    {target && (
                                      <div className="mt-0.5 text-[11px] text-slate-600">
                                        Target cell
                                      </div>
                                    )}
                                  </td>
                                );
                              }

                              return (
                                <td
                                  key={acc}
                                  className={`px-3 py-3 align-top ${
                                    target ? targetCellClasses(cell.targetStatus) : ''
                                  }`}
                                >
                                  <div className="flex items-baseline justify-between gap-2">
                                    <span className="font-mono tabular-nums text-xs font-semibold text-white">
                                      {fmtPct(cell.winRate)} win · {fmtPct(cell.anchorPct)}{' '}
                                      Anchor
                                    </span>
                                    {target && cell.targetLabel && (
                                      <span
                                        className={`text-[11px] font-semibold whitespace-nowrap ${targetLabelClasses(
                                          cell.targetStatus
                                        )}`}
                                      >
                                        {cell.targetLabel}
                                      </span>
                                    )}
                                  </div>
                                  <div className="mt-1 font-mono tabular-nums text-[11px] text-slate-400">
                                    Opt {cell.optimalWon ? fmtPct(cell.optimalAnchorPct) : 'Loss'}{' '}
                                    · Good {cell.goodWon ? fmtPct(cell.goodAnchorPct) : 'Loss'}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Red Target Cell Suggestions */}
                {res.probingSuggestions && (
                  <div className="border-t border-slate-800 bg-[#0f1524] px-4 py-3 text-xs text-cyan-300">
                    Testing startCrystals and balance numbers for red target cells...
                  </div>
                )}

                {!res.probingSuggestions && res.suggestions.length > 0 && (
                  <div className="border-t border-slate-800 bg-[#0f1524] px-4 py-3.5 space-y-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-xs font-semibold text-rose-200">
                        Suggested changes for red target cells
                      </h3>
                      {res.recommendedStartCrystals !== undefined &&
                        res.recommendedBalance !== undefined && (
                          <code className="font-mono tabular-nums text-[11px] text-emerald-300">
                            startCrystals: {res.recommendedStartCrystals}, balance: {'{ '}
                            easy: {res.recommendedBalance.easy.toFixed(2)}, normal:{' '}
                            {res.recommendedBalance.normal.toFixed(2)}, hard:{' '}
                            {res.recommendedBalance.hard.toFixed(2)}, expert:{' '}
                            {res.recommendedBalance.expert.toFixed(2)}
                            {' }'}
                          </code>
                        )}
                    </div>

                    <div className="divide-y divide-slate-800/70 text-xs">
                      {res.suggestions.map((s) => (
                        <div
                          key={`${s.difficulty}-${s.readingAccuracy}`}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-1.5"
                        >
                          <div className="flex flex-wrap items-baseline gap-2">
                            <span className="font-semibold text-slate-100">
                              {DIFFICULTIES[s.difficulty].label} @{' '}
                              {fmtPct(s.readingAccuracy)}
                            </span>
                            <span className="text-[11px] text-rose-300">
                              {s.currentStatusLabel} ({fmtPct(s.currentWinRate)} win,{' '}
                              {fmtPct(s.currentAnchorPct)} Anchor)
                            </span>
                          </div>
                          <div className="flex flex-wrap items-baseline gap-3 font-mono tabular-nums text-[11px]">
                            <span className="text-slate-300">
                              startCrystals {s.currentStartCrystals} -&gt;{' '}
                              <strong className="text-white">
                                {s.suggestedStartCrystals}
                              </strong>
                            </span>
                            <span className="text-slate-300">
                              balance {s.currentBalanceScale.toFixed(2)} -&gt;{' '}
                              <strong className="text-white">
                                {s.suggestedBalanceScale.toFixed(2)}
                              </strong>
                            </span>
                            <span className={targetLabelClasses(s.predictedStatus)}>
                              Est {fmtPct(s.predictedWinRate)} win ·{' '}
                              {fmtPct(s.predictedAnchorPct)} Anchor ({s.predictedLabel})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })
        )}
      </main>
    </div>
  );
};
