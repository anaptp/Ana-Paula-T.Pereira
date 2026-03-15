/// <reference types="vite/client" />
import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { B, T } from "./data";
import { fmt, fmtShort, printMontagem, printLocacao, mergePdfs, createBlobUrl } from "./helpers";
import { AlertCircle, CheckCircle2, Loader2, ChevronLeft, ChevronRight, Download, Printer, Trash2, FileText, Upload, Eye, EyeOff } from "lucide-react";
import { supabase } from "./supabase";
import { getDashboardData } from "./api";
import Papa from "papaparse";
import Joyride, { CallBackProps, STATUS } from 'react-joyride';

// ============================================================
// BRAND — Apt Stays
// ============================================================
export const getSafeKey = (cNome: string, iNome: string) => {
  const safeC = (cNome || "").replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  const safeI = (iNome || "").replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return `${safeC}_${safeI}`;
};

const Logo = ({ size = 44, className = "" }: { size?: number, className?: string }) => {
  const [logoSrc, setLogoSrc] = useState(localStorage.getItem('app_logo') || B.logoUrl);

  useEffect(() => {
    const handleLogoChange = () => setLogoSrc(localStorage.getItem('app_logo') || B.logoUrl);
    window.addEventListener('logoUpdated', handleLogoChange);
    return () => window.removeEventListener('logoUpdated', handleLogoChange);
  }, []);

  if (logoSrc) {
    return (
      <img 
        src={logoSrc} 
        alt="Apt Stays Logo" 
        style={{
          width: size, height: size, borderRadius: "50%",
          border: `2px solid ${B.green}`, flexShrink: 0,
          objectFit: "cover"
        }} 
        className={className}
        referrerPolicy="no-referrer"
        onError={(e) => {
          // If the image fails to load (e.g., bucket not public), fallback to default
          if (logoSrc !== B.logoUrl) {
            setLogoSrc(B.logoUrl);
          }
        }}
      />
    );
  }
  
  return (
    <div className={className} style={{
      width: size, height: size, borderRadius: "50%",
      background: `linear-gradient(135deg, ${B.navy}, ${B.green})`,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: `2px solid ${B.green}`, flexShrink: 0,
      fontSize: size * 0.35, color: "white", fontWeight: "bold", fontStyle: "italic"
    }}>AS</div>
  );
};

const fetchGlobalLogo = async () => {
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');
  if (!isSupabaseConfigured) return;
  
  try {
    const { data, error } = await supabase.storage.from('logos').list();
    
    if (error) {
      console.warn("Aviso ao buscar logo (pode ser que o bucket não exista ainda):", error.message);
      return;
    }

    if (data && data.length > 0) {
      // Sort by updated_at to get the most recent one
      const sortedFiles = data
        .filter(f => f.name.startsWith('app_logo'))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        
      const logoFile = sortedFiles[0];
      if (logoFile) {
        const { data: urlData } = supabase.storage.from('logos').getPublicUrl(logoFile.name);
        const newUrl = `${urlData.publicUrl}?t=${new Date(logoFile.updated_at).getTime()}`;
        if (newUrl !== localStorage.getItem('app_logo')) {
          localStorage.setItem('app_logo', newUrl);
          window.dispatchEvent(new Event('logoUpdated'));
        }
      }
    }
  } catch (e) {
    console.error("Erro ao buscar logo:", e);
  }
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

  const handleSaveAlerta = () => {
    imovel.alerta = JSON.stringify(alertas);
    setIsEditingAlerta(false);
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
const MontagemView = ({ t, imovel, isAdmin, onRefresh }: any) => {
  const [expandido, setExpandido] = useState<number | null>(0);
  const m = imovel.montagem;
  const totalItens = m.comodos.flatMap((c: any) => c.itens).filter((i: any) => !i.emprestado).reduce((a: any, i: any) => a + i.total, 0);

  const [nfs, setNfs] = useState<Record<string, string>>({});
  const [isProcessingNfs, setIsProcessingNfs] = useState(false);
  const [nfProgress, setNfProgress] = useState("");
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');

  useEffect(() => {
    const loadNfs = async () => {
      const loaded: Record<string, string> = {};
      
      if (isSupabaseConfigured && supabase) {
        try {
          const { data, error } = await supabase.storage.from('aptstays_files').list('nfs', { limit: 1000 });
          if (data) {
            const prefix = `${imovel.nome.replace(/\s+/g, '')}_`;
            data.forEach(f => {
              if (f.name.startsWith(prefix)) {
                const keyPart = f.name.replace(prefix, '').split('.')[0];
                loaded[`nf_${keyPart}`] = f.name;
              }
            });
          }
        } catch (e) {
          console.error("Erro ao carregar NFs do Supabase:", e);
        }
      } else {
        for (let ci = 0; ci < m.comodos.length; ci++) {
          const c = m.comodos[ci];
          for (let ii = 0; ii < c.itens.length; ii++) {
            const key = `nf_${ci}_${ii}`;
            const val = localStorage.getItem(key);
            if (val) loaded[key] = val;
          }
        }
      }
      setNfs(loaded);
    };
    loadNfs();
  }, [m, isSupabaseConfigured]);

  const handleUploadNF = async (cNome: string, iNome: string, e: any) => {
    const file = e.target.files[0];
    if (file) {
      const safeKey = getSafeKey(cNome, iNome);
      const key = `nf_${safeKey}`;
      if (isSupabaseConfigured && supabase) {
        const filename = `${imovel.nome.replace(/\s+/g, '')}_${safeKey}`;
        const path = `nfs/${filename}`;
        const { error } = await supabase.storage.from('aptstays_files').upload(path, file, { upsert: true, contentType: file.type });
        if (error) {
          console.error(error);
          alert("Erro no upload. Verifique se o bucket 'aptstays_files' existe e é público.");
          return;
        }
        // Store a flag in localStorage so we know it exists
        localStorage.setItem(key, 'supabase');
        setNfs(prev => ({ ...prev, [key]: filename }));
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

  const handleViewNF = async (cNome: string, iNome: string, ci: number, ii: number) => {
    const safeKey = getSafeKey(cNome, iNome);
    const newKey = `nf_${safeKey}`;
    const oldKey = `nf_${ci}_${ii}`;
    const key = nfs[newKey] ? newKey : oldKey;
    const val = nfs[key];
    if (!val) return;

    const base64 = await getFileBase64(key);
    if (base64) {
      const url = createBlobUrl(base64);
      const w = window.open(url, "_blank");
      if (!w) {
        alert("Por favor, permita pop-ups para visualizar a NF.");
      }
    } else {
      alert("Erro ao carregar a NF do servidor.");
    }
  };

  const handleDeleteNF = async (cNome: string, iNome: string, ci: number, ii: number) => {
    const safeKey = getSafeKey(cNome, iNome);
    const newKey = `nf_${safeKey}`;
    const oldKey = `nf_${ci}_${ii}`;
    const key = nfs[newKey] ? newKey : oldKey;
    
    if (isSupabaseConfigured && supabase) {
      try {
        const pathPart = key.replace('nf_', '');
        const prefix = `${imovel.nome.replace(/\s+/g, '')}_${pathPart}`;
        
        const { data } = await supabase.storage.from('aptstays_files').list('nfs', { search: prefix, limit: 100 });
        
        let pathsToRemove: string[] = [];
        if (data && data.length > 0) {
          pathsToRemove = data
            .filter(f => f.name === prefix || f.name.startsWith(`${prefix}.`))
            .map(f => `nfs/${f.name}`);
        }
        
        if (pathsToRemove.length === 0) {
          pathsToRemove = [`nfs/${prefix}`];
        }
        
        const { error } = await supabase.storage.from('aptstays_files').remove(pathsToRemove);
        if (error && !error.message.includes('not found') && !error.message.includes('Not Found')) {
          console.error("Erro ao excluir do Supabase:", error);
          alert("Erro ao excluir a NF do servidor.");
          return;
        }
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

  const getFileBase64 = async (key: string): Promise<string | null> => {
    const val = nfs[key];
    if (!val) return null;
    if (val && !val.startsWith('data:') && isSupabaseConfigured && supabase) {
      let filename = `${imovel.nome.replace(/\s+/g, '')}_${key.replace('nf_', '')}`;
      if (val !== 'supabase') {
        filename = val;
      }
      const path = `nfs/${filename}`;
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
    const keysToPrint = new Set<string>();
    for (let ci = 0; ci < m.comodos.length; ci++) {
      const c = m.comodos[ci];
      for (let ii = 0; ii < c.itens.length; ii++) {
        const item = c.itens[ii];
        const safeKey = getSafeKey(c.nome, item.item || item.nome);
        const newKey = `nf_${safeKey}`;
        const oldKey = `nf_${ci}_${ii}`;
        if (nfs[newKey]) keysToPrint.add(newKey);
        else if (nfs[oldKey]) keysToPrint.add(oldKey);
      }
    }
    const keys = Array.from(keysToPrint);

    if (keys.length === 0) {
      alert("Nenhuma NF anexada aos itens atuais.");
      return;
    }
    setIsProcessingNfs(true);
    setNfProgress("Preparando...");
    try {
      const files: string[] = [];
      const seen = new Set<string>();
      
      let loaded = 0;
      const base64Results = await Promise.all(keys.map(async (key) => {
        const res = await getFileBase64(key);
        loaded++;
        setNfProgress(`Baixando ${loaded} de ${keys.length}...`);
        return res;
      }));
      
      setNfProgress("Mesclando arquivos...");
      for (const base64 of base64Results) {
        if (base64 && !seen.has(base64)) {
          seen.add(base64);
          files.push(base64);
        }
      }
      if (files.length === 0) {
        alert("Nenhum arquivo válido encontrado.");
        setIsProcessingNfs(false);
        setNfProgress("");
        return;
      }
      const mergedBase64 = await mergePdfs(files);
      const url = createBlobUrl(mergedBase64);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NFs_Montagem.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      console.error(e);
      alert("Erro ao processar arquivos.");
    } finally {
      setIsProcessingNfs(false);
      setNfProgress("");
    }
  };

  const handlePrintAllNfs = async () => {
    const keysToPrint = new Set<string>();
    for (let ci = 0; ci < m.comodos.length; ci++) {
      const c = m.comodos[ci];
      for (let ii = 0; ii < c.itens.length; ii++) {
        const item = c.itens[ii];
        const safeKey = getSafeKey(c.nome, item.item || item.nome);
        const newKey = `nf_${safeKey}`;
        const oldKey = `nf_${ci}_${ii}`;
        if (nfs[newKey]) keysToPrint.add(newKey);
        else if (nfs[oldKey]) keysToPrint.add(oldKey);
      }
    }
    const keys = Array.from(keysToPrint);

    if (keys.length === 0) {
      alert("Nenhuma NF anexada aos itens atuais.");
      return;
    }
    
    const w = window.open("", "_blank");
    if (w) {
      w.document.write("<html><body style='font-family:sans-serif;text-align:center;padding-top:50px;'><h2>Preparando documento para impressão, por favor aguarde...</h2></body></html>");
    } else {
      alert("Por favor, permita pop-ups para imprimir.");
      return;
    }

    setIsProcessingNfs(true);
    setNfProgress("Preparando...");
    try {
      const files: string[] = [];
      const seen = new Set<string>();
      
      let loaded = 0;
      const base64Results = await Promise.all(keys.map(async (key) => {
        const res = await getFileBase64(key);
        loaded++;
        setNfProgress(`Baixando ${loaded} de ${keys.length}...`);
        return res;
      }));
      
      setNfProgress("Mesclando arquivos...");
      for (const base64 of base64Results) {
        if (base64 && !seen.has(base64)) {
          seen.add(base64);
          files.push(base64);
        }
      }
      if (files.length === 0) {
        alert("Nenhum arquivo válido encontrado.");
        if (w) w.close();
        setIsProcessingNfs(false);
        setNfProgress("");
        return;
      }
      const mergedBase64 = await mergePdfs(files);
      const url = createBlobUrl(mergedBase64);
      
      if (w) {
        w.location.href = url;
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao processar arquivos.");
      if (w) w.close();
    } finally {
      setIsProcessingNfs(false);
      setNfProgress("");
    }
  };

  const [syncingMontagem, setSyncingMontagem] = useState(false);
  const [sheetUrlMontagem, setSheetUrlMontagem] = useState(localStorage.getItem(`sheet_montagem_${imovel.nome}`) || "");

  const processCsvData = async (csvText: string) => {
    return new Promise<void>((resolve, reject) => {
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rows = results.data as string[][];
            
            const comodosMap: Record<string, any[]> = {};
            let totalMontagem = 0;
            let currentComodo = "Geral";
            let readingProblemas = false;
            const problemasInesperados: string[] = [];
            
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const col0 = row[0]?.trim() || "";
              
              if (!col0) continue;
              
              // Skip header rows
              if (col0.toUpperCase().includes("APARTAMENTO") || col0 === "DESPESAS") {
                continue;
              }
              
              if (col0.toUpperCase().includes("PROBLEMAS INESPERADOS")) {
                readingProblemas = true;
                continue;
              }
              
              if (readingProblemas) {
                if (col0) problemasInesperados.push(col0);
                continue;
              }
              
              // Check if it's a room header (only col0 has value, or it's just a category)
              // Usually, if col1 (Date) and col2 (Price) are empty, it's a category
              const col1 = row[1]?.trim() || "";
              const col2 = row[2]?.trim() || "";
              const col5 = row[5]?.trim() || "";
              
              if (!col1 && !col2 && !col0.toUpperCase().includes("TOTAL")) {
                currentComodo = col0;
                if (!comodosMap[currentComodo]) {
                  comodosMap[currentComodo] = [];
                }
                continue;
              }
              
              // It's an item row
              if (col0 && (col1 || col2 || col5)) {
                const item = col0;
                const datCompra = col1;
                const precoStr = col2.replace(/[^0-9,-]/g, '').replace(',', '.');
                const preco = parseFloat(precoStr) || 0;
                const qtd = parseInt(row[3], 10) || 1;
                const loja = row[4] || "";
                const totalStr = (row[5] || "").replace(/[^0-9,-]/g, '').replace(',', '.');
                const total = parseFloat(totalStr) || (preco * qtd);
                
                if (!comodosMap[currentComodo]) {
                  comodosMap[currentComodo] = [];
                }
                
                // Skip rows that are just totals or empty items
                if (item.toUpperCase().includes("FALTA ME PAGAR") || item.toUpperCase() === "FALTA" || item.toUpperCase().includes("TOTAL MONTAGEM") || item.toUpperCase().includes("TOTAL PAGO")) {
                  continue;
                }
                
                const isEmprestado = (preco === 0 && total === 0) || datCompra.toLowerCase().includes("emprestado") || col2.toLowerCase().includes("emprestado");

                comodosMap[currentComodo].push({
                  item,
                  datCompra: isEmprestado ? "" : datCompra,
                  preco,
                  qtd,
                  loja,
                  total,
                  emprestado: isEmprestado
                });
                
                totalMontagem += total;
              }
            }
            
            const novosComodos = Object.keys(comodosMap).map(nome => ({
              nome,
              itens: comodosMap[nome]
            })).filter(c => c.itens.length > 0);
            
            if (isSupabaseConfigured && supabase) {
              const updatedMontagem = {
                ...imovel.montagem,
                comodos: novosComodos,
                totalMontagem: totalMontagem,
                problemasInesperados: problemasInesperados.length > 0 ? problemasInesperados : imovel.montagem.problemasInesperados
              };
              
              const path = `montagem/${imovel.nome.replace(/\s+/g, '')}.json`;
              const blob = new Blob([JSON.stringify(updatedMontagem)], { type: 'application/json' });
              const { error } = await supabase.storage.from('aptstays_files').upload(path, blob, { upsert: true });
                
              if (error) throw error;
              
              alert("Dados sincronizados com sucesso! A página será atualizada.");
              if (onRefresh) onRefresh();
              resolve();
            } else {
              alert("Supabase não configurado. Não é possível salvar.");
              resolve();
            }
          } catch (e: any) {
            console.error(e);
            alert(`Erro ao processar dados: ${e.message}`);
            reject(e);
          } finally {
            setSyncingMontagem(false);
          }
        },
        error: (error) => {
          console.error(error);
          alert(`Erro no parse do CSV: ${error.message}`);
          setSyncingMontagem(false);
          reject(error);
        }
      });
    });
  };

  const handleSyncMontagem = async () => {
    if (!sheetUrlMontagem) return;
    setSyncingMontagem(true);
    localStorage.setItem(`sheet_montagem_${imovel.nome}`, sheetUrlMontagem);
    
    try {
      const match = sheetUrlMontagem.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!match) {
        throw new Error("Link da planilha inválido. Certifique-se de que é um link do Google Sheets.");
      }
      const sheetId = match[1];
      
      const gidMatch = sheetUrlMontagem.match(/[#&]gid=([0-9]+)/);
      const gid = gidMatch ? gidMatch[1] : "0";

      const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error("Não foi possível acessar a planilha. Verifique se ela está publicada na web ou se o link é público.");
      }
      
      const csvText = await response.text();
      await processCsvData(csvText);
      
    } catch (e: any) {
      console.error(e);
      alert(`Erro ao sincronizar: ${e.message}`);
    } finally {
      setSyncingMontagem(false);
    }
  };

  const handleFileUploadMontagem = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSyncingMontagem(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const csvText = ev.target?.result as string;
        await processCsvData(csvText);
      } catch (e: any) {
        console.error(e);
        alert(`Erro ao processar arquivo: ${e.message}`);
      } finally {
        setSyncingMontagem(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const [problemas, setProblemas] = useState<string[]>(m.problemasInesperados || []);
  const [isEditingProblemas, setIsEditingProblemas] = useState(false);
  const [novoProblema, setNovoProblema] = useState("");

  const handleSaveProblemas = async () => {
    m.problemasInesperados = problemas;
    setIsEditingProblemas(false);
    
    if (isSupabaseConfigured && supabase) {
      try {
        const path = `montagem/${imovel.nome.replace(/\s+/g, '')}.json`;
        const blob = new Blob([JSON.stringify(m)], { type: 'application/json' });
        await supabase.storage.from('aptstays_files').upload(path, blob, { upsert: true });
      } catch (e) {
        console.error("Erro ao salvar problemas", e);
      }
    }
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
          className="tour-montagem-imprimir text-xs text-white px-3 py-2 rounded-xl font-medium flex items-center gap-1"
          style={{ background: B.green }}>
          🖨️ {t.print}
        </button>
      </div>

      {isAdmin && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-100 bg-blue-50/30">
          <p className="text-sm font-semibold text-blue-800 mb-2">Sincronização com Google Sheets ou Arquivo CSV</p>
          <div className="flex flex-col gap-3">
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
                {syncingMontagem ? <Loader2 className="animate-spin" size={14} /> : "Sincronizar Link"}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-blue-200"></div>
              <span className="text-xs text-blue-500 font-medium">OU</span>
              <div className="flex-1 h-px bg-blue-200"></div>
            </div>
            <div>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleFileUploadMontagem}
                disabled={syncingMontagem}
                id="csv-upload-montagem"
                className="hidden"
              />
              <label 
                htmlFor="csv-upload-montagem"
                className={`w-full flex items-center justify-center gap-2 border border-blue-200 border-dashed rounded-lg px-3 py-2 text-xs font-medium text-blue-700 bg-white cursor-pointer hover:bg-blue-50 transition ${syncingMontagem ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Upload size={14} /> Enviar arquivo CSV
              </label>
            </div>
          </div>
          <p className="text-[10px] text-blue-600 mt-2 opacity-70">A planilha deve seguir o formato padrão de montagem (Cômodo como título, seguido dos itens).</p>
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
                      <p className="text-xs font-medium text-gray-800">{item.item || item.nome}{item.emprestado ? " ↩" : ""}</p>
                      <p className="text-xs text-gray-400">{item.datCompra} · {item.loja}{item.qtd > 1 ? ` · ${item.qtd}x` : ""}</p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      {item.emprestado
                        ? <span className="tour-montagem-emprestado text-xs text-gray-400 italic">{t.emprestado}</span>
                        : <p className="tour-montagem-emprestado text-sm font-bold" style={{ color: B.navy }}>{fmt(item.total)}</p>
                      }
                      {!item.emprestado && item.qtd > 1 && <p className="text-xs text-gray-400">{fmt(item.preco)} un.</p>}
                      
                      {/* NF Buttons */}
                      <div className="flex gap-1 mt-1">
                        {(nfs[`nf_${getSafeKey(c.nome, item.item || item.nome)}`] || nfs[`nf_${ci}_${ii}`]) && (
                          <>
                            <button onClick={() => handleViewNF(c.nome, item.item || item.nome, ci, ii)} className="tour-montagem-ver-nf text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200">
                              📄 Ver NF
                            </button>
                            {isAdmin && (
                              <button onClick={() => handleDeleteNF(c.nome, item.item || item.nome, ci, ii)} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200">
                                🗑️
                              </button>
                            )}
                          </>
                        )}
                        {isAdmin && !(nfs[`nf_${getSafeKey(c.nome, item.item || item.nome)}`] || nfs[`nf_${ci}_${ii}`]) && (
                          <div className="relative">
                            <input type="file" onChange={(e) => handleUploadNF(c.nome, item.item || item.nome, e)} className="hidden" id={`upload-nf-${ci}-${ii}`} />
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
        <div className="flex flex-col gap-2 pt-2">
          <div className="flex gap-2">
            <button onClick={handlePrintAllNfs} disabled={isProcessingNfs}
              className={`tour-montagem-imprimir-nfs flex-1 text-xs py-2 rounded-xl font-medium border flex justify-center items-center gap-1 ${isProcessingNfs ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ borderColor: B.green, color: B.green }}>
              {isProcessingNfs ? "⏳ Processando..." : `🖨️ ${t.imprimirNfs}`}
            </button>
            <button onClick={handleDownloadAllNfs} disabled={isProcessingNfs}
              className={`flex-1 text-xs py-2 rounded-xl font-medium text-white flex justify-center items-center gap-1 ${isProcessingNfs ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ background: B.green }}>
              {isProcessingNfs ? "⏳ Processando..." : `⬇️ ${t.baixarNfs}`}
            </button>
          </div>
          {isProcessingNfs && nfProgress && (
            <p className="text-xs text-center text-gray-500 animate-pulse">{nfProgress}</p>
          )}
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

const LocacoesView = ({ t, imovel, isAdmin, lang, onRefresh }: any) => {
  // Extract unique years from locacoes
  const anosDisponiveis = Array.from(new Set(imovel.locacoesPorMes.map((m: any) => "20" + m.mes.split(" ")[1]))) as string[];
  anosDisponiveis.sort();
  if (anosDisponiveis.length === 0) anosDisponiveis.push("2025"); // fallback
  
  const [anoSel, setAnoSel] = useState<string>(anosDisponiveis[anosDisponiveis.length - 1]);
  
  // Filter months by selected year
  const mesesDoAno = imovel.locacoesPorMes.filter((m: any) => m.mes.endsWith(anoSel.substring(2)));
  const [mesSelIdx, setMesSelIdx] = useState(0);
  
  // Ensure mesSelIdx is valid for the current year
  const mes = mesesDoAno[mesSelIdx] || mesesDoAno[0] || { mes: "N/A", hospedes: 0, noites: 0, lucro: 0, registros: [] };
  
  const totalLucroGeral = imovel.locacoesPorMes.reduce((a: any, m: any) => a + m.lucro, 0);

  const [attachments, setAttachments] = useState<Record<string, string>>({});
  const [recibos, setRecibos] = useState<Record<string, string>>({});
  const [isProcessingRecibos, setIsProcessingRecibos] = useState(false);
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');
  
  useEffect(() => {
    const loadRecibos = async () => {
      if (isSupabaseConfigured) {
        try {
          const { supabase } = await import('./supabase');
          if (supabase) {
            const { data, error } = await supabase.storage.from('aptstays_files').list(`recibos/${imovel.id}`, { limit: 1000 });
            if (data && !error) {
              const loaded: Record<string, string> = {};
              data.forEach(file => {
                if (file.name !== '.emptyFolderPlaceholder') {
                  const regId = file.name.split('.')[0];
                  loaded[regId] = file.name;
                }
              });
              setRecibos(loaded);
            }
          }
        } catch (e) {
          console.error("Erro ao carregar recibos", e);
        }
      }
    };
    loadRecibos();
  }, [imovel.id, isSupabaseConfigured]);
  
  const handleUploadRecibo = async (regId: string, e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    if (isSupabaseConfigured) {
      try {
        const { supabase } = await import('./supabase');
        if (supabase) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${regId}.${fileExt}`;
          const path = `recibos/${imovel.id}/${fileName}`;
          
          const { error } = await supabase.storage.from('aptstays_files').upload(path, file, { upsert: true });
          if (error) {
            alert("Erro ao salvar recibo: " + error.message);
            return;
          }
          
          setRecibos(prev => ({ ...prev, [regId]: fileName }));
        }
      } catch (err: any) {
        alert("Erro: " + err.message);
      }
    } else {
      alert("Supabase não configurado.");
    }
    e.target.value = '';
  };

  const handleViewRecibo = async (regId: string) => {
    const fileName = recibos[regId];
    if (!fileName) return;

    if (isSupabaseConfigured) {
      try {
        const { supabase } = await import('./supabase');
        if (supabase) {
          const path = `recibos/${imovel.id}/${fileName}`;
          const { data, error } = await supabase.storage.from('aptstays_files').download(path);
          if (data) {
            const url = URL.createObjectURL(data);
            window.open(url);
          } else if (error) {
            alert("Erro ao baixar recibo: " + error.message);
          }
        }
      } catch (err: any) {
        alert("Erro: " + err.message);
      }
    }
  };

  const handleDeleteRecibo = async (regId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este recibo?")) return;
    
    if (isSupabaseConfigured) {
      try {
        const { supabase } = await import('./supabase');
        if (supabase) {
          const { data, error } = await supabase.storage.from('aptstays_files').list(`recibos/${imovel.id}`, {
            search: regId
          });
          
          if (data && data.length > 0) {
            const filesToRemove = data.map(f => `recibos/${imovel.id}/${f.name}`);
            const { error: removeError } = await supabase.storage.from('aptstays_files').remove(filesToRemove);
            if (removeError) {
              alert("Erro ao excluir recibo: " + removeError.message);
              return;
            }
          }
          
          const newRecibos = { ...recibos };
          delete newRecibos[regId];
          setRecibos(newRecibos);
        }
      } catch (err: any) {
        alert("Erro: " + err.message);
      }
    }
  };

  const handlePrintAllRecibos = async () => {
    if (Object.keys(recibos).length === 0) {
      alert("Nenhum recibo anexado neste mês.");
      return;
    }
    
    setIsProcessingRecibos(true);
    try {
      const { supabase } = await import('./supabase');
      if (!supabase) throw new Error("Supabase client not found");

      const pdfsToMerge = [];
      const { mergePdfs } = await import('./helpers');

      for (const reg of mes.registros) {
        if (recibos[reg.id]) {
          const fileName = recibos[reg.id];
          const path = `recibos/${imovel.id}/${fileName}`;
          const { data, error } = await supabase.storage.from('aptstays_files').download(path);
          if (data && !error) {
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(data);
            });
            pdfsToMerge.push(base64);
          }
        }
      }

      if (pdfsToMerge.length > 0) {
        const mergedPdfBytes = await mergePdfs(pdfsToMerge);
        const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url);
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.print();
          };
        } else {
          alert("Por favor, permita pop-ups para imprimir os recibos.");
        }
      } else {
        alert("Não foi possível carregar os recibos para impressão.");
      }
    } catch (e: any) {
      console.error("Erro ao imprimir recibos:", e);
      alert("Erro ao imprimir recibos: " + e.message);
    } finally {
      setIsProcessingRecibos(false);
    }
  };

  const handleDownloadAllRecibos = async () => {
    if (Object.keys(recibos).length === 0) {
      alert("Nenhum recibo anexado neste mês.");
      return;
    }
    
    setIsProcessingRecibos(true);
    try {
      const { supabase } = await import('./supabase');
      if (!supabase) throw new Error("Supabase client not found");

      const pdfsToMerge = [];
      const { mergePdfs } = await import('./helpers');

      for (const reg of mes.registros) {
        if (recibos[reg.id]) {
          const fileName = recibos[reg.id];
          const path = `recibos/${imovel.id}/${fileName}`;
          const { data, error } = await supabase.storage.from('aptstays_files').download(path);
          if (data && !error) {
            const base64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(data);
            });
            pdfsToMerge.push(base64);
          }
        }
      }

      if (pdfsToMerge.length > 0) {
        const mergedPdfBytes = await mergePdfs(pdfsToMerge);
        const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Recibos_${imovel.nome}_${mes.mes.replace(/\s+/g, '_')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert("Não foi possível carregar os recibos para download.");
      }
    } catch (e: any) {
      console.error("Erro ao baixar recibos:", e);
      alert("Erro ao baixar recibos: " + e.message);
    } finally {
      setIsProcessingRecibos(false);
    }
  };

  const [plataformas, setPlataformas] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem(`plataformas_${imovel.nome}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Migrate old array format to new object format
          return {};
        }
        return parsed;
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  const currentPlataformas = plataformas[mes.mes] || ["Airbnb", "Booking", "Direct"];
  const allPlataformas = Array.from(new Set([...currentPlataformas, ...Object.keys(attachments).filter(k => attachments[k])]));

  const [isEditingPlataformas, setIsEditingPlataformas] = useState(false);
  const [novaPlataforma, setNovaPlataforma] = useState("");

  const handleAddPlataforma = () => {
    const plat = novaPlataforma.trim();
    if (plat && !currentPlataformas.includes(plat)) {
      const newPlats = { ...plataformas, [mes.mes]: [...currentPlataformas, plat] };
      setPlataformas(newPlats);
      try {
        localStorage.setItem(`plataformas_${imovel.nome}`, JSON.stringify(newPlats));
      } catch (e) {
        console.error("Erro ao salvar plataformas no localStorage:", e);
      }
      setNovaPlataforma("");
    }
  };

  const handleRemovePlataforma = async (plat: string) => {
    const newPlats = { ...plataformas, [mes.mes]: currentPlataformas.filter(p => p !== plat) };
    setPlataformas(newPlats);
    try {
      localStorage.setItem(`plataformas_${imovel.nome}`, JSON.stringify(newPlats));
    } catch (e) {
      console.error("Erro ao salvar plataformas no localStorage:", e);
    }
    
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
        const { data, error } = await supabase.storage.from('aptstays_files').list(path, { limit: 1000 });
        if (error) {
          console.error("Erro ao listar anexos de locações:", error);
          setAttachments({});
          return;
        }
        if (data) {
          const loaded: Record<string, string> = {};
          data.forEach(file => {
            if (file.name !== '.emptyFolderPlaceholder') {
              const plat = file.name.replace('.pdf', '');
              loaded[plat] = 'supabase';
            }
          });
          setAttachments(loaded);
        } else {
          setAttachments({});
        }
      } else {
        const loaded: Record<string, string> = {};
        currentPlataformas.forEach(plat => {
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
      const url = createBlobUrl(base64);
      const w = window.open(url, "_blank");
      if (!w) {
        alert("Por favor, permita pop-ups para visualizar o documento.");
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
      const seen = new Set<string>();
      for (const plat of plats) {
        const base64 = await getPdfBase64(plat);
        if (base64 && !seen.has(base64)) {
          seen.add(base64);
          if (base64.startsWith('data:application/pdf')) {
            pdfs.push(base64);
          } else {
            const url = createBlobUrl(base64);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Relatorio_${mes.mes}_${plat}`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }
        }
      }
      if (pdfs.length > 0) {
        const mergedBase64 = await mergePdfs(pdfs);
        const url = createBlobUrl(mergedBase64);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Relatorios_${mes.mes}.pdf`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    
    const w = window.open("", "_blank");
    if (w) {
      w.document.write("<html><body style='font-family:sans-serif;text-align:center;padding-top:50px;'><h2>Preparando documento para impressão, por favor aguarde...</h2></body></html>");
    } else {
      alert("Por favor, permita pop-ups para imprimir.");
      return;
    }

    try {
      const pdfs: string[] = [];
      const seen = new Set<string>();
      for (const plat of plats) {
        const base64 = await getPdfBase64(plat);
        if (base64 && !seen.has(base64)) {
          seen.add(base64);
          if (base64.startsWith('data:application/pdf')) {
            pdfs.push(base64);
          } else if (base64.startsWith('data:image')) {
            const imgW = window.open("");
            if (imgW) {
              imgW.document.write(`<img src="${base64}" style="max-width:100%;" />`);
              setTimeout(() => imgW.print(), 500);
            }
          }
        }
      }
      if (pdfs.length > 0) {
        const mergedBase64 = await mergePdfs(pdfs);
        const url = createBlobUrl(mergedBase64);
        if (w) {
          w.location.href = url;
        }
      } else {
        if (w) w.close();
      }
    } catch (e) {
      console.error(e);
      if (w) w.close();
      alert("Erro ao processar arquivos.");
    }
  };

  const [importingCsv, setImportingCsv] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(prev => [...prev, ...Array.from(e.target.files as FileList)]);
    }
  };

  const handleImportCsv = async () => {
    if (selectedFiles.length === 0) return;

    if (!isSupabaseConfigured) {
      alert("Supabase não configurado. Não é possível importar.");
      return;
    }

    setImportingCsv(true);
    let totalImportedCount = 0;
    let errorMessages: string[] = [];

    try {
      if (isSupabaseConfigured && supabase) {
        const { error: deleteError } = await supabase
          .from('locacoes')
          .delete()
          .eq('imovel_id', imovel.id);
          
        if (deleteError) {
          console.error("Erro ao apagar locações antigas:", deleteError);
          alert("Erro ao apagar locações antigas. A importação foi cancelada.");
          setImportingCsv(false);
          return;
        }
      }

      for (const file of selectedFiles) {
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
                  if (mes_ref) {
                    // Normalize "fev/25", "Fev", "fevereiro 2025" to "Fev 25"
                    mes_ref = mes_ref.toString().trim();
                    const parts = mes_ref.split(/[\s/_-]+/);
                    let m = parts[0].substring(0, 3);
                    m = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
                    let y = parts[1] || "";
                    if (y.length === 4) y = y.substring(2);
                    if (!y && data_entrada) {
                      const d = new Date(data_entrada);
                      if (!isNaN(d.getTime())) y = d.getFullYear().toString().slice(2);
                    }
                    if (!y) y = new Date().getFullYear().toString().slice(2);
                    mes_ref = `${m} ${y}`;
                  } else if (data_entrada) {
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
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      console.error("Erro geral na importação:", err);
      alert(`Ocorreu um erro fatal ao importar: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setImportingCsv(false);
      setSelectedFiles([]);
      // Reset input
      const fileInput = document.getElementById('csv-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
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
            {selectedFiles.length > 0 && (
              <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-md">
                {selectedFiles.length} arquivo(s)
              </span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <input 
              type="file" 
              accept=".csv"
              multiple
              onChange={handleFileSelect}
              disabled={importingCsv}
              id="csv-upload"
              className="hidden"
            />
            <label 
              htmlFor="csv-upload"
              className={`flex-1 flex items-center justify-center gap-2 border border-blue-200 border-dashed rounded-xl px-4 py-3 text-sm font-medium text-blue-700 bg-white cursor-pointer hover:bg-blue-50 transition ${importingCsv ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload size={18} /> {selectedFiles.length > 0 ? "Adicionar mais arquivos" : "Selecionar arquivos CSV"}
            </label>
            {selectedFiles.length > 0 && (
              <button
                onClick={handleImportCsv}
                disabled={importingCsv}
                className="px-4 py-3 rounded-xl font-semibold text-white text-sm bg-blue-600 hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {importingCsv ? <><Loader2 className="animate-spin" size={18} /> Importando...</> : "Importar"}
              </button>
            )}
          </div>
          
          {selectedFiles.length > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-600">Arquivos selecionados:</p>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between bg-white border border-gray-100 rounded-lg p-2 text-xs">
                    <span className="truncate text-gray-700 font-medium flex-1">{f.name}</span>
                    <button 
                      onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      disabled={importingCsv}
                      className="text-red-500 hover:bg-red-50 p-1 rounded transition ml-2"
                      title="Remover arquivo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
          {isAdmin && (
            <button
              onClick={async () => {
                if (window.confirm(`Tem certeza que deseja excluir TODAS as locações de ${mes.mes}?`)) {
                  if (isSupabaseConfigured) {
                    try {
                      const { error } = await supabase
                        .from('locacoes')
                        .delete()
                        .eq('imovel_id', imovel.id)
                        .eq('mes_ref', mes.mes);
                      if (error) throw error;
                      alert('Mês excluído com sucesso!');
                      if (onRefresh) onRefresh();
                    } catch (e: any) {
                      alert(`Erro ao excluir: ${e.message}`);
                    }
                  } else {
                    alert('Modo demonstração: exclusão não disponível.');
                  }
                }
              }}
              className="absolute top-4 right-4 text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition"
              title="Excluir este mês"
            >
              <Trash2 size={16} />
            </button>
          )}
          <p className="font-semibold text-gray-700 text-sm mb-2 pr-8">
            {(() => {
              const monthName = mes.mes.split(" ")[0];
              const monthIndex = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"].indexOf(monthName);
              return monthIndex >= 0 ? `${t.meses[monthIndex]} ${mes.mes.split(" ")[1] || ""}` : mes.mes;
            })()}
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
            <div><p className="text-gray-400">{t.totalHospedes}</p><p className="font-bold text-gray-700">{mes.hospedes}</p></div>
            <div><p className="text-gray-400">{t.totalNoites}</p><p className="font-bold text-gray-700">{mes.noites}</p></div>
            <div><p className="text-gray-400">{t.lucroTotal}</p><p className="font-bold" style={{ color: B.green }}>{fmt(mes.lucro)}</p></div>
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
                      {currentPlataformas.map(plat => (
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
                  {allPlataformas.map(plat => (
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
                {allPlataformas.map(plat => attachments[plat] && (
                  <button key={plat} onClick={() => handleView(plat)}
                    className="tour-locacoes-imprimir-um text-[10px] font-semibold px-2 py-1 rounded border bg-gray-50 border-gray-200 text-gray-600">
                    📄 {plat}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-2 mt-3">
              <button onClick={handlePrintAll}
                className="tour-locacoes-imprimir-todos flex-1 text-xs py-2 rounded-xl font-medium border flex justify-center items-center gap-1"
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
          [...mes.registros].sort((a, b) => {
            const aIsExpense = a.hospede.toLowerCase().includes('despesa');
            const bIsExpense = b.hospede.toLowerCase().includes('despesa');
            if (aIsExpense && !bIsExpense) return 1;
            if (!aIsExpense && bIsExpense) return -1;
            return 0;
          }).map((reg: any, i: number) => (
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
              
              {(reg.despesas > 0 || reg.hospede.toLowerCase().includes('despesa')) && (isAdmin || recibos[reg.id]) && (
                <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Recibo:</span>
                  <div className="flex items-center gap-1">
                    {recibos[reg.id] ? (
                      <>
                        <button onClick={() => handleViewRecibo(reg.id)} className="tour-locacoes-recibo text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200">
                          📄 Ver Recibo
                        </button>
                        {isAdmin && (
                          <button onClick={() => handleDeleteRecibo(reg.id)} className="text-[10px] px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200">
                            🗑️
                          </button>
                        )}
                      </>
                    ) : isAdmin ? (
                      <label className="cursor-pointer text-[10px] px-2 py-1 bg-gray-50 text-gray-600 rounded border border-gray-200 block">
                        📎 Anexar
                        <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => handleUploadRecibo(reg.id, e)} />
                      </label>
                    ) : null}
                  </div>
                </div>
              )}
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
      const { data, error } = await supabase.storage.from('aptstays_files').list(path, { limit: 1000 });
      if (error) {
        console.error("Erro ao listar documentos:", error);
      }
      if (data) {
        setDocs(data.filter(d => d.name !== '.emptyFolderPlaceholder'));
      }
      
      if (isAdmin) {
        const adminPath = `documentos_admin/${imovel.nome.replace(/\s+/g, '')}`;
        const { data: adminData, error: adminError } = await supabase.storage.from('aptstays_files').list(adminPath, { limit: 1000 });
        if (adminError) {
          console.error("Erro ao listar documentos admin:", adminError);
        }
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
  const formatPhone = (val: string) => {
    let clean = val.replace(/\D/g, '');
    if (clean.length > 11) clean = clean.slice(0, 11);
    if (clean.length > 2) {
      clean = `(${clean.slice(0, 2)}) ${clean.slice(2)}`;
    }
    if (clean.length > 10) {
      clean = `${clean.slice(0, 10)}-${clean.slice(10)}`;
    }
    return clean;
  };

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

  useEffect(() => {
    const loadInfo = async () => {
      const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');
      if (isSupabaseConfigured) {
        try {
          const { supabase } = await import('./supabase');
          if (supabase) {
            const path = `infoprop/${imovel.nome.replace(/\s+/g, '')}.json`;
            const { data, error } = await supabase.storage.from('aptstays_files').download(path);
            if (data && !error) {
              const text = await data.text();
              const parsed = JSON.parse(text);
              setInfo(parsed);
              localStorage.setItem(`infoprop_${imovel.id}`, text);
            }
          }
        } catch (e) {
          console.error("Erro ao carregar Info Propriedade do Supabase", e);
        }
      }
    };
    loadInfo();
  }, [imovel.nome, imovel.id]);

  const handleSave = async () => {
    localStorage.setItem(`infoprop_${imovel.id}`, JSON.stringify(info));
    setIsEditing(false);
    
    const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');
    if (isSupabaseConfigured) {
      try {
        const { supabase } = await import('./supabase');
        if (supabase) {
          const path = `infoprop/${imovel.nome.replace(/\s+/g, '')}.json`;
          const blob = new Blob([JSON.stringify(info)], { type: 'application/json' });
          await supabase.storage.from('aptstays_files').upload(path, blob, { upsert: true });
        }
      } catch (e) {
        console.error("Erro ao salvar Info Propriedade no Supabase", e);
      }
    }
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
                <input type="text" placeholder="Telefone" value={info.contato1Tel} onChange={e => setInfo({...info, contato1Tel: formatPhone(e.target.value)})} className="border border-gray-200 rounded p-2 text-xs" />
                <input type="email" placeholder="E-mail" value={info.contato1Email} onChange={e => setInfo({...info, contato1Email: e.target.value})} className="col-span-2 border border-gray-200 rounded p-2 text-xs" />
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <p className="text-xs font-semibold text-gray-600">Contato 2</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="Nome" value={info.contato2Nome} onChange={e => setInfo({...info, contato2Nome: e.target.value})} className="border border-gray-200 rounded p-2 text-xs" />
                <input type="text" placeholder="Telefone" value={info.contato2Tel} onChange={e => setInfo({...info, contato2Tel: formatPhone(e.target.value)})} className="border border-gray-200 rounded p-2 text-xs" />
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
    telefone: user?.user_metadata?.telefone || localStorage.getItem(`phone_${user?.email}`) || "",
    prefixo: user?.user_metadata?.prefixo || localStorage.getItem(`prefix_${user?.email}`) || "+55",
    endereco: user?.user_metadata?.endereco || localStorage.getItem(`address_${user?.email}`) || "",
    nascimento: user?.user_metadata?.nascimento || localStorage.getItem(`birth_${user?.email}`) || "",
  });

  useEffect(() => {
    if (user) {
      setAvatar(user.user_metadata?.avatar_url || localStorage.getItem(`avatar_${user.email}`) || "");
      setPersonalData({
        nome: user.user_metadata?.name || "",
        email: user.email || "",
        telefone: user.user_metadata?.telefone || localStorage.getItem(`phone_${user.email}`) || "",
        prefixo: user.user_metadata?.prefixo || localStorage.getItem(`prefix_${user.email}`) || "+55",
        endereco: user.user_metadata?.endereco || localStorage.getItem(`address_${user.email}`) || "",
        nascimento: user.user_metadata?.nascimento || localStorage.getItem(`birth_${user.email}`) || "",
      });
    }
  }, [user]);

  const prefixOptions = [
    { code: '+55', country: 'br', label: 'BR' },
    { code: '+1', country: 'us', label: 'US/CA' },
    { code: '+351', country: 'pt', label: 'PT' },
    { code: '+44', country: 'gb', label: 'UK' },
    { code: '+34', country: 'es', label: 'ES' },
    { code: '+33', country: 'fr', label: 'FR' },
    { code: '+49', country: 'de', label: 'DE' },
  ];
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (personalData.prefixo === '+55') {
      if (val.length > 11) val = val.slice(0, 11);
      if (val.length > 2) {
        val = `(${val.slice(0, 2)}) ${val.slice(2)}`;
      }
      if (val.length > 10) {
        val = `${val.slice(0, 10)}-${val.slice(10)}`;
      }
    }
    setPersonalData({ ...personalData, telefone: val });
  };

  const selectedPrefix = prefixOptions.find(o => o.code === personalData.prefixo) || prefixOptions[0];

  useEffect(() => {
    // Se não tiver telefone ou endereço salvo, abre em modo de edição
    if (!personalData.telefone || !personalData.endereco) {
      setIsEditingPersonalData(true);
    }
  }, []);

  const handleSavePersonalData = async () => {
    localStorage.setItem(`phone_${user?.email}`, personalData.telefone);
    localStorage.setItem(`prefix_${user?.email}`, personalData.prefixo);
    localStorage.setItem(`address_${user?.email}`, personalData.endereco);
    localStorage.setItem(`birth_${user?.email}`, personalData.nascimento);
    
    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ 
        data: { 
          name: personalData.nome,
          telefone: personalData.telefone,
          prefixo: personalData.prefixo,
          endereco: personalData.endereco,
          nascimento: personalData.nascimento
        } 
      });
      if (error) {
        alert("Erro ao salvar dados no Supabase: " + error.message);
        return;
      }
    }
    setIsEditingPersonalData(false);
    alert(t.dadosSalvos);
  };

  const handlePhotoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      if (isSupabaseConfigured && supabase) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
          
          const { error } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
          if (error) {
            if (error.message.includes('Bucket not found')) {
              alert("ERRO: O Bucket 'avatars' não existe no Supabase.\n\nCrie um BUCKET chamado 'avatars' (tudo minúsculo) e marque-o como 'Public'.");
            } else {
              alert("Erro ao salvar a foto: " + error.message);
            }
            e.target.value = '';
            return;
          }

          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
          const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
          
          setAvatar(newUrl);
          localStorage.setItem(`avatar_${user.email}`, newUrl);
          await supabase.auth.updateUser({ data: { avatar_url: newUrl } });
          
        } catch (err: any) {
          alert("Erro: " + err.message);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (ev: any) => {
          const base64 = ev.target.result;
          setAvatar(base64);
          localStorage.setItem(`avatar_${user.email}`, base64);
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = '';
  };

  const handleLogoUpload = async (e: any) => {
    const file = e.target.files[0];
    if (file) {
      if (isSupabaseConfigured && supabase) {
        try {
          // Remove existing logos
          const { data: existingFiles, error: listError } = await supabase.storage.from('logos').list();
          
          if (listError) {
            if (listError.message.includes('Bucket not found')) {
              alert("ERRO: O Bucket 'logos' não existe no Supabase.\n\nVá no Supabase > Storage e crie um BUCKET chamado 'logos' (tudo minúsculo). Não crie uma pasta dentro de outro bucket, crie um Bucket novo e marque-o como 'Public'.");
              e.target.value = ''; // Clear input
              return;
            }
            console.warn("Aviso ao listar logos antigas:", listError.message);
          }

          if (existingFiles) {
            const filesToRemove = existingFiles.filter(f => f.name.startsWith('app_logo')).map(f => f.name);
            if (filesToRemove.length > 0) {
              await supabase.storage.from('logos').remove(filesToRemove);
            }
          }

          // Upload new
          const fileExt = file.name.split('.').pop();
          const fileName = `app_logo_${Date.now()}.${fileExt}`;
          const { error } = await supabase.storage.from('logos').upload(fileName, file);
          
          if (error) {
            if (error.message.includes('row-level security')) {
              alert("ERRO DE PERMISSÃO: Você precisa criar uma 'Policy' no Supabase Storage para o bucket 'logos' permitindo Insert/Update/Select.");
            } else {
              alert("Erro ao salvar a logo no Supabase: " + error.message);
            }
            e.target.value = ''; // Clear input
            return;
          }

          // Fetch new URL
          const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName);
          const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
          localStorage.setItem('app_logo', newUrl);
          setAppLogo(newUrl);
          window.dispatchEvent(new Event('logoUpdated'));
          alert("Logo atualizada com sucesso no Supabase!");
        } catch (err: any) {
          alert("Erro: " + err.message);
        }
      } else {
        const reader = new FileReader();
        reader.onload = (ev: any) => {
          const base64 = ev.target.result;
          setAppLogo(base64);
          localStorage.setItem('app_logo', base64);
          window.dispatchEvent(new Event('logoUpdated'));
          alert("Logo atualizada com sucesso! (Modo Local)");
        };
        reader.readAsDataURL(file);
      }
    }
    e.target.value = ''; // Clear input
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
                <input type="tel" value={personalData.telefone} onChange={handlePhoneChange} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1" style={{ '--tw-ring-color': B.green } as any} />
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
  const [name, setName] = useState("");
  const [imovelName, setImovelName] = useState("");
  const [role, setRole] = useState("proprietario");
  const [loginRole, setLoginRole] = useState("proprietario");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Por favor, insira seu e-mail no campo acima para redefinir a senha.");
      return;
    }
    if (!isSupabaseConfigured) {
      alert("Modo de demonstração: e-mail de redefinição não enviado.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) {
      alert("Erro ao enviar e-mail de redefinição: " + error.message);
    } else {
      alert("E-mail de redefinição enviado! Verifique sua caixa de entrada.");
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!isSupabaseConfigured) {
      // Mock login/register
      onLogin({ id: 'mock-id', email, user_metadata: { role, name: name || email.split('@')[0], imovelName: role === 'proprietario' ? imovelName : undefined } });
      return;
    }
    
    setLoading(true);
    if (isRegister) {
      const { error } = await supabase.auth.signUp({ 
        email, 
        password: pw,
        options: { data: { role, name, imovelName: role === 'proprietario' ? imovelName : undefined } }
      });
      if (error) setAuthError(error.message);
      else alert("Cadastro realizado! Faça login.");
      setIsRegister(false);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setAuthError("E-mail ou senha incorretos. Tente novamente.");
        } else {
          setAuthError(error.message);
        }
      }
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
          className="text-[10px] px-2 py-1 rounded-md font-bold text-white transition-colors border border-white/20"
          style={{ background: "rgba(255,255,255,0.15)" }}>
          {lang === "pt" ? "EN" : "PT"}
        </button>
      </div>

      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative mt-8">
        {!isRegister && (
          <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10 flex bg-gray-100 p-1 rounded-full border border-gray-200 shadow-sm">
            <button type="button" onClick={() => setLoginRole("proprietario")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${loginRole === "proprietario" ? "bg-white text-green-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Proprietário
            </button>
            <button type="button" onClick={() => setLoginRole("admin")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all duration-200 ${loginRole === "admin" ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Administrador
            </button>
          </div>
        )}
        <div className="flex flex-col items-center mb-8 mt-4 gap-3">
          <Logo size={120} />
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: B.navy }}>Apt Stays</h1>
            <p className="text-gray-400 text-sm">
              {isRegister 
                ? (role === "proprietario" ? "Portal do Proprietário" : "Portal do Administrador")
                : (loginRole === "proprietario" ? "Portal do Proprietário" : "Portal do Administrador")}
            </p>
          </div>
        </div>
        <form onSubmit={handleAuthSubmit} className="space-y-3">
          {isRegister && (
            <>
              <div className="flex gap-2 mb-2">
                <button type="button" onClick={() => setRole("proprietario")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border-2 transition-colors ${role === "proprietario" ? "border-green-500 text-green-600 bg-green-50" : "border-gray-100 text-gray-400 bg-gray-50"}`}>
                  Proprietário
                </button>
                <button type="button" onClick={() => setRole("admin")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl border-2 transition-colors ${role === "admin" ? "border-blue-500 text-blue-600 bg-blue-50" : "border-gray-100 text-gray-400 bg-gray-50"}`}>
                  Administrador
                </button>
              </div>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t.seuNome} type="text" required
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': B.green } as React.CSSProperties} />
              {role === "proprietario" && (
                <input value={imovelName} onChange={e => setImovelName(e.target.value)} placeholder="Nome do Imóvel" type="text" required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': B.green } as React.CSSProperties} />
              )}
            </>
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t.email} type="email" required
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': B.green } as React.CSSProperties} />
          
          <div className="relative">
            <input value={pw} onChange={e => setPw(e.target.value)} placeholder={t.password} type={showPassword ? "text" : "password"} required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': B.green } as React.CSSProperties} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          
          {authError && (
            <div className="text-red-500 text-xs text-center font-medium bg-red-50 p-2 rounded-lg border border-red-100">
              {authError}
            </div>
          )}
          
          {!isRegister && (
            <div className="flex justify-end mt-1">
              <button type="button" onClick={handleForgotPassword} className="text-[10px] text-gray-500 hover:underline">
                Esqueci minha senha
              </button>
            </div>
          )}

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
  const [isPendingAdmin, setIsPendingAdmin] = useState(false);
  const [runTour, setRunTour] = useState(false);
  const t = T[lang];
  const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('http');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    
    fetchGlobalLogo();
    
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
        let userIsAdmin = user?.user_metadata?.role === 'admin' || user?.email === 'aptstays.rio@gmail.com';
        
        if (userIsAdmin && user?.email !== 'aptstays.rio@gmail.com') {
          if (!user?.user_metadata?.isApprovedAdmin) {
            setIsPendingAdmin(true);
            setLoadingData(false);
            return;
          }
        }
        
        setIsPendingAdmin(false);

        if (isSupabaseConfigured && !userIsAdmin) {
          try {
            const { data, error } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            if (data && data.role === 'admin') {
              userIsAdmin = true;
            }
          } catch (e) {
            console.error("Error fetching role:", e);
          }
        }
        setIsAdmin(userIsAdmin);
        
        try {
          const data = await getDashboardData(user, userIsAdmin);
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

  if (isPendingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5" style={{ background: `linear-gradient(145deg, ${B.navy} 0%, ${B.green} 100%)` }}>
        <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center">
          <Logo size={80} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2" style={{ color: B.navy }}>Aguardando Aprovação</h2>
          <p className="text-gray-500 text-sm mb-6">
            Sua conta de administrador foi criada, mas precisa ser aprovada pelo administrador principal antes de você poder acessar o painel.
          </p>
          <button onClick={handleLogout} className="px-4 py-2 rounded-lg font-semibold text-white w-full" style={{ background: B.navy }}>
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!imovelData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-5 bg-gray-50 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-lg max-w-sm w-full">
          <Logo size={80} className="mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Nenhum imóvel encontrado</h2>
          <p className="text-gray-500 text-sm mb-6">
            Não encontramos nenhum imóvel associado ao seu perfil. Verifique se o nome do imóvel foi digitado corretamente durante o cadastro.
          </p>
          <button onClick={handleLogout} className="px-4 py-2 rounded-lg font-semibold text-white w-full" style={{ background: B.navy }}>
            Sair e tentar novamente
          </button>
        </div>
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

  const handleRefresh = async () => {
    if (user) {
      setLoadingData(true);
      try {
        const data = await getDashboardData(user, isAdmin);
        setImoveisList(data);
        if (data.length > 0 && !selectedImovelId) {
          setSelectedImovelId(data[0].id);
        }
      } catch (e) {
        console.error("Error refreshing data:", e);
      } finally {
        setLoadingData(false);
      }
    }
  };

  const tourSteps = [
    {
      target: '.tour-dashboard',
      content: 'Aqui você vê o resumo financeiro do seu imóvel, incluindo lucro, despesas e ocupação.',
      disableBeacon: true,
      targetTab: 'dashboard',
    },
    {
      target: '.tour-montagem',
      content: 'Nesta aba, você gerencia o inventário e as notas fiscais de tudo que foi comprado para o imóvel.',
      targetTab: 'montagem',
    },
    {
      target: '.tour-montagem-imprimir',
      content: 'Imprime o relatório total de todos os itens de montagem.',
      targetTab: 'montagem',
    },
    {
      target: '.tour-montagem-ver-nf',
      content: 'Permite visualizar a nota fiscal de um item específico.',
      targetTab: 'montagem',
    },
    {
      target: '.tour-montagem-emprestado',
      content: 'Aqui você vê o valor do item. Se ele foi emprestado e não comprado, aparecerá a indicação "Emprestado".',
      targetTab: 'montagem',
    },
    {
      target: '.tour-montagem-imprimir-nfs',
      content: 'Imprime ou baixa todas as notas fiscais juntas em um único arquivo.',
      targetTab: 'montagem',
    },
    {
      target: '.tour-locacoes',
      content: 'Aqui ficam os registros de todas as locações, hóspedes, valores e recibos de despesas.',
      targetTab: 'locacoes',
    },
    {
      target: '.tour-locacoes-imprimir-um',
      content: 'Imprimir relatório de uma plataforma específica.',
      targetTab: 'locacoes',
    },
    {
      target: '.tour-locacoes-imprimir-todos',
      content: 'Imprime ou baixa todos os relatórios de locações juntos.',
      targetTab: 'locacoes',
    },
    {
      target: '.tour-locacoes-recibo',
      content: 'Permite visualizar o recibo de uma despesa específica.',
      targetTab: 'locacoes',
    },
    {
      target: '.tour-documentos',
      content: 'Acesse documentos importantes do imóvel, como manuais e contratos.',
      targetTab: 'documentos',
    },
    ...(isAdmin ? [{
      target: '.tour-infoprop',
      content: 'Informações detalhadas do imóvel e contatos importantes.',
      targetTab: 'infoprop',
    }] : []),
    {
      target: '.tour-profile',
      content: 'Gerencie seu perfil, senha e configurações do aplicativo.',
      targetTab: 'profile',
    }
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, type, index } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];
    
    if (type === 'step:before') {
      const step = tourSteps[index];
      if (step && step.targetTab && step.targetTab !== tab) {
        setTab(step.targetTab);
      }
    }

    if (finishedStatuses.includes(status)) {
      setRunTour(false);
    }
  };

  const renderView = () => {
    return (
      <div className="w-full h-full relative">
        <div className={tab === "dashboard" ? "block" : "hidden"}>
          <Dashboard t={t} lang={lang} imovel={imovelData} isAdmin={isAdmin} />
        </div>
        <div className={tab === "montagem" ? "block" : "hidden"}>
          <MontagemView t={t} imovel={imovelData} isAdmin={isAdmin} onRefresh={handleRefresh} />
        </div>
        <div className={tab === "locacoes" ? "block" : "hidden"}>
          <LocacoesView t={t} imovel={imovelData} isAdmin={isAdmin} lang={lang} onRefresh={handleRefresh} />
        </div>
        <div className={tab === "documentos" ? "block" : "hidden"}>
          <DocumentosView t={t} imovel={imovelData} isAdmin={isAdmin} isSupabaseConfigured={isSupabaseConfigured} />
        </div>
        <div className={tab === "infoprop" ? "block" : "hidden"}>
          <InfoPropriedadeView t={t} imovel={imovelData} isAdmin={isAdmin} />
        </div>
        <div className={tab === "profile" ? "block" : "hidden"}>
          <ProfileView t={t} user={user} lang={lang} setLang={setLang} onLogout={handleLogout} isSupabaseConfigured={isSupabaseConfigured} isAdmin={isAdmin} />
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-2xl">
      <Joyride
        steps={tourSteps}
        run={runTour}
        continuous
        showProgress
        showSkipButton
        disableOverlayClose
        disableScrolling
        callback={handleJoyrideCallback}
        styles={{
          options: {
            primaryColor: B.green,
            zIndex: 1000,
          }
        }}
        locale={{
          back: 'Anterior',
          close: 'Fechar',
          last: 'Concluir',
          next: 'Próximo',
          skip: 'Pular'
        }}
      />
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
                      setSelectedImovelId(Number(e.target.value));
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
            <button onClick={() => setRunTour(true)}
              className="text-xs px-2 py-1 rounded-lg font-medium"
              style={{ background: "rgba(255,255,255,0.2)" }}>
              Tour
            </button>
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
      <div className="flex-1 overflow-auto p-4 pb-24">
        {renderView()}
      </div>

      {/* Bottom Nav */}
      <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 flex justify-around px-1 py-2 pb-6">
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            className={`tour-${tb.id} flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-colors`}
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
