-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. profiles (role-based access)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'proprietario',
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-create a profile row when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'proprietario'),
    COALESCE(NEW.raw_user_meta_data->>'name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (but not role)
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (for upsert during signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Helper: check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 1. imoveis
CREATE TABLE imoveis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  apelido TEXT,
  proprietario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  comissao_perc NUMERIC DEFAULT 20,
  alerta TEXT,
  fatura_montagem TEXT,
  data_montagem TEXT,
  total_montagem NUMERIC DEFAULT 0,
  total_pago NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. locacoes
CREATE TABLE locacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imovel_id UUID REFERENCES imoveis(id) ON DELETE CASCADE,
  hospede TEXT NOT NULL,
  n_hospedes INTEGER DEFAULT 1,
  data_entrada TEXT,
  n_diarias INTEGER DEFAULT 1,
  quarto TEXT,
  valor_liquido NUMERIC DEFAULT 0,
  taxa_limpeza NUMERIC DEFAULT 0,
  comissao_perc NUMERIC DEFAULT 20,
  comissao_valor NUMERIC DEFAULT 0,
  valor_extra NUMERIC DEFAULT 0,
  plataforma TEXT,
  despesas NUMERIC DEFAULT 0,
  lucro NUMERIC DEFAULT 0,
  mes_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. montagem_itens
CREATE TABLE montagem_itens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imovel_id UUID REFERENCES imoveis(id) ON DELETE CASCADE,
  comodo TEXT NOT NULL,
  item TEXT NOT NULL,
  dat_compra TEXT,
  preco NUMERIC DEFAULT 0,
  qtd INTEGER DEFAULT 1,
  loja TEXT,
  total NUMERIC DEFAULT 0,
  emprestado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. problemas_inesperados
CREATE TABLE problemas_inesperados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  imovel_id UUID REFERENCES imoveis(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE imoveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE locacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE montagem_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE problemas_inesperados ENABLE ROW LEVEL SECURITY;

-- Create Policies (owners see their own data, admins see everything)
CREATE POLICY "Users can view their own imoveis"
  ON imoveis FOR SELECT
  USING (auth.uid() = proprietario_id OR public.is_admin());

CREATE POLICY "Users can view locacoes of their imoveis"
  ON locacoes FOR SELECT
  USING (imovel_id IN (SELECT id FROM imoveis WHERE proprietario_id = auth.uid()) OR public.is_admin());

CREATE POLICY "Users can view montagem_itens of their imoveis"
  ON montagem_itens FOR SELECT
  USING (imovel_id IN (SELECT id FROM imoveis WHERE proprietario_id = auth.uid()) OR public.is_admin());

CREATE POLICY "Users can view problemas of their imoveis"
  ON problemas_inesperados FOR SELECT
  USING (imovel_id IN (SELECT id FROM imoveis WHERE proprietario_id = auth.uid()) OR public.is_admin());
