Ran terminal command: cat /workspaces/ki/kurs/*.md

Read [](file:///home/codespace/.vscode-remote/data/User/workspaceStorage/-3311fed8/GitHub.copilot-chat/chat-session-resources/f1af1c9e-73e2-415f-850f-5cad44f55a06/toolu_bdrk_01PnMQLECSj6sA8xUkCzzB5f__vscode-1780312328237/content.txt#1-1), lines 1 to 300

Read [](file:///home/codespace/.vscode-remote/data/User/workspaceStorage/-3311fed8/GitHub.copilot-chat/chat-session-resources/f1af1c9e-73e2-415f-850f-5cad44f55a06/toolu_bdrk_01PnMQLECSj6sA8xUkCzzB5f__vscode-1780312328237/content.txt#301-301), lines 301 to 600

Read [](file:///home/codespace/.vscode-remote/data/User/workspaceStorage/-3311fed8/GitHub.copilot-chat/chat-session-resources/f1af1c9e-73e2-415f-850f-5cad44f55a06/toolu_bdrk_01PnMQLECSj6sA8xUkCzzB5f__vscode-1780312328237/content.txt#601-601), lines 601 to 770

Her er et sammendrag av kurset:

---

## Sammendrag: KI-kurs med GitHub Copilot

Kurset er et praktisk innføringskurs i bruk av KI-agenter i programvareutvikling, basert på eksempelapplikasjonen **tidtaker** (en enkel timeregistreringsapp i Go).

### Moduloversikt

**01 – Start**
Sette opp GitHub Codespaces og koble til VSCode. Verifisere at Copilot-chat fungerer med Claude Sonnet 4.6.

**02 – Chat**
Bruk chat til å forstå en ukjent kodebase, spørre om teknologier (PocketBase, HTMX, Tailwind) og gjøre kontekstavhengige endringer. Norsk fungerer like godt som engelsk.

**03 – Kontekst**
Gi modellen bedre resultater ved å legge ved relevante filer, utvalgte kodelinjer, og informasjon fra internett. Modellen kan ha utdatert kunnskap – bruk internett-søk for å hente fersk informasjon.

**04 – Agenter**
Bruk agentmodus til å utføre større oppgaver automatisk: legge til tester (TDD), verifisere, fikse implementasjon, oppdatere dokumentasjon og gjøre sikkerhetsvurdering. Legg faste instrukser i `AGENTS.md` for å slippe å gjenta seg selv.

**05 – Feilsøking**
Gi feilmeldingen direkte som instruks til agenten. Fungerer også med stack traces og uventede resultater.

**06 – Utforskning**
Bruk *skills* (tilpassede instruksfiler) til å utforske løsninger. Eksempel: *grill-me* skill stiller oppklarende spørsmål for å utrede et problem grundig. Agenten kjenner ofte til løsninger og verktøy du ikke visste om selv.

**07 – Planer**
Skriv en selvstendig plan som agenten kan jobbe med uten ytterligere input. Bruk Playwright MCP-server og OpenCode CLI til å la agenten navigere i nettleseren for å samle detaljer til planen.

**08 – Veien videre**
Avanserte tips:
- **AFK-resultater**: Gi agenten tydelige verifiseringsoppgaver så den kan sjekke seg selv
- **Parallell jobbing**: Bruk `git worktrees` for å isolere parallelle agenter
- **Når agenten feiler**: Start på nytt med ny kontekst, be om plan før implementasjon, vær presis om verifisering
- **Fullt kontekstvindu**: Bruk `/compact` eller start ny chat
- **Subagenter**: La én agent orkestrere flere parallelle subagenter for store oppgaver
- **Nyttige oppgaver**: Grafana-dashboards, kodegjennomgang, commit-meldinger, pull requests, arkitekturskisser med Mermaid

### Rød tråd
Kurset handler om å gå fra "gjøre alt selv" til "bruke hele verdens kunnskap som grunnlag for egne valg" – og optimalisere flyten slik at agenten kan jobbe mest mulig selvstendig med god kvalitet.