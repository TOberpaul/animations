# Context Starter für Codex

## In ein neues Projekt übernehmen

1. Kopiere den Abschnitt aus `starter/AGENTS.md` in die `AGENTS.md` der Projektwurzel. Ergänze bei Bedarf bestehende Regeln.
2. Kopiere `starter/.agents/skills/resume-work` nach `.agents/skills/resume-work` im Zielprojekt.
3. Codex legt lokale `AGENTS.md` bei neuen Ressourcen mit dauerhaftem Wissen an und aktualisiert sie bei Änderungen im selben Arbeitsschritt. Ein Eintrag kann etwa lauten „Der Scrollbereich reicht bis zur Viewport-Oberkante. Der Abstand zum Header liegt im Scrollinhalt.“
4. Starte für ein eigenständiges Arbeitspaket einen frischen Chat. Für ein offenes Paket fordere mit `$resume-work` eine Übergabe an. Gib dem neuen Chat den Pfad dazu und öffne ihn im selben Checkout.

Die Regel in `AGENTS.md` lässt Codex die passende `INHALT.md` bei Änderungen an Bereichen und Einstiegspunkten mitpflegen und bei Bedarf anlegen. Eine Zeile wie „Benachrichtigungen → `src/notifications/`“ genügt. Bestehende Karten kannst du beim Einbau übernehmen.

## Optional · Verbrauch messen

Kopiere aus `telemetry/.codex/` die Datei `hooks/context-usage.cjs` und übernimm den Eintrag aus `hooks.json` in die entsprechende Projektdatei. Benötigt Git und Node.js im PATH. Prüfe und aktiviere den Hook in Codex unter **Settings → Hooks** oder mit `/hooks`. Die Konfiguration löst den Skriptpfad vom Git-Root auf.

Der Hook schreibt pro Modellversuch eine Zeile nach `.codex/context-usage.jsonl`. Er erfasst Zeitpunkt, Session, Turn, Modell, Agent, Status und die verfügbaren Token-Zähler. Prompts und Antworten bleiben aus dem Log. Fehlende Zähler stehen als `null` im Log. Füge `/.codex/context-usage.jsonl` zur lokalen Git-Ignore-Liste hinzu, etwa in `.git/info/exclude`.

### Datengrundlage für AI Analytics

Das lokale React-Dashboard liegt in `analytics/` und lässt sich unabhängig von diesem Projekt betreiben. Benötigt Node.js und npm. Installiere die Abhängigkeiten einmal und gib beim Start das auszuwertende Projektverzeichnis an:

```sh
npm --prefix "<Pfad zum Starter>/analytics" install
npm --prefix "<Pfad zum Starter>/analytics" start -- "<Pfad zum Zielprojekt>"
```

Öffne die ausgegebene localhost-Adresse. **Aktualisieren** liest die Dateien des Zielprojekts erneut. Das Dashboard zeigt erfasste Tokens, Arbeitspakete und den Effizienzindex. Die Dateien werden lokal gelesen.

The ticket overview groups unique tickets by epic and follows the dashboard's epic filter. Switch between ticket count, story points, recorded tokens and work time. Score distributions include unscored tickets, and the totals flag incomplete measurements.

The chat-context overview estimates starting context from input tokens divided by the model context window for the first recorded request in a ticket’s first implementation run. It includes that request’s prompt and compares completed tickets with the same starting model and story-point estimate. Switch between total tokens, work time and rework rounds. The dashboard suggests trying a fresh chat only when the below-25% baseline and two adjacent higher bands each have at least three token measurements and both higher medians exceed the baseline by at least 25%. This is a signal to test, and it does not start a new chat automatically.

Quota attribution coverage divides the measured quota use assigned to tickets by the highest observed account usage in each 5-hour window. The project total weights windows by their observed usage and stays the same when the epic filter changes. The remaining usage is split into measured runs without a ticket and usage without a matching measurement. Only snapshots available in the analysed Codex chats contribute. Windows where measured runs exceed observed account usage are flagged and excluded from the total.

Each measured window has its own quota bar. Hover or focus a segment for its share of that window’s full quota. Unused quota reflects the available snapshot. Zero-only snapshots can have a provisional reset and are excluded. The overall attribution score uses observed consumption as its denominator.

When a run has no direct quota association, its work interval places it in a window if it overlaps exactly one observed 5-hour window. Time-based placement leaves the run’s quota usage unknown.

