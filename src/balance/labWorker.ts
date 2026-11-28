// Web Worker for the Builder-only Balance Lab.
// Runs the headless balance bot off the main thread so the UI never freezes,
// streaming W1-L1 targets, cell results, progress updates, and verified
// suggestions for any red target cells.

import { runBalanceLab } from './labRunner';
import { LabWorkerMessage, LabWorkerRunRequest } from './labTypes';

function post(msg: LabWorkerMessage): void {
  self.postMessage(msg);
}

self.onmessage = (event: MessageEvent<LabWorkerRunRequest>) => {
  const req = event.data;
  if (!req || req.type !== 'run') return;

  try {
    runBalanceLab({
      runId: req.runId,
      levelIds: req.levelIds,
      dialsByDifficulty: req.dialsByDifficulty,
      seed: req.seed ?? 101,
      emit: post,
    });
  } catch (err) {
    post({
      type: 'error',
      runId: req.runId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
};
