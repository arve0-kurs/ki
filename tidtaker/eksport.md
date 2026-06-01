# Xledger-eksport fra tidtaker

## Oppsummering

Vi skal automatisere timeføring i Xledger ved hjelp av en Chrome-plugin og en eksportfunksjon i tidtaker.

---

## Del 1 — Tidtaker (Go/PocketBase)

### Ny collection: `projects`

| Felt | Type | Beskrivelse |
|------|------|-------------|
| `userId` | Text | Eier av mappingen |
| `tag` | Text | Tag fra tidtaking (nøkkel) |
| `prosjekt` | Text | Xledger-verdi, f.eks. `100783 - Salg og markedsføring - Trondheim` |
| `aktivitet` | Text | Xledger-verdi, f.eks. `250 - Markedsføring` |

### Ny side: `/projects`

CRUD-side der brukeren mapper tags til Xledger-felter (prosjekt, aktivitet).

### Nytt eksport-endepunkt: `GET /api/export?month=2026-05`

Returnerer selvforsynt JSON gruppert per (tag + beskrivelse) per dag, rundet til nærmeste halvtime.

**Aggregeringsregler:**
- Grupper per: prosjekt + beskrivelse (samme tag og samme beskrivelse på samme dag summeres)
- Summer alle tidtakinger i gruppen
- Rund totalen til nærmeste halvtime (f.eks. 4t45m → 5t, 4t14m → 4t)
- Slå opp prosjekt/aktivitet fra `projects`-collection

**Eksempel på eksport-format:**
```json
[
  {
    "date": "2026-06-02",
    "prosjekt": "100783 - Salg og markedsføring - Trondheim",
    "aktivitet": "250 - Markedsføring",
    "tekst": "KI-kurs",
    "timer": 2.0
  }
]
```

**Feilhåndtering:** Dersom måneden har tags som mangler prosjektmapping, gi en feilmelding med kontekst, slik at brukeren kan fylle inn prosjektmapping. En kan la brukeren laste ned alle tidtakinger, men de som mangler har tomt prosjekt og aktivitet.

---

## Del 2 — Chrome Extension (Manifest V3)

### Aktivering
- Aktiveres på `https://www.xledger.net/f/timesheet*`
- Trigger: drag-and-drop av eksport-JSON-fil over timeliste-siden til synlig område 20% av bunnen på siden

### Flyt
1. Brukeren laster ned eksport-JSON fra tidtaker
2. Brukeren logger inn i Xledger selv
3. Brukeren drar JSON-filen over Xledger timeregistreringssiden
4. Pluginen validerer JSON og sjekker at alle felter er utfylt
5. Hvis noe mangler: prøv å fylle ut, men vis feillogg i området der en har sluppet filen
6. For hver rad i JSON:
   - Klikk "+ Legg til ny rad"-knappen
   - Fyll inn autocomplete-felt (type verdi → vent på dropdown → klikk riktig match):
     - Prosjekt: `input[id^="rv_project"]`
     - Aktivitet: `input[id^="rv_activity"]`
   - Fyll inn tekstfelt: `input[id^="s_text"]`
   - Fyll inn timefelt for riktig dato: `input[id^="f_working_hours-:f_working_hours"]` + dato (f.eks. `f_working_hours-:f_working_hours2026-06-02`)
7. Vis oppsummering: antall rader lagt inn, totale timer

### Navigering til riktig uke

Bruk **Date Picker** for deterministisk navigering (ikke pil-knapper som er avhengig av nåværende uke):

1. Klikk knappen med tittel `Date Picker` (viser gjeldende måned, f.eks. "Juni 2026")
2. Klikk `button[aria-label="previous month"]` eller `button[aria-label="next month"]` til riktig måned vises
3. Klikk på dagen (mandag i riktig uke) som en tallknapp, f.eks. `button` med tekst `"4"` for 4. mai

**Alternativ for "denne uken":** Klikk knappen med tekst `"Denne uke"` — navigerer alltid til inneværende uke uavhengig av utgangspunkt.

### Detaljert steg-for-steg flyt med selektorer

**Forutsetning:** Brukeren er innlogget og på siden `https://www.xledger.net/f/timesheet*`

1. **Naviger til riktig uke** (se over)

2. **Legg til ny rad:** Klikk knappen med tekst `"+"` (nederst i tabellen)

3. **Velg prosjekt:**
   - Et autocomplete-felt med `id` som starter på `rv_project` aktiveres automatisk og viser dropdown
   - Skriv inn søkeord eller la dropdown stå åpen
   - Klikk ønsket alternativ i listbox (første alternativ er under overskriften "Mest brukt")

4. **Velg aktivitet:**
   - Klikk combobox-feltet med `id` som starter på `rv_activity`
   - Klikk ønsket alternativ i listbox (første alternativ er under overskriften "Mest brukt")

5. **Fyll inn beskrivelse:**
   - Klikk tekstboksen i "Tekst"-kolonnen (`id` starter på `s_text`)
   - Skriv inn tekst, f.eks. `"AI-kurs"`

6. **Fyll inn timer for riktig dag:**
   - Klikk tallboksen i kolonnen for riktig ukedag
   - `id`-mønster: `f_working_hours-:f_working_hours{dato}`, f.eks. `f_working_hours-:f_working_hours2026-06-02` for tirsdag 2. juni
   - Skriv inn desimaltall, f.eks. `1.5`

7. **Lagre:** Klikk knappen med tekst `"Lagre endringer"` (viser også antall endringer i parentes)

### Installasjon (sideloading, ingen Web Store)
1. Gå til `chrome://extensions`
2. Aktiver "Developer mode"
3. Klikk "Load unpacked" og velg plugin-mappen

---

## Antakelser

- Beskrivelse fra tidtaking brukes som `tekst`-felt i Xledger
- Pluginen trenger ikke autentisering mot tidtaker — eksporten er komplett og selvforsynt
- Xledger-feltene prosjekt og aktivitet er autocomplete-comboboxer som krever at pluginen trigger input-events, ikke bare setter `value`
- Pluginen stopper og viser tydelig feilmelding hvis noen rader mangler prosjektmapping
