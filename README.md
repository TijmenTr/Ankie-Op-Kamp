# 🎬 Ankie op Kamp — Regie & Spelers App

Een two-screen YouTube series webapp voor GPS-navigatie en missiebeheer.

**Versie:** v0.29 — het nummer staat in de footer van `index.html` en moet gelijk zijn aan het opslagpunt in het platform.

## 🗂️ Bestandsstructuur

```
index.html          — Keuzescherm (🗺️ Spelersscherm / 🎬 Regie)
speler.html         — Spelersscherm (MapLibre kaart, opdrachten, navigatie)
regie.html          — Regischerm (PIN-beveiligd, volledig beheer)
css/speler.css      — Stijlen spelersscherm
css/regie.css       — Stijlen regischerm
js/sync.js          — Supabase API wrappers (API, SignalBus, PositieStore, SettingsStore)
sw.js               — Service worker (effectief uitgeschakeld, ruimt cache op)
supabase_setup.sql  — Supabase tabellen + RLS policies + upgrade-script
manifest.json       — PWA manifest spelersscherm
manifest-regie.json — PWA manifest regischerm
```

## ✅ Geïmplementeerde features

### Keuzescherm (`index.html`)
- Twee kaarten: spelersscherm en regischerm
- Service worker cache-clearing bij laden
- Geen JS-logica, geen service worker fetch handler

### Spelersscherm (`speler.html`)
- **MapLibre GL JS 4.1.3** kaart via OpenFreeMap Liberty tiles
- **Locatiedot + centreer-knop**: spelerspijl én de centreer-knop zijn alleen zichtbaar als de live locatie zichtbaar is (off-route, of via regie-signaal `toon_locatie`); ze verdwijnen samen bij terugkeer op de route of bij `verberg_locatie`, en de volgmodus gaat dan uit
- **Vlaggen**: startlocatie = groene vlag 🚩, bestemming = finishvlag 🏁
- **Route zichtbaarheid**: blauw pad pas zichtbaar wanneer route actief is in regie (of via `toon_route` signaal)
- **Turn-by-turn navigatie banner** met pijlicoon, instructie en afstand (OSRM stappen met `steps=true`)
- **Offroute nav-banner**: donkergele achtergrond + gele rand wanneer terugkeerroute actief is
- **Route auto-update**: dubbel mechanisme — `route_bijgewerkt` signaal (≤2.5s) + polling fallback elke 4s via `checkRouteWijziging()`
- **Opdrachten**: ontvangen via SignalBus, overlaykaart met afbeelding/audio
- **Timer per opdracht**: countdown in seconden, auto-fail bij 0
- **Auto-stop op locatie**: opdracht slaagt automatisch bij aankomst stoplocatie (Haversine check)
- **Beloning & Straf**: tekst getoond in resultaat-overlay na succes of falen
- **Resultaat overlay**: groot emoji + beloning/straf tekst na voltooiing of mislukking
- **Route activering na opdracht**: `activeerRoute(id)` deactiveert huidige routes, activeert opgegeven route
- **Bericht overlay**: ontvangt `bericht` signaal van regie, toont tekst + emoji als fullscreen overlay
- **Opdrachtengeschiedenis**: slide-up panel met badge-teller
- **Terugkeerroute**: **felgele lijn** (`#FFD600`) als speler te ver afdwaalt — duidelijk zichtbaar op de zandkleurige kaart en naast de blauwe hoofdroute
- **GPS polling** + PositieStore voor positiedeling met regie
- **SignalBus polling** elke 2,5s voor inkomende signalen
- **Opname (v0.28)**: zolang er in de regie een opname loopt, schrijft de speler elke ~2 s een trackpunt weg in `aok_track` (alleen bij verplaatsing > 3 m, met een hartslag elke 30 s) en logt hij momenten in `aok_events`: opdracht getoond/voltooid/gefaald, bericht van de regie, van route af en terug op route. In de statusbalk staat dan een rode **REC**-indicator. Start/stopt via `opname_start` / `opname_stop` en via de instelling `opname_actief`, zodat een herlaadbeurt midden in een rit de opname hervat.
- **Opname via een opdracht (v0.29)**: een opdracht met `opname_actie = 'start'` begint zelf een nieuwe opname (naam uit `opname_naam`), eentje met `'stop'` beëindigt hem. De speler regelt dat zonder tussenkomst van de regie, dus de opname start ook als de regie niet meekijkt.

### Regischerm (`regie.html`)
- **PIN-beveiliging** (standaard 1234, instelbaar)
- **Kaart tab**: live spelerspositie, route-overlay, snelle opdrachtverzending
- **Routes tab**: route aanmaken met adreszoeken (Nominatim), OSRM routeberekening, waypoint-lijst, activeren/verwijderen
- **Opdrachten tab** — uitgebreid formulier:
  - Titel, tekst, afbeelding URL, audio koppeling
  - Trigger type: Locatie / Tijd / Handmatig
  - **Timer (seconden)**: 0 = geen timer
  - **Stop bij locatie**: checkbox + stop_lat/lon/straal (of kopieer van trigger-locatie)
  - **Beloning**: tekst bij succes
  - **Straf**: tekst bij mislukken / timer op
  - **Route bij succes**: kies route om te activeren na behalen
  - **Route bij falen**: kies route om te activeren na mislukken/timer
  - **Opname** (v0.29): start of stop de opname zodra deze opdracht verschijnt, met optionele naam voor de nieuwe opname — zo begint de opname automatisch aan het begin van een opnamedag. Opdrachten met een opname-actie krijgen een badge in de lijst.
- **Audio tab**: audiobestanden toevoegen (naam + URL), speel nu naar spelers
- **💬 Berichten tab** (nieuw):
  - Vrij tekstveld + emoji-veld
  - Audio meesturen optie
  - Snelberichten (6 vooraf ingestelde berichten)
  - Berichtgeschiedenis
  - Stuur als overlay naar spelersscherm
- **Instellingen tab**: afwijkingsdrempel, wachttijd, route zichtbaarheid (direct/handmatig/afwijking), toon/verberg route live, kaartstijl, pincode wijzigen
- **🎬 Opname tab** (v0.28) — rit terugkijken en animatie exporteren:
  - **Opname starten/stoppen** met een naam; de speler schrijft dan trackpunten + momenten weg
  - **Opnames-lijst** met datum, looptijd en verwijderknop; klik = inladen in de kaart
  - **Terugspelen**: tijdlijn met play/pause, scrubber, snelheid 0,5×–8×, kloktijd en gekleurde markers voor de momenten (opdracht, bericht, off-route)
  - **Camera keyframes**: zet de kaart op de gewenste stand en klik "Keyframe hier" (tijd, positie, zoom, peiling, kanteling). Zonder keyframes volgt de camera de speler
  - **Export WebM**: neemt het kaartbeeld op in 1280×720, 1920×1080 of 2560×1440 bij 30 of 60 fps, met de keyframes als camerabeweging
  - **Export JSON**: baan, momenten en keyframes met tijdstempels, om later opnieuw of in een montage-app te gebruiken
  - **Let op bij WebM**: de export duurt even lang als de animatie zelf (opnemen gebeurt in reële tijd) en de browser zet geen duur in het bestand — sommige spelers tonen daarom een oneindige lengte. Importeren in Premiere/DaVinci gaat goed; anders eerst door Handbrake halen.
- **SignalBus handlers**: `van_route_af`, `terug_op_route`, `opdracht_voltooid`, `opdracht_gefaald` (toast)

## 🗄️ Supabase tabellen

| Tabel | Doel |
|---|---|
| `aok_settings` | Sleutel/waarde instellingen (sleutel, waarde) |
| `aok_routes` | Routes met waypoints + GeoJSON |
| `aok_opdrachten` | Opdrachten inclusief timer, stop-locatie, beloning/straf, route_bij_succes/falen |
| `aok_positie` | Enkelvoudige GPS-positie van spelers (upsert pattern) |
| `aok_signalen` | SignalBus berichten (type, payload, ts, gelezen) |
| `aok_audio` | Audio-bestandencatalogus |
| `aok_opnames` | Opnamen/sessies (naam, gestart, gestopt) — v0.28 |
| `aok_track` | Trackpunten per opname (ts, lat, lon, speed, heading, accuracy) — v0.28 |
| `aok_events` | Momenten per opname (opdracht, bericht, off-route) — v0.28 |