Das Dashboard bewertet Tokenverbrauch und Arbeitsdauer getrennt. Für jede Kennzahl vergleicht es ein erledigtes Ticket mit mindestens zwei anderen erledigten Projekttickets derselben Story-Point-Stufe und vollständigen, positiven Messwerten. Die Formel pro Kennzahl lautet `100 × Median der Vergleichstickets / Messwert des Tickets`. Nacharbeit fließt über die jeweiligen Summen ein. Ab 110 ist die Bewertung grün, von 90 bis 109 gelb und unter 90 rot. Beide Bewertungen gelten für das gesamte Ticket und bleiben beim Epic-Filter und in geteilten 5-Stunden-Fenstern gleich.

Änderungen an React-Komponenten, CSS und der Datenaufbereitung laden den geöffneten Browser-Tab automatisch neu. Änderungen am Server-Einstiegspunkt `analytics/serve.mjs` erfordern einen Serverneustart.

Mit der Codex-Historie gruppiert das Dashboard die Arbeitspakete nach dem Reset-Zeitpunkt des 5-Stunden-Kontingents. Ein Ticket mit Durchläufen in mehreren Fenstern erscheint anteilig in jedem Fenster. Die Summe berücksichtigt die gemessenen Durchläufe der angezeigten Tickets und folgt dem Epic-Filter. Durchläufe ohne zuordenbaren Reset bleiben separat sichtbar.

Mit `--codex-history` am Ende des Startbefehls liest das Dashboard zusätzlich lokale Codex-Sitzungen zu den gespeicherten Teilaufgaben. Es übernimmt nur Verbrauchsdaten der zugeordneten Turns und zählt sie bei vorhandenen Hook-Daten einmal. Die 5‑Stunden-Anzeige verwendet verfügbare Kontostände aus demselben Limitfenster.

Kopiere `telemetry/.codex/context-packages.json` ins Projekt, um die Paketerfassung zu aktivieren. Codex legt einen Eintrag pro Paket an und erfasst jeden Durchlauf als Teilaufgabe. Session- und Turn-ID verbinden ihn mit den Token-Messwerten. Die aufgeklappte Paketzeile zeigt die einzelnen Durchläufe. Das Dashboard berechnet die Gesamtdauer, die Tokens und die Anzahl der Feedbackrunden daraus.

Kopiere für die Abschlussprüfung zusätzlich `hooks/context-package-check.cjs` und übernimm die Einträge für `UserPromptSubmit`, `Stop` und `Interrupt` aus der Hook-Vorlage. Prüfe und vertraue ihnen einmalig in Codex. Der Hook vergleicht den Git-Arbeitsstand zu Beginn und Ende des Turns. Bei erkannten Projektänderungen prüft er Schätzung und eindeutige Zuordnung und fordert bei einem fehlenden oder ungültigen Eintrag einmal zum Nachtragen auf. Die Prüfung arbeitet lokal. Parallele Änderungen im selben Checkout können ebenfalls einen Hinweis auslösen.

```json
{
  "id": "P-001",
  "name": "Aktiven TOC-Eintrag sichtbar halten",
  "epic": "Documentation Navigation",
  "points": 2,
  "strategy": "fresh",
  "startedAt": "2026-11-05T10:00:00Z",
  "completedAt": "2026-11-05T10:05:00Z",
  "acceptedAt": "2026-11-05T10:20:00Z",
  "subtasks": [
    { "name": "TOC-Verhalten umsetzen", "kind": "implementation", "sessionId": "erste-session", "turnId": "umsetzung", "workSeconds": 100 },
    { "name": "Scrollgrenze korrigieren", "kind": "feedback", "sessionId": "fortsetzung", "turnId": "korrektur", "workSeconds": 45 }
  ]
}
```

Codex leitet `name` beim Erfassen aus dem Aufgabenziel ab. Bei älteren Einträgen ohne Namen zeigt das Dashboard die Paket-ID. Verwende `fresh` oder `continued` für den Start des Pakets. `acceptedAt` bleibt bis zur Abnahme `null`. Zähle Fehlversuche, Übergabe und Neustart zum Paket. Vergleiche bei gleichem Modell und ähnlichen Aufgaben die Tokens bis zur Abnahme innerhalb derselben Punktestufe. Zeit und Korrekturrunden bleiben separat. Die Hook-Zähler lassen sich nicht zuverlässig in Prozentpunkte des 5‑Stunden-Kontingents umrechnen.

Der Einstieg nutzt manuelle Chat-Wechsel. Prüfe zunächst, ob die kurzen Übergaben funktionieren und der Gesamtverbrauch sinkt. Der Hook arbeitet ohne Modellaufruf und gibt keinen Text in den Chat zurück.
