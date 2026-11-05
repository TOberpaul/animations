import { createReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { createInterface } from 'node:readline';

function quota(payload) {
  const limits = payload.rate_limits;
  if (limits?.limit_id && limits.limit_id !== 'codex') return null;
  const window = [limits?.primary, limits?.secondary].find((entry) => entry?.window_minutes === 300);
  return Number.isFinite(window?.used_percent) && Number.isFinite(window.resets_at)
    ? { used: window.used_percent, resetsAt: window.resets_at } : null;
}

async function* files(directory, sessions, depth = 0) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'EACCES' || error.code === 'EPERM') return;
    throw error;
  }
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (depth < 3 && entry.isDirectory() && /^\d{2,4}$/.test(entry.name)) yield* files(path, sessions, depth + 1);
    if (!entry.isFile() || !entry.name.startsWith('rollout-')) continue;
    const id = entry.name.match(/([\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12})\.jsonl$/i)?.[1];
    if (sessions.has(id)) yield { id, path };
  }
}

export async function readRolloutUsage(directory, packages) {
  const sessions = new Map();
  for (const item of packages) {
    for (const step of Array.isArray(item?.subtasks) ? item.subtasks : []) {
      if (!step?.sessionId || !step.turnId) continue;
      if (!sessions.has(step.sessionId)) sessions.set(step.sessionId, new Set());
      sessions.get(step.sessionId).add(step.turnId);
    }
  }
  const rows = [];
  const quotas = new Map();
  if (!sessions.size) return { rows, quotas };
  for await (const { id, path } of files(directory, sessions)) {
    const turns = sessions.get(id);
    sessions.delete(id);
    let current, model, before, latest, previousTotal;
    const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });
    try {
      for await (const line of lines) {
        if (!line.includes('"token_count"') && !line.includes('"task_started"') &&
            !line.includes('"task_complete"') && !line.includes('"turn_context"')) continue;
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        const payload = event?.payload;
        if (!payload) continue;
        if (event.type === 'turn_context' && payload.turn_id === current) model = payload.model;
        if (event.type !== 'event_msg') continue;
        if (payload.type === 'task_started') {
          current = payload.turn_id;
          model = null;
          before = latest;
        } else if (payload.type === 'task_complete' && payload.turn_id === current) {
          if (turns.has(current) && before && latest && before !== latest &&
              Math.abs(before.resetsAt - latest.resetsAt) <= 2 && latest.used >= before.used) {
            quotas.set(JSON.stringify([id, current]), { before: before.used, after: latest.used });
          }
          current = null;
        } else if (payload.type === 'token_count') {
          latest = quota(payload) ?? latest;
          const cumulative = payload.info?.total_token_usage?.total_tokens;
          if (!Number.isSafeInteger(cumulative) || cumulative === previousTotal) continue;
          const last = payload.info?.last_token_usage?.total_tokens;
          if (turns.has(current) && Number.isSafeInteger(last) && last >= 0) {
            rows.push({ sessionId: id, turnId: current, model, tokens: last });
          }
          previousTotal = cumulative;
        }
      }
    } finally {
      lines.close();
    }
    if (!sessions.size) break;
  }
  return { rows, quotas };
}
