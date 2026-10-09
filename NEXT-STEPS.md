# Stand & nächste Schritte

**Stand vom 2026-10-06** · Branch `dev` · lokal, **nicht deployt** (der Live-Prototyp auf chatgpt.site ist unverändert)

## Wo wir stehen
- Das Frontend-Overhaul ist fertig und lokal getestet: Desktop, Tablet und Handy, hell und dunkel, offline. axe-core meldet 0 Verstöße, es gibt keine JS-Fehler.
- Details: `README.md` (Architektur, Deploy) und `GAP-ANALYSIS.md` (Abschnitt 0 zeigt den Umsetzungsstatus je Lücke).
- Vorher/Nachher-Screenshots liegen in `docs/screenshots/`.
- Das Original zum Zurückrollen liegt in `_original/`.

## Morgen weitermachen
```bash
cd ~/Documents/git/tabi
python3 tools/dev-server.py 8765   # dann http://localhost:8765
```

## Offene Punkte (Vorschlag, nach Priorität)
1. **Auf echten Geräten testen** (iPhone Safari, Android Chrome): Bottom-Sheets, Pinch-Zoom, Safe Areas, Zurück-Geste.
2. **Deployen** auf den chatgpt.site-Host: alles außer `_original/`, `docs/`, `tools/` hochladen und dabei `VERSION` in `sw.js` erhöhen. Danach mit dem echten Backend testen (Cloud-Speichern, Fahrpläne, Wetter).
3. **Karte:** Relief-Schattierung und Clustering der Orts-Punkte (GAP C3).
4. **Datumsbereich-Kalender** im Reise-Sheet (D4).
5. **Strukturell:** Vite und ES-Module, danach eine Komponentenschicht mit keyed Rendering (F1/F2). Vorher Charakterisierungstests für `app.js` schreiben.
6. **Englische Oberfläche** (H4) und ein eigenes Bild-CDN statt Wikimedia (E5).

## Gut zu wissen
- `css/legacy.css` wird generiert und nie von Hand bearbeitet (`python3 tools/build-legacy-css.py`). Design-Änderungen gehören in `css/app.css`.
- Lokal gibt es kein `/api/*`. Die 404-Meldungen dafür in der Konsole sind erwartet.
- Testläufe mit Playwright legen `.playwright-mcp/` an; der Ordner ist in `.gitignore`.
