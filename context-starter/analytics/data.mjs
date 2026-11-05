import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

const count = (value) => Number.isSafeInteger(value) && value >= 0;

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

export async function readAnalytics(project) {
  const read = (file) => readFile(join(project, '.codex', file), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  const [usage, packagesFile] = await Promise.all([read('context-usage.jsonl'), read('context-packages.json')]);
  const packages = packagesFile === null ? [] : JSON.parse(packagesFile.replace(/^\uFEFF/, ''));
  if (!Array.isArray(packages)) throw new Error('context-packages.json muss ein JSON-Array enthalten.');

  const attempts = [];
  const bySession = new Map();
  let skipped = 0;
  for (const line of (usage ?? '').split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      if (!event || typeof event !== 'object' || Array.isArray(event)) throw new Error();
      const row = { ...event, tokens: totalTokens(event.tokenUsage) };
      attempts.push(row);
      if (row.sessionId) {
        if (!bySession.has(row.sessionId)) bySession.set(row.sessionId, []);
        bySession.get(row.sessionId).push(row);
      }
    } catch {
      skipped++;
    }
  }

  const groups = new Map();
  const items = packages.map((item, index) => {
    if (!item || typeof item.id !== 'string' || !Array.isArray(item.sessionIds) ||
        (item.turnIds !== undefined && !Array.isArray(item.turnIds))) {
      throw new Error(`Ungültiger Eintrag ${index + 1} in context-packages.json.`);
    }
    const rows = [...new Set(item.sessionIds)].flatMap((id) => bySession.get(id) ?? [])
      .filter((row) => item.turnIds === undefined || item.turnIds.includes(row.turnId));
    const models = [...new Set(rows.map((row) => row.model))];
    const stats = totals(rows);
    const started = Date.parse(item.startedAt);
    const accepted = Date.parse(item.acceptedAt);
    const name = typeof item.name === 'string' ? item.name.trim() || item.id : item.id;
    const result = { ...stats, id: item.id, name, points: item.points, strategy: item.strategy,
      accepted: Number.isFinite(accepted), correctionRounds: item.correctionRounds,
      minutes: accepted >= started ? Math.round((accepted - started) / 60000) : null };
    const linked = item.turnIds === undefined
      ? item.sessionIds.every((id) => rows.some((row) => row.sessionId === id))
      : item.turnIds.every((id) => rows.some((row) => row.turnId === id));
    if (!skipped && linked && result.accepted && stats.tokens !== null && stats.attempts === stats.measured &&
        models.length === 1 && models[0] && [1, 2, 3, 5, 8, 13, 20].includes(item.points) &&
        ['fresh', 'continued'].includes(item.strategy)) {
      const key = JSON.stringify([item.points, models[0]]);
      if (!groups.has(key)) groups.set(key, { points: item.points, model: models[0], fresh: [], continued: [] });
      groups.get(key)[item.strategy].push(stats.tokens);
    }
    return result;
  });
  const comparisons = [...groups.values()].sort((a, b) => a.points - b.points).map((group) => ({
    ...group,
    fresh: { count: group.fresh.length, tokens: median(group.fresh) },
    continued: { count: group.continued.length, tokens: median(group.continued) },
  }));
  return { project: basename(project), hasLog: usage !== null, skipped, ...totals(attempts), items, comparisons };
}
