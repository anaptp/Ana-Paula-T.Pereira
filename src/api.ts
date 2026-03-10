/// <reference types="vite/client" />
import { supabase } from './supabase';
import { IMOVEIS_MOCK } from './data';

export async function getDashboardData(userId: string, isAdmin: boolean = false) {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    console.log("Supabase not configured, using mock data");
    return isAdmin ? IMOVEIS_MOCK : [IMOVEIS_MOCK[0]];
  }

  try {
    // 1. Fetch Imoveis
    let query = supabase.from('imoveis').select('*');
    if (!isAdmin) {
      query = query.eq('proprietario_id', userId);
    }
    
    const { data: imoveis, error: errImovel } = await query;

    if (errImovel || !imoveis || imoveis.length === 0) {
      console.log("No property found for user, falling back to mock data for demo");
      return isAdmin ? IMOVEIS_MOCK : [IMOVEIS_MOCK[0]];
    }

    const results = [];

    for (const imovel of imoveis) {
      // 2. Fetch related data
      const [itensRes, problemasRes, locacoesRes] = await Promise.all([
        supabase.from('montagem_itens').select('*').eq('imovel_id', imovel.id),
        supabase.from('problemas_inesperados').select('*').eq('imovel_id', imovel.id),
        supabase.from('locacoes').select('*').eq('imovel_id', imovel.id).order('data_entrada', { ascending: true })
      ]);

      // Group items by comodo
      const comodosMap = new Map();
      (itensRes.data || []).forEach(item => {
        if (!comodosMap.has(item.comodo)) comodosMap.set(item.comodo, { nome: item.comodo, itens: [] });
        comodosMap.get(item.comodo).itens.push({
          item: item.item,
          datCompra: item.dat_compra,
          preco: Number(item.preco),
          qtd: item.qtd,
          loja: item.loja,
          total: Number(item.total),
          emprestado: item.emprestado
        });
      });

      // Group locacoes by mes_ref
      const locacoesMap = new Map();
      (locacoesRes.data || []).forEach(loc => {
        if (!locacoesMap.has(loc.mes_ref)) {
          locacoesMap.set(loc.mes_ref, { mes: loc.mes_ref, hospedes: 0, noites: 0, lucro: 0, registros: [] });
        }
        const mesData = locacoesMap.get(loc.mes_ref);
        mesData.hospedes += loc.n_hospedes;
        mesData.noites += loc.n_diarias;
        mesData.lucro += Number(loc.lucro);
        mesData.registros.push({
          hospede: loc.hospede,
          nHospedes: loc.n_hospedes,
          data: loc.data_entrada,
          diarias: loc.n_diarias,
          quarto: loc.quarto,
          valorLiquido: Number(loc.valor_liquido),
          taxaLimpeza: Number(loc.taxa_limpeza),
          comissao: Number(loc.comissao_valor || (loc.valor_liquido * (loc.comissao_perc / 100))),
          extra: Number(loc.valor_extra),
          plataforma: loc.plataforma,
          despesas: Number(loc.despesas),
          lucro: Number(loc.lucro)
        });
      });

      // Ensure we have at least one month to show
      if (locacoesMap.size === 0) {
        locacoesMap.set("Mês Atual", { mes: "Mês Atual", hospedes: 0, noites: 0, lucro: 0, registros: [] });
      }

      results.push({
        id: imovel.id,
        nome: imovel.nome,
        apelido: imovel.apelido,
        proprietario: "Proprietário", // Could be fetched from a profiles table
        comissaoPerc: Number(imovel.comissao_perc),
        alerta: imovel.alerta,
        montagem: {
          fatura: imovel.fatura_montagem || "001",
          data: imovel.data_montagem || new Date().toLocaleDateString('pt-BR'),
          totalMontagem: Number(imovel.total_montagem),
          totalPago: Number(imovel.total_pago),
          comodos: Array.from(comodosMap.values()),
          problemasInesperados: (problemasRes.data || []).map(p => p.descricao)
        },
        locacoesPorMes: Array.from(locacoesMap.values())
      });
    }

    return results;
  } catch (error) {
    console.error("Error fetching Supabase data:", error);
    return isAdmin ? IMOVEIS_MOCK : [IMOVEIS_MOCK[0]];
  }
}
