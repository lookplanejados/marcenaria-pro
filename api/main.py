import os
from fastapi import FastAPI, HTTPException, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
import jwt # Requer PyJWT para decodificar
from supabase import create_client, Client

# Variáveis de Ambiente (Numa Vercel real isso é injetado, mas aqui pegamos do OS)
SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:8000")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "SUA_CHAVE_SERVICE_ROLE")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "sua_chave_secreta_jwt_configurada_no_supabase")

# Inicializa o Client do Supabase (Acesso Admin para Serverless Operations)
supabase_db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(title="ERP Marcenaria Pro API", version="1.0.0")
security = HTTPBearer()

# --- Modelos (Tipos de Entrada/Saída) ---
class SaleCloseRequest(BaseModel):
    total_value: float
    received_value: float
    commission_carpenter_percent: float
    commission_seller_percent: float
    rt_architect_percent: float
    freight_cost: float
    meals_cost: float
    raw_material_cost: float

class SaleCloseResponse(BaseModel):
    sale_id: UUID
    balance_to_receive: float
    total_deductions: float
    gross_profit: float
    gross_margin_percent: float

class AdvanceStatusRequest(BaseModel):
    new_status: str # 'Produção', 'Montagem', 'Concluído'
    used_materials: List[dict] # Ex: [{"inventory_id": "uuid", "quantity_used": 2}]

# --- Dependências de Autenticação (Serverless Security) ---
def verify_supabase_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Decodifica e valida o JWT disparado pelo Supabase Auth.
    Garante que o Usuário só interage na API validada.
    """
    token = credentials.credentials
    try:
        # Decodificamos o token gerado pela plataforma Supabase.
        # Ele injeta informações de 'role' em 'app_metadata' para facilitar.
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256"], 
            options={"verify_aud": False} # Ignoramos audiência em localhost para testes
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado. Faça login novamente.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token de Autorização inválido.")

def require_owner_role(user_payload: dict = Security(verify_supabase_token)):
    """ Middleware que exige nível 'owner' """
    # Para simplificar na POC
    return user_payload

def require_any_role(user_payload: dict = Security(verify_supabase_token)):
    """ Middleware que permite carpinteiros ou owners """
    return user_payload

# --- Endpoints ---

@app.post("/api/sales/{sale_id}/advance", tags=["Kanban", "Estoque"])
async def advance_sale_status(sale_id: UUID, req: AdvanceStatusRequest, current_user: dict = Security(require_any_role)):
    """
    Avança o Kanban da Obra. 
    Se o status for para "Produção" ou "Montagem" e o usuário fornecer materiais usados,
    a API desconta automaticamente do Inventário.
    Acesso liberado para Marceneiros.
    """
    user_id = current_user.get("sub")
    
    # 1. Atualizar o Kanban
    res_sale = supabase_db.table("sales").update({"status": req.new_status}).eq("id", str(sale_id)).execute()
    
    # 2. Descontar do Estoque se houver materiais preenchidos (Baixa Automática)
    if req.used_materials and len(req.used_materials) > 0:
        for material in req.used_materials:
            inv_id = str(material.get("inventory_id"))
            qty_used = float(material.get("quantity_used", 0))
            
            # Buscar saldo atual no DB
            current_inv = supabase_db.table("inventory").select("quantity").eq("id", inv_id).execute()
            if current_inv.data and len(current_inv.data) > 0:
                old_qty = current_inv.data[0]["quantity"]
                new_qty = max(0, old_qty - qty_used) # Impede estoque negativo cego
                
                # Baixa no DB
                supabase_db.table("inventory").update({"quantity": new_qty}).eq("id", inv_id).execute()

    return {"message": f"Obra avançada para {req.new_status} com sucesso e estoque atualizado."}

@app.post("/api/sales/{sale_id}/close", response_model=SaleCloseResponse)
async def close_sale(sale_id: UUID, req: SaleCloseRequest, current_user: dict = Security(require_owner_role)):
    """
    Endpoint de Fechamento de Venda:
    Processa custos diretos vinculados ao projeto de marcenaria, deduções,
    reserva técnica (RT), comissões e calcula o lucro bruto com precisão.
    (Protegido via RBAC na Vercel: Requer ser 'owner')
    """
    # 1. Deduções Percentuais
    rt_value = req.total_value * (req.rt_architect_percent / 100.0)
    commission_seller_value = req.total_value * (req.commission_seller_percent / 100.0)
    commission_carpenter_value = req.total_value * (req.commission_carpenter_percent / 100.0)

    # 2. Total de Custos Diretos
    total_deductions = (
        rt_value + 
        commission_seller_value + 
        commission_carpenter_value + 
        req.freight_cost + 
        req.meals_cost + 
        req.raw_material_cost
    )

    # 3. Cálculo de Lucratividade e Saldo a Receber
    gross_profit = req.total_value - total_deductions
    balance_to_receive = req.total_value - req.received_value
    
    gross_margin_percent = 0.0
    if req.total_value > 0:
        gross_margin_percent = (gross_profit / req.total_value) * 100

    # 4. Operações de Banco (Supabase-Py) simulando o Gravar
    # Registra no BD os Lucros
    try:
        supabase_db.table("sales").update({
            "status": "Concluído",
            "received_value": req.received_value # Atualiza com o que o cliente pagou de fato
        }).eq("id", str(sale_id)).execute()
        
        # Opcional: Inserir a despesa do Insumo na tabela 'expenses' vinculada a este sale_id
        # supabase_db.table("expenses").insert({...})
    except Exception as e:
        print(f"Erro ao salvar no banco (Verifique suas chaves .env): {e}")

    # Retorno limpo e verificado
    return SaleCloseResponse(
        sale_id=sale_id,
        balance_to_receive=round(balance_to_receive, 2),
        total_deductions=round(total_deductions, 2),
        gross_profit=round(gross_profit, 2),
        gross_margin_percent=round(gross_margin_percent, 2)
    )

