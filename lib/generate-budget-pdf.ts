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
    budgetNumber: string;
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

export function generateBudgetPDF(data: BudgetPDFData) {
    const doc = new jsPDF();
    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const fmt = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

    let y = 0;

    const checkPage = (needed: number) => {
        if (y + needed > pageHeight - 20) {
            doc.addPage();
            y = 15;
        }
    };

    // ── HEADER ──────────────────────────────────────────────
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, pageWidth, 44, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(data.orgName, 15, 12);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    let headerY = 20;
    if (data.orgCompanyName) { doc.text(data.orgCompanyName, 15, headerY); headerY += 6; }
    if (data.orgCNPJ)        { doc.text(`CNPJ: ${data.orgCNPJ}`, 15, headerY); headerY += 6; }

    // linha inferior esquerda: endereço | tel | email
    const infoLeft: string[] = [];
    if (data.orgAddress)  infoLeft.push(data.orgAddress);
    if (data.orgPhone)    infoLeft.push(`Tel: ${data.orgPhone}`);
    if (data.orgEmail)    infoLeft.push(data.orgEmail);
    if (infoLeft.length)  doc.text(infoLeft.join("  |  "), 15, 40, { maxWidth: pageWidth * 0.65 });

    // Título e número direita
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("ORÇAMENTO", pageWidth - 15, 12, { align: "right" });
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(data.budgetNumber, pageWidth - 15, 20, { align: "right" });
    doc.text(`Válido até: ${data.validityDate}`, pageWidth - 15, 27, { align: "right" });
    if (data.orgOwnerName) doc.text(`Resp.: ${data.orgOwnerName}`, pageWidth - 15, 34, { align: "right" });

    y = 54;

    // ── CLIENTE ─────────────────────────────────────────────
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`Cliente: ${data.clientName}`, 15, y);
    y += 7;
    if (data.clientAddress) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.text(`Endereço: ${data.clientAddress}`, 15, y);
        y += 6;
    }
    y += 4;

    // ── CONDIÇÕES DE PAGAMENTO ──────────────────────────────
    const showPrazo  = data.paymentType === 'prazo'  || data.paymentType === 'both';
    const showAvista = data.paymentType === 'avista' || data.paymentType === 'both';

    const prazoEntry       = data.totalPrazo * (data.prazoEntryPercent / 100);
    const prazoRemainder   = data.totalPrazo - prazoEntry;
    const prazoInstallment = data.prazoInstallments > 0 ? prazoRemainder / data.prazoInstallments : 0;

    const avistaTotal     = data.totalPrazo * (1 - data.avistaDiscountPercent / 100);
    const avistaEntry     = avistaTotal * (data.avistaEntryPercent / 100);
    const avistaRemainder = avistaTotal - avistaEntry;

    const boxH = (showPrazo && showAvista ? 30 : 18);
    doc.setFillColor(240, 240, 250);
    doc.rect(15, y - 3, pageWidth - 30, boxH, "F");

    doc.setFontSize(9);
    if (showPrazo) {
        doc.setFillColor(79, 70, 229);
        doc.rect(15, y - 3, 28, boxH / (showPrazo && showAvista ? 2 : 1), "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("A Prazo", 29, y + 4, { align: "center" });

        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "normal");
        const prazoText = `${fmt(data.totalPrazo)}  Entrada de ${fmt(prazoEntry)} e o restante em ${data.prazoInstallments}x de ${fmt(prazoInstallment)} no cartão de crédito.`;
        doc.text(prazoText, 48, y + 4);
        y += (showPrazo && showAvista ? 13 : 18);
    }

    if (showAvista) {
        doc.setFillColor(16, 185, 129);
        const avistaBoxY = showPrazo ? y - (boxH / 2) : y - 3;
        doc.rect(15, avistaBoxY, 28, boxH / (showPrazo && showAvista ? 2 : 1), "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("À Vista", 29, y + 4, { align: "center" });

        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "normal");
        const avistaText = `${fmt(avistaTotal)} (-${data.avistaDiscountPercent}%)  Entrada de ${fmt(avistaEntry)} e o saldo de ${fmt(avistaRemainder)} na finalização da montagem via PIX.`;
        doc.text(avistaText, 48, y + 4);
        y += 18;
    }

    y += 8;

    // ── TOTAIS ──────────────────────────────────────────────
    const colQty   = 15;
    const colDesc  = 28;
    const colPrazo = pageWidth - 50;
    const colAvist = pageWidth - 15;

    // cabeçalho tabela
    checkPage(12);
    doc.setFillColor(230, 230, 245);
    doc.rect(15, y - 4, pageWidth - 30, 10, "F");
    doc.setTextColor(79, 70, 229);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Qtd", colQty, y + 2);
    doc.text("Descrição", colDesc, y + 2);
    doc.text("A Prazo", colPrazo, y + 2, { align: "right" });
    doc.text("À Vista", colAvist, y + 2, { align: "right" });
    y += 10;

    // ── AMBIENTES E ITENS ────────────────────────────────────
    for (const env of data.environments) {
        const activeItems = env.items.filter(i => i.is_active);
        if (activeItems.length === 0) continue;

        checkPage(14);
        // cabeçalho do ambiente
        doc.setFillColor(245, 245, 255);
        doc.rect(15, y - 3, pageWidth - 30, 10, "F");
        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(env.name.toUpperCase(), colDesc, y + 3);
        y += 10;

        let subPrazo  = 0;
        let subAvista = 0;

        for (const item of activeItems) {
            checkPage(8);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(60, 60, 60);
            doc.text(String(item.qty % 1 === 0 ? Math.round(item.qty) : item.qty).padStart(2, "0"), colQty, y);

            // trunca descrição se necessária
            const descLines = doc.splitTextToSize(item.description, colPrazo - colDesc - 5);
            doc.text(descLines[0], colDesc, y);

            doc.setTextColor(30, 30, 30);
            doc.text(fmt(item.value_prazo),  colPrazo, y, { align: "right" });
            doc.text(fmt(item.value_avista), colAvist, y, { align: "right" });

            subPrazo  += item.value_prazo;
            subAvista += item.value_avista;
            y += 7;
        }

        // subtotal
        checkPage(10);
        doc.setDrawColor(200, 200, 220);
        doc.line(15, y, pageWidth - 15, y);
        y += 5;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(79, 70, 229);
        doc.text("Sub Total =>", colPrazo - 40, y);
        doc.text(fmt(subPrazo),  colPrazo, y, { align: "right" });
        doc.text(fmt(subAvista), colAvist, y, { align: "right" });
        y += 8;
    }

    // ── TOTAL GERAL ──────────────────────────────────────────
    checkPage(16);
    doc.setFillColor(79, 70, 229);
    doc.rect(15, y - 3, pageWidth - 30, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`Total: ${fmt(data.totalPrazo)}`, colPrazo, y + 5, { align: "right" });
    doc.text(`${fmt(avistaTotal)}`, colAvist, y + 5, { align: "right" });
    y += 18;

    // ── OBSERVAÇÕES ──────────────────────────────────────────
    if (data.observations) {
        checkPage(20);
        doc.setTextColor(30, 30, 30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text("OBS:", 15, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        const obsLines = doc.splitTextToSize(data.observations, pageWidth - 30);
        doc.text(obsLines, 15, y);
        y += obsLines.length * 5 + 8;
    }

    // ── ASSINATURA ───────────────────────────────────────────
    checkPage(30);
    y += 5;
    doc.setDrawColor(150, 150, 150);
    doc.line(15, y, 90, y);
    doc.line(pageWidth / 2 + 10, y, pageWidth - 15, y);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Assinatura do Cliente", 15, y + 6);
    doc.text("Assinatura da Marcenaria", pageWidth / 2 + 10, y + 6);

    // ── RODAPÉ ───────────────────────────────────────────────
    doc.setFontSize(7);
    doc.setTextColor(180, 180, 180);
    doc.text("Documento gerado automaticamente pelo sistema Marcenaria Pro", 15, pageHeight - 5);

    const safe = data.clientName.replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`Orcamento_${safe}_${data.budgetNumber.replace(/[^a-zA-Z0-9]/g, "")}.pdf`);
}
