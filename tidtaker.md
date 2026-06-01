User: > I mappen tidtaker ligger det et program. Forklar meg hva det gjør, hvilken teknologi det bruker og hvordan jeg kommer i gang.

GitHub Copilot: Read [](file:///workspaces/ki/tidtaker/README.md#1-1), lines 1 to 100

Read [](file:///workspaces/ki/tidtaker/main.go)

**Tidtaker** er en tidsregistreringsapplikasjon – et verktøy for å registrere hva du jobber med og hvor lenge.

### Hva den gjør
- Start og stopp en timer med ett klikk
- Legg til beskrivelse og tagger på tidsregistreringer
- Rediger start- og stopptid i etterkant
- Søk, filtrer og sorter registreringene dine
- Uendelig scroll gjennom historikken

### Teknologi
| Lag | Teknologi |
|-----|-----------|
| Backend | **Go** med [PocketBase](https://pocketbase.io) (innebygd database + auth) |
| Frontend | **HTMX** + HTML-templates (server-side rendering) |
| Styling | **Tailwind CSS** via CDN |
| Testing | **Playwright** for ende-til-ende-tester |

PocketBase er spesielt praktisk her – det er én enkelt binær som inkluderer SQLite-database, autentisering og admin-panel.

### Kom i gang

Du trenger Go 1.21+ installert. Deretter:

```bash
cd tidtaker

# Start utviklingsserver
./scripts/dev.sh
```

Åpne [http://localhost:8090](http://localhost:8090) i nettleseren og registrer en bruker. Admin-panelet er tilgjengelig på [http://localhost:8090/_/](http://localhost:8090/_/).

User: Kan du forklare meg mer om teknologiene pocketbase, htmx og tailwind?

GitHub Copilot: ### PocketBase
Et open-source backend-rammeverk skrevet i Go. Det er én enkelt binær som inneholder:
- **SQLite-database** med realtime-støtte
- **Autentisering** (e-post/passord, OAuth)
- **REST API** generert automatisk fra databaseschemaet
- **Admin-panel** tilgjengelig på `/_/`

Passer perfekt for mindre applikasjoner der du ikke vil sette opp en separat database og auth-server. I tidtaker brukes PocketBase som fundament, men med egne HTTP-handlere på toppen (ikke det auto-genererte API-et).

---

### HTMX
Et JavaScript-bibliotek med en uvanlig filosofi: i stedet for å bygge en SPA (Single Page App) med React/Vue, returnerer serveren **ferdig HTML** som HTMX bytter inn i siden.

```html
<!-- Knapp som sender POST og bytter ut #timer-status med svaret -->
<button hx-post="/api/timings/start" hx-target="#timer-status">
  Start
</button>
```

Fordeler:
- Ingen frontend-byggsteg, ingen JavaScript du skriver selv
- Serveren styrer all logikk (enklere å sikre og vedlikeholde)
- Fungerer godt for applikasjoner med mye server-interaksjon, som tidtaker

---

### Tailwind CSS
Et utility-first CSS-rammeverk. I stedet for å skrive egne CSS-klasser, setter du styling direkte i HTML med forhåndsdefinerte klasser:

```html
<!-- Tradisjonell CSS -->
<div class="card">...</div>

<!-- Tailwind -->
<div class="rounded-lg shadow p-4 bg-white text-gray-800">...</div>
```

I tidtaker lastes det inn via CDN (ingen byggsteg nødvendig), som passer godt med HTMX-tilnærmingen om å holde alt enkelt og uten kompilering.

---

Kombinasjonen kalles gjerne **"boring tech"** – ingen kompleks frontend-pipeline, alt rendres på serveren, og applikasjonen er lett å forstå og drifte.