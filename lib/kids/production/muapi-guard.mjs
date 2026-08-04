export const SUCCESS_STATUSES = new Set(['completed', 'succeeded', 'success']);
export const FAILURE_STATUSES = new Set(['failed', 'error', 'cancelled', 'canceled']);
export const ACTIVE_STATUSES = new Set(['queued', 'pending', 'processing', 'starting']);

export function normalizeStatus(status) {
  return typeof status === 'string' ? status.trim().toLowerCase() : '';
}

export function classifyMuapiStatus(status) {
  const normalized = normalizeStatus(status);
  if (SUCCESS_STATUSES.has(normalized)) return 'success';
  if (FAILURE_STATUSES.has(normalized)) return 'failure';
  if (ACTIVE_STATUSES.has(normalized) || normalized === '') return 'active';
  return 'unknown';
}

export function shouldContinuePolling(status) {
  return classifyMuapiStatus(status) === 'active';
}

export function assertSingleActiveRequest(activeRequests) {
  const active = (activeRequests || []).filter((job) => shouldContinuePolling(job.status));
  if (active.length > 0) {
    throw new Error(`Ya existe una solicitud Lumo Kids activa: ${active[0].requestId || active[0].id || 'sin id'}.`);
  }
  return true;
}

export function validateBudgetPreflight({
  liveBalance,
  exactQuote,
  maximumPerGeneration,
  spentInStage = 0,
  stageCap,
  protectedReserve,
}) {
  const numbers = { liveBalance, exactQuote, maximumPerGeneration, spentInStage, stageCap, protectedReserve };
  for (const [name, value] of Object.entries(numbers)) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name} debe ser un número no negativo.`);
  }
  if (exactQuote > maximumPerGeneration) {
    throw new Error(`La cotización ${exactQuote} supera el máximo por generación ${maximumPerGeneration}.`);
  }
  if (spentInStage + exactQuote > stageCap) {
    throw new Error(`La compra superaría el tope de etapa ${stageCap}.`);
  }
  if (liveBalance - exactQuote < protectedReserve) {
    throw new Error(`La compra reduciría el saldo por debajo de la reserva ${protectedReserve}.`);
  }
  return {
    approved: true,
    balanceBefore: liveBalance,
    quote: exactQuote,
    balanceAfterMaximum: Number((liveBalance - exactQuote).toFixed(6)),
    stageAfterMaximum: Number((spentInStage + exactQuote).toFixed(6)),
  };
}

export function buildMuapiReceipt({ requestId, jobId, model, quotedCost, actualCost, balanceAfter, status }) {
  if (!requestId) throw new Error('El recibo necesita request_id.');
  const normalized = normalizeStatus(status);
  if (!SUCCESS_STATUSES.has(normalized) && !FAILURE_STATUSES.has(normalized)) {
    throw new Error('El recibo solo puede cerrarse con un estado terminal.');
  }
  return {
    requestId,
    jobId,
    model,
    quotedCost,
    actualCost,
    balanceAfter,
    status: normalized,
    terminal: true,
  };
}

export function getRequestCost(payload = {}, headers = null) {
  const headerCost = headers?.get?.('X-MuAPI-Cost-USD');
  const headerBalance = headers?.get?.('X-Account-Balance');
  const bodyCost = payload.cost?.amount_usd;
  return {
    amountUsd: Number.isFinite(Number(headerCost)) ? Number(headerCost) : Number(bodyCost),
    balanceAfter: Number.isFinite(Number(headerBalance)) ? Number(headerBalance) : null,
    refunded: Boolean(payload.cost?.refunded),
  };
}
