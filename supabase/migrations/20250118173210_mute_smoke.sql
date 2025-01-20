/*
  # Create universities table for SISU data

  1. New Tables
    - `universities`
      - `id` (uuid, primary key)
      - `name` (text)
      - `short_name` (text)
      - `state` (text)
      - `city` (text)
      - `min_score` (numeric)
      - `weight_linguagens` (numeric)
      - `weight_humanas` (numeric)
      - `weight_natureza` (numeric)
      - `weight_matematica` (numeric)
      - `weight_redacao` (numeric)
      - `last_update` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `universities` table
    - Add policy for public read access
*/

CREATE TABLE IF NOT EXISTS universities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  short_name text NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  min_score numeric NOT NULL,
  weight_linguagens numeric NOT NULL,
  weight_humanas numeric NOT NULL,
  weight_natureza numeric NOT NULL,
  weight_matematica numeric NOT NULL,
  weight_redacao numeric NOT NULL,
  last_update timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE universities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Universities are viewable by everyone"
  ON universities
  FOR SELECT
  TO public
  USING (true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_universities_updated_at
  BEFORE UPDATE ON universities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();