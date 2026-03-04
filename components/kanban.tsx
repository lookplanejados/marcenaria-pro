"use client";

import React, { useState } from 'react';

// Tipagem base de uma Venda (Projeto) no Kanban
type SaleProject = {
  id: string;
  clientName: string;
  status: 'Orçamento' | 'Produção' | 'Montagem' | 'Concluído';
  totalValue: number;
  balanceToReceive: number;
  grossProfit: number;
  grossMarginPercent: number;
};

const mockProjects: SaleProject[] = [
  {
    id: '1',
    clientName: 'Cozinha Planejada - Sra. Mariana',
    status: 'Produção',
    totalValue: 24500,
    balanceToReceive: 12250,
    grossProfit: 8575,
    grossMarginPercent: 35.0,
  },
  {
    id: '2',
    clientName: 'Painel TV Quarto - Joao Silva',
    status: 'Orçamento',
    totalValue: 3200,
    balanceToReceive: 3200,
    grossProfit: 1120,
    grossMarginPercent: 35.0,
  },
  {
    id: '3',
    clientName: 'Móveis Banheiro Suite',
    status: 'Montagem',
    totalValue: 4800,
    balanceToReceive: 1000,
    grossProfit: 1440,
    grossMarginPercent: 30.0,
  }
];

const COLUMNS = ['Orçamento', 'Produção', 'Montagem', 'Concluído'];

export function KanbanBoard() {
  const [projects, setProjects] = useState<SaleProject[]>(mockProjects);

  // Formatação monetária (BRL)
  const formatBRL = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Define cor da margem baseada na saúde financeira
  const getMarginColor = (margin: number) => {
    if (margin >= 35) return 'text-emerald-600 bg-emerald-50';
    if (margin >= 25) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Kanban de Projetos</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhamento e saúde financeira de vendas ativas</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {COLUMNS.map((column) => (
          <div key={column} className="flex flex-col">
            {/* Header da Coluna */}
            <div className="flex items-center justify-between bg-white px-4 py-3 border-t-4 border-indigo-600 rounded-t-lg shadow-sm">
              <h2 className="font-semibold text-gray-800">{column}</h2>
              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded-full">
                {projects.filter(p => p.status === column).length}
              </span>
            </div>

            {/* Container de Cards */}
            <div className="bg-gray-100 flex-1 min-h-[500px] p-3 rounded-b-lg flex flex-col gap-4">
              {projects.filter(p => p.status === column).map((project) => (
                <div 
                  key={project.id} 
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 border border-gray-100 cursor-grab"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-medium text-sm text-gray-900 leading-tight">
                      {project.clientName}
                    </h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-xs items-center">
                      <span className="text-gray-500">Valor Total</span>
                      <span className="font-semibold text-gray-900">{formatBRL(project.totalValue)}</span>
                    </div>

                    <div className="flex justify-between text-xs items-center">
                      <span className="text-gray-500">A Receber</span>
                      <span className="font-medium text-orange-600">{formatBRL(project.balanceToReceive)}</span>
                    </div>

                    <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                      <span className="text-gray-500">Lucro Estimado</span>
                      <div className={`px-2 py-1 rounded font-bold flex items-center gap-1 ${getMarginColor(project.grossMarginPercent)}`}>
                        {formatBRL(project.grossProfit)}
                        <span className="text-[10px] ml-1">({project.grossMarginPercent}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