### Supabase verbinding
- URL: `https://jafyymqqcsjszbfgfbqj.supabase.co`
- Key: anon key in `js/sync.js`
- RLS: open voor anon (app gebruikt anon key)

## 🔧 Database upgrade (bestaande installaties)

Als de Supabase database al bestond zonder de nieuwe `aok_opdrachten` kolommen, run dan het upgrade-blok onderaan `supabase_setup.sql` in de Supabase SQL Editor. Dit voegt de nieuwe kolommen veilig toe zonder data te verliezen:
- `timer_seconden`, `stop_bij_locatie`, `stop_lat`, `stop_lon`, `stop_straal`
- `beloning`, `straf`, `route_bij_succes`, `route_bij_falen`

### Ronde 4 — opnames (v0.28)

Voor de Opname-tab zijn drie nieuwe tabellen nodig. Het blok **"RONDE 4 — OPNAMES"** onderaan `supabase_setup.sql` maakt ze aan (plus indexen en RLS-policies) en is veilig om opnieuw te draaien:

```sql
CREATE TABLE IF NOT EXISTS aok_opnames (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  naam text, gestart timestamptz DEFAULT now(), gestopt timestamptz,
  bron text DEFAULT 'regie', created_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS aok_track (
  id bigserial PRIMARY KEY,
  opname_id uuid REFERENCES aok_opnames(id) ON DELETE CASCADE,
  ts bigint, lat double precision, lon double precision,
  speed double precision DEFAULT 0, heading double precision DEFAULT 0,
  accuracy double precision DEFAULT 0, created_at timestamptz DEFAULT now());

CREATE TABLE IF NOT EXISTS aok_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  opname_id uuid REFERENCES aok_opnames(id) ON DELETE CASCADE,
  ts bigint, type text, titel text, tekst text, payload text,
  lat double precision, lon double precision, created_at timestamptz DEFAULT now());
```

Zonder dit blok werkt de rest van de app gewoon; alleen de Opname-tab blijft dan leeg.

### Ronde 5 — opname via een opdracht (v0.29)

Twee kolommen op `aok_opdrachten` (het blok **"RONDE 5"** onderaan `supabase_setup.sql`, ook veilig om opnieuw te draaien):

```sql
ALTER TABLE aok_opdrachten ADD COLUMN IF NOT EXISTS opname_actie text;   -- NULL | 'start' | 'stop'
ALTER TABLE aok_opdrachten ADD COLUMN IF NOT EXISTS opname_naam  text;   -- naam voor de nieuwe opname
```

Zonder deze kolommen werkt de rest; een opdracht met een opname-actie wordt dan opgeslagen zónder die optie (met een melding erbij).

## 🌐 Deployment

- **Cloudflare Pages** — verbonden met GitHub repo `TijmenTr/Ankie-Op-Kamp`
- Auto-deploy bij push naar main branch
- Alle bestanden in repo-root (geen submap vereist)
- Service worker actief maar zonder fetch-handler (alleen cache-clearing)

## 📡 Externe services

| Service | Gebruik |
|---|---|
| MapLibre GL JS 4.1.3 | Kaartrendering (UMD via jsDelivr) |
| OpenFreeMap Liberty | Gratis vectortiles |
| OSRM | Routeberekening + turn-by-turn stappen (`overview=full&geometries=geojson&steps=true`) |
| Nominatim (OSM) | Adreszoeken |
| Supabase PostgREST | Database REST API |

## 🔜 Mogelijke volgende stappen

- Opdracht-locatiekaart klik ook invullen voor stoplocatie-coördinaten (tweede klikmodus)
- Meerdere spelersgroepen ondersteunen (meerdere positie-rijen in `aok_positie`)
- Tijdstempelweergave in opdrachtengeschiedenis spelersscherm
- Export/import routes als GPX of GeoJSON
- Supabase Realtime i.p.v. polling voor lagere latency
- Opdracht-status badges in regischerm bijwerken na gefaald-signaal
- Opname: puntenteller/afstand per opname in de lijst
- Opname: meerdere camera-tracks of een "auto-volg met vaste afstand" naast keyframes
- Opname: momenten als labels/bijschriften in het kaartbeeld branden bij export
