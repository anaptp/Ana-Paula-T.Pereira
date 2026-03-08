-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Create Policies
CREATE POLICY "Users can view their own imoveis" 
  ON imoveis FOR SELECT 
  USING (auth.uid() = proprietario_id);

CREATE POLICY "Users can view locacoes of their imoveis" 
  ON locacoes FOR SELECT 
  USING (imovel_id IN (SELECT id FROM imoveis WHERE proprietario_id = auth.uid()));

CREATE POLICY "Users can view montagem_itens of their imoveis" 
  ON montagem_itens FOR SELECT 
  USING (imovel_id IN (SELECT id FROM imoveis WHERE proprietario_id = auth.uid()));

CREATE POLICY "Users can view problemas of their imoveis" 
  ON problemas_inesperados FOR SELECT 
  USING (imovel_id IN (SELECT id FROM imoveis WHERE proprietario_id = auth.uid()));
