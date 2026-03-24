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
    responsibleName?: string;
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
    const HEADER_H = 52;
    doc.setFillColor(...INDIGO);
    doc.rect(0, 2, W, HEADER_H, "F");

    // Logo — caixa maior sem compressão
    const LOGO_X    = ML;
    const LOGO_Y    = 5;
    const LOGO_W    = 34;
    const LOGO_H    = 34;

    if (logoBase64) {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, 3, 3, "F");
        try {
            const imgType = logoBase64.includes('image/png') ? 'PNG'
                : logoBase64.includes('image/jpeg') || logoBase64.includes('image/jpg') ? 'JPEG'
                : 'PNG';
            // padding mínimo (0.5) para preservar as bordas arredondadas
            doc.addImage(logoBase64, imgType, LOGO_X + 0.5, LOGO_Y + 0.5, LOGO_W - 1, LOGO_H - 1);
        } catch { /* ignora se falhar */ }
    } else {
        doc.setFillColor(255, 255, 255, 0.2);
        doc.roundedRect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, 3, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(
            (data.orgName || "M").charAt(0).toUpperCase(),
            LOGO_X + LOGO_W / 2,
            LOGO_Y + LOGO_H / 2 + 5,
            { align: "center" }
        );
    }

    // Nome da empresa
    const TX = LOGO_X + LOGO_W + 5;
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

    // cálculos de pagamento (usados na tabela e nos cards do rodapé)
    const showPrazo  = data.paymentType === 'prazo'  || data.paymentType === 'both';
    const showAvista = data.paymentType === 'avista' || data.paymentType === 'both';

    const prazoEntry       = data.totalPrazo * (data.prazoEntryPercent / 100);
    const prazoRemainder   = data.totalPrazo - prazoEntry;
    const prazoInstallment = data.prazoInstallments > 0 ? prazoRemainder / data.prazoInstallments : 0;
    const avistaTotal      = data.totalPrazo * (1 - data.avistaDiscountPercent / 100);
    const avistaEntry      = avistaTotal * (data.avistaEntryPercent / 100);
    const avistaRemainder  = avistaTotal - avistaEntry;

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
    if (showAvista) doc.text("À Vista", COL_VIST, y + 3, { align: "right" });
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

            // Calcula valor à vista por item aplicando o desconto sobre o prazo
            const itemAvista = item.value_prazo * (1 - data.avistaDiscountPercent / 100);

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
            doc.text(fmt(item.value_prazo), COL_PRAZO, y + 2, { align: "right" });
            if (showAvista) doc.text(fmt(itemAvista), COL_VIST, y + 2, { align: "right" });

            subPrazo  += item.value_prazo;
            subAvista += itemAvista;
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
        doc.text(fmt(subPrazo), COL_PRAZO, y + 2, { align: "right" });
        if (showAvista) doc.text(fmt(subAvista), COL_VIST, y + 2, { align: "right" });
        y += 8;
        doc.setLineWidth(1);
    }

    // ── CARDS DE PAGAMENTO (no lugar do TOTAL) ───────────────
    checkPage(42);
    y += 4;

    const colW = showPrazo && showAvista ? (W - ML * 2 - 4) / 2 : W - ML * 2;

    if (showPrazo) {
        const bx = ML;
        const bh = 32;
        doc.setFillColor(...INDIGO_L);
        doc.roundedRect(bx, y, colW, bh, 2, 2, "F");
        doc.setDrawColor(...INDIGO);
        doc.roundedRect(bx, y, colW, bh, 2, 2, "S");

        doc.setFillColor(...INDIGO);
        doc.roundedRect(bx, y, colW, 9, 2, 2, "F");
        doc.rect(bx, y + 4, colW, 5, "F");
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

    // ── OBSERVAÇÕES + RESPONSÁVEL ────────────────────────────
    const hasObs  = !!data.observations;
    const hasResp = !!data.responsibleName;

    if (hasObs || hasResp) {
        const RESP_W = 58; // largura do card responsável
        const obsW   = hasResp ? W - ML * 2 - RESP_W - 4 : W - ML * 2;

        // Calcula altura necessária para as observações
        const obsLines = hasObs
            ? doc.splitTextToSize(data.observations!, obsW - 4)
            : [];
        const obsH = hasObs ? Math.max(obsLines.length * 4.5 + 6, 22) : 0;
        const respH = 22;
        const blockH = hasResp ? Math.max(obsH, respH) : obsH;

        checkPage(blockH + 12);

        if (hasObs) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.setTextColor(...GRAY);
            doc.text("OBSERVAÇÕES", ML, y);
            y += 3;

            doc.setFillColor(...XLGRAY);
            doc.roundedRect(ML, y, obsW, blockH, 2, 2, "F");
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7.5);
            doc.setTextColor(...DARK);
            doc.text(obsLines, ML + 3, y + 5);
        }

        if (hasResp) {
            const rx = ML + obsW + 4;
            const ry = hasObs ? y : y + 3;

            if (!hasObs) {
                // avança y pelo label se não há observações
                y += 3;
            }

            doc.setFillColor(...INDIGO_L);
            doc.roundedRect(rx, ry, RESP_W, blockH, 2, 2, "F");
            doc.setDrawColor(...INDIGO);
            doc.roundedRect(rx, ry, RESP_W, blockH, 2, 2, "S");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(...INDIGO);
            doc.text("RESPONSÁVEL PELO ORÇAMENTO", rx + RESP_W / 2, ry + 6, { align: "center" });

            doc.setDrawColor(...INDIGO);
            doc.setLineWidth(0.2);
            doc.line(rx + 4, ry + 8, rx + RESP_W - 4, ry + 8);
            doc.setLineWidth(1);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(8.5);
            doc.setTextColor(...DARK);
            const nameLines = doc.splitTextToSize(data.responsibleName!, RESP_W - 6);
            doc.text(nameLines, rx + RESP_W / 2, ry + 14, { align: "center" });
        }

        y += blockH + 8;
    }

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
