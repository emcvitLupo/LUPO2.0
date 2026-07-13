ALTER TABLE public.prove
ADD COLUMN IF NOT EXISTS limite_quantificazione TEXT,
ADD COLUMN IF NOT EXISTS unita_misura TEXT,
ADD COLUMN IF NOT EXISTS limiti_riferimento JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS formula_calcolo TEXT,
ADD COLUMN IF NOT EXISTS variabili_calcolo JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tecnico_esecutore TEXT;
