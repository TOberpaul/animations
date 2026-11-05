# Motion steering

Every visible part of an entering or exiting view must participate in its transition. Include headings, labels, icons, controls, dividers, and content rows when defining reveal and outgoing targets. Keep related elements such as a title and its back button in the same motion group.

Preserve the motion behavior's existing recipe, progression settings, and reduced-motion handling. When a view changes, verify the visible elements in both directions.

# MDK library principles

- Treat a concrete integration issue as a reproduction. Identify the general capability or invariant before changing the library API.
- Keep MDK independent of frameworks, component libraries, and consumers. Express reusable behavior through platform primitives and explicit contracts. Keep provider-specific selectors, event wiring, and workarounds in the integration or its example.
- Add a core capability only when it applies to a class of components or layouts. Verify it in materially different configurations and preserve existing defaults unless a change is explicitly requested.
- Use `$mdk-release` for every MDK npm release. Keep package documentation, public website and hosted MCP aligned with the release.

# Projektwissen und Arbeitspakete

- Vor Änderungen die lokalen `AGENTS.md` entlang der betroffenen Pfade lesen. Dauerhafte Entscheidungen, Invarianten und Prüfschritte im selben Arbeitsschritt im engsten passenden Ordner festhalten.
- Bei unklarer Zuständigkeit `INHALT.md` lesen. Neue, verschobene oder entfernte Einstiegspunkte in der passenden Karte mitpflegen.
- Umsetzungspakete vor Beginn in einer Zeile relativ schätzen. Nutze 1 (lokal und klar), 2 (begrenzte Untersuchung), 3 (bereichsübergreifend), 5 (grundlegend), 8 (mehrere gekoppelte Änderungen), 13 (großer Umbau) oder 20 (sehr großer oder unsicherer Umbau). Umfang, Unsicherheit und Prüfaufwand berücksichtigen. Die Startschätzung bleibt erhalten.
- Wenn `.codex/context-packages.json` vorhanden ist, für jedes neue Umsetzungspaket einen Datensatz mit selbst abgeleitetem Titel (`name`), Startschätzung (`points`), Strategie und Startzeit anlegen. Jeden zugehörigen Durchlauf genau einmal in `subtasks` erfassen, mit kurzem `name`, `kind` (`implementation`, `feedback` oder `handoff`), `sessionId`, `turnId` und gemessenen `workSeconds`. Das Dashboard summiert die Teilaufgaben und verknüpft die Token-Zähler aus dem Hook.
- Feedback, Nachbesserungen und Übergaben zur selben Aufgabe dem bestehenden Paket zuordnen. Titel und Startschätzung beibehalten. Bei offener Arbeit `completedAt` auf `null` setzen und beim Abschluss der Umsetzung den Zeitstempel eintragen. Eine ausdrückliche Abnahme separat in `acceptedAt` erfassen.
- Zusammengehörige Pakete über das optionale Feld `epic` gruppieren. Bei eindeutigem Bezug den vorhandenen Epic-Namen wiederverwenden.
- Eigenständige Pakete in einem frischen Chat bearbeiten. Bei längeren Paketen am geprüften Zwischenstand früh einen Wechsel vorschlagen, sobald eine kurze Übergabe reicht. Für eine angeforderte Übergabe `$resume-work` verwenden.

