import { IMOVEL, B } from "./data";
import { PDFDocument } from 'pdf-lib';

export const fmt = (v: number | string) => `R$ ${Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
export const fmtShort = (v: number | string) => {
  const num = Number(v);
  if (num >= 1000) return `R$ ${(num / 1000).toFixed(1)}k`;
  return `R$ ${num.toFixed(0)}`;
};

export const createBlobUrl = (base64: string): string => {
  try {
    const parts = base64.split(',');
    if (parts.length < 2) return base64;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
    const byteCharacters = atob(parts[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error("Error creating blob url", e);
    return base64;
  }
};

const compressImageBase64 = (base64: string, maxWidth = 1200, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(base64);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64);
    img.src = base64;
  });
};

export const mergePdfs = async (
  items: string[], 
  fetcher?: (item: string) => Promise<string | null>,
  onProgress?: (msg: string) => void
): Promise<Uint8Array> => {
  const mergedPdf = await PDFDocument.create();
  for (let i = 0; i < items.length; i++) {
    if (onProgress) onProgress(`Processando ${i + 1} de ${items.length}...`);
    // Yield to main thread to allow UI updates
    await new Promise(resolve => setTimeout(resolve, 50));

    let base64 = items[i];
    if (fetcher) {
      if (onProgress) onProgress(`Baixando ${i + 1} de ${items.length}...`);
      const fetched = await fetcher(base64);
      if (!fetched) continue;
      base64 = fetched;
    }

    try {
      if (base64.startsWith('data:application/pdf')) {
        const res = await fetch(base64);
        const pdfBytes = await res.arrayBuffer();
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      } else if (base64.startsWith('data:image/')) {
        if (onProgress) onProgress(`Otimizando imagem ${i + 1}...`);
        const compressedBase64 = await compressImageBase64(base64);
        const res = await fetch(compressedBase64);
        const imageBytes = await res.arrayBuffer();
        let image;
        if (compressedBase64.startsWith('data:image/png')) {
          image = await mergedPdf.embedPng(imageBytes);
        } else if (compressedBase64.startsWith('data:image/jpeg') || compressedBase64.startsWith('data:image/jpg')) {
          image = await mergedPdf.embedJpg(imageBytes);
        }
        if (image) {
          // A4 size in points: 595.28 x 841.89
          const page = mergedPdf.addPage([595.28, 841.89]);
          const { width, height } = image.scaleToFit(595.28 - 40, 841.89 - 40);
          page.drawImage(image, {
            x: 20,
            y: 841.89 - height - 20,
            width,
            height,
          });
        }
      }
    } catch (err) {
      console.error("Erro ao mesclar arquivo:", err);
    }
  }
  
  if (onProgress) onProgress("Gerando arquivo final...");
  await new Promise(resolve => setTimeout(resolve, 50));
  
  const mergedPdfBytes = await mergedPdf.save();
  return mergedPdfBytes;
};

export const printMontagem = (imovel = IMOVEL) => {
  const m = imovel.montagem;
  const totalItens = m.comodos.flatMap((c: any) => c.itens).reduce((a: any, i: any) => a + i.total, 0);
  const w = window.open("", "_blank");
  if (!w) return;
  
  const logoHtml = B.logoUrl 
    ? `<img src="${B.logoUrl}" class="logo-circle" style="object-fit: cover;" />`
    : `<div class="logo-circle">AS</div>`;

  w.document.write(`<html><head><title>Fatura Montagem — ${imovel.nome}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;padding:40px;color:#222;max-width:860px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;padding-bottom:20px;border-bottom:3px solid #0a8f44}
    .logo-box{display:flex;align-items:center;gap:16px}
    .logo-circle{width:96px;height:96px;border-radius:50%;background:linear-gradient(135deg,#022b5e,#0a8f44);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-style:italic;font-size:24px;border:2px solid #0a8f44}
    .brand{font-size:26px;font-weight:bold;color:#022b5e}
    .brand-sub{font-size:12px;color:#888}
    .title-box{text-align:right}
    .title{font-size:22px;font-weight:bold;border:2px solid #222;padding:8px 18px;border-radius:8px;display:inline-block}
    .num{color:#555;font-size:14px;margin-top:6px}
    .info-box{border:1px solid #ddd;border-radius:10px;padding:14px 18px;margin:20px 0;display:inline-block;background:#f9f9f9}
    .info-box p{font-size:13px;margin:2px 0}
    .section{margin:24px 0 8px;font-size:14px;font-weight:bold;color:#1a6b3a;border-left:4px solid #1a6b3a;padding-left:10px}
    table{width:100%;border-collapse:collapse;margin:6px 0 14px;font-size:12px}
    th{background:#f0f0f0;padding:8px 10px;text-align:left;border:1px solid #ddd}
    td{padding:7px 10px;border:1px solid #eee}
    tr:nth-child(even) td{background:#fafafa}
    .emp{color:#999;font-style:italic}
    .totals{float:right;width:280px;border:1px solid #ddd;border-radius:10px;overflow:hidden;margin-top:20px}
    .tot-row{display:flex;justify-content:space-between;padding:8px 14px;font-size:13px;border-bottom:1px solid #eee}
    .tot-final{display:flex;justify-content:space-between;padding:10px 14px;background:#1a6b3a;color:white;font-weight:bold;font-size:15px}
    .tot-pago{color:#1a6b3a;font-weight:bold}
    .tot-falta{color:#e55;font-weight:bold}
    .problema{padding:6px 10px;margin:3px 0;background:#fff8f0;border-left:3px solid #f59e0b;font-size:12px;border-radius:4px}
    .footer{margin-top:40px;padding-top:16px;border-top:1px dashed #ccc;font-size:11px;color:#999;display:flex;justify-content:space-between}
    @media print{body{padding:20px}}
  </style></head><body>
  <div class="header">
    <div class="logo-box">
      ${logoHtml}
      <div><div class="brand">Apt Stays</div><div class="brand-sub">aptstays.rio@gmail.com</div></div>
    </div>
    <div class="title-box">
      <div class="title">FATURA DA MONTAGEM</div>
      <div class="num">#${m.fatura} &nbsp;·&nbsp; ${m.data}</div>
    </div>
  </div>
  <div class="info-box">
    <p><b>Imóvel:</b> ${imovel.nome} (${imovel.apelido})</p>
    <p><b>Proprietário:</b> ${imovel.proprietario}</p>
    <p><b>Data:</b> ${m.data} &nbsp;&nbsp; <b>Fatura Nº:</b> ${m.fatura}</p>
  </div>
  ${m.comodos.map(c => {
    const subtotal = c.itens.reduce((a, i) => a + i.total, 0);
    return `
    <div class="section">🏠 ${c.nome} — Subtotal: ${fmt(subtotal)}</div>
    <table>
      <tr><th>Item</th><th>Data Compra</th><th>Preço Unit.</th><th>Qtd</th><th>Loja</th><th>Total</th></tr>
      ${c.itens.map(i => `<tr>
        <td${i.emprestado ? ' class="emp"' : ""}>${i.item}${i.emprestado ? " (emprestado)" : ""}</td>
        <td>${i.datCompra}</td>
        <td>${i.emprestado ? "—" : fmt(i.preco)}</td>
        <td>${i.qtd}</td>
        <td>${i.loja}</td>
        <td><b>${i.emprestado ? "R$ 0,00" : fmt(i.total)}</b></td>
      </tr>`).join("")}
    </table>`;
  }).join("")}
  <div class="totals">
    <div class="tot-final"><span>TOTAL MONTAGEM</span><span>${fmt(m.totalMontagem)}</span></div>
    <div class="tot-row tot-pago"><span>Total Pago até agora</span><span>${fmt(m.totalPago)}</span></div>
    <div class="tot-row tot-falta"><span>Falta Pagar</span><span>${fmt(m.totalMontagem - m.totalPago)}</span></div>
  </div>
  <div style="clear:both;padding-top:20px">
    <div class="section">⚠️ Problemas inesperados ocorridos</div>
    ${m.problemasInesperados.map(p => `<div class="problema">${p}</div>`).join("")}
  </div>
  <div class="footer">
    <span>📞 +55(21)98063-1617</span>
    <span>✉️ aptstays.rio@gmail.com</span>
    <span>Gerado em ${new Date().toLocaleDateString("pt-BR")}</span>
  </div>
  <script>window.print();</script>
  </body></html>`);
};

export const printLocacao = (reg: any, imovel = IMOVEL) => {
  const w = window.open("", "_blank");
  if (!w) return;

  const logoHtml = B.logoUrl 
    ? `<img src="${B.logoUrl}" class="logo-circle" style="object-fit: cover;" />`
    : `<div class="logo-circle">AS</div>`;

  w.document.write(`<html><head><title>Recibo — ${reg.hospede}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Arial,sans-serif;padding:40px;color:#222;max-width:640px;margin:0 auto}
    .header{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #0a8f44}
    .logo-circle{width:86px;height:86px;border-radius:50%;background:linear-gradient(135deg,#022b5e,#0a8f44);display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-style:italic;font-size:20px;border:2px solid #0a8f44}
    .title{font-size:20px;font-weight:bold;border:2px solid #222;padding:7px 16px;border-radius:8px}
    .num{color:#555;font-size:12px;margin-top:5px;text-align:right}
    table{width:100%;border-collapse:collapse;margin:16px 0}
    th{background:#f0f0f0;padding:9px 12px;text-align:left;border:1px solid #ddd;font-size:13px}
    td{padding:9px 12px;border:1px solid #eee;font-size:13px}
    .neg{color:#e55}
    .pos{color:#1a6b3a;font-weight:bold}
    .final td{background:#1a6b3a;color:white;font-weight:bold;font-size:16px}
    .footer{margin-top:32px;padding-top:14px;border-top:1px dashed #ccc;font-size:11px;color:#999;text-align:center}
  </style></head><body>
  <div class="header">
    ${logoHtml}
    <div style="text-align:right">
      <div class="title">RECIBO DE LOCAÇÃO</div>
      <div class="num">${imovel.nome} · ${reg.data}</div>
    </div>
  </div>
  <table>
    <tr><th>Campo</th><th>Detalhe</th></tr>
    <tr><td>Hóspede</td><td>${reg.hospede}</td></tr>
    <tr><td>Nº de Hóspedes</td><td>${reg.nHospedes}</td></tr>
    <tr><td>Data de Entrada</td><td>${reg.data}</td></tr>
    <tr><td>Nº de Diárias</td><td>${reg.diarias}</td></tr>
    <tr><td>Quarto / Unidade</td><td>${reg.quarto}</td></tr>
    <tr><td>Plataforma</td><td>${reg.plataforma}</td></tr>
    <tr><td>Valor Líquido Plataforma</td><td>${fmt(reg.valorLiquido)}</td></tr>
    ${reg.taxaLimpeza > 0 ? `<tr><td>Taxa de Limpeza</td><td>${fmt(reg.taxaLimpeza)}</td></tr>` : ""}
    <tr><td>Comissão Apt Stays (20%)</td><td class="neg">− ${fmt(reg.comissao)}</td></tr>
    ${reg.extra > 0 ? `<tr><td>Valor Extra</td><td class="pos">+ ${fmt(reg.extra)}</td></tr>` : ""}
    ${reg.despesas > 0 ? `<tr><td>Despesas</td><td class="neg">− ${fmt(reg.despesas)}</td></tr>` : ""}
    <tr class="final"><td>LUCRO LÍQUIDO</td><td>${fmt(reg.lucro)}</td></tr>
  </table>
  <div class="footer">📞 +55(21)98063-1617 &nbsp;·&nbsp; ✉️ aptstays.rio@gmail.com &nbsp;·&nbsp; Gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
  <script>window.print();</script>
  </body></html>`);
};
