-- Brand rules table for storing compliance rules
CREATE TABLE IF NOT EXISTS public.brand_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('color', 'font', 'logo', 'content', 'format', 'style')),
  rule_data JSONB NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Brand rule categories for organization
CREATE TABLE IF NOT EXISTS public.brand_rule_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT, -- Hex color for UI display
  icon TEXT, -- Icon name or path
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Junction table for rule-category relationships
CREATE TABLE IF NOT EXISTS public.brand_rule_category_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES public.brand_rules(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.brand_rule_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(rule_id, category_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brand_rules_type ON public.brand_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_brand_rules_severity ON public.brand_rules(severity);
CREATE INDEX IF NOT EXISTS idx_brand_rules_active ON public.brand_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_brand_rules_created_by ON public.brand_rules(created_by);

-- Enable Row Level Security
ALTER TABLE public.brand_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_rule_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_rule_category_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brand_rules
CREATE POLICY "All users can view active brand rules" ON public.brand_rules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage brand rules" ON public.brand_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for categories
CREATE POLICY "All users can view categories" ON public.brand_rule_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories" ON public.brand_rule_categories
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for mappings
CREATE POLICY "All users can view category mappings" ON public.brand_rule_category_mappings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage category mappings" ON public.brand_rule_category_mappings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default categories
INSERT INTO public.brand_rule_categories (name, description, color, icon) VALUES
('Visual Identity', 'Logo usage, colors, and visual elements', '#3B82F6', 'eye'),
('Typography', 'Font families, sizes, and text formatting', '#8B5CF6', 'type'),
('Content Guidelines', 'Tone of voice, messaging, and copy standards', '#10B981', 'message-square'),
('Layout & Design', 'Spacing, alignment, and composition rules', '#F59E0B', 'layout'),
('Brand Voice', 'Communication style and language guidelines', '#EF4444', 'volume-2'),
('Compliance', 'Legal requirements and regulatory standards', '#6B7280', 'shield')
ON CONFLICT (name) DO NOTHING;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at timestamps
CREATE TRIGGER update_brand_rules_updated_at
  BEFORE UPDATE ON public.brand_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();