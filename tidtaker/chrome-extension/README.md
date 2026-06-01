# Tidtaker → Xledger Chrome Extension

Denne Chrome-utvidelsen lar deg importere tidtaker-eksport direkte til Xledger timeregistrering.

## Installasjon (sideloading)

1. Åpne `chrome://extensions` i Chrome
2. Aktiver **Developer mode** (øverst til høyre)
3. Klikk **Load unpacked** og velg denne mappen (`chrome-extension/`)

## Bruk

1. Logg inn på [Xledger](https://www.xledger.net/f/timesheet)
2. Last ned eksport-JSON fra tidtaker (`/projects` → "Last ned JSON")
3. Dra og slipp JSON-filen over **bunnen av Xledger-siden** (de siste 20%)
4. Utvidelsen fyller inn timene automatisk og viser en oppsummering

## Forutsetninger

- Brukeren er innlogget i Xledger
- Alle tags i JSON-filen har tilsvarende prosjektmapping i tidtaker
- Rader uten prosjektmapping importeres med tomme felt og vises i feilloggen
