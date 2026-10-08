# Ankie op Kamp 🗺️

YouTube-serie webapp voor GPS-tracking, kaartlezen en opdrachten in het veld.

## Twee interfaces

| Scherm | URL | Doel |
|---|---|---|
| **Spelersscherm** | `index.html` | Volledig scherm kaart, GPS, opdrachten tonen |
| **Regiescherm** | `regie.html` | PIN-beveiligd (standaard: 1234), live tracking, routebeheer, opdrachten sturen |
| **Startpagina** | `start.html` | Landingspagina met keuze |

## Stack

- **MapLibre GL JS 4.1.3** — vectorkaart via jsDelivr UMD
- **OpenFreeMap** — gratis vector tiles (`tiles.openfreemap.org/styles/liberty`)
- **OSRM** — gratis routeberekening (`router.project-osrm.org`)
- **Nominatim (OSM)** — gratis adreszoeken
- **Supabase** — database backend (PostgreSQL + REST API)
- **PWA** — installeerbaar op iPad/Android

## Database (Supabase)

Project URL: `https://jafyymqqcsjszbfgfbqj.supabase.co`

### Tabellen

| Tabel | Gebruik |
|---|---|
| `aok_settings` | Instellingen (key/value): pincode, drempels, kaartstijl |
| `aok_routes` | Opgeslagen routes met waypoints + GeoJSON |
| `aok_opdrachten` | Opdrachten (locatie/tijd/handmatig) |
| `aok_positie` | GPS positie van spelers (1 rij, wordt geüpdatet) |
| `aok_signalen` | Berichtbus regie ↔ spelers |
| `aok_audio` | Audiocatalogus (naam + URL) |

### Tabellen aanmaken

Voer `supabase_setup.sql` uit in **Supabase → SQL Editor → New query → Run**.

## Hosting

- **Cloudflare Pages** — statische hosting, auto-deploy bij GitHub push
- Werkende URL: `https://[project-naam].pages.dev`

## Bestanden

```
index.html          Spelersscherm
regie.html          Regiescherm (PIN: 1234)
start.html          Landingspagina
js/sync.js          Supabase API wrapper + helpers
css/speler.css      Styling spelersscherm
css/regie.css       Styling regiescherm
manifest.json       PWA manifest spelers
manifest-regie.json PWA manifest regie
sw.js               Service worker
icons/icon.svg      App icoon
supabase_setup.sql  SQL script voor Supabase tabellen
```

## Instellingen (via regie → Instellingen tab)

| Instelling | Standaard | Betekenis |
|---|---|---|
| Afwijkingsdrempel | 500 m | Hoe ver van route voordat alert komt |
| Wachttijd | 30 s | Hoe lang van route voordat alert getoond wordt |
| Teruhaalfunctie | aan | OSRM terugkeerroute berekenen |
| Locatie zichtbaar | 60 s | Hoe lang de spelerdot zichtbaar is |
| Toon route | uit | Route op spelerskaart tonen |
| Pincode | 1234 | Toegang tot regiescherm |

## Signalen (regie → spelers)

| Signaal | Effect |
|---|---|
| `toon_locatie` | Spelerdot tonen |
| `verberg_locatie` | Spelerdot verbergen |
| `speel_audio` | Audio afspelen op spelersapparaat |
| `toon_opdracht` | Opdrachtkaart tonen |
| `route_bijgewerkt` | Actieve route herladen |
| `instellingen_bijgewerkt` | Instellingen herladen |
| `centreer_kaart` | Kaart centreren op coördinaat |

## Workflow opnamedag

1. Open `regie.html` op iPad/laptop van regisseur
2. Open `index.html` op iPad/telefoon van Ankie & Femke
3. Activeer een route in Regie → Routes
4. Klik "Start de rit" op het spelersscherm
5. Stuur opdrachten en audio vanuit het regiescherm
