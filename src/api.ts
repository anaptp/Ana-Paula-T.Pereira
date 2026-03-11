/// <reference types="vite/client" />
import { supabase } from './supabase';
import { IMOVEL } from './data';

const MESES_ORDEM = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function mesRefParaNum(mesRef: string): number {
  const parts = (mesRef || "").split(" ");
  const mes = parts[0];
  const ano = parts[1] || "25";
  const mIdx = MESES_ORDEM.indexOf(mes);
  const anoNum = parseInt("20" + ano);
  if (mIdx === -1 || isNaN(anoNum)) return 999999;
  return anoNum * 100 + mIdx;
}

export async function getDashboardData(userId: string, isAdmin: boolean = false) {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_URL.startsWith('http')) {
    return [];
  }

  try {
    let query = supabase.from('imoveis').select('*');
    if (!isAdmin) query = query.eq('proprietario_id', userId);

    const { data: imoveis, error: errImovel } = await query;
    if (errImovel) throw errImovel;
    if (!imoveis || imoveis.length === 0) return [];

    const results = [];

    for (const imovel of imoveis) {
      const { data: locacoesRes, error: errLocacoes } = await supabase
        .from('locacoes')
        .select('*')
        .eq('imovel_id', imovel.id)
        .order('data_entrada', { ascending: true });

      if (errLocacoes) console.error("Erro ao buscar locações:", errLocacoes);

      const locacoesMap = new Map<string, any>();

      for (const loc of (locacoesRes || [])) {
        const mesRef = loc.mes_ref || "—";
        if (!locacoesMap.has(mesRef)) {
          locacoesMap.set(mesRef, { mes: mesRef, hospedes: 0, noites: 0, lucro: 0, registros: [] });
        }
        const mesData = locacoesMap.get(mesRef);
        const nHospedes = Number(loc.n_hospedes) || 0;
        const nDiarias = Number(loc.n_diarias) || 0;
        const lucro = Number(loc.lucro) || 0;
        const valorLiquido = Number(loc.valor_liquido) || 0;
        const comissaoPerc = loc.comissao_perc !== undefined
          ? Number(loc.comissao_perc)
          : Number(imovel.comissao_perc || 20);
        const comissaoCalculada = valorLiquido * (comissaoPerc / 100);

        const isDespesa = typeof loc.hospede === 'string' && loc.hospede.startsWith('Despesa:');
        if (!isDespesa) {
          mesData.hospedes += nHospedes;
          mesData.noites += nDiarias;
        }
        mesData.lucro += lucro;

        mesData.registros.push({
          hospede: loc.hospede,
          nHospedes,
          data: loc.data_entrada,
          diarias: nDiarias,
          quarto: loc.quarto || "",
          valorLiquido,
          taxaLimpeza: Number(loc.taxa_limpeza) || 0,
          comissao: comissaoCalculada,
          extra: Number(loc.valor_extra) || 0,
          plataforma: loc.plataforma || "—",
          despesas: Number(loc.despesas) || 0,
          lucro
        });
      }

      const locacoesPorMes = Array.from(locacoesMap.values())
        .sort((a, b) => mesRefParaNum(a.mes) - mesRefParaNum(b.mes));

      results.push({
        id: imovel.id,
        nome: imovel.nome || "Imóvel",
        apelido: imovel.apelido || "",
        proprietario: imovel.proprietario_id,
        comissaoPerc: Number(imovel.comissao_perc || 20),
        alerta: imovel.alerta || "",
        montagem: IMOVEL.montagem,
        locacoesPorMes,
        problemasInesperados: JSON.parse(imovel.problemas_inesperados || '[]'),
      });
    }

    return results;

  } catch (error) {
    console.error("Erro geral na API:", error);
    throw error;
  }
}
