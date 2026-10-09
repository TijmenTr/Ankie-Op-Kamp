# 🎬 Ankie op Kamp — Regie & Spelers App

Een two-screen YouTube series webapp voor GPS-navigatie en missiebeheer.

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
- **Locatiedot**: alleen zichtbaar als speler te ver van route af is (off-route), verdwijnt bij terugkeer
- **Vlaggen**: startlocatie = groene vlag 🚩, bestemming = finishvlag 🏁
- **Route zichtbaarheid**: blauw pad pas zichtbaar wanneer route actief is in regie (of via `toon_route` signaal)
- **Turn-by-turn navigatie banner** met pijlicoon, instructie en afstand (OSRM stappen)
- **Opdrachten**: ontvangen via SignalBus, overlaykaart met afbeelding/audio
- **Timer per opdracht**: countdown in seconden, auto-fail bij 0
- **Auto-stop op locatie**: opdracht slaagt automatisch bij aankomst stoplocatie (Haversine check)
- **Beloning & Straf**: tekst getoond in resultaat-overlay na succes of falen
- **Resultaat overlay**: groot emoji + beloning/straf tekst na voltooiing of mislukking
- **Route activering na opdracht**: `activeerRoute(id)` deactiveert huidige routes, activeert opgegeven route
- **Bericht overlay**: ontvangt `bericht` signaal van regie, toont tekst + emoji als fullscreen overlay
- **Opdrachtengeschiedenis**: slide-up panel met badge-teller
- **Terugkeerroute**: oranje lijn als speler te ver afdwaalt
- **GPS polling** + PositieStore voor positiedeling met regie
- **SignalBus polling** elke 2,5s voor inkomende signalen

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
- **Audio tab**: audiobestanden toevoegen (naam + URL), speel nu naar spelers
- **💬 Berichten tab** (nieuw):
  - Vrij tekstveld + emoji-veld
  - Audio meesturen optie
  - Snelberichten (6 vooraf ingestelde berichten)
  - Berichtgeschiedenis
  - Stuur als overlay naar spelersscherm
- **Instellingen tab**: afwijkingsdrempel, wachttijd, route zichtbaarheid (direct/handmatig/afwijking), toon/verberg route live, kaartstijl, pincode wijzigen
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

### Supabase verbinding
- URL: `https://jafyymqqcsjszbfgfbqj.supabase.co`
- Key: anon key in `js/sync.js`
- RLS: open voor anon (app gebruikt anon key)

## 🔧 Database upgrade (bestaande installaties)

Als de Supabase database al bestond zonder de nieuwe `aok_opdrachten` kolommen, run dan het upgrade-blok onderaan `supabase_setup.sql` in de Supabase SQL Editor. Dit voegt de nieuwe kolommen veilig toe zonder data te verliezen:
- `timer_seconden`, `stop_bij_locatie`, `stop_lat`, `stop_lon`, `stop_straal`
- `beloning`, `straf`, `route_bij_succes`, `route_bij_falen`

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
| OSRM | Routeberekening + turn-by-turn stappen |
| Nominatim (OSM) | Adreszoeken |
| Supabase PostgREST | Database REST API |

## 🔜 Mogelijke volgende stappen

- Opdracht-locatiekaart klik ook invullen voor stoplocatie-coördinaten (tweede klikmodus)
- Meerdere spelersgroepen ondersteunen (meerdere positie-rijen in `aok_positie`)
- Tijdstempelweergave in opdrachtengeschiedenis spelersscherm
- Export/import routes als GPX of GeoJSON
- Supabase Realtime i.p.v. polling voor lagere latency
- Opdracht-status badges in regischerm bijwerken na gefaald-signaal
