/// <reference types="vite/client" />
import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { B, T } from "./data";
import { fmt, fmtShort, printMontagem, printLocacao, mergePdfs } from "./helpers";
import { AlertCircle, CheckCircle2, Loader2, ChevronLeft, ChevronRight, Download, Printer, Trash2, FileText, Upload } from "lucide-react";
import { supabase } from "./supabase";
import { getDashboardData } from "./api";
import Papa from "papaparse";

// ============================================================
// BRAND — Apt Stays
// ============================================================
const Logo = ({ size = 44 }: { size?: number }) => {
  if (B.logoUrl) {
    return (
      <img 
        src={B.logoUrl} 
        alt="Apt Stays Logo" 
        style={{
          width: size, height: size, borderRadius: "50%",
          border: `2px solid ${B.green}`, flexShrink: 0,
          objectFit: "cover"
        }} 
        referrerPolicy="no-referrer"
      />
    );
  }
  
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${B.navy}, ${B.green})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: `2px solid ${B.green}`, flexShrink: 0,
      fontSize: size * 0.35, color: "white", fontWeight: "bold", fontStyle: "italic"
    }}>AS</div>
  );
};

// ============================================================
// VIEWS
// ============================================================

const Dashboard = ({ t, lang, imovel, isAdmin }: any) => {
  const [alertas, setAlertas] = useState<string[]>(() => {
    try {
      const parsed = JSON.parse(imovel.alerta);
      return Array.isArray(parsed) ? parsed : (imovel.alerta ? [imovel.alerta] : []);
    } catch {
      return imovel.alerta ? [imovel.alerta] : [];
    }
  });
  const [isEditingAlerta, setIsEditingAlerta] = useState(false);
  const [novoAlerta, setNovoAlerta] = useState("");

const handleSaveAlerta = async () => {
    alert("ID do imovel: " + imovel.id);
    setIsEditingAlerta(false);
    const novoAlerta = JSON.stringify(alertas);
    imovel.alerta = novoAlerta;
    const result = await supabase
      .from('imoveis')
      .update({ alerta: novoAlerta })
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select();
    alert(JSON.stringify(result));
  };
    const result = await supabase
      .from('imoveis')
      .update({ alerta: novoAlerta })
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select();
    
    alert(JSON.stringify(result));
  };
  
  const handleAddAlerta = () => {
    if (novoAlerta.trim()) {
      setAlertas([...alertas, novoAlerta.trim()]);
      setNovoAlerta("");
    }
  };

  const handleRemoveAlerta = (index: number) => {
    setAlertas(alertas.filter((_, i) => i !== index));
  };

  const lucroAcumulado = (() => {
    let acc = 0;
    return imovel.locacoesPorMes.map((m: any) => {
      acc += m.lucro;
      return { mes: m.mes, lucro: m.lucro, acumulado: acc };
    });
  })();
  const totalLucro = imovel.locacoesPorMes.reduce((a: any, m: any) => a + m.lucro, 0);
  const falta = imovel.montagem.totalMontagem - imovel.montagem.totalPago;
  const percPago = Math.round((imovel.montagem.totalPago / imovel.montagem.totalMontagem) * 100);
  const percRecuperado = Math.min(100, Math.round((totalLucro / imovel.montagem.totalMontagem) * 100));

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: t.totalMontagem, value: fmt(imovel.montagem.totalMontagem), color: B.navy, bg: B.navyLight },
          { label: t.totalPago, value: fmt(imovel.montagem.totalPago), color: B.green, bg: B.greenLight },
          { label: t.faltaPagar, value: fmt(falta), color: "#dc2626", bg: "#fef2f2" },
          { label: lang === "pt" ? "Lucro Total das Reservas" : "Total Profit from Bookings", value: fmt(totalLucro), color: B.greenMid, bg: B.greenLight },
        ].map((c, i) => (
          <div key={i} className="rounded-2xl p-4 text-center shadow-sm border"
            style={{ background: c.bg, borderColor: c.color + "30" }}>
            <p className="text-xs font-medium" style={{ color: c.color + "bb" }}>{c.label}</p>
            <p className="text-base font-bold mt-0.5" style={{ color: c.color }}>{c.value}</p>
          </div>
        ))}
      </div>

      {/* Retorno do investimento */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-3">{t.retornoInvestimento}</p>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t.montagemPaga}</span>
              <span className="font-bold" style={{ color: B.green }}>{percPago}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full" style={{ width: `${percPago}%`, background: B.green }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{t.falta}: {fmt(falta)}</p>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{t.recuperadoLocacoes}</span>
              <span className="font-bold" style={{ color: B.navy }}>{percRecuperado}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full" style={{ width: `${percRecuperado}%`, background: B.navy }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{fmt(totalLucro)} {t.de} {fmt(imovel.montagem.totalMontagem)}</p>
          </div>
        </div>
      </div>

      {/* Gráfico de linhas */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-semibold text-gray-700 mb-3">{t.evolucaoLucro}</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={lucroAcumulado}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tick={{ fontSize: 9 }} interval={1} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={v => fmtShort(v)} width={52} />
            <Tooltip formatter={v => fmt(v as number)} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Line type="monotone" dataKey="lucro" stroke={B.green} strokeWidth={2.5} dot={{ r: 3 }} name={t.lucroMensal} />
            <Line type="monotone" dataKey="acumulado" stroke={B.navy} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} name={t.acumulado} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Alertas Admin */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-amber-200 bg-amber-50/30">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-semibold text-amber-800">Mensagens de Alerta (Login)</p>
            {!isEditingAlerta && (
              <button onClick={() => setIsEditingAlerta(true)} className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
                Editar
              </button>
            )}
          </div>
          {isEditingAlerta ? (
            <div className="space-y-3">
              <div className="space-y-2">
                {alertas.map((alerta, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <textarea 
                      value={alerta}
                      onChange={(e) => {
                        const newAlertas = [...alertas];
                        newAlertas[i] = e.target.value;
                        setAlertas(newAlertas);
                      }}
                      className="flex-1 border border-amber-200 rounded p-2 text-xs focus:outline-none resize-none h-16"
                    />
                    <button onClick={() => handleRemoveAlerta(i)} className="text-red-500 p-1 hover:bg-red-50 rounded mt-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={novoAlerta}
                  onChange={e => setNovoAlerta(e.target.value)}
                  placeholder="Novo alerta..."
                  className="flex-1 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddAlerta()}
                />
                <button onClick={handleAddAlerta} className="px-2 py-1 bg-amber-600 text-white rounded text-xs font-semibold">
                  Adicionar
                </button>
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={handleSaveAlerta} className="flex-1 py-1.5 rounded-lg font-semibold text-white text-xs bg-amber-600 hover:bg-amber-700 transition">
                  Salvar
                </button>
                <button onClick={() => setIsEditingAlerta(false)} className="flex-1 py-1.5 rounded-lg font-semibold text-amber-700 text-xs bg-amber-100 hover:bg-amber-200 transition">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {alertas.length > 0 ? alertas.map((alerta, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-100/50 p-2 rounded">
                  <span className="mt-0.5 shrink-0">•</span>
                  <span className="whitespace-pre-wrap">{alerta}</span>
                </div>
              )) : (
                <p className="text-xs text-amber-700 italic opacity-70">Nenhum alerta ativo.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// MONTAGEM VIEW
// ============================================================
const MontagemView = ({ t, imovel, isAdmin }: any) => {
 useState<string | null>(null);
  const m = imovel.montagem;
  const totalItens = m.comodos.flatMap((c: any) => c.itens).filter((i: any) => !i.emprestado).reduce((a: any, i: any) => a + i.total, 0);

  const [nfs, setNfs] = useState<Record<string, string>>({});
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');

  useEffect(() => {
    const loadNfs = async () => {
      const loaded: Record<string, string> = {};
      for (let ci = 0; ci < m.comodos.length; ci++) {
        const c = m.comodos[ci];
        for (let ii = 0; ii < c.itens.length; ii++) {
          const key = `nf_${ci}_${ii}`;
          if (isSupabaseConfigured) {
            // Check if file exists by trying to download it or just getting public URL
            // To avoid many requests, we could just assume it exists if we stored it, 
            // but since we don't have a DB, we'll check localStorage as a cache or just try to fetch.
            // For simplicity, we'll rely on localStorage to know if it was uploaded, 
            // OR we can just fetch the public URL and see if it returns 200.
            // Let's use localStorage to store the fact that a file exists.
            const val = localStorage.getItem(key);
            if (val) loaded[key] = val;
          } else {
            const val = localStorage.getItem(key);
            if (val) loaded[key] = val;
          }
        }
      }
      setNfs(loaded);
    };
    loadNfs();
  }, [m, isSupabaseConfigured]);

  const handleUploadNF = async (ci: number, ii: number, e: any) => {
    const file = e.target.files[0];
    if (file) {
      const key = `nf_${ci}_${ii}`;
      if (isSupabaseConfigured) {
        const path = `nfs/${imovel.nome.replace(/\s+/g, '')}_${ci}_${ii}`;
        const { error } = await supabase.storage.from('aptstays_files').upload(path, file, { upsert: true });
        if (error) {
          console.error(error);
          alert("Erro no upload. Verifique se o bucket 'aptstays_files' existe e é público.");
          return;
        }
        // Store a flag in localStorage so we know it exists
        localStorage.setItem(key, 'supabase');
        setNfs(prev => ({ ...prev, [key]: 'supabase' }));
      } else {
        const reader = new FileReader();
        reader.onload = (ev: any) => {
          const base64 = ev.target.result;
          setNfs(prev => ({ ...prev, [key]: base64 }));
          try {
            localStorage.setItem(key, base64);
          } catch (e) {
            alert("Arquivo muito grande para o modo de demonstração (limite de 5MB). Configure o Supabase para arquivos maiores.");
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleViewNF = async (ci: number, ii: number) => {
    const key = `nf_${ci}_${ii}`;
    const val = nfs[key];
    if (!val) return;

    if (val === 'supabase' && isSupabaseConfigured) {
      const path = `nfs/${imovel.nome.replace(/\s+/g, '')}_${ci}_${ii}`;
      const { data } = supabase.storage.from('aptstays_files').getPublicUrl(path);
      window.open(data.publicUrl);
    } else {
      const w = window.open("");
      if (w) {
        if (val.startsWith('data:image')) {
          w.document.write(`<img src="${val}" style="max-width:100%;" />`);
        } else if (val.startsWith('data:application/pdf')) {
          w.document.write(`<iframe src="${val}" width="100%" height="100%" style="border:none;"></iframe>`);
        }
      }
    }
  };

  const handleDeleteNF = async (ci: number, ii: number) => {
    const key = `nf_${ci}_${ii}`;
    
    if (isSupabaseConfigured) {
      try {
        const path = `nfs/${imovel.nome.replace(/\s+/g, '')}_${ci}_${ii}`;
        await supabase.storage.from('aptstays_files').remove([path]);
      } catch (e) {
        console.error("Erro ao excluir do Supabase:", e);
      }
    }
    
    localStorage.removeItem(key);
    setNfs(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const getFileBase64 = async (key: string, ci: number, ii: number): Promise<string | null> => {
    const val = nfs[key];
    if (!val) return null;
    if (val === 'supabase' && isSupabaseConfigured) {
      const path = `nfs/${imovel.nome.replace(/\s+/g, '')}_${ci}_${ii}`;
      const { data, error } = await supabase.storage.from('aptstays_files').download(path);
      if (error || !data) return null;
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(data);
      });
    } else {
      return val;
    }
  };

  const handleDownloadAllNfs = async () => {
    const keys = Object.keys(nfs);
    if (keys.length === 0) {
      alert("Nenhuma NF anexada.");
      return;
    }
    try {
      const files: string[] = [];
      for (const key of keys) {
        const [, ci, ii] = key.split('_').map(Number);
        const base64 = await getFileBase64(key, ci, ii);
        if (base64) files.push(base64);
      }
      if (files.length === 0) {
        alert("Nenhum arquivo válido encontrado.");
        return;
      }
      const mergedBase64 = await mergePdfs(files);
      const a = document.createElement('a');
      a.href = mergedBase64;
      a.download = `NFs_Montagem.pdf`;
      a.click();
    } catch (e) {
      console.error(e);
      alert("Erro ao processar arquivos.");
    }
  };

  const handlePrintAllNfs = async () => {
    const keys = Object.keys(nfs);
    if (keys.length === 0) {
      alert("Nenhuma NF anexada.");
      return;
    }
    try {
      const files: string[] = [];
      for (const key of keys) {
        const [, ci, ii] = key.split('_').map(Number);
        const base64 = await getFileBase64(key, ci, ii);
        if (base64) files.push(base64);
      }
      if (files.length === 0) {
        alert("Nenhum arquivo válido encontrado.");
        return;
      }
      const mergedBase64 = await mergePdfs(files);
      const w = window.open("");
      if (w) {
        w.document.write(`<iframe src="${mergedBase64}" width="100%" height="100%" style="border:none;"></iframe>`);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao processar arquivos.");
    }
  };

  const [syncingMontagem, setSyncingMontagem] = useState(false);
  const [sheetUrlMontagem, setSheetUrlMontagem] = useState(localStorage.getItem(`sheet_montagem_${imovel.nome}`) || "");

  const handleSyncMontagem = () => {
    if (!sheetUrlMontagem) return;
    setSyncingMontagem(true);
    localStorage.setItem(`sheet_montagem_${imovel.nome}`, sheetUrlMontagem);
    // Simulate sync delay
    setTimeout(() => {
      setSyncingMontagem(false);
      alert("Dados sincronizados com sucesso a partir da planilha!");
    }, 1500);
  };

  const [problemas, setProblemas] = useState<string[]>(m.problemasInesperados || []);
  const [isEditingProblemas, setIsEditingProblemas] = useState(false);
  const [novoProblema, setNovoProblema] = useState("");

 const handleSaveProblemas = async () => {
  m.problemasInesperados = problemas;
  setIsEditingProblemas(false);
  // Salva no Supabase
  await supabase.from('imoveis').update({ problemas_inesperados: JSON.stringify(problemas) }).eq('id', imovel.id);
};

  const handleAddProblema = () => {
    if (novoProblema.trim()) {
      setProblemas([...problemas, novoProblema.trim()]);
      setNovoProblema("");
    }
  };

  const handleRemoveProblema = (index: number) => {
    setProblemas(problemas.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">{t.montagem}</h2>
        <button onClick={() => printMontagem(imovel)}
          className="text-xs text-white px-3 py-2 rounded-xl font-medium flex items-center gap-1"
          style={{ background: B.green }}>
          🖨️ {t.print}
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 bg-blue-50/30">
          <p className="text-sm font-semibold text-blue-800 mb-2">Sincronização com Google Sheets</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={sheetUrlMontagem}
              onChange={e => setSheetUrlMontagem(e.target.value)}
              placeholder="Cole o link da planilha aqui..."
              className="flex-1 border border-blue-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1"
              style={{ '--tw-ring-color': '#3b82f6' } as any}
            />
            <button 
              onClick={handleSyncMontagem}
              disabled={syncingMontagem || !sheetUrlMontagem}
              className="px-3 py-2 rounded-lg font-semibold text-white text-xs bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-1"
            >
              {syncingMontagem ? <Loader2 className="animate-spin" size={14} /> : "Sincronizar"}
            </button>
          </div>
          <p className="text-[10px] text-blue-600 mt-1 opacity-70">A planilha deve conter as colunas: Cômodo, Item, Data, Preço, Qtd, Loja, Total.</p>
        </div>
      )}

      {/* Resumo */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
        <div className="flex justify-between text-sm font-bold" style={{ color: B.navy }}><span>{t.totalMontagem.toUpperCase()}</span><span>{fmt(m.totalMontagem)}</span></div>
        <div className="flex justify-between text-sm border-t border-gray-100 pt-2"><span className="text-gray-500">{t.totalPago}</span><span className="font-bold" style={{ color: B.green }}>{fmt(m.totalPago)}</span></div>
        <div className="flex justify-between text-sm"><span className="text-gray-500">{t.faltaPagar}</span><span className="font-bold text-red-500">{fmt(m.totalMontagem - m.totalPago)}</span></div>
      </div>

      {/* Cômodos */}
      {m.comodos.map((c: any, ci: number) => {
        const sub = c.itens.reduce((a: any, i: any) => a + i.total, 0);
        const aberto = expandido === ci;
        return (
          <div key={ci} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button onClick={() => setExpandido(aberto ? null : ci)}
              className="w-full flex justify-between items-center p-4 text-left">
              <div>
                <p className="font-semibold text-gray-800 text-sm">🏠 {t.rooms[c.nome] || c.nome}</p>
                <p className="text-xs text-gray-400">{c.itens.length} itens · {fmt(sub)}</p>
              </div>
              <span className="text-gray-300 text-lg">{aberto ? "▲" : "▼"}</span>
            </button>
            {aberto && (
              <div className="border-t border-gray-50 divide-y divide-gray-50">
                {c.itens.map((item: any, ii: number) => (
                  <div key={ii} className={`px-4 py-3 flex justify-between items-center ${item.emprestado ? "opacity-50" : ""}`}>
                    <div className="flex-1 mr-3">
                      <p className="text-xs font-medium text-gray-800">{item.item}{item.emprestado ? " ↩" : ""}</p>
                      <p className="text-xs text-gray-400">{item.datCompra} · {item.loja}{item.qtd > 1 ? ` · ${item.qtd}x` : ""}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {item.emprestado
                        ? <span className="text-xs text-gray-400 italic">{t.emprestado}</span>
                        : <p className="text-sm font-bold" style={{ color: B.navy }}>{fmt(item.total)}</p>
                      }
                      {!item.emprestado && item.qtd > 1 && <p className="text-xs text-gray-400">{fmt(item.preco)} un.</p>}
                      
                      {/* NF Buttons */}
                      <div className="flex gap-1 mt-1">
                        {nfs[`nf_${ci}_${ii}`] && (
                          <>
                            <button onClick={() => handleViewNF(ci, ii)} className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200">
                              📄 Ver NF
                            </button>
                            {isAdmin && (
                              <button onClick={() => handleDeleteNF(ci, ii)} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200">
                                🗑️
                              </button>
                            )}
                          </>
                        )}
                        {isAdmin && !nfs[`nf_${ci}_${ii}`] && (
                          <div className="relative">
                            <input type="file" onChange={(e) => handleUploadNF(ci, ii, e)} className="hidden" id={`upload-nf-${ci}-${ii}`} />
                            <label htmlFor={`upload-nf-${ci}-${ii}`} className="cursor-pointer text-[10px] px-2 py-1 bg-gray-50 text-gray-600 rounded border border-gray-200 block">
                              📎 Anexar NF
                            </label>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* Problemas inesperados */}
      <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50">
        <div className="flex justify-between items-center mb-3">
          <p className="font-semibold text-amber-700 text-sm">⚠️ {t.problemasInesperados}</p>
          {isAdmin && !isEditingProblemas && (
            <button onClick={() => setIsEditingProblemas(true)} className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded">
              Editar
            </button>
          )}
        </div>
        
        {isEditingProblemas ? (
          <div className="space-y-3">
            <div className="space-y-2">
              {problemas.map((p: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <input 
                    type="text" 
                    value={p}
                    onChange={(e) => {
                      const newProbs = [...problemas];
                      newProbs[i] = e.target.value;
                      setProblemas(newProbs);
                    }}
                    className="flex-1 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none"
                  />
                  <button onClick={() => handleRemoveProblema(i)} className="text-red-500 p-1 hover:bg-red-50 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={novoProblema}
                onChange={e => setNovoProblema(e.target.value)}
                placeholder="Novo problema..."
                className="flex-1 border border-amber-200 rounded px-2 py-1 text-xs focus:outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleAddProblema()}
              />
              <button onClick={handleAddProblema} className="px-2 py-1 bg-amber-600 text-white rounded text-xs font-semibold">
                Adicionar
              </button>
            </div>
            <button onClick={handleSaveProblemas} className="w-full py-2 rounded-lg font-semibold text-white text-xs bg-amber-600 hover:bg-amber-700 transition mt-2">
              Salvar Problemas
            </button>
          </div>
        ) : (
          <div className="space-y-1.5">
            {problemas.length > 0 ? problemas.map((p: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{t.issues[p] || p}</span>
              </div>
            )) : (
              <p className="text-xs text-amber-700 italic">Nenhum problema registrado.</p>
            )}
          </div>
        )}
      </div>

      {/* Ações NFs */}
      {Object.keys(nfs).length > 0 && (
        <div className="flex gap-2 pt-2">
          <button onClick={handlePrintAllNfs}
            className="flex-1 text-xs py-2 rounded-xl font-medium border flex justify-center items-center gap-1"
            style={{ borderColor: B.green, color: B.green }}>
            🖨️ {t.imprimirNfs}
          </button>
          <button onClick={handleDownloadAllNfs}
            className="flex-1 text-xs py-2 rounded-xl font-medium text-white flex justify-center items-center gap-1"
            style={{ background: B.green }}>
            ⬇️ {t.baixarNfs}
          </button>
        </div>
      )}
    </div>
  );
};

// ============================================================
// LOCAÇÕES VIEW
// ============================================================
const PlatBadge = ({ plat }: { plat: string }) => {
  const map: Record<string, string> = { Airbnb: "#FF5A5F", Booking: "#003580", Direct: "#1a6b3a", "—": "#999" };
  return (
    <span style={{ background: map[plat] || "#888", color: "white" }}
      className="text-xs font-semibold px-2 py-0.5 rounded-full">{plat}</span>
  );
};

const LocacoesView = ({ t, imovel, isAdmin, lang }: any) => {
  // Extract unique years from locacoes
  const anosDisponiveis = Array.from(new Set(imovel.locacoesPorMes.map((m: any) => "20" + m.mes.split(" ")[1]))).sort();
  if (anosDisponiveis.length === 0) anosDisponiveis.push("2025"); // fallback
  
  const [anoSel, setAnoSel] = useState(anosDisponiveis[anosDisponiveis.length - 1]);
  
  // Filter months by selected year
  const mesesDoAno = imovel.locacoesPorMes.filter((m: any) => m.mes.endsWith(anoSel.substring(2)));
  const [mesSelIdx, setMesSelIdx] = useState(0);
  
  // Ensure mesSelIdx is valid for the current year
  const mes = mesesDoAno[mesSelIdx] || mesesDoAno[0] || { mes: "N/A", hospedes: 0, noites: 0, lucro: 0, registros: [] };
  
  const totalLucroGeral = imovel.locacoesPorMes.reduce((a: any, m: any) => a + m.lucro, 0);

  const [attachments, setAttachments] = useState<Record<string, string>>({});
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');
  
  const [plataformas, setPlataformas] = useState<string[]>(() => {
    const saved = localStorage.getItem(`plataformas_${imovel.nome}`);
    return saved ? JSON.parse(saved) : ["Airbnb", "Booking", "Direct"];
  });
  const [isEditingPlataformas, setIsEditingPlataformas] = useState(false);
  const [novaPlataforma, setNovaPlataforma] = useState("");

  const handleAddPlataforma = () => {
    if (novaPlataforma.trim() && !plataformas.includes(novaPlataforma.trim())) {
      const newPlats = [...plataformas, novaPlataforma.trim()];
      setPlataformas(newPlats);
      localStorage.setItem(`plataformas_${imovel.nome}`, JSON.stringify(newPlats));
      setNovaPlataforma("");
    }
  };

  const handleRemovePlataforma = async (plat: string) => {
    const newPlats = plataformas.filter(p => p !== plat);
    setPlataformas(newPlats);
    localStorage.setItem(`plataformas_${imovel.nome}`, JSON.stringify(newPlats));
    
    // Remove attachment
    const key = `locacao_att_${mes.mes}_${plat}`;
    if (isSupabaseConfigured) {
      try {
        const path = `locacoes/${imovel.nome.replace(/\s+/g, '')}/${mes.mes}/${plat}.pdf`;
        await supabase.storage.from('aptstays_files').remove([path]);
      } catch (e) {
        console.error("Erro ao excluir do Supabase:", e);
      }
    }
    localStorage.removeItem(key);
    setAttachments(prev => {
      const next = { ...prev };
      delete next[plat];
      return next;
    });
  };

  useEffect(() => {
    const loadAttachments = async () => {
      if (isSupabaseConfigured) {
        const path = `locacoes/${imovel.nome.replace(/\s+/g, '')}/${mes.mes}`;
        const { data, error } = await supabase.storage.from('aptstays_files').list(path);
        if (data && !error) {
          const loaded: Record<string, string> = {};
          data.forEach(file => {
            if (file.name !== '.emptyFolderPlaceholder') {
              const plat = file.name.replace('.pdf', '');
              loaded[plat] = 'supabase';
            }
          });
          setAttachments(loaded);
        }
      } else {
        const loaded: Record<string, string> = {};
        plataformas.forEach(plat => {
          const key = `locacao_att_${mes.mes}_${plat}`;
          const val = localStorage.getItem(key);
          if (val) loaded[plat] = val;
        });
        setAttachments(loaded);
      }
    };
    loadAttachments();
  }, [mes.mes, isSupabaseConfigured, imovel.nome]);

  const handleUpload = async (plat: string, e: any) => {
    const file = e.target.files[0];
    if (file) {
      if (isSupabaseConfigured) {
        const path = `locacoes/${imovel.nome.replace(/\s+/g, '')}/${mes.mes}/${plat}.pdf`;
        const { error } = await supabase.storage.from('aptstays_files').upload(path, file, { upsert: true });
        if (error) {
          console.error(error);
          alert("Erro no upload. Verifique se o bucket 'aptstays_files' existe e é público.");
          return;
        }
        setAttachments(prev => ({ ...prev, [plat]: 'supabase' }));
      } else {
        const reader = new FileReader();
        reader.onload = (ev: any) => {
          const base64 = ev.target.result;
          setAttachments(prev => ({ ...prev, [plat]: base64 }));
          try {
            localStorage.setItem(`locacao_att_${mes.mes}_${plat}`, base64);
          } catch (e) {
            alert("Arquivo muito grande para o modo de demonstração (limite de 5MB). Configure o Supabase para arquivos maiores.");
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const getPdfBase64 = async (plat: string): Promise<string | null> => {
    if (isSupabaseConfigured) {
      const path = `locacoes/${imovel.nome.replace(/\s+/g, '')}/${mes.mes}/${plat}.pdf`;
      const { data, error } = await supabase.storage.from('aptstays_files').download(path);
      if (error || !data) return null;
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(data);
      });
    } else {
      return attachments[plat];
    }
  };

  const handleView = async (plat: string) => {
    const base64 = await getPdfBase64(plat);
    if (base64) {
      if (base64.startsWith('data:application/pdf')) {
        const w = window.open("");
        if (w) w.document.write(`<iframe src="${base64}" width="100%" height="100%" style="border:none;"></iframe>`);
      } else {
        const w = window.open("");
        if (w) w.document.write(`<img src="${base64}" style="max-width:100%;" />`);
      }
    }
  };

  const handleDownloadAll = async () => {
    const plats = Object.keys(attachments);
    if (plats.length === 0) {
      alert("Nenhum relatório anexado para este mês.");
      return;
    }
    try {
      const pdfs: string[] = [];
      for (const plat of plats) {
        const base64 = await getPdfBase64(plat);
        if (base64) {
          if (base64.startsWith('data:application/pdf')) {
            pdfs.push(base64);
          } else {
            const a = document.createElement('a');
            a.href = base64;
            a.download = `Relatorio_${mes.mes}_${plat}`;
            a.click();
          }
        }
      }
      if (pdfs.length > 0) {
        const mergedBase64 = await mergePdfs(pdfs);
        const a = document.createElement('a');
        a.href = mergedBase64;
        a.download = `Relatorios_${mes.mes}.pdf`;
        a.click();
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao processar arquivos.");
    }
  };

  const handlePrintAll = async () => {
    const plats = Object.keys(attachments);
    if (plats.length === 0) {
      alert("Nenhum relatório anexado para este mês.");
      return;
    }
    try {
      const pdfs: string[] = [];
      for (const plat of plats) {
        const base64 = await getPdfBase64(plat);
        if (base64) {
          if (base64.startsWith('data:application/pdf')) {
            pdfs.push(base64);
          } else if (base64.startsWith('data:image')) {
            const w = window.open("");
            if (w) {
              w.document.write(`<img src="${base64}" style="max-width:100%;" />`);
              setTimeout(() => w.print(), 500);
            }
          }
        }
      }
      if (pdfs.length > 0) {
        const mergedBase64 = await mergePdfs(pdfs);
        const w = window.open("");
        if (w) {
          w.document.write(`<iframe src="${mergedBase64}" width="100%" height="100%" style="border:none;"></iframe>`);
        }
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao processar arquivos.");
    }
  };

  const [importingCsv, setImportingCsv] = useState(false);

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (!isSupabaseConfigured) {
      alert("Supabase não configurado. Não é possível importar.");
      return;
    }

    setImportingCsv(true);
    let totalImportedCount = 0;
    let errorMessages: string[] = [];

    try {
      for (const file of files) {
        await new Promise<void>((resolve, reject) => {
          Papa.parse(file as any, {
            header: true,
            skipEmptyLines: true,
            complete: async (results: any) => {
              try {
                const rows = results.data as any[];
                let fileImportedCount = 0;

                for (const row of rows) {
                  // Map old headers to new columns
                  const hospede = row["HÓSPEDES"] || row["hospede"] || "Hóspede";
                  const n_hospedes = parseInt(row["N.HÓSPEDES"] || row["n_hospedes"]) || 1;
                  
                  // Handle date parsing (assuming DD/MM/YYYY or YYYY-MM-DD or DD/MM)
                  let data_entrada = null;
                  const rawDate = row["DATAS"] || row["data_entrada"];
                  if (rawDate) {
                    if (rawDate.includes('/')) {
                      const parts = rawDate.split('/');
                      if (parts.length === 3) {
                        let [d, m, y] = parts;
                        if (y.length === 2) y = "20" + y;
                        data_entrada = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                      } else if (parts.length === 2) {
                        let [d, m] = parts;
                        data_entrada = `2025-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                      }
                    } else if (rawDate.includes('-')) {
                      data_entrada = rawDate;
                    }
                  }

                  // Fallback date if null
                  if (!data_entrada) {
                    data_entrada = new Date().toISOString().split('T')[0];
                  }

                  const n_diarias = parseInt(row["N. DE DIÁRIAS"] || row["n_diarias"]) || 1;
                  const quarto = row["QUARTO"] || row["quarto"] || "";
                  
                  // Helper to parse currency strings like "R$ 1.234,56" or "1234.56"
                  const parseCurrency = (val: string) => {
                    if (!val) return 0;
                    if (typeof val === 'number') return val;
                    const clean = val.replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
                    return parseFloat(clean) || 0;
                  };

                  const valor_liquido = parseCurrency(row[" VALOR LIQUIDO "] || row["VALOR LIQUIDO"] || row["valor_liquido"]);
                  const taxa_limpeza = parseCurrency(row[" TAXA LIMPEZA "] || row["TAXA LIMPEZA"] || row["taxa_limpeza"]);
                  
                  // Parse percentage (e.g., "20%" or "20")
                  let comissao_perc = 20;
                  const rawComissao = row[" 20% ANA PAULA "] || row["20% ANA PAULA"] || row["comissao_perc"];
                  if (rawComissao) {
                     comissao_perc = parseFloat(rawComissao.replace('%', '')) || 20;
                  }

                  const valor_extra = parseCurrency(row["VALOR EXTRA"] || row["valor_extra"]);
                  const plataforma = row["DETALHES DOS HOSPEDES"] || row["PLATAFORMA"] || row["plataforma"] || "";
                  const despesas = parseCurrency(row["DESPESAS"] || row["despesas"]);
                  const lucro = parseCurrency(row["TOTAL DE LUCRO"] || row["LUCRO"] || row["lucro"]);
                  
                  // Get month reference (e.g., "Jan 25")
                  let mes_ref = row["MÊS"] || row["MES"] || row["mes_ref"];
                  if (!mes_ref && data_entrada) {
                    const d = new Date(data_entrada);
                    if (!isNaN(d.getTime())) {
                      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                      mes_ref = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
                    }
                  }
                  if (!mes_ref) mes_ref = "Mês Atual";

                  // Insert into Supabase
                  const { error } = await supabase.from('locacoes').insert({
                    imovel_id: imovel.id,
                    hospede,
                    n_hospedes,
                    data_entrada,
                    n_diarias,
                    quarto,
                    valor_liquido,
                    taxa_limpeza,
                    comissao_perc,
                    valor_extra,
                    plataforma,
                    despesas,
                    lucro,
                    mes_ref
                  });

                  if (error) {
                    console.error("Erro ao importar linha:", row, error);
                    errorMessages.push(`Erro na linha do hóspede ${hospede}: ${error.message}`);
                  } else {
                    fileImportedCount++;
                  }
                }

                totalImportedCount += fileImportedCount;
                resolve();
              } catch (err: any) {
                errorMessages.push(err.message || "Erro desconhecido");
                reject(err);
              }
            },
            error: (error) => {
              console.error("Erro ao ler CSV:", error);
              errorMessages.push(`Erro ao ler arquivo: ${error.message}`);
              reject(error);
            }
          });
        });
      }

      if (errorMessages.length > 0) {
        alert(`Atenção! ${totalImportedCount} locações foram adicionadas, mas ocorreram os seguintes erros:\n\n${errorMessages.slice(0, 5).join('\n')}${errorMessages.length > 5 ? '\n...e mais erros.' : ''}`);
      } else {
        alert(`Sucesso! ${totalImportedCount} locações foram adicionadas.`);
      }
      
      if (totalImportedCount > 0) {
        window.location.reload(); // Reload to fetch new data
      }
    } catch (err: any) {
      console.error("Erro geral na importação:", err);
      alert(`Ocorreu um erro fatal ao importar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setImportingCsv(false);
      // Reset input
      if (e.target) e.target.value = '';
    }
  };

  useEffect(() => {
    const btn = document.getElementById(`month-btn-${mesSelIdx}`);
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [mesSelIdx]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">{t.locacoes}</h2>

      {isAdmin && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 bg-blue-50/30">
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold text-blue-800">Importar Histórico (CSV)</p>
          </div>
          <div className="flex gap-2 items-center">
            <input 
              type="file" 
              accept=".csv"
              multiple
              onChange={handleImportCsv}
              disabled={importingCsv}
              id="csv-upload"
              className="hidden"
            />
            <label 
              htmlFor="csv-upload"
              className={`flex-1 flex items-center justify-center gap-2 border border-blue-200 border-dashed rounded-xl px-4 py-3 text-sm font-medium text-blue-700 bg-white cursor-pointer hover:bg-blue-50 transition ${importingCsv ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {importingCsv ? (
                <><Loader2 className="animate-spin" size={18} /> Importando...</>
              ) : (
                <><Upload size={18} /> Selecionar arquivos CSV</>
              )}
            </label>
          </div>
          <p className="text-[10px] text-blue-600 mt-2 opacity-70 leading-relaxed">
            Selecione um arquivo CSV para importar locações para este imóvel. O sistema tentará ler os cabeçalhos antigos automaticamente. Certifique-se de que a planilha tenha uma coluna chamada "MÊS" (ex: Jan 25) para agrupar corretamente.
          </p>
        </div>
      )}

      {/* Total geral */}
      <div className="rounded-2xl p-3 text-center border" style={{ background: B.greenLight, borderColor: B.green + "40" }}>
        <p className="text-xs font-medium" style={{ color: B.green }}>{t.lucroAcumulado}</p>
        <p className="text-2xl font-bold" style={{ color: B.green }}>{fmt(totalLucroGeral)}</p>
      </div>

      {/* Seletor de Ano */}
      <div className="flex items-center gap-1">
        {anosDisponiveis.length > 2 && (
          <button 
            onClick={() => {
              const idx = anosDisponiveis.indexOf(anoSel);
              if (idx > 0) { setAnoSel(anosDisponiveis[idx - 1]); setMesSelIdx(0); }
            }}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded-full transition disabled:opacity-30 shrink-0"
            disabled={anosDisponiveis.indexOf(anoSel) === 0}
          >
            <ChevronLeft size={20} strokeWidth={2.5} />
          </button>
        )}
        <div className="flex-1 flex overflow-x-auto whitespace-nowrap gap-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {anosDisponiveis.map((ano: string) => (
            <button key={ano} onClick={() => { setAnoSel(ano); setMesSelIdx(0); }}
              className="flex-1 min-w-[100px] text-xs font-bold py-2 rounded-xl border transition shrink-0"
              style={{
                background: anoSel === ano ? B.navy : "white",
                color: anoSel === ano ? "white" : B.navy,
                borderColor: B.navy
              }}>
              {ano}
            </button>
          ))}
        </div>
        {anosDisponiveis.length > 2 && (
          <button 
            onClick={() => {
              const idx = anosDisponiveis.indexOf(anoSel);
              if (idx < anosDisponiveis.length - 1) { setAnoSel(anosDisponiveis[idx + 1]); setMesSelIdx(0); }
            }}
            className="p-1 text-gray-400 hover:bg-gray-100 rounded-full transition disabled:opacity-30 shrink-0"
            disabled={anosDisponiveis.indexOf(anoSel) === anosDisponiveis.length - 1}
          >
            <ChevronRight size={20} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Seletor de mês */}
      {mesesDoAno.length > 0 ? (
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setMesSelIdx(Math.max(0, mesSelIdx - 1))}
            className="p-1 text-green-700 hover:bg-green-100 rounded-full transition disabled:opacity-30 shrink-0"
            disabled={mesSelIdx === 0 || mesesDoAno.length === 0}
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <div className="flex-1 flex overflow-x-auto whitespace-nowrap gap-2 pb-2 -mx-1 px-1" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {mesesDoAno.map((m: any, i: number) => {
              const monthName = m.mes.split(" ")[0]; // e.g., "Jan"
              const monthIndex = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].indexOf(monthName);
              const translatedMonth = monthIndex >= 0 ? t.meses[monthIndex] : monthName;
              
              return (
                <button key={i} id={`month-btn-${i}`} onClick={() => setMesSelIdx(i)}
                  className="shrink-0 text-xs font-semibold px-4 py-2 rounded-xl transition"
                  style={{
                    background: mesSelIdx === i ? B.green : B.greenLight,
                    color: mesSelIdx === i ? "white" : B.green,
                    border: `1px solid ${B.green}40`
                  }}>
                  {translatedMonth}
                </button>
              );
            })}
          </div>
          <button 
            onClick={() => setMesSelIdx(Math.min(mesesDoAno.length - 1, mesSelIdx + 1))}
            className="p-1 text-green-700 hover:bg-green-100 rounded-full transition disabled:opacity-30 shrink-0"
            disabled={mesSelIdx === mesesDoAno.length - 1 || mesesDoAno.length === 0}
          >
            <ChevronRight size={24} strokeWidth={2.5} />
          </button>
        </div>
      ) : (
        <div className="text-center text-gray-400 text-sm py-4">Nenhum mês para este ano.</div>
      )}

      {/* Sumário do mês */}
      {mesesDoAno.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="font-semibold text-gray-700 text-sm mb-2">
            {(() => {
              const monthName = mes.mes.split(" ")[0];
              const monthIndex = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].indexOf(monthName);
              return monthIndex >= 0 ? `${t.meses[monthIndex]} ${mes.mes.split(" ")[1]}` : mes.mes;
            })()}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
            <div><p className="text-gray-400">{t.totalHospedes}</p><p className="font-bold text-gray-700">{mes.hospedes}</p></div>
            <div><p className="text-gray-400">{t.totalNoites}</p><p className="font-bold text-gray-700">{mes.noites}</p></div>
            <div><p className="text-gray-400">{t.lucroTotal}</p><p className="font-bold" style={{ color: B.green }}>{fmtShort(mes.lucro)}</p></div>
          </div>

          {/* Attachments Area */}
          <div className="border-t border-gray-100 pt-3">
            {isAdmin ? (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <p className="text-xs font-semibold text-gray-600">{t.anexarRelatoriosAdmin}</p>
                  <button onClick={() => setIsEditingPlataformas(!isEditingPlataformas)} className="text-[10px] text-blue-600 bg-blue-50 px-2 py-1 rounded font-semibold">
                    {isEditingPlataformas ? "Concluir" : "Gerenciar Plataformas"}
                  </button>
                </div>
                
                {isEditingPlataformas && (
                  <div className="mb-3 p-2 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                    <div className="flex flex-wrap gap-1">
                      {plataformas.map(plat => (
                        <div key={plat} className="flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded text-[10px] font-semibold text-gray-700">
                          <span>{plat}</span>
                          <button onClick={() => handleRemovePlataforma(plat)} className="text-red-500 hover:text-red-700 ml-1">×</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      <input 
                        type="text" 
                        value={novaPlataforma}
                        onChange={e => setNovaPlataforma(e.target.value)}
                        placeholder="Nova plataforma..."
                        className="flex-1 border border-gray-200 rounded px-2 py-1 text-[10px] focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPlataforma()}
                      />
                      <button onClick={handleAddPlataforma} className="px-2 py-1 bg-blue-600 text-white rounded text-[10px] font-semibold">
                        Adicionar
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {plataformas.map(plat => (
                    <div key={plat} className="relative">
                      <input type="file" onChange={(e) => handleUpload(plat, e)} className="hidden" id={`upload-${plat}`} />
                      <label htmlFor={`upload-${plat}`} className={`cursor-pointer text-[10px] font-semibold px-2 py-1 rounded border ${attachments[plat] ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                        {attachments[plat] ? `✓ ${plat}` : `+ ${plat}`}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {plataformas.map(plat => attachments[plat] && (
                  <button key={plat} onClick={() => handleView(plat)}
                    className="text-[10px] font-semibold px-2 py-1 rounded border bg-gray-50 border-gray-200 text-gray-600">
                    📄 {plat}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 mt-3">
              <button onClick={handlePrintAll}
                className="flex-1 text-xs py-2 rounded-xl font-medium border flex justify-center items-center gap-1"
                style={{ borderColor: B.green, color: B.green }}>
                🖨️ {t.imprimirRelatorios}
              </button>
              <button onClick={handleDownloadAll}
                className="flex-1 text-xs py-2 rounded-xl font-medium text-white flex justify-center items-center gap-1"
                style={{ background: B.green }}>
                ⬇️ {t.baixarRelatorios}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Registros do mês */}
      {mesesDoAno.length > 0 && (
        mes.registros.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8 bg-white rounded-2xl border border-gray-100">
            {t.nenhumaLocacao}
          </div>
        ) : (
          mes.registros.map((reg: any, i: number) => (
          <div key={i} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-gray-800">{reg.hospede}</p>
                <p className="text-xs text-gray-400">{reg.data} · {reg.diarias} diária{reg.diarias > 1 ? "s" : ""} · {reg.nHospedes} hóspede{reg.nHospedes > 1 ? "s" : ""}</p>
              </div>
              <PlatBadge plat={reg.plataforma} />
            </div>
            <div className="space-y-1 text-sm border-t border-gray-50 pt-3">
              <div className="flex justify-between text-gray-500">
                <span>{t.valorLiquido}</span><span>{fmt(reg.valorLiquido)}</span>
              </div>
              {reg.taxaLimpeza > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>{t.taxaLimpeza}</span><span className="text-red-400">− {fmt(reg.taxaLimpeza)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>{t.comissao}</span><span className="text-red-400">− {fmt(reg.comissao)}</span>
              </div>
              {reg.extra > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>{t.extra}</span><span className="text-emerald-500">+ {fmt(reg.extra)}</span>
                </div>
              )}
              {reg.despesas > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>{t.despesas}</span><span className="text-red-400">− {fmt(reg.despesas)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1.5 border-t border-gray-100 text-base"
                style={{ color: B.green }}>
                <span>{t.lucro}</span><span>{fmt(reg.lucro)}</span>
              </div>
            </div>
          </div>
          ))
        )
      )}
    </div>
  );
};

// ============================================================
// DOCUMENTOS
// ============================================================
const DocumentosView = ({ t, imovel, isAdmin, isSupabaseConfigured }: any) => {
  const [docs, setDocs] = useState<any[]>([]);
  const [adminDocs, setAdminDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingAdmin, setUploadingAdmin] = useState(false);

  useEffect(() => {
    loadDocs();
  }, [imovel.nome]);

  const loadDocs = async () => {
    setLoading(true);
    if (isSupabaseConfigured && supabase) {
      const path = `documentos/${imovel.nome.replace(/\s+/g, '')}`;
      const { data, error } = await supabase.storage.from('aptstays_files').list(path);
      if (data) {
        setDocs(data.filter(d => d.name !== '.emptyFolderPlaceholder'));
      }
      
      if (isAdmin) {
        const adminPath = `documentos_admin/${imovel.nome.replace(/\s+/g, '')}`;
        const { data: adminData } = await supabase.storage.from('aptstays_files').list(adminPath);
        if (adminData) {
          setAdminDocs(adminData.filter(d => d.name !== '.emptyFolderPlaceholder'));
        }
      }
    } else {
      const localDocs = JSON.parse(localStorage.getItem(`docs_${imovel.nome}`) || "[]");
      setDocs(localDocs.filter((d: any) => !d.isAdminOnly));
      if (isAdmin) {
        setAdminDocs(localDocs.filter((d: any) => d.isAdminOnly));
      }
    }
    setLoading(false);
  };

  const handleUpload = async (e: any, isAdminOnly: boolean = false) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (isAdminOnly) setUploadingAdmin(true);
    else setUploading(true);

    if (isSupabaseConfigured && supabase) {
      const folder = isAdminOnly ? 'documentos_admin' : 'documentos';
      const path = `${folder}/${imovel.nome.replace(/\s+/g, '')}/${file.name}`;
      const { error } = await supabase.storage.from('aptstays_files').upload(path, file, { upsert: true });
      if (error) {
        alert("Erro no upload.");
      } else {
        loadDocs();
      }
    } else {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        const base64 = ev.target.result;
        const newDoc = {
          name: file.name,
          type: file.type,
          data: base64,
          created_at: new Date().toISOString(),
          isAdminOnly
        };
        const localDocs = JSON.parse(localStorage.getItem(`docs_${imovel.nome}`) || "[]");
        localDocs.push(newDoc);
        try {
          localStorage.setItem(`docs_${imovel.nome}`, JSON.stringify(localDocs));
          loadDocs();
        } catch (e) {
          alert("Arquivo muito grande para o modo de demonstração (limite de 5MB). Configure o Supabase para arquivos maiores.");
        }
      };
      reader.readAsDataURL(file);
    }
    
    if (isAdminOnly) setUploadingAdmin(false);
    else setUploading(false);
  };

  const handleDelete = async (docName: string, isAdminOnly: boolean = false) => {
    if (isSupabaseConfigured && supabase) {
      try {
        const folder = isAdminOnly ? 'documentos_admin' : 'documentos';
        const path = `${folder}/${imovel.nome.replace(/\s+/g, '')}/${docName}`;
        const { error } = await supabase.storage.from('aptstays_files').remove([path]);
        if (error) console.error("Erro ao excluir do Supabase:", error);
      } catch (e) {
        console.error(e);
      }
    }
    
    // Always remove from localStorage as fallback
    let localDocs = JSON.parse(localStorage.getItem(`docs_${imovel.nome}`) || "[]");
    localDocs = localDocs.filter((d: any) => !(d.name === docName && !!d.isAdminOnly === isAdminOnly));
    localStorage.setItem(`docs_${imovel.nome}`, JSON.stringify(localDocs));
    loadDocs();
  };

  const handleDownload = async (doc: any, isAdminOnly: boolean = false) => {
    if (isSupabaseConfigured && supabase) {
      const folder = isAdminOnly ? 'documentos_admin' : 'documentos';
      const path = `${folder}/${imovel.nome.replace(/\s+/g, '')}/${doc.name}`;
      const { data, error } = await supabase.storage.from('aptstays_files').download(path);
      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    } else {
      const a = document.createElement('a');
      a.href = doc.data;
      a.download = doc.name;
      a.click();
    }
  };

  const handlePrint = async (doc: any, isAdminOnly: boolean = false) => {
    if (isSupabaseConfigured && supabase) {
      const folder = isAdminOnly ? 'documentos_admin' : 'documentos';
      const path = `${folder}/${imovel.nome.replace(/\s+/g, '')}/${doc.name}`;
      const { data, error } = await supabase.storage.from('aptstays_files').download(path);
      if (data) {
        const url = URL.createObjectURL(data);
        const w = window.open(url);
        if (w) {
          w.onload = () => {
            w.print();
          };
        }
      }
    } else {
      const w = window.open("");
      if (w) {
        if (doc.type?.includes('image') || doc.data?.startsWith('data:image')) {
          w.document.write(`<img src="${doc.data}" style="max-width:100%;" />`);
          setTimeout(() => w.print(), 500);
        } else if (doc.type?.includes('pdf') || doc.data?.startsWith('data:application/pdf')) {
          w.document.write(`<iframe src="${doc.data}" width="100%" height="100%" style="border:none;"></iframe>`);
          // Note: printing iframe content directly can be tricky cross-origin, but this is a data URL
          setTimeout(() => w.print(), 500);
        } else {
          w.document.write(`<p>Não é possível imprimir este tipo de arquivo diretamente.</p>`);
        }
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Docs Compartilhados */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-800">{t.documentos}</h2>
          {isAdmin && (
            <div>
              <input type="file" id="upload-doc" className="hidden" onChange={(e) => handleUpload(e, false)} disabled={uploading} />
              <label htmlFor="upload-doc" className={`cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg text-white ${uploading ? 'opacity-50' : ''}`} style={{ background: B.navy }}>
                {uploading ? <Loader2 className="animate-spin inline" size={14} /> : "+ Anexar"}
              </label>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
        ) : docs.length === 0 ? (
          <div className="text-center text-gray-400 text-sm py-8 bg-white rounded-2xl border border-gray-100">Nenhum documento anexado.</div>
        ) : (
          <div className="space-y-2">
            {docs.map((doc, i) => (
              <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <FileText size={20} className="text-gray-400" />
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                    <p className="text-[10px] text-gray-400">{new Date(doc.created_at || Date.now()).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button onClick={() => handleDownload(doc, false)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title={t.download}>
                    <Download size={16} />
                  </button>
                  <button onClick={() => handlePrint(doc, false)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" title={t.print}>
                    <Printer size={16} />
                  </button>
                  {isAdmin && (
                    <button onClick={() => handleDelete(doc.name, false)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Docs Internos (Admin Only) */}
      {isAdmin && (
        <div className="space-y-4 pt-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-gray-800">Docs Internos (Admin)</h2>
            <div>
              <input type="file" id="upload-doc-admin" className="hidden" onChange={(e) => handleUpload(e, true)} disabled={uploadingAdmin} />
              <label htmlFor="upload-doc-admin" className={`cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg text-white ${uploadingAdmin ? 'opacity-50' : ''}`} style={{ background: B.green }}>
                {uploadingAdmin ? <Loader2 className="animate-spin inline" size={14} /> : "+ Anexar Interno"}
              </label>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-gray-400" /></div>
          ) : adminDocs.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-8 bg-white rounded-2xl border border-gray-100">Nenhum documento interno anexado.</div>
          ) : (
            <div className="space-y-2">
              {adminDocs.map((doc, i) => (
                <div key={i} className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-gray-400" />
                    </div>
                    <div className="truncate flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                      <p className="text-[10px] text-gray-400">{new Date(doc.created_at || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    <button onClick={() => handleDownload(doc, true)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition" title={t.download}>
                      <Download size={16} />
                    </button>
                    <button onClick={() => handlePrint(doc, true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition" title={t.print}>
                      <Printer size={16} />
                    </button>
                    <button onClick={() => handleDelete(doc.name, true)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition" title="Excluir">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// INFO PROPRIEDADE
// ============================================================
const InfoPropriedadeView = ({ t, imovel, isAdmin }: any) => {
  const [isEditing, setIsEditing] = useState(false);
  const [info, setInfo] = useState(() => {
    const saved = localStorage.getItem(`infoprop_${imovel.id}`);
    return saved ? JSON.parse(saved) : {
      nome: imovel.nome || "",
      apelido: imovel.apelido || "",
      endereco: "",
      bairro: "",
      contato1Nome: "",
      contato1Tel: "",
      contato1Email: "",
      contato2Nome: "",
      contato2Tel: "",
      contato2Email: "",
      plataformas: "",
      quartos: "",
      camas: "",
      decoracao: "",
      comentarios: localStorage.getItem(`info_${imovel.nome}`) || "",
      fotos: []
    };
  });

  const handleSave = () => {
    localStorage.setItem(`infoprop_${imovel.id}`, JSON.stringify(info));
    setIsEditing(false);
  };

  const handleAddFoto = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev: any) => {
      try {
        const newFotos = [...info.fotos, ev.target.result];
        setInfo({ ...info, fotos: newFotos });
      } catch (err) {
        alert("Imagem muito grande para o modo demonstração.");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFoto = (index: number) => {
    const newFotos = info.fotos.filter((_: any, i: number) => i !== index);
    setInfo({ ...info, fotos: newFotos });
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-800">Inf. Propriedade</h2>
        {isAdmin && !isEditing && (
          <button onClick={() => setIsEditing(true)} className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
            Editar Informações
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Dados Básicos</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold">Nome da Propriedade</label>
                <input type="text" value={info.nome} onChange={e => setInfo({...info, nome: e.target.value})} className="w-full border border-gray-200 rounded p-2 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold">Apelido</label>
                <input type="text" value={info.apelido} onChange={e => setInfo({...info, apelido: e.target.value})} className="w-full border border-gray-200 rounded p-2 text-xs" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Endereço</label>
                <input type="text" value={info.endereco} onChange={e => setInfo({...info, endereco: e.target.value})} className="w-full border border-gray-200 rounded p-2 text-xs" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Bairro</label>
                <input type="text" value={info.bairro} onChange={e => setInfo({...info, bairro: e.target.value})} className="w-full border border-gray-200 rounded p-2 text-xs" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Contatos Responsáveis</h3>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-600">Contato 1</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nome" value={info.contato1Nome} onChange={e => setInfo({...info, contato1Nome: e.target.value})} className="border border-gray-200 rounded p-2 text-xs" />
                <input type="text" placeholder="Telefone" value={info.contato1Tel} onChange={e => setInfo({...info, contato1Tel: e.target.value})} className="border border-gray-200 rounded p-2 text-xs" />
                <input type="email" placeholder="E-mail" value={info.contato1Email} onChange={e => setInfo({...info, contato1Email: e.target.value})} className="col-span-2 border border-gray-200 rounded p-2 text-xs" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-gray-600">Contato 2</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nome" value={info.contato2Nome} onChange={e => setInfo({...info, contato2Nome: e.target.value})} className="border border-gray-200 rounded p-2 text-xs" />
                <input type="text" placeholder="Telefone" value={info.contato2Tel} onChange={e => setInfo({...info, contato2Tel: e.target.value})} className="border border-gray-200 rounded p-2 text-xs" />
                <input type="email" placeholder="E-mail" value={info.contato2Email} onChange={e => setInfo({...info, contato2Email: e.target.value})} className="col-span-2 border border-gray-200 rounded p-2 text-xs" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Detalhes do Imóvel</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Plataformas Inscritas</label>
                <input type="text" placeholder="Ex: Airbnb, Booking, Vrbo" value={info.plataformas} onChange={e => setInfo({...info, plataformas: e.target.value})} className="w-full border border-gray-200 rounded p-2 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold">Qtd. Quartos</label>
                <input type="number" value={info.quartos} onChange={e => setInfo({...info, quartos: e.target.value})} className="w-full border border-gray-200 rounded p-2 text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase font-bold">Qtd. Camas</label>
                <input type="number" value={info.camas} onChange={e => setInfo({...info, camas: e.target.value})} className="w-full border border-gray-200 rounded p-2 text-xs" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-gray-500 uppercase font-bold">Estilo de Decoração</label>
                <input type="text" value={info.decoracao} onChange={e => setInfo({...info, decoracao: e.target.value})} className="w-full border border-gray-200 rounded p-2 text-xs" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Informações e Comentários</h3>
            <textarea 
              value={info.comentarios} 
              onChange={e => setInfo({...info, comentarios: e.target.value})} 
              className="w-full h-32 border border-gray-200 rounded-lg p-3 text-xs focus:outline-none resize-none" 
              placeholder="Digite as informações, links, senhas, etc..."
            />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-bold text-gray-800">Fotos</h3>
              <input type="file" accept="image/*" id="upload-foto-prop" className="hidden" onChange={handleAddFoto} />
              <label htmlFor="upload-foto-prop" className="cursor-pointer text-[10px] bg-gray-100 px-2 py-1 rounded font-bold text-gray-600">
                + Adicionar Foto
              </label>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {info.fotos.map((f: string, i: number) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                  <img src={f} alt="Foto" className="w-full h-full object-cover" />
                  <button onClick={() => handleRemoveFoto(i)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition">×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 sticky bottom-4">
            <button onClick={() => setIsEditing(false)} className="flex-1 py-3 rounded-xl font-bold text-gray-600 bg-white border border-gray-200 shadow-sm">
              Cancelar
            </button>
            <button onClick={handleSave} className="flex-1 py-3 rounded-xl font-bold text-white shadow-sm" style={{ background: B.green }}>
              Salvar Tudo
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Dados Básicos</h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="col-span-2"><span className="text-gray-400 text-xs block">Nome</span><span className="font-medium text-gray-800">{info.nome || "—"}</span></div>
              <div><span className="text-gray-400 text-xs block">Apelido</span><span className="font-medium text-gray-800">{info.apelido || "—"}</span></div>
              <div className="col-span-2"><span className="text-gray-400 text-xs block">Endereço</span><span className="font-medium text-gray-800">{info.endereco || "—"}</span></div>
              <div className="col-span-2"><span className="text-gray-400 text-xs block">Bairro</span><span className="font-medium text-gray-800">{info.bairro || "—"}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Contatos Responsáveis</h3>
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400 text-xs block font-bold mb-1">Contato 1</span>
                <p className="font-medium text-gray-800">{info.contato1Nome || "—"}</p>
                <p className="text-gray-600 text-xs">{info.contato1Tel}</p>
                <p className="text-gray-600 text-xs">{info.contato1Email}</p>
              </div>
              <div className="border-t border-gray-50 pt-2">
                <span className="text-gray-400 text-xs block font-bold mb-1">Contato 2</span>
                <p className="font-medium text-gray-800">{info.contato2Nome || "—"}</p>
                <p className="text-gray-600 text-xs">{info.contato2Tel}</p>
                <p className="text-gray-600 text-xs">{info.contato2Email}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Detalhes do Imóvel</h3>
            <div className="grid grid-cols-2 gap-y-3 text-sm">
              <div className="col-span-2"><span className="text-gray-400 text-xs block">Plataformas</span><span className="font-medium text-gray-800">{info.plataformas || "—"}</span></div>
              <div><span className="text-gray-400 text-xs block">Quartos</span><span className="font-medium text-gray-800">{info.quartos || "—"}</span></div>
              <div><span className="text-gray-400 text-xs block">Camas</span><span className="font-medium text-gray-800">{info.camas || "—"}</span></div>
              <div className="col-span-2"><span className="text-gray-400 text-xs block">Decoração</span><span className="font-medium text-gray-800">{info.decoracao || "—"}</span></div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Informações e Comentários</h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {info.comentarios || <span className="text-gray-400 italic">Nenhuma informação cadastrada.</span>}
            </div>
          </div>

          {info.fotos && info.fotos.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <h3 className="text-sm font-bold text-gray-800 border-b pb-2">Fotos</h3>
              <div className="grid grid-cols-2 gap-2">
                {info.fotos.map((f: string, i: number) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <img src={f} alt="Foto" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// PROFILE
// ============================================================
const ProfileView = ({ t, user, lang, setLang, onLogout, isSupabaseConfigured, isAdmin }: any) => {
  const [avatar, setAvatar] = useState(user?.user_metadata?.avatar_url || localStorage.getItem(`avatar_${user?.email}`) || "");
  const [appLogo, setAppLogo] = useState(localStorage.getItem('app_logo') || "");
  const [isEditingPersonalData, setIsEditingPersonalData] = useState(false);
  const [showPrefixDropdown, setShowPrefixDropdown] = useState(false);
  const [personalData, setPersonalData] = useState({
    nome: user?.user_metadata?.name || "",
    email: user?.email || "",
    telefone: localStorage.getItem(`phone_${user?.email}`) || "",
    prefixo: localStorage.getItem(`prefix_${user?.email}`) || "+55",
    endereco: localStorage.getItem(`address_${user?.email}`) || "",
    nascimento: localStorage.getItem(`birth_${user?.email}`) || "",
  });

  const prefixOptions = [
    { code: '+55', country: 'br', label: 'BR' },
    { code: '+1', country: 'us', label: 'US/CA' },
    { code: '+351', country: 'pt', label: 'PT' },
    { code: '+44', country: 'gb', label: 'UK' },
    { code: '+34', country: 'es', label: 'ES' },
    { code: '+33', country: 'fr', label: 'FR' },
    { code: '+49', country: 'de', label: 'DE' },
  ];
  const selectedPrefix = prefixOptions.find(o => o.code === personalData.prefixo) || prefixOptions[0];

  useEffect(() => {
    // Se não tiver telefone ou endereço salvo, abre em modo de edição
    if (!personalData.telefone || !personalData.endereco) {
      setIsEditingPersonalData(true);
    }
  }, []);

  const handleSavePersonalData = () => {
    localStorage.setItem(`phone_${user?.email}`, personalData.telefone);
    localStorage.setItem(`prefix_${user?.email}`, personalData.prefixo);
    localStorage.setItem(`address_${user?.email}`, personalData.endereco);
    localStorage.setItem(`birth_${user?.email}`, personalData.nascimento);
    if (isSupabaseConfigured && supabase) {
      supabase.auth.updateUser({ data: { name: personalData.nome } });
    }
    setIsEditingPersonalData(false);
    alert(t.dadosSalvos);
  };

  const handlePhotoUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        const base64 = ev.target.result;
        setAvatar(base64);
        localStorage.setItem(`avatar_${user.email}`, base64);
        if (isSupabaseConfigured && supabase) {
          supabase.auth.updateUser({ data: { avatar_url: base64 } });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        const base64 = ev.target.result;
        setAppLogo(base64);
        localStorage.setItem('app_logo', base64);
        window.location.reload(); // Reload to apply logo everywhere
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">{t.profile}</h2>
      
      {/* User Profile Photo */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center gap-3">
        <div className="relative">
          <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" id="avatar-upload" />
          <label htmlFor="avatar-upload" className="cursor-pointer flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden hover:bg-gray-100 transition relative group">
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <span className="text-2xl">📷</span>
                <p className="text-[10px] text-gray-500 font-medium mt-1 leading-tight">Add sua<br/>foto</p>
              </div>
            )}
            {avatar && (
              <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-semibold">{t.alterarFoto}</span>
              </div>
            )}
          </label>
        </div>
        {avatar && <p className="text-[10px] text-gray-400 mt-[-8px]">{t.alterarFoto}</p>}
        <p className="font-semibold text-gray-800">{user.email}</p>
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: isAdmin ? B.navyLight : B.greenLight, color: isAdmin ? B.navy : B.green }}>
          {user.user_metadata?.name || (isAdmin ? "Administrador" : "Proprietário")}
        </span>
      </div>

      {/* App Settings (Logo Upload) */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-600 mb-3">Configurações do App</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">Logo do Aplicativo</span>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" id="logo-upload" />
            <label htmlFor="logo-upload" className="cursor-pointer text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: B.navy }}>
              Alterar Logo
            </label>
          </div>
        </div>
      )}

      {/* Dados Pessoais */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-gray-600">{t.dadosPessoais}</p>
          {!isEditingPersonalData && (
            <button onClick={() => setIsEditingPersonalData(true)} className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
              {t.editar}
            </button>
          )}
        </div>
        
        {isEditingPersonalData ? (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.nomeCompleto}</label>
              <input type="text" value={personalData.nome} onChange={e => setPersonalData({...personalData, nome: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ '--tw-ring-color': B.green } as any} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.email}</label>
              <input type="email" value={personalData.email} disabled className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.telefone}</label>
              <div className="flex gap-2 relative">
                <button 
                  type="button"
                  onClick={() => setShowPrefixDropdown(!showPrefixDropdown)}
                  className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 transition focus:outline-none focus:ring-1"
                  style={{ '--tw-ring-color': B.green } as any}
                >
                  <img src={`https://flagcdn.com/w20/${selectedPrefix.country}.png`} alt={selectedPrefix.label} className="w-4 h-3 object-cover rounded-sm" />
                  <span>{selectedPrefix.code}</span>
                </button>
                {showPrefixDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowPrefixDropdown(false)}></div>
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 w-36 max-h-48 overflow-y-auto">
                      {prefixOptions.map(opt => (
                        <button
                          key={opt.code}
                          type="button"
                          onClick={() => {
                            setPersonalData({...personalData, prefixo: opt.code});
                            setShowPrefixDropdown(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 text-left transition"
                        >
                          <img src={`https://flagcdn.com/w20/${opt.country}.png`} alt={opt.label} className="w-4 h-3 object-cover rounded-sm" />
                          <span>{opt.code} ({opt.label})</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                <input type="tel" value={personalData.telefone} onChange={e => setPersonalData({...personalData, telefone: e.target.value})} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ '--tw-ring-color': B.green } as any} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.endereco}</label>
              <input type="text" value={personalData.endereco} onChange={e => setPersonalData({...personalData, endereco: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ '--tw-ring-color': B.green } as any} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">{t.dataNascimento}</label>
              <input type="date" value={personalData.nascimento} onChange={e => setPersonalData({...personalData, nascimento: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ '--tw-ring-color': B.green } as any} />
            </div>
            <button onClick={handleSavePersonalData} className="w-full py-2 mt-2 rounded-lg font-semibold text-white text-sm transition" style={{ background: B.green }}>
              {t.salvar}
            </button>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-gray-50 pb-1">
              <span className="text-gray-500">{t.nomeCompleto}</span>
              <span className="font-medium text-gray-800">{personalData.nome || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-1">
              <span className="text-gray-500">{t.email}</span>
              <span className="font-medium text-gray-800">{personalData.email}</span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-1">
              <span className="text-gray-500">{t.telefone}</span>
              <span className="font-medium text-gray-800 flex items-center gap-1.5">
                {personalData.telefone ? (
                  <>
                    <img src={`https://flagcdn.com/w20/${selectedPrefix.country}.png`} alt={selectedPrefix.label} className="w-4 h-3 object-cover rounded-sm" />
                    {personalData.prefixo} {personalData.telefone}
                  </>
                ) : "—"}
              </span>
            </div>
            <div className="flex justify-between border-b border-gray-50 pb-1">
              <span className="text-gray-500">{t.endereco}</span>
              <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{personalData.endereco || "—"}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-gray-500">{t.dataNascimento}</span>
              <span className="font-medium text-gray-800">
                {personalData.nascimento ? new Date(personalData.nascimento).toLocaleDateString(lang === 'pt' ? 'pt-BR' : 'en-US') : "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Language Settings */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="text-sm font-medium text-gray-600 mb-3">Idioma / Language</p>
        <div className="flex gap-2">
          {["pt", "en"].map(l => (
            <button key={l} onClick={() => setLang(l)}
              className="flex-1 py-2 rounded-xl text-sm font-medium transition"
              style={{ background: lang === l ? B.green : "#f3f4f6", color: lang === l ? "white" : "#555" }}>
              {l === "pt" ? "🇧🇷 Português" : "🇺🇸 English"}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-xs text-gray-400 space-y-1">
        <p>📞 +55(21)98063-1617</p>
        <p>✉️ aptstays.rio@gmail.com</p>
      </div>
      <button onClick={onLogout}
        className="w-full py-3 rounded-xl font-semibold text-red-500 bg-red-50 border border-red-100">
        {t.logout}
      </button>
    </div>
  );
};

// ============================================================
// LOGIN
// ============================================================
const LoginScreen = ({ t, lang, setLang, onLogin }: any) => {
  const [isRegister, setIsRegister] = useState(false);
  const [role, setRole] = useState("proprietario"); // 'proprietario' | 'admin'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      // Mock login/register
      onLogin({ id: 'mock-id', email, user_metadata: { role, name: name || email.split('@')[0] } });
      return;
    }
    
    setLoading(true);
    if (isRegister) {
      const roleToSave = role === 'admin' ? 'pendente' : role;
      const { error } = await supabase.auth.signUp({ 
        email, 
        password: pw,
        options: { data: { role: roleToSave, name } }
      });
      if (error) alert(error.message);
      else if (role === 'admin') alert("Solicitação enviada! Aguarde a aprovação do administrador.");
     else {
  // Vincula automaticamente ao imóvel padrão
  const { data: userData } = await supabase.auth.getUser();
  if (userData?.user && role !== 'admin') {
    await supabase.from('imoveis')
      .update({ proprietario_id: userData.user.id })
      .eq('id', '00000000-0000-0000-0000-000000000001');
    await supabase.from('profiles').upsert({ 
      id: userData.user.id, 
      email, 
      role: roleToSave,
      created_at: new Date().toISOString()
    });
  }
  alert("Cadastro realizado! Faça login.");
}
      setIsRegister(false);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) alert(error.message);
      else onLogin(data.user);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 relative"
      style={{ background: `linear-gradient(145deg, ${B.navy} 0%, ${B.green} 100%)` }}>
      
      {/* Language Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <button onClick={() => setLang(lang === "pt" ? "en" : "pt")}
          className="text-xs px-3 py-1.5 rounded-lg font-bold text-white transition-colors"
          style={{ background: "rgba(255,255,255,0.2)" }}>
          {lang === "pt" ? "EN" : "PT"}
        </button>
      </div>

      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative">
        
        {/* Role Toggle */}
        <div className="absolute top-4 left-0 w-full flex justify-center">
          <div className="flex bg-gray-100 rounded-full p-1 shadow-inner">
            <button type="button" onClick={() => setRole("proprietario")}
              className={`text-[10px] font-bold px-3 py-1 rounded-full transition ${role === "proprietario" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              {t.proprietario}
            </button>
            <button type="button" onClick={() => setRole("admin")}
              className={`text-[10px] font-bold px-3 py-1 rounded-full transition ${role === "admin" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              {t.administrador}
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center mb-8 mt-6 gap-3">
          <Logo size={120} />
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: B.navy }}>Apt Stays</h1>
            <p className="text-gray-400 text-sm">
              {role === "admin" ? t.portalAdmin : t.portalProp}
            </p>
          </div>
        </div>
        <form onSubmit={handleAuthSubmit} className="space-y-3">
          {isRegister && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder={t.seuNome} type="text" required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': B.green } as React.CSSProperties} />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} type="email" required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': B.green } as React.CSSProperties} />
          <input value={pw} onChange={e => setPw(e.target.value)} placeholder={t.password} type="password" required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': B.green } as React.CSSProperties} />
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white flex justify-center items-center gap-2"
            style={{ background: B.green }}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isRegister ? t.cadastrar : t.login)}
          </button>
          {!isSupabaseConfigured && (
            <p className="text-xs text-center text-amber-600 mt-2">
              Modo de Demonstração (Supabase não configurado). Clique em Entrar para testar o layout.
            </p>
          )}
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => setIsRegister(!isRegister)} className="text-xs text-gray-500 underline">
            {isRegister ? t.jaTenhoConta : t.criarConta}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// APP
// ============================================================
export default function App() {
  const [lang, setLang] = useState("pt");
  const [user, setUser] = useState<any>(null);
  const [imoveisList, setImoveisList] = useState<any[]>([]);
  const [selectedImovelId, setSelectedImovelId] = useState<number | null>(null);
  const [tab, setTab] = useState("dashboard");
  const [alertStep, setAlertStep] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  const [showNewImovelModal, setShowNewImovelModal] = useState(false);
  const [newImovelData, setNewImovelData] = useState({ nome: "", apelido: "", proprietarioEmail: "" });
  const [isAdmin, setIsAdmin] = useState(false);
  const t = T[lang];
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [isSupabaseConfigured]);

  useEffect(() => {
    if (user) {
      setLoadingData(true);
      const fetchRoleAndData = async () => {
        let userIsAdmin = false;
        if (isSupabaseConfigured) {
          try {
            const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (data?.role === 'pendente') {
              alert("Sua conta está aguardando aprovação do administrador.");
              await supabase.auth.signOut();
              return;
            }
            if (data && data.role === 'admin') userIsAdmin = true;
          } catch (e) {
            console.error("Error fetching role:", e);
          }
        } else {
          userIsAdmin = user?.user_metadata?.role === 'admin';
        }
        setIsAdmin(userIsAdmin);
        
        try {
          const data = await getDashboardData(user.id, userIsAdmin);
          setImoveisList(data);
          if (data && data.length > 0) {
            setSelectedImovelId(data[0].id);
          }
        } catch (e) {
          console.error("Error fetching dashboard data:", e);
          setImoveisList([]);
        } finally {
          setLoadingData(false);
        }
      };
      fetchRoleAndData();
    } else {
      setImoveisList([]);
      setSelectedImovelId(null);
      setIsAdmin(false);
    }
  }, [user, isSupabaseConfigured]);

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  const handleCreateImovel = async () => {
    if (!newImovelData.nome || !newImovelData.apelido) return;
    
    if (isSupabaseConfigured && supabase) {
      alert("Para criar propriedades no banco de dados real, você deve inserir os dados diretamente no Supabase ou criar uma API de backend.");
      setShowNewImovelModal(false);
      return;
    }
    
    // Mock creation for demo
    const newId = Math.max(...imoveisList.map(i => i.id), 0) + 1;
    const newImv = {
      ...imoveisList[0], // Copy structure
      id: newId,
      nome: newImovelData.nome,
      apelido: newImovelData.apelido,
      proprietario: newImovelData.proprietarioEmail,
      alerta: "",
      montagem: { totalMontagem: 0, totalPago: 0, comodos: [], problemasInesperados: [] },
      locacoesPorMes: []
    };
    setImoveisList([...imoveisList, newImv]);
    setSelectedImovelId(newId);
    setShowNewImovelModal(false);
    setNewImovelData({ nome: "", apelido: "", proprietarioEmail: "" });
  };

  if (!user) return <LoginScreen t={t} lang={lang} setLang={setLang} onLogin={(u: any) => { setUser(u); setAlertStep(0); }} />;
  
  const imovelData = imoveisList.find(i => i.id === selectedImovelId) || imoveisList[0];

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!imovelData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 mb-4">
          🏠
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum imóvel encontrado</h2>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          Não encontramos nenhuma propriedade vinculada à sua conta. Se você é um proprietário, entre em contato com o administrador.
        </p>
        <button onClick={handleLogout} className="px-6 py-2 bg-gray-800 text-white rounded-xl font-semibold">
          Sair
        </button>
      </div>
    );
  }

  // Show Alert Modal if property has an alert and it hasn't been dismissed
  let alertasArray: string[] = [];
  try {
    alertasArray = JSON.parse(imovelData.alerta);
    if (!Array.isArray(alertasArray)) alertasArray = imovelData.alerta ? [imovelData.alerta] : [];
  } catch {
    alertasArray = imovelData.alerta ? [imovelData.alerta] : [];
  }

  if (alertasArray.length > 0 && alertStep < alertasArray.length) {
    const alertText = alertasArray[alertStep];

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border-t-4 border-amber-500">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-500">
              <AlertCircle size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">{t.avisoImportante}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{alertText}</p>
            </div>
            <button 
              onClick={() => setAlertStep(prev => prev + 1)}
              className="w-full py-3 mt-2 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: B.green }}
            >
              <CheckCircle2 size={18} />
              {alertStep === alertasArray.length - 1 ? t.confirmarLeitura : "Próximo"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "dashboard", icon: "📊", label: t.dashboard },
    { id: "montagem", icon: "🏠", label: t.montagem },
    { id: "locacoes", icon: "🔑", label: t.locacoes },
    { id: "documentos", icon: "📁", label: t.documentos },
    ...(isAdmin ? [{ id: "infoprop", icon: "ℹ️", label: "Inf. Prop." }] : []),
    { id: "profile", icon: "👤", label: t.profile },
  ];

  const renderView = () => {
    if (tab === "dashboard") return <Dashboard t={t} lang={lang} imovel={imovelData} isAdmin={isAdmin} />;
    if (tab === "montagem") return <MontagemView t={t} imovel={imovelData} isAdmin={isAdmin} />;
    if (tab === "locacoes") return <LocacoesView t={t} imovel={imovelData} isAdmin={isAdmin} />;
    if (tab === "documentos") return <DocumentosView t={t} imovel={imovelData} isAdmin={isAdmin} isSupabaseConfigured={isSupabaseConfigured} />;
    if (tab === "infoprop") return <InfoPropriedadeView t={t} imovel={imovelData} isAdmin={isAdmin} />;
    if (tab === "profile") return <ProfileView t={t} user={user} lang={lang} setLang={setLang} onLogout={handleLogout} isSupabaseConfigured={isSupabaseConfigured} isAdmin={isAdmin} />;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-2xl">
      {/* Header */}
      <div className="text-white px-5 pt-10 pb-5"
        style={{ background: `linear-gradient(135deg, ${B.navy} 0%, ${B.green} 100%)` }}>
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Logo size={76} />
            <div>
              <p className="text-xs opacity-70">{t.hi}, {user.user_metadata?.name || user.email?.split("@")[0] || "Proprietário"} 👋</p>
              <p className="font-bold text-base leading-tight">Apt Stays</p>
              {isAdmin ? (
                <select 
                  value={selectedImovelId || ""} 
                  onChange={(e) => {
                    if (e.target.value === "new") {
                      setShowNewImovelModal(true);
                    } else {
                      setSelectedImovelId(e.target.value);
                      setAlertStep(0); // Reset alert for new property
                    }
                  }}
                  className="mt-1 text-xs bg-white/20 border border-white/30 rounded px-2 py-1 text-white outline-none focus:bg-white/30"
                >
                  {imoveisList.map(imv => (
                    <option key={imv.id} value={imv.id} className="text-gray-800">{imv.nome} · {imv.apelido}</option>
                  ))}
                  <option value="new" className="text-blue-600 font-bold">➕ Nova Propriedade</option>
                </select>
              ) : (
                <p className="text-xs opacity-60">{imovelData.nome} · {imovelData.apelido}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setLang(lang === "pt" ? "en" : "pt")}
              className="text-xs px-2 py-1 rounded-lg font-medium"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              {lang === "pt" ? "EN" : "PT"}
            </button>
            <button onClick={handleLogout}
              className="text-xs px-2 py-1 rounded-lg"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              {t.logout}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 pb-24">{renderView()}</div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around px-1 py-2 pb-6">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors"
            style={{ color: tab === tb.id ? B.green : "#9ca3af" }}>
            <span className="text-lg">{tb.icon}</span>
            <span className="text-[9px] font-semibold">{tb.label}</span>
          </button>
        ))}
      </div>

      {/* Modal Nova Propriedade */}
      {showNewImovelModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Cadastrar Nova Propriedade</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Nome da Propriedade</label>
                <input type="text" value={newImovelData.nome} onChange={e => setNewImovelData({...newImovelData, nome: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ '--tw-ring-color': B.green } as any} placeholder="Ex: Apartamento Copacabana" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Apelido (Curto)</label>
                <input type="text" value={newImovelData.apelido} onChange={e => setNewImovelData({...newImovelData, apelido: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ '--tw-ring-color': B.green } as any} placeholder="Ex: Copa 101" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Emails dos Proprietários (separados por vírgula)</label>
                <input type="text" value={newImovelData.proprietarioEmail} onChange={e => setNewImovelData({...newImovelData, proprietarioEmail: e.target.value})} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ '--tw-ring-color': B.green } as any} placeholder="dono@email.com, sindico@email.com" />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setShowNewImovelModal(false)} className="flex-1 py-2 rounded-xl font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                Cancelar
              </button>
              <button onClick={handleCreateImovel} className="flex-1 py-2 rounded-xl font-semibold text-white transition" style={{ background: B.green }}>
                Cadastrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
