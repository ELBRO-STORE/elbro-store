-- ELBRO STORE - Store Settings Schema
-- Configurable store settings

CREATE TABLE store_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

-- Public read access for published settings
CREATE POLICY "Public read store settings"
  ON store_settings FOR SELECT
  USING (TRUE);

-- Admin write access
CREATE POLICY "Admins can manage store settings"
  ON store_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER update_store_settings_updated_at
  BEFORE UPDATE ON store_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings
INSERT INTO store_settings (key, value, description) VALUES
  ('store_name', '"ELBRO STORE"', 'Store display name'),
  ('whatsapp_number', '"212783865276"', 'WhatsApp number in international format without +'),
  ('currency', '"MAD"', 'Currency code'),
  ('delivery_fee_cents', '3500', 'Default delivery fee in cents'),
  ('free_delivery_from_cents', '50000', 'Free delivery threshold in cents (null to disable)'),
  ('logo_url', 'null', 'Store logo URL'),
  ('instagram_url', 'null', 'Instagram profile URL'),
  ('facebook_url', 'null', 'Facebook page URL'),
  ('tiktok_url', 'null', 'TikTok profile URL'),
  ('email', 'null', 'Contact email'),
  ('phone', 'null', 'Contact phone'),
  ('address', 'null', 'Store address'),
  ('store_open', 'true', 'Whether store accepts orders')
ON CONFLICT (key) DO NOTHING;