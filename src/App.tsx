import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { B, T } from "./data";
import { fmt, fmtShort, printMontagem, printLocacao, mergePdfs } from "./helpers";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "./supabase";
import { getDashboardData } from "./api";

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

const Dashboard = ({ t, lang, imovel }: any) => {
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
              <span>Montagem paga</span>
              <span className="font-bold" style={{ color: B.green }}>{percPago}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full" style={{ width: `${percPago}%`, background: B.green }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Falta: {fmt(falta)}</p>
          </div>
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Recuperado via locações</span>
              <span className="font-bold" style={{ color: B.navy }}>{percRecuperado}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className="h-2.5 rounded-full" style={{ width: `${percRecuperado}%`, background: B.navy }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{fmt(totalLucro)} de {fmt(imovel.montagem.totalMontagem)}</p>
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
            <Line type="monotone" dataKey="lucro" stroke={B.green} strokeWidth={2.5} dot={{ r: 3 }} name="Lucro mensal" />
            <Line type="monotone" dataKey="acumulado" stroke={B.navy} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} name="Acumulado" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============================================================
// MONTAGEM VIEW
// ============================================================
const MontagemView = ({ t, imovel, isAdmin }: any) => {
  const [expandido, setExpandido] = useState<number | null>(null);
  const m = imovel.montagem;
  const totalItens = m.comodos.flatMap((c: any) => c.itens).filter((i: any) => !i.emprestado).reduce((a: any, i: any) => a + i.total, 0);

  const [nfs, setNfs] = useState<Record<string, string>>({});

  useEffect(() => {
    const loaded: Record<string, string> = {};
    m.comodos.forEach((c: any, ci: number) => {
      c.itens.forEach((_: any, ii: number) => {
        const key = `nf_${ci}_${ii}`;
        const val = localStorage.getItem(key);
        if (val) loaded[key] = val;
      });
    });
    setNfs(loaded);
  }, [m]);

  const handleUploadNF = (ci: number, ii: number, e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        const base64 = ev.target.result;
        const key = `nf_${ci}_${ii}`;
        setNfs(prev => ({ ...prev, [key]: base64 }));
        localStorage.setItem(key, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleViewNF = (ci: number, ii: number) => {
    const base64 = nfs[`nf_${ci}_${ii}`];
    if (base64) {
      const w = window.open("");
      if (w) {
        if (base64.startsWith('data:image')) {
          w.document.write(`<img src="${base64}" style="max-width:100%;" />`);
        } else if (base64.startsWith('data:application/pdf')) {
          w.document.write(`<iframe src="${base64}" width="100%" height="100%" style="border:none;"></iframe>`);
        }
      }
    }
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

      {/* Resumo */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-2">
        <div className="flex justify-between text-sm font-bold" style={{ color: B.navy }}><span>TOTAL MONTAGEM</span><span>{fmt(m.totalMontagem)}</span></div>
        <div className="flex justify-between text-sm border-t border-gray-100 pt-2"><span className="text-gray-500">{t.totalPago} (até 29/01/2026)</span><span className="font-bold" style={{ color: B.green }}>{fmt(m.totalPago)}</span></div>
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
                <p className="font-semibold text-gray-800 text-sm">🏠 {c.nome}</p>
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
                          <button onClick={() => handleViewNF(ci, ii)} className="text-[10px] px-2 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200">
                            📄 Ver NF
                          </button>
                        )}
                        {isAdmin && (
                          <div className="relative">
                            <input type="file" accept="image/*,application/pdf" onChange={(e) => handleUploadNF(ci, ii, e)} className="hidden" id={`upload-nf-${ci}-${ii}`} />
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
      {m.problemasInesperados && m.problemasInesperados.length > 0 && (
        <div className="rounded-2xl p-4 border border-amber-200 bg-amber-50">
          <p className="font-semibold text-amber-700 mb-3 text-sm">⚠️ {t.problemasInesperados}</p>
          <div className="space-y-1.5">
            {m.problemasInesperados.map((p: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-800">
                <span className="mt-0.5 shrink-0">•</span>
                <span>{p}</span>
              </div>
            ))}
          </div>
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

const LocacoesView = ({ t, imovel, isAdmin }: any) => {
  const [mesSel, setMesSel] = useState(0);
  const mes = imovel.locacoesPorMes[mesSel] || { mes: "N/A", hospedes: 0, noites: 0, lucro: 0, registros: [] };
  const totalLucroGeral = imovel.locacoesPorMes.reduce((a: any, m: any) => a + m.lucro, 0);

  const [attachments, setAttachments] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load attachments from localStorage for the current month
    const loaded: Record<string, string> = {};
    ["Airbnb", "Booking", "Direct"].forEach(plat => {
      const key = `locacao_att_${mes.mes}_${plat}`;
      const val = localStorage.getItem(key);
      if (val) loaded[plat] = val;
    });
    setAttachments(loaded);
  }, [mes.mes]);

  const handleUpload = (plat: string, e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev: any) => {
        const base64 = ev.target.result;
        setAttachments(prev => ({ ...prev, [plat]: base64 }));
        localStorage.setItem(`locacao_att_${mes.mes}_${plat}`, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadAll = async () => {
    const pdfs = Object.values(attachments).filter(a => a.startsWith('data:application/pdf'));
    if (pdfs.length === 0) {
      alert("Nenhum relatório PDF anexado para este mês.");
      return;
    }
    try {
      const mergedBase64 = await mergePdfs(pdfs);
      const a = document.createElement('a');
      a.href = mergedBase64;
      a.download = `Relatorios_${mes.mes}.pdf`;
      a.click();
    } catch (e) {
      console.error(e);
      alert("Erro ao processar PDFs.");
    }
  };

  const handlePrintAll = async () => {
    const pdfs = Object.values(attachments).filter(a => a.startsWith('data:application/pdf'));
    if (pdfs.length === 0) {
      alert("Nenhum relatório PDF anexado para este mês.");
      return;
    }
    try {
      const mergedBase64 = await mergePdfs(pdfs);
      const w = window.open("");
      if (w) {
        w.document.write(`<iframe src="${mergedBase64}" width="100%" height="100%" style="border:none;"></iframe>`);
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao processar PDFs.");
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-gray-800">{t.locacoes}</h2>

      {/* Total geral */}
      <div className="rounded-2xl p-3 text-center border" style={{ background: B.greenLight, borderColor: B.green + "40" }}>
        <p className="text-xs font-medium" style={{ color: B.green }}>Lucro Total Acumulado</p>
        <p className="text-2xl font-bold" style={{ color: B.green }}>{fmt(totalLucroGeral)}</p>
      </div>

      {/* Seletor de mês */}
      <div className="flex overflow-x-auto gap-2 pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
        {imovel.locacoesPorMes.map((m: any, i: number) => (
          <button key={i} onClick={() => setMesSel(i)}
            className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-xl transition"
            style={{
              background: mesSel === i ? B.green : B.greenLight,
              color: mesSel === i ? "white" : B.green,
              border: `1px solid ${B.green}40`
            }}>
            {m.mes}
          </button>
        ))}
      </div>

      {/* Sumário do mês */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <p className="font-semibold text-gray-700 text-sm mb-2">{mes.mes}</p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
          <div><p className="text-gray-400">{t.totalHospedes}</p><p className="font-bold text-gray-700">{mes.hospedes}</p></div>
          <div><p className="text-gray-400">{t.totalNoites}</p><p className="font-bold text-gray-700">{mes.noites}</p></div>
          <div><p className="text-gray-400">{t.lucroTotal}</p><p className="font-bold" style={{ color: B.green }}>{fmtShort(mes.lucro)}</p></div>
        </div>

        {/* Attachments Area */}
        <div className="border-t border-gray-100 pt-3">
          {isAdmin ? (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Anexar Relatórios (Admin)</p>
              <div className="flex flex-wrap gap-2">
                {["Airbnb", "Booking", "Direct"].map(plat => (
                  <div key={plat} className="relative">
                    <input type="file" accept="application/pdf" onChange={(e) => handleUpload(plat, e)} className="hidden" id={`upload-${plat}`} />
                    <label htmlFor={`upload-${plat}`} className={`cursor-pointer text-[10px] font-semibold px-2 py-1 rounded border ${attachments[plat] ? 'bg-green-50 border-green-200 text-green-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
                      {attachments[plat] ? `✓ ${plat}` : `+ ${plat}`}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={handlePrintAll}
                className="flex-1 text-xs py-2 rounded-xl font-medium border flex justify-center items-center gap-1"
                style={{ borderColor: B.green, color: B.green }}>
                🖨️ Imprimir Relatórios
              </button>
              <button onClick={handleDownloadAll}
                className="flex-1 text-xs py-2 rounded-xl font-medium text-white flex justify-center items-center gap-1"
                style={{ background: B.green }}>
                ⬇️ Baixar Relatórios
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Registros do mês */}
      {mes.registros.length === 0 ? (
        <div className="text-center text-gray-400 text-sm py-8 bg-white rounded-2xl border border-gray-100">
          Nenhuma locação registrada neste mês
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
                  <span>{t.taxaLimpeza}</span><span>{fmt(reg.taxaLimpeza)}</span>
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
          <label htmlFor="avatar-upload" className="cursor-pointer flex flex-col items-center justify-center w-24 h-24 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 overflow-hidden hover:bg-gray-100 transition">
            {avatar ? (
              <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <span className="text-2xl">📷</span>
                <p className="text-[10px] text-gray-500 font-medium mt-1 leading-tight">Add sua<br/>foto</p>
              </div>
            )}
          </label>
        </div>
        <p className="font-semibold text-gray-800">{user.email}</p>
        <span className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ background: isAdmin ? B.navyLight : B.greenLight, color: isAdmin ? B.navy : B.green }}>
          {user.user_metadata?.name || (isAdmin ? "Administrador" : "Proprietário")}
        </span>
      </div>

      {/* App Settings (Logo Upload) */}
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
const LoginScreen = ({ t, onLogin }: any) => {
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
      const { error } = await supabase.auth.signUp({ 
        email, 
        password: pw,
        options: { data: { role, name } }
      });
      if (error) alert(error.message);
      else alert("Cadastro realizado! Faça login.");
      setIsRegister(false);
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pw });
      if (error) alert(error.message);
      else onLogin(data.user);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5"
      style={{ background: `linear-gradient(145deg, ${B.navy} 0%, ${B.green} 100%)` }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative">
        
        {/* Role Toggle */}
        <div className="absolute top-4 left-0 w-full flex justify-center">
          <div className="flex bg-gray-100 rounded-full p-1 shadow-inner">
            <button type="button" onClick={() => setRole("proprietario")}
              className={`text-[10px] font-bold px-3 py-1 rounded-full transition ${role === "proprietario" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              Proprietário
            </button>
            <button type="button" onClick={() => setRole("admin")}
              className={`text-[10px] font-bold px-3 py-1 rounded-full transition ${role === "admin" ? "bg-white shadow text-gray-800" : "text-gray-500"}`}>
              Administrador
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center mb-8 mt-6 gap-3">
          <Logo size={120} />
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: B.navy }}>Apt Stays</h1>
            <p className="text-gray-400 text-sm">
              {role === "admin" ? "Portal do Administrador" : "Portal do Proprietário"}
            </p>
          </div>
        </div>
        <form onSubmit={handleAuthSubmit} className="space-y-3">
          {isRegister && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Seu Nome" type="text" required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ focusRingColor: B.green }} />
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
            {loading ? <Loader2 className="animate-spin" size={18} /> : (isRegister ? "Cadastrar" : t.login)}
          </button>
          {!isSupabaseConfigured && (
            <p className="text-xs text-center text-amber-600 mt-2">
              Modo de Demonstração (Supabase não configurado). Clique em Entrar para testar o layout.
            </p>
          )}
        </form>
        <div className="mt-4 text-center">
          <button onClick={() => setIsRegister(!isRegister)} className="text-xs text-gray-500 underline">
            {isRegister ? "Já tenho uma conta" : "Criar nova conta"}
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
  const [imovelData, setImovelData] = useState<any>(null);
  const [tab, setTab] = useState("dashboard");
  const [alertDismissed, setAlertDismissed] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
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
      getDashboardData(user.id).then(data => {
        setImovelData(data);
        setLoadingData(false);
      });
    } else {
      setImovelData(null);
    }
  }, [user]);

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    setUser(null);
  };

  if (!user) return <LoginScreen t={t} onLogin={(u: any) => { setUser(u); setAlertDismissed(false); }} />;
  
  if (loadingData || !imovelData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  // Show Alert Modal if property has an alert and it hasn't been dismissed
  if (imovelData.alerta && !alertDismissed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-5">
        <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl border-t-4 border-amber-500">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-500">
              <AlertCircle size={32} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Aviso Importante</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{imovelData.alerta}</p>
            </div>
            <button 
              onClick={() => setAlertDismissed(true)}
              className="w-full py-3 mt-2 rounded-xl font-semibold text-white flex items-center justify-center gap-2"
              style={{ background: B.green }}
            >
              <CheckCircle2 size={18} />
              Confirmar Leitura
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
    { id: "profile", icon: "👤", label: t.profile },
  ];

  const isAdmin = user?.user_metadata?.role === 'admin';

  const renderView = () => {
    if (tab === "dashboard") return <Dashboard t={t} lang={lang} imovel={imovelData} />;
    if (tab === "montagem") return <MontagemView t={t} imovel={imovelData} isAdmin={isAdmin} />;
    if (tab === "locacoes") return <LocacoesView t={t} imovel={imovelData} isAdmin={isAdmin} />;
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
              <p className="text-xs opacity-60">{imovelData.nome} · {imovelData.apelido}</p>
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
    </div>
  );
}
