import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const formatter = new Intl.NumberFormat('de-DE');
const number = (value) => Number.isFinite(value) ? formatter.format(value) : '–';
const duration = (item) => {
  if (item.workSeconds === null) return item.minutes == null ? '–' : `${number(item.minutes)} Min. bis Abnahme`;
  const minutes = Math.floor(item.workSeconds / 60);
  const seconds = item.workSeconds % 60;
  return minutes ? `${number(minutes)} Min. ${number(seconds)} Sek.` : `${number(seconds)} Sek.`;
};
const strategies = { fresh: 'Frischer Chat', continued: 'Fortgesetzter Chat' };
const stepTypes = { implementation: 'Umsetzung', feedback: 'Feedback', handoff: 'Übergabe' };

function TokenCount({ item }) {
  return <>{number(item.tokens)} {item.partialUsage &&
    <span className="muted">· teilweise gemessen</span>}
    {item.quota && <span className="quota muted">5 h · +{number(item.quota.after - item.quota.before)} %</span>}
  </>;
}

function PackageRows({ item }) {
  const [expanded, setExpanded] = useState(false);
  return <>
    <tr>
      <th scope="row">{item.subtasks.length ? <Button className="package-toggle"
        aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>{item.name}
      </Button> : item.name}</th>
      <td>{item.epic || '–'}</td><td>{number(item.points)}</td><td>{strategies[item.strategy] ?? '–'}</td>
      <td><span className={item.completed ? 'badge accepted' : 'badge'}>{item.accepted ? 'Abgenommen' : item.completed ? 'Erledigt' : 'Offen'}</span></td>
      <td><TokenCount item={item}/></td><td>{duration(item)}</td><td>{number(item.correctionRounds)}</td>
    </tr>
    {expanded && item.subtasks.map((step) => <tr key={step.key} className="package-step">
      <th scope="row" colSpan={4}><span className="muted">{stepTypes[step.kind]} · </span>{step.name}</th>
      <td></td><td><TokenCount item={step}/></td><td>{duration(step)}</td><td></td>
    </tr>)}
  </>;
}

function Metric({ title, value, detail }) {
  return <Card className="metric">
    <h2>{title}</h2>
    <strong>{typeof value === 'string' ? value : number(value)}</strong>
    <p>{detail}</p>
  </Card>;
}

function Table({ label, columns, children }) {
  return <div className="table-scroll" tabIndex={0} role="region" aria-label={label}>
    <table aria-label={label}>
      <thead><tr>{columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{children}</tbody>
    </table>
  </div>;
}

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState('all');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function refresh() {
      setLoading(true);
      setError('');
      try {
        const query = scope === 'all' ? '' : '?' + new URLSearchParams({ epic: scope === 'none' ? '' : scope.slice(5) });
        const response = await fetch('/api/analytics' + query, { signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        setData(result);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    refresh();
    return () => controller.abort();
  }, [scope, revision]);

  const completed = data?.items.filter((item) => item.completed).length ?? 0;
  const timed = data?.items.filter((item) => item.workSeconds !== null) ?? [];
  const workSeconds = timed.length ? timed.reduce((sum, item) => sum + item.workSeconds, 0) : null;
  return <main>
    <header className="page-header">
      <div>
        <p className="eyebrow">CONTEXT STARTER <span> / </span> LOKALE TELEMETRIE</p>
        <h1>AI Analytics</h1>
        <p className="subtitle">Tokenverbrauch und Aufwand pro Arbeitspaket.</p>
      </div>
      <Button disabled={loading} onClick={() => setRevision(revision + 1)}>Aktualisieren</Button>
    </header>

    <p className="status" role="status">{loading ? 'Messdaten werden geladen …' : data?.project}</p>
    {error && <p className="notice" role="alert">Daten konnten nicht geladen werden. {error}</p>}
    {data && <>
      <label className="epic-filter">Epic
        <select value={scope} onChange={(event) => setScope(event.target.value)}>
          <option value="all">Alle Epics</option>
          <option value="none">Ohne Epic</option>
          {data.epics.map((epic) => <option key={epic} value={'epic:' + epic}>{epic}</option>)}
        </select>
      </label>
      {!data.hasLog && <p className="notice">Noch kein Verbrauchslog. Sobald der Mess-Hook Daten schreibt, erscheinen sie hier.</p>}
      {data.skipped > 0 && <p className="notice">{number(data.skipped)} ungültige Logzeilen übersprungen. Der Vergleich ist bis zur Korrektur ausgeblendet.</p>}
      <div className="metrics">
        <Metric title="Erfasste Tokens" value={data.tokens} detail={`${number(data.measured)} von ${number(data.attempts)} Versuchen mit Zähler`} />
        <Metric title="Modellversuche" value={data.attempts} detail={scope === 'all' ? 'Alle lesbaren Logeinträge' : 'Zugeordnete Logeinträge'} />
        <Metric title="Arbeitsdauer" value={duration({ workSeconds })} detail={`Für ${number(timed.length)} von ${number(data.items.length)} Paketen erfasst`} />
        <Metric title="Erledigte Pakete" value={completed} detail={`Von ${number(data.items.length)} erfassten Paketen`} />
      </div>

      <Card className="panel">
        <h2>Chat-Strategien im Vergleich</h2>
        <p>Median der Tokens für erledigte Pakete mit vollständigen Zählern, gruppiert nach Story Points und Modell.</p>
        {data.comparisons.length ? <Table label="Chat-Strategien" columns={['Punkte', 'Modell', 'Frischer Chat', 'Fortgesetzter Chat']}>
          {data.comparisons.map((row) => <tr key={JSON.stringify([row.points, row.model])}>
            <td>{row.points}</td><td>{row.model}</td>
            {[row.fresh, row.continued].map((group, index) => <td key={index}>
              {number(group.tokens)} <span className="muted">· {number(group.count)} Pakete</span>
            </td>)}
          </tr>)}
        </Table> : <p className="empty">Für den Vergleich fehlen erledigte Pakete mit zugeordneten Messdaten.</p>}
      </Card>

      <Card className="panel">
        <h2>Arbeitspakete</h2>
        <p>Die Paketzeile zeigt die Summe. Klappe sie auf, um die einzelnen Durchläufe zu sehen. 5 h zeigt, um wie viele Prozentpunkte der Verbrauchsstand des gesamten Kontos während des Durchlaufs gestiegen ist.</p>
        {data.items.length ? <Table label="Arbeitspakete" columns={['Paket', 'Epic', 'Punkte', 'Strategie', 'Status', 'Tokens', 'Arbeitsdauer', 'Korrekturen']}>
          {data.items.map((item) => <PackageRows key={item.id} item={item}/>)}
        </Table> : <p className="empty">{scope === 'all'
          ? <>Lege ein Paket in <code>.codex/context-packages.json</code> an, um es hier zu sehen.</>
          : 'Für diesen Filter sind keine Pakete erfasst.'}</p>}
      </Card>
    </>}
  </main>;
}

createRoot(document.getElementById('root')).render(<Dashboard />);
