"use client";

import jsPDF from "jspdf";

export interface BudgetItemPDF {
    description: string;
    qty: number;
    alt_cm: number;
    larg_cm: number;
    value_prazo: number;
    value_avista: number;
    is_active: boolean;
}

export interface BudgetEnvironmentPDF {
    name: string;
    items: BudgetItemPDF[];
}

export interface BudgetPDFData {
    orgName: string;
    orgCompanyName?: string;
    orgCNPJ?: string;
    orgPhone?: string;
    orgEmail?: string;
    orgAddress?: string;
    orgOwnerName?: string;
    orgLogoUrl?: string;
    validityDate: string;
    clientName: string;
    clientAddress?: string;
    paymentType: 'prazo' | 'avista' | 'both';
    totalPrazo: number;
    totalAvista: number;
    prazoEntryPercent: number;
    prazoInstallments: number;
    avistaDiscountPercent: number;
    avistaEntryPercent: number;
    environments: BudgetEnvironmentPDF[];
    observations?: string;
}

// Converte URL de imagem para base64
async function urlToBase64(url: string): Promise<string | null> {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => reject(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export async function generateBudgetPDF(data: BudgetPDFData) {
    // Pré-carrega logo se existir
    let logoBase64: string | null = null;
    if (data.orgLogoUrl) {
        logoBase64 = await urlToBase64(data.orgLogoUrl);
    }

    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();   // 210
    const H = doc.internal.pageSize.getHeight();  // 297
    const ML = 14; // margem esquerda
    const MR = W - 14; // margem direita

    const fmt = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

    // Cores
    const INDIGO  = [67, 56, 202] as const;   // indigo-700
    const INDIGO_L = [238, 242, 255] as const; // indigo-50
    const GREEN   = [5, 150, 105] as const;    // emerald-600
    const GREEN_L = [236, 253, 245] as const;  // emerald-50
    const DARK    = [30, 30, 30] as const;
    const GRAY    = [100, 100, 100] as const;
    const LGRAY   = [200, 200, 210] as const;
    const XLGRAY  = [245, 245, 250] as const;

    let y = 0;

    const checkPage = (needed: number) => {
        if (y + needed > H - 20) { doc.addPage(); y = 15; }
    };

    // ── FAIXA TOPO (gradiente simulado com retângulos) ──────
    doc.setFillColor(...INDIGO);
    doc.rect(0, 0, W, 2, "F");

    // ── CABEÇALHO ───────────────────────────────────────────
    const HEADER_H = 48;
    doc.setFillColor(...INDIGO);
    doc.rect(0, 2, W, HEADER_H, "F");

    // Logo
    const LOGO_X = ML;
    const LOGO_Y = 6;
    const LOGO_SIZE = 22;

    if (logoBase64) {
        // Caixa branca para o logo
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 2, 2, "F");
        try {
            // Detecta tipo da imagem
            const imgType = logoBase64.includes('image/png') ? 'PNG'
                : logoBase64.includes('image/jpeg') || logoBase64.includes('image/jpg') ? 'JPEG'
                : 'PNG';
            doc.addImage(logoBase64, imgType, LOGO_X + 1, LOGO_Y + 1, LOGO_SIZE - 2, LOGO_SIZE - 2);
        } catch { /* ignora se falhar */ }
    } else {
        // Placeholder: quadrado com inicial
        doc.setFillColor(255, 255, 255, 0.2);
        doc.roundedRect(LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE, 2, 2, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(
            (data.orgName || "M").charAt(0).toUpperCase(),
            LOGO_X + LOGO_SIZE / 2,
            LOGO_Y + LOGO_SIZE / 2 + 4,
            { align: "center" }
        );
    }

    // Nome da empresa
    const TX = LOGO_X + LOGO_SIZE + 5;
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(data.orgName, TX, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let infoY = 22;
    if (data.orgCompanyName) {
        doc.setTextColor(200, 210, 255);
        doc.text(data.orgCompanyName, TX, infoY);
        infoY += 5;
    }
    if (data.orgCNPJ) {
        doc.setTextColor(200, 210, 255);
        doc.text(`CNPJ: ${data.orgCNPJ}`, TX, infoY);
        infoY += 5;
    }

    // Endereço / contato na parte inferior do header
    const contact: string[] = [];
    if (data.orgAddress) contact.push(data.orgAddress);
    if (data.orgPhone)   contact.push(`Tel: ${data.orgPhone}`);
    if (data.orgEmail)   contact.push(data.orgEmail);
    if (contact.length) {
        doc.setTextColor(180, 195, 255);
        doc.setFontSize(7.5);
        const contactStr = contact.join("  |  ");
        const lines = doc.splitTextToSize(contactStr, W * 0.58);
        doc.text(lines, TX, 42);
    }

    // Lado direito: ORÇAMENTO + validade + responsável
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("ORÇAMENTO", MR, 16, { align: "right" });

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(200, 210, 255);
    doc.text(`Válido até: ${data.validityDate}`, MR, 23, { align: "right" });
    if (data.orgOwnerName) {
        doc.text(`Resp.: ${data.orgOwnerName}`, MR, 29, { align: "right" });
    }

    y = HEADER_H + 8;

    // ── PARA (CLIENTE) ──────────────────────────────────────
    doc.setFillColor(...XLGRAY);
    doc.roundedRect(ML, y, W - ML * 2, data.clientAddress ? 20 : 13, 2, 2, "F");
    doc.setDrawColor(...LGRAY);
    doc.roundedRect(ML, y, W - ML * 2, data.clientAddress ? 20 : 13, 2, 2, "S");

    // Rótulo "PARA"
    doc.setFillColor(...INDIGO);
    doc.roundedRect(ML, y, 18, data.clientAddress ? 20 : 13, 2, 2, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("PARA", ML + 9, y + (data.clientAddress ? 11 : 7.5), { align: "center" });

    doc.setTextColor(...DARK);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(data.clientName, ML + 22, y + 7);
    if (data.clientAddress) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...GRAY);
        doc.text(data.clientAddress, ML + 22, y + 14);
    }

    y += (data.clientAddress ? 20 : 13) + 8;

    // ── CONDIÇÕES DE PAGAMENTO ──────────────────────────────
    const showPrazo  = data.paymentType === 'prazo'  || data.paymentType === 'both';
    const showAvista = data.paymentType === 'avista' || data.paymentType === 'both';

    const prazoEntry       = data.totalPrazo * (data.prazoEntryPercent / 100);
    const prazoRemainder   = data.totalPrazo - prazoEntry;
    const prazoInstallment = data.prazoInstallments > 0 ? prazoRemainder / data.prazoInstallments : 0;
    const avistaTotal      = data.totalPrazo * (1 - data.avistaDiscountPercent / 100);
    const avistaEntry      = avistaTotal * (data.avistaEntryPercent / 100);
    const avistaRemainder  = avistaTotal - avistaEntry;

    checkPage(55);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    doc.text("CONDIÇÕES DE PAGAMENTO", ML, y);
    y += 4;

    const colW = showPrazo && showAvista ? (W - ML * 2 - 4) / 2 : W - ML * 2;

    if (showPrazo) {
        const bx = ML;
        const bh = 32;
        doc.setFillColor(...INDIGO_L);
        doc.roundedRect(bx, y, colW, bh, 2, 2, "F");
        doc.setDrawColor(...INDIGO);
        doc.roundedRect(bx, y, colW, bh, 2, 2, "S");

        // Label
        doc.setFillColor(...INDIGO);
        doc.roundedRect(bx, y, colW, 9, 2, 2, "F");
        doc.rect(bx, y + 4, colW, 5, "F"); // cobre cantos inferiores arredondados
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("A PRAZO — CARTÃO DE CRÉDITO", bx + colW / 2, y + 6, { align: "center" });

        doc.setTextColor(...DARK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(fmt(data.totalPrazo), bx + colW / 2, y + 17, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY);
        doc.text(
            `Entrada: ${fmt(prazoEntry)} (${data.prazoEntryPercent}%) + ${data.prazoInstallments}x de ${fmt(prazoInstallment)}`,
            bx + colW / 2, y + 24, { align: "center" }
        );
        doc.text("via cartão de crédito", bx + colW / 2, y + 29, { align: "center" });
    }

    if (showAvista) {
        const bx = showPrazo ? ML + colW + 4 : ML;
        const bh = 32;
        doc.setFillColor(...GREEN_L);
        doc.roundedRect(bx, y, colW, bh, 2, 2, "F");
        doc.setDrawColor(...GREEN);
        doc.roundedRect(bx, y, colW, bh, 2, 2, "S");

        doc.setFillColor(...GREEN);
        doc.roundedRect(bx, y, colW, 9, 2, 2, "F");
        doc.rect(bx, y + 4, colW, 5, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(`À VISTA — PIX (-${data.avistaDiscountPercent}%)`, bx + colW / 2, y + 6, { align: "center" });

        doc.setTextColor(...DARK);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.text(fmt(avistaTotal), bx + colW / 2, y + 17, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...GRAY);
        doc.text(
            `Entrada: ${fmt(avistaEntry)} (${data.avistaEntryPercent}%) + Saldo: ${fmt(avistaRemainder)}`,
            bx + colW / 2, y + 24, { align: "center" }
        );
        doc.text("na finalização da montagem via PIX", bx + colW / 2, y + 29, { align: "center" });
    }

    y += 38;

    // ── TABELA DE ITENS ──────────────────────────────────────
    const COL_QTY   = ML;
    const COL_DESC  = ML + 12;
    const COL_PRAZO = MR - 35;
    const COL_VIST  = MR;

    checkPage(14);

    // Cabeçalho da tabela
    doc.setFillColor(...INDIGO);
    doc.rect(ML, y - 3, W - ML * 2, 9, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Qtd",       COL_QTY,   y + 3);
    doc.text("Descrição", COL_DESC,  y + 3);
    doc.text("A Prazo",   COL_PRAZO, y + 3, { align: "right" });
    doc.text("À Vista",   COL_VIST,  y + 3, { align: "right" });
    y += 10;

    let rowAlt = false;

    for (const env of data.environments) {
        const activeItems = env.items.filter(i => i.is_active);
        if (activeItems.length === 0) continue;

        checkPage(12);
        // Cabeçalho do ambiente
        doc.setFillColor(230, 232, 250);
        doc.rect(ML, y - 2, W - ML * 2, 8, "F");
        doc.setTextColor(...INDIGO);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(env.name.toUpperCase(), COL_DESC, y + 4);
        y += 9;
        rowAlt = false;

        let subPrazo  = 0;
        let subAvista = 0;

        for (const item of activeItems) {
            checkPage(8);

            if (rowAlt) {
                doc.setFillColor(250, 250, 253);
                doc.rect(ML, y - 2, W - ML * 2, 7, "F");
            }
            rowAlt = !rowAlt;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(...DARK);
            doc.text(
                String(item.qty % 1 === 0 ? Math.round(item.qty) : item.qty).padStart(2, "0"),
                COL_QTY, y + 2
            );

            const maxDescW = COL_PRAZO - COL_DESC - 4;
            const descLines = doc.splitTextToSize(item.description, maxDescW);
            doc.text(descLines[0], COL_DESC, y + 2);

            doc.setTextColor(...DARK);
            doc.text(fmt(item.value_prazo),  COL_PRAZO, y + 2, { align: "right" });
            doc.text(fmt(item.value_avista), COL_VIST,  y + 2, { align: "right" });

            subPrazo  += item.value_prazo;
            subAvista += item.value_avista;
            y += 7;
        }

        // Subtotal
        checkPage(10);
        doc.setDrawColor(...LGRAY);
        doc.setLineWidth(0.3);
        doc.line(ML, y, MR, y);
        y += 4;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...INDIGO);
        doc.text("Subtotal", COL_PRAZO - 22, y + 2, { align: "right" });
        doc.text(fmt(subPrazo),  COL_PRAZO, y + 2, { align: "right" });
        doc.text(fmt(subAvista), COL_VIST,  y + 2, { align: "right" });
        y += 8;
        doc.setLineWidth(1);
    }

    // ── TOTAL GERAL ──────────────────────────────────────────
    checkPage(14);
    doc.setFillColor(...INDIGO);
    doc.rect(ML, y, W - ML * 2, 11, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TOTAL", ML + 4, y + 7);
    doc.text(fmt(data.totalPrazo), COL_PRAZO, y + 7, { align: "right" });
    if (showAvista) doc.text(fmt(avistaTotal), COL_VIST, y + 7, { align: "right" });
    y += 17;

    // ── OBSERVAÇÕES ──────────────────────────────────────────
    if (data.observations) {
        checkPage(24);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...GRAY);
        doc.text("OBSERVAÇÕES", ML, y);
        y += 4;

        const obsLines = doc.splitTextToSize(data.observations, W - ML * 2 - 4);
        const obsH = obsLines.length * 4.5 + 6;
        doc.setFillColor(...XLGRAY);
        doc.roundedRect(ML, y, W - ML * 2, obsH, 2, 2, "F");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...DARK);
        doc.text(obsLines, ML + 3, y + 5);
        y += obsH + 8;
    }

    // ── ASSINATURA ───────────────────────────────────────────
    checkPage(28);
    y += 4;
    const sigW = (W - ML * 2 - 10) / 2;

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.4);
    doc.line(ML,           y + 14, ML + sigW,           y + 14);
    doc.line(MR - sigW,    y + 14, MR,                  y + 14);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("Assinatura do Cliente",     ML,           y + 19);
    doc.text(data.clientName,             ML,           y + 24);

    doc.text("Assinatura da Marcenaria",  MR - sigW,    y + 19);
    doc.text(data.orgName,                MR - sigW,    y + 24);

    // ── RODAPÉ ───────────────────────────────────────────────
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(ML, H - 12, MR, H - 12);
    doc.setFontSize(6.5);
    doc.setTextColor(180, 180, 180);
    doc.text(
        `Documento gerado em ${new Date().toLocaleDateString('pt-BR')} pelo sistema Marcenaria Pro`,
        W / 2, H - 7, { align: "center" }
    );

    const safe = data.clientName.replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Orcamento_${safe}.pdf`);
}
