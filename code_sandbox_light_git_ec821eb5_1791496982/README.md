# 🗺️ Ankie op Kamp – Webapp

Productie-app voor de YouTube-serie **Ankie op Kamp** — Ankie en Femke rijden met ouderwets kaartlezen naar bestemmingen. Tijmen regisseert vanuit een tweede tablet.

---

## 🔗 Hoe te openen

| Scherm | URL | Gebruiker |
|---|---|---|
| **Startpagina** | `/start.html` | Iedereen |
| **Spelersscherm** | `/index.html` | Ankie & Femke (tablet in auto) |
| **Regie** | `/regie.html` | Tijmen (beveiligd met pincode `1234`) |

> **Tip:** Open de juiste URL op elk apparaat en voeg toe aan het beginscherm (iOS: Deel → Zet op beginscherm / Android: Menu → Installeren). Beide schermen synchroniseren live via de backend.

---

## 🎬 Twee interfaces

### Spelersscherm (`index.html`)
- **Start-scherm** met grote knop → ontgrendelt audio op iOS
- **Schermvullende kaart** (MapLibre GL + OpenFreeMap vectorstijl)
- Alle POI-lagen (winkels, iconen, restaurants) zijn automatisch verborgen — alleen wegen, straatnamen en plaatsnamen blijven zichtbaar
- Eigen locatie standaard **verborgen**; kaart volgt spelers niet automatisch
- **GPS tracking** op de achtergrond (`watchPosition` high accuracy)
- **Wake Lock API** — scherm blijft aan
- **Terughaalsysteem**: bij afwijking > drempel gedurende wachttijd → locatie verschijnt + oranje terugroute via OSRM
- **Opdrachten overlay**: verschijnt bij locatiegebonden, tijdgebonden of door regie gestuurde opdrachten
- Status bar: GPS nauwkeurigheid + sync status

### Regiescherm (`regie.html`)
- **Pincode scherm** (standaard: `1234`, instelbaar)
- **5 tabs:**
  1. 🗺️ **Kaart** — live positie spelers, toon/verberg, centreer, snel opdracht sturen
  2. 📍 **Routes** — aanmaken (adressen zoeken + slepen), opslaan, activeren; berekend via OSRM
  3. 📋 **Opdrachten** — locatiegebonden (kaart klikken), tijdgebonden (tijdstip of minuten), handmatig; direct sturen
  4. 🔊 **Audio** — URL-bestanden toevoegen (mp3/m4a/wav); afspelen op spelersapparaat via signaal
  5. ⚙️ **Instellingen** — alle parameters aanpasbaar, pincode wijzigen

---

## ⚙️ Alle instellingen

| Instelling | Standaard | Beschrijving |
|---|---|---|
| Afwijkingsdrempel | 500 m | Hoeveel meter buiten de route triggert terughaal |
| Wachttijd | 30 s | Hoe lang afwijking moet aanhouden |
| Locatie zichtbaar duur | 60 s | Hoe lang positie na tonen zichtbaar blijft (0 = altijd) |
| Teruhaalfunctie | Aan | Schakel terughaalsysteem uit/aan |
| Toon route | Uit | Route als gestippelde lijn op spelersscherm |
| Toon bestemming | Uit | Bestemming markering op spelersscherm |
| Kaartstijl | Liberty | OpenFreeMap stijl (Liberty/Bright/Positron/Dark) |
| Pincode | 1234 | 4-cijferige pincode regie |

---

## 🗂️ Database tabellen (RESTful Table API)

| Tabel | Gebruik |
|---|---|
| `aok_settings` | Key-value store voor alle instellingen en pincode |
| `aok_routes` | Opgeslagen routes met waypoints en GeoJSON geometrie |
| `aok_opdrachten` | Locatie/tijd/handmatige opdrachten met status |
| `aok_positie` | Huidige GPS positie spelers (1 record, continu bijgewerkt) |
| `aok_signalen` | Signaalbus voor live communicatie regie ↔ spelers |
| `aok_audio` | Audiobestand catalogus (naam + URL) |

---

## 🛠️ Technische stack

- **MapLibre GL JS 4.1** — vector kaart rendering
- **OpenFreeMap** — gratis vector kaarttegels (liberty stijl)
- **OSRM** (router.project-osrm.org) — gratis routing over wegen
- **Nominatim** (OSM) — gratis geocoding / adresszoeken
- **Navigator.geolocation.watchPosition** — achtergrond GPS
- **Wake Lock API** — scherm aan houden
- **PWA** — installeerbaar op iOS/Android beginscherm
- **ES Modules** — moderne JS zonder bundler

---

## 📁 Bestandsstructuur

```
start.html          # Landingspagina (keuze speler/regie)
index.html          # Spelersscherm
regie.html          # Regiescherm
css/
  speler.css        # Stijlen spelersscherm
  regie.css         # Stijlen regiescherm
js/
  sync.js           # Gedeelde module: API, GPS, routing, signalen
manifest.json       # PWA manifest spelers
manifest-regie.json # PWA manifest regie
sw.js               # Service Worker (offline cache)
icons/
  icon.svg          # App icoon bron
```

---

## 💡 Aanbevolen workflow

1. Open `start.html` op beide tablets
2. Spelerstablet → kies **Spelersscherm** → tik "Start de rit"
3. Regietablet → kies **Regie** → voer pincode in
4. Regie: maak route aan → activeer → stel opdrachten in
5. Klaar om te rijden! 🚗🗺️

---

## 🔧 Aandachtspunten bij gebruik

- **iOS audio**: de "Start de rit" knop is verplicht om audio te activeren op Safari/iOS
- **GPS**: verleen locatierechten bij eerste gebruik ("Altijd toestaan" voor achtergrond tracking)
- **Audio URL's**: gebruik directe download-links (Dropbox `?dl=1`, GitHub raw, etc.)
- **HTTPS vereist**: GPS en Wake Lock werken alleen op HTTPS
