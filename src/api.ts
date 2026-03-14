/// <reference types="vite/client" />
import { supabase } from './supabase';
import { IMOVEL } from './data';

export async function getDashboardData(user: any, isAdmin: boolean = false) {
  if (!import.meta.env.VITE_SUPABASE_URL) {
    console.log("Supabase not configured");
    return [];
  }

  try {
    // 1. Fetch Imoveis
    let query = supabase.from('imoveis').select('*');
    if (!isAdmin) {
      console.log("User metadata:", user.user_metadata);
      if (user.user_metadata?.imovelName) {
        console.log("Filtering by imovelName:", user.user_metadata.imovelName);
        // Filter by the exact property name provided during registration
        query = query.ilike('nome', `%${user.user_metadata.imovelName}%`);
      } else {
        console.log("No imovelName found, falling back to proprietario_id:", user.id);
        // Fallback to ID if no name is set
        query = query.eq('proprietario_id', user.id);
      }
    }
    
    const { data: imoveis, error: errImovel } = await query;
    console.log("Imoveis fetched:", imoveis);

    if (errImovel) {
      console.error("Error fetching imoveis:", errImovel);
      throw errImovel;
    }

    if (!imoveis || imoveis.length === 0) {
      console.log("No property found for user");
      return [];
    }

    const results = [];

    for (const imovel of imoveis) {
      // 2. Fetch locacoes
      const { data: locacoesRes, error: errLocacoes } = await supabase
        .from('locacoes')
        .select('*')
        .eq('imovel_id', imovel.id)
        .order('data_entrada', { ascending: true });

      if (errLocacoes) {
        console.error("Error fetching locacoes:", errLocacoes);
      }

      // Group locacoes by mes_ref
      const locacoesMap = new Map();
      (locacoesRes || []).forEach(loc => {
        if (!locacoesMap.has(loc.mes_ref)) {
          locacoesMap.set(loc.mes_ref, { mes: loc.mes_ref, hospedes: 0, noites: 0, lucro: 0, registros: [] });
        }
        const mesData = locacoesMap.get(loc.mes_ref);
        mesData.hospedes += loc.n_hospedes;
        mesData.noites += loc.n_diarias;
        mesData.lucro += Number(loc.lucro);
        
        const comissaoPerc = loc.comissao_perc !== undefined ? Number(loc.comissao_perc) : Number(imovel.comissao_perc || 20);
        const comissaoCalculada = Number(loc.valor_liquido) * (comissaoPerc / 100);

        mesData.registros.push({
          hospede: loc.hospede,
          nHospedes: loc.n_hospedes,
          data: loc.data_entrada,
          diarias: loc.n_diarias,
          quarto: loc.quarto,
          valorLiquido: Number(loc.valor_liquido),
          taxaLimpeza: Number(loc.taxa_limpeza),
          comissao: comissaoCalculada,
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

      // Calculate total profit
      const totalLucro = Array.from(locacoesMap.values()).reduce((sum, mes) => sum + mes.lucro, 0);

      // Fetch montagem data
      let montagemData = { ...IMOVEL.montagem };
      try {
        const path = `montagem/${imovel.nome.replace(/\s+/g, '')}.json`;
        const { data: fileData, error: fileError } = await supabase.storage.from('aptstays_files').download(path);
        if (fileData) {
          const text = await fileData.text();
          const parsed = JSON.parse(text);
          if (parsed && parsed.comodos) {
            montagemData = parsed;
          }
        }
      } catch (e) {
        console.error("Error loading montagem data", e);
      }

      results.push({
        id: imovel.id,
        nome: imovel.nome,
        apelido: imovel.apelido,
        proprietario: imovel.proprietario_id,
        comissaoPerc: Number(imovel.comissao_perc || 20), // Default to 20 if missing
        alerta: imovel.alerta || "", // Default to empty string if missing
        montagem: {
          ...montagemData,
          totalPago: totalLucro // Set totalPago to the total profit from rentals
        },
        locacoesPorMes: Array.from(locacoesMap.values())
      });
    }

    return results;
  } catch (error) {
    console.error("Error fetching Supabase data:", error);
    throw error;
  }
}

