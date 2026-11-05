import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const formatter = new Intl.NumberFormat('de-DE');
const number = (value) => Number.isFinite(value) ? formatter.format(value) : '–';
const strategies = { fresh: 'Frischer Chat', continued: 'Fortgesetzter Chat' };

function Metric({ title, value, detail }) {
  return <Card className="metric">
    <h2>{title}</h2>
    <strong>{number(value)}</strong>
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

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/analytics');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setData(result);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  const accepted = data?.items.filter((item) => item.accepted).length ?? 0;
  return <main>
    <header className="page-header">
      <div>
        <p className="eyebrow">CONTEXT STARTER <span> / </span> LOKALE TELEMETRIE</p>
        <h1>AI Analytics</h1>
        <p className="subtitle">Tokenverbrauch und Aufwand pro Arbeitspaket.</p>
      </div>
      <Button disabled={loading} onClick={refresh}>Aktualisieren</Button>
    </header>

    <p className="status" role="status">{loading ? 'Messdaten werden geladen …' : data?.project}</p>
    {error && <p className="notice" role="alert">Daten konnten nicht geladen werden. {error}</p>}
    {data && <>
      {!data.hasLog && <p className="notice">Noch kein Verbrauchslog. Sobald der Mess-Hook Daten schreibt, erscheinen sie hier.</p>}
      {data.skipped > 0 && <p className="notice">{number(data.skipped)} ungültige Logzeilen übersprungen. Der Vergleich ist bis zur Korrektur ausgeblendet.</p>}
      <div className="metrics">
        <Metric title="Erfasste Tokens" value={data.tokens} detail={`${number(data.measured)} von ${number(data.attempts)} Versuchen mit Zähler`} />
        <Metric title="Modellversuche" value={data.attempts} detail="Alle lesbaren Logeinträge" />
        <Metric title="Abgenommene Pakete" value={accepted} detail={`Von ${number(data.items.length)} erfassten Paketen`} />
      </div>

      <Card className="panel">
        <h2>Chat-Strategien im Vergleich</h2>
        <p>Median der Tokens für abgenommene Pakete mit vollständigen Zählern, gruppiert nach Story Points und Modell.</p>
        {data.comparisons.length ? <Table label="Chat-Strategien" columns={['Punkte', 'Modell', 'Frischer Chat', 'Fortgesetzter Chat']}>
          {data.comparisons.map((row) => <tr key={JSON.stringify([row.points, row.model])}>
            <td>{row.points}</td><td>{row.model}</td>
            {[row.fresh, row.continued].map((group, index) => <td key={index}>
              {number(group.tokens)} <span className="muted">· {number(group.count)} Pakete</span>
            </td>)}
          </tr>)}
        </Table> : <p className="empty">Für den Vergleich fehlen abgenommene Pakete mit zugeordneten Messdaten.</p>}
      </Card>

      <Card className="panel">
        <h2>Arbeitspakete</h2>
        <p>Erfasster Verbrauch inklusive zugeordneter Fehlversuche und Übergaben.</p>
        {data.items.length ? <Table label="Arbeitspakete" columns={['Paket', 'Punkte', 'Strategie', 'Status', 'Tokens', 'Dauer', 'Korrekturen']}>
          {data.items.map((item) => <tr key={item.id}>
            <th scope="row">{item.name}</th><td>{number(item.points)}</td><td>{strategies[item.strategy] ?? '–'}</td>
            <td><span className={item.accepted ? 'badge accepted' : 'badge'}>{item.accepted ? 'Abgenommen' : 'Offen'}</span></td>
            <td>{number(item.tokens)} {item.attempts > 0 && item.measured < item.attempts &&
              <span className="muted">· {number(item.measured)}/{number(item.attempts)} gemessen</span>}</td>
            <td>{item.minutes === null ? '–' : `${number(item.minutes)} Min.`}</td>
            <td>{number(item.correctionRounds)}</td>
          </tr>)}
        </Table> : <p className="empty">Lege ein Paket in <code>.codex/context-packages.json</code> an, um es hier zu sehen.</p>}
      </Card>
    </>}
  </main>;
}

createRoot(document.getElementById('root')).render(<Dashboard />);
