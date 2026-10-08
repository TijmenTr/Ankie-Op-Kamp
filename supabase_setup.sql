-- ============================================================
--  ANKIE OP KAMP — Supabase tabellen setup
--  Plak dit in Supabase → SQL Editor → New query → Run
-- ============================================================

-- ── 1. Settings (instellingen + pincode) ──────────────────
CREATE TABLE IF NOT EXISTS aok_settings (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sleutel   text UNIQUE NOT NULL,
  waarde    text,
  created_at timestamptz DEFAULT now()
);

-- ── 2. Routes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aok_routes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  naam        text,
  aflevering  text,
  waypoints   text,   -- JSON string
  geojson     text,   -- GeoJSON LineString string
  actief      boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ── 3. Opdrachten ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aok_opdrachten (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type             text,   -- 'locatie' | 'tijd' | 'handmatig'
  titel            text,
  tekst            text,
  afbeelding_url   text,
  audio_id         text,
  lat              double precision,
  lon              double precision,
  straal           integer DEFAULT 200,
  trigger_tijd     text,
  trigger_minuten  integer DEFAULT 0,
  status           text DEFAULT 'wacht',
  volgorde         integer DEFAULT 0,
  created_at       timestamptz DEFAULT now()
);

-- ── 4. Positie (GPS van spelers) ───────────────────────────
CREATE TABLE IF NOT EXISTS aok_positie (
  id        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lat       double precision,
  lon       double precision,
  accuracy  double precision DEFAULT 0,
  speed     double precision DEFAULT 0,
  heading   double precision DEFAULT 0,
  ts        bigint,   -- Unix timestamp in ms
  created_at timestamptz DEFAULT now()
);

-- ── 5. Signalen (berichtbus regie ↔ spelers) ───────────────
CREATE TABLE IF NOT EXISTS aok_signalen (
  id       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type     text,
  payload  text,
  gelezen  boolean DEFAULT false,
  ts       bigint,   -- Unix timestamp in ms
  created_at timestamptz DEFAULT now()
);

-- ── 6. Audio catalog ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS aok_audio (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  naam       text,
  url        text,
  type       text DEFAULT 'muziek',
  created_at timestamptz DEFAULT now()
);

-- ============================================================
--  Row Level Security — open voor anon (app gebruikt anon key)
--  De app is niet publiek te raden, de anon key zit in de JS.
--  Voor productie kun je dit strenger maken.
-- ============================================================

ALTER TABLE aok_settings  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aok_routes    ENABLE ROW LEVEL SECURITY;
ALTER TABLE aok_opdrachten ENABLE ROW LEVEL SECURITY;
ALTER TABLE aok_positie   ENABLE ROW LEVEL SECURITY;
ALTER TABLE aok_signalen  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aok_audio     ENABLE ROW LEVEL SECURITY;

-- Geef de anonieme gebruiker (anon key) volledige toegang
CREATE POLICY "anon_all" ON aok_settings  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON aok_routes    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON aok_opdrachten FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON aok_positie   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON aok_signalen  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON aok_audio     FOR ALL TO anon USING (true) WITH CHECK (true);

-- ============================================================
--  Opruimen van oude signalen (optioneel, handmatig uitvoeren)
--  Verwijder signalen ouder dan 1 dag om de tabel klein te houden
-- ============================================================
-- DELETE FROM aok_signalen WHERE ts < (EXTRACT(EPOCH FROM now()) * 1000 - 86400000)::bigint;
