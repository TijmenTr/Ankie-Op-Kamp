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
  -- Ronde 2: timer, stop-locatie, beloning/straf, routes
  timer_seconden   integer DEFAULT 0,        -- 0 = geen timer
  stop_bij_locatie boolean DEFAULT false,
  stop_lat         double precision,
  stop_lon         double precision,
  stop_straal      integer DEFAULT 100,
  beloning         text,
  straf            text,
  route_bij_succes uuid REFERENCES aok_routes(id) ON DELETE SET NULL,
  route_bij_falen  uuid REFERENCES aok_routes(id) ON DELETE SET NULL,
  -- Ronde 3: timer start modus, stopwatch, audio bij resultaat, voltooiing modus
  timer_start      text DEFAULT 'auto',      -- 'auto' | 'handmatig'
  stopwatch        boolean DEFAULT false,    -- stopwatch tonen
  audio_succes     text,                     -- audio_id bij voltooien
  audio_falen      text,                     -- audio_id bij falen
  voltooiing_modus text DEFAULT 'beide',     -- 'beide' | 'gedaan'
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
--  UPGRADE: als aok_opdrachten al bestond, voeg nieuwe kolommen toe
--  Plak dit APART in de SQL Editor als de tabel al bestaat.
--  (Safe: IF NOT EXISTS / DO NOTHING — geen data verlies)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='timer_seconden') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN timer_seconden   integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='stop_bij_locatie') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN stop_bij_locatie boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='stop_lat') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN stop_lat         double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='stop_lon') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN stop_lon         double precision;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='stop_straal') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN stop_straal      integer DEFAULT 100;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='beloning') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN beloning         text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='straf') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN straf            text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='route_bij_succes') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN route_bij_succes uuid REFERENCES aok_routes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='route_bij_falen') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN route_bij_falen  uuid REFERENCES aok_routes(id) ON DELETE SET NULL;
  END IF;
  -- Ronde 3 kolommen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='timer_start') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN timer_start      text DEFAULT 'auto';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='stopwatch') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN stopwatch        boolean DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='audio_succes') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN audio_succes     text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='audio_falen') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN audio_falen      text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aok_opdrachten' AND column_name='voltooiing_modus') THEN
    ALTER TABLE aok_opdrachten ADD COLUMN voltooiing_modus text DEFAULT 'beide';
  END IF;
END $$;

-- ============================================================
--  Opruimen van oude signalen (optioneel, handmatig uitvoeren)
--  Verwijder signalen ouder dan 1 dag om de tabel klein te houden
-- ============================================================
-- DELETE FROM aok_signalen WHERE ts < (EXTRACT(EPOCH FROM now()) * 1000 - 86400000)::bigint;
