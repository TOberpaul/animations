import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { readRolloutUsage } from './rollout.mjs';

const count = (value) => Number.isSafeInteger(value) && value >= 0;
const epicName = (item) => typeof item?.epic === 'string' ? item.epic.trim() : '';

function totalTokens(usage) {
  const total = usage?.total_tokens ?? usage?.totalTokens;
  if (count(total)) return total;
  const input = usage?.input_tokens ?? usage?.inputTokens;
  const output = usage?.output_tokens ?? usage?.outputTokens;
  return count(input) && count(output) ? input + output : null;
}

function totals(rows) {
  const measured = rows.filter((row) => row.tokens !== null);
  return {
    attempts: rows.length,
    measured: measured.length,
    tokens: measured.length ? measured.reduce((sum, row) => sum + row.tokens, 0) : null,
  };
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return (sorted[Math.floor(sorted.length / 2)] + sorted[Math.floor((sorted.length - 1) / 2)]) / 2;
}

export async function readAnalytics(project, epic = null, historyDirectory) {
  const read = (file) => readFile(join(project, '.codex', file), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  const [usage, packagesFile] = await Promise.all([read('context-usage.jsonl'), read('context-packages.json')]);
  const packages = packagesFile === null ? [] : JSON.parse(packagesFile.replace(/^\uFEFF/, ''));
  if (!Array.isArray(packages)) throw new Error('context-packages.json muss ein JSON-Array enthalten.');
  const epics = [...new Set(packages.map(epicName).filter(Boolean))].sort((a,b) => a.localeCompare(b, 'de'));
  const scopedAttempts = new Set();

  const history = historyDirectory ? await readRolloutUsage(historyDirectory, packages) : { rows: [], quotas: new Map() };
  const turnKey = (row) => JSON.stringify([row.sessionId, row.turnId]);
  const recovered = new Set(history.rows.map(turnKey));
  const attempts = [...history.rows];
  const bySession = new Map();
  let skipped = 0;
  for (const line of (usage ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error();
      const row = { ...event, tokens: totalTokens(event.tokenUsage) };
      if (!recovered.has(turnKey(row))) attempts.push(row);
    } catch {
      skipped++;
    }
  }
  for (const row of attempts) {
    if (!row.sessionId) continue;
    if (!bySession.has(row.sessionId)) bySession.set(row.sessionId, []);
    bySession.get(row.sessionId).push(row);
  }

  const groups = new Map();
  const items = packages.flatMap((item, index) => {
    if (epic !== null && epicName(item) !== epic) return [];
    if (!item || typeof item.id !== 'string' || (item.subtasks === undefined
      ? !Array.isArray(item.sessionIds) || (item.turnIds !== undefined && !Array.isArray(item.turnIds))
      : !Array.isArray(item.subtasks))) {
      throw new Error(`Ungültiger Eintrag ${index + 1} in context-packages.json.`);
    }
    const seen = new Set();
    const steps = item.subtasks?.map((step) => {
      if (!step || typeof step.sessionId !== 'string' || typeof step.turnId !== 'string' ||
          typeof step.name !== 'string' || !['implementation', 'feedback', 'handoff'].includes(step.kind)) {
        throw new Error(`Ungültige Teilaufgabe in Paket ${item.id}.`);
      }
      const key = JSON.stringify([step.sessionId, step.turnId]);
      if (seen.has(key)) throw new Error(`Doppelter Durchlauf in Paket ${item.id}.`);
      seen.add(key);
      const rows = (bySession.get(step.sessionId) ?? []).filter((row) => row.turnId === step.turnId);
      const stats = totals(rows);
      return { rows, detail: { key, name: step.name, kind: step.kind,
        workSeconds: count(step.workSeconds) ? step.workSeconds : null,
        tokens: stats.tokens, partialUsage: stats.tokens !== null && stats.measured < stats.attempts,
        quota: history.quotas.get(key) ?? null } };
    });
    const rows = steps ? steps.flatMap((step) => step.rows)
      : [...new Set(item.sessionIds)].flatMap((id) => bySession.get(id) ?? [])
        .filter((row) => item.turnIds === undefined || item.turnIds.includes(row.turnId));
    if (epic !== null) rows.forEach((row) => scopedAttempts.add(row));
    const subtasks = steps?.map((step) => step.detail) ?? [];
    const models = [...new Set(rows.map((row) => row.model))];
    const stats = totals(rows);
    const started = Date.parse(item.startedAt);
    const accepted = Date.parse(item.acceptedAt);
    const completed = Number.isFinite(Date.parse(item.completedAt)) ||
      (item.completedAt === undefined && Number.isFinite(accepted));
    const name = typeof item.name === 'string' ? item.name.trim() || item.id : item.id;
    const result = { ...stats, id: item.id, name, epic: epicName(item), points: item.points, strategy: item.strategy,
      completed, accepted: completed && Number.isFinite(accepted), subtasks, quota: subtasks.length === 1 ? subtasks[0].quota : null,
      correctionRounds: steps ? subtasks.filter((step) => step.kind === 'feedback').length : item.correctionRounds,
      workSeconds: steps
        ? subtasks.length && subtasks.every((step) => step.workSeconds !== null)
          ? subtasks.reduce((sum, step) => sum + step.workSeconds, 0) : null
        : count(item.workSeconds) ? item.workSeconds : null,
      minutes: !steps && accepted >= started ? Math.round((accepted - started) / 60000) : null };
    const linked = steps ? steps.every((step) => step.rows.length > 0) : item.turnIds === undefined
      ? item.sessionIds.every((id) => rows.some((row) => row.sessionId === id))
      : item.turnIds.every((id) => rows.some((row) => row.turnId === id));
    result.partialUsage = stats.tokens !== null && (!linked || stats.measured < stats.attempts);
    if (!skipped && linked && result.completed && stats.tokens !== null && stats.attempts === stats.measured &&
        models.length === 1 && models[0] && [1, 2, 3, 5, 8, 13, 20].includes(item.points) &&
        ['fresh', 'continued'].includes(item.strategy)) {
      const key = JSON.stringify([item.points, models[0]]);
      if (!groups.has(key)) groups.set(key, { points: item.points, model: models[0], fresh: [], continued: [] });
      groups.get(key)[item.strategy].push(stats.tokens);
    }
    return [result];
  });
  const comparisons = [...groups.values()].sort((a, b) => a.points - b.points).map((group) => ({
    ...group,
    fresh: { count: group.fresh.length, tokens: median(group.fresh) },
    continued: { count: group.continued.length, tokens: median(group.continued) },
  }));
  return { project: basename(project), hasLog: usage !== null || history.rows.length > 0, skipped, epics,
    ...totals(epic === null ? attempts : [...scopedAttempts]), items, comparisons };
}
