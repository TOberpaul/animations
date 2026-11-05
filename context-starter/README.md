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

Öffne die ausgegebene localhost-Adresse. **Aktualisieren** liest die Dateien des Zielprojekts erneut. Das Dashboard zeigt erfasste Tokens, Arbeitspakete und den Vergleich nach Story Points, Modell und Chat-Strategie. Die Dateien werden lokal gelesen.

Änderungen an React-Komponenten und CSS laden den geöffneten Browser-Tab automatisch neu. Nach Änderungen am Analytics-Server oder seiner Datenaufbereitung startest du den Server neu.

Mit `--codex-history` am Ende des Startbefehls liest das Dashboard zusätzlich lokale Codex-Sitzungen zu den gespeicherten Teilaufgaben. Es übernimmt nur Verbrauchsdaten der zugeordneten Turns und zählt sie bei vorhandenen Hook-Daten einmal. Die 5‑Stunden-Anzeige verwendet verfügbare Kontostände aus demselben Limitfenster.

Kopiere `telemetry/.codex/context-packages.json` ins Projekt, um die Paketerfassung zu aktivieren. Codex legt einen Eintrag pro Paket an und erfasst jeden Durchlauf als Teilaufgabe. Session- und Turn-ID verbinden ihn mit den Token-Messwerten. Die aufgeklappte Paketzeile zeigt die einzelnen Durchläufe. Das Dashboard berechnet die Gesamtdauer, die Tokens und die Anzahl der Feedbackrunden daraus.

```json
{
  "id": "P-001",
  "name": "Aktiven TOC-Eintrag sichtbar halten",
  "epic": "Dokumentationsnavigation",
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
