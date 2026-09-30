export type Outcome = 'APPROVED' | 'DENIED' | 'ESCALATED';
export type Reason = 'DAMAGED' | 'WRONG_ITEM' | 'CHANGED_MIND' | 'OTHER';
export type Customer = { id: string; name: string; email: string };
export type Order = {
  id: string;
  customerId: string;
  product: string;
  category: 'home' | 'tech' | 'wear';
  amountCents: number;
  currency: 'USD';
  orderedAt: string;
  deliveredAt: string | null;
  finalSale: boolean;
  status: 'DELIVERED' | 'IN_TRANSIT' | 'REFUNDED';
};
export type Analysis = {
  reason: Reason;
  confidence: number;
  suspicious: boolean;
  conflicting: boolean;
  summary: string;
  mode: 'openai' | 'demo' | 'unavailable';
  model: string | null;
};
export type PolicyCheck = { code: string; passed: boolean; note: string };
export type Decision = {
  outcome: Outcome;
  code: string;
  message: string;
  checks: PolicyCheck[];
};
export type AuditEntry = {
  at: string;
  actor: string;
  event: string;
  note: string;
};
export type Refund = {
  id: string;
  orderId: string;
  customerId: string;
  message: string;
  selectedReason: Reason;
  analysis: Analysis;
  decision: Decision;
  originalOutcome: Outcome;
  amountCents: number;
  policyVersion: string;
  createdAt: string;
  updatedAt: string;
  audit: AuditEntry[];
};
export type RefundView = Refund & { order: Order; customer: Customer };
export type AppConfig = {
  aiMode: 'openai' | 'demo';
  policyVersion: string;
  demo: true;
};
export const reasonLabels: Record<Reason, string> = {
  DAMAGED: 'It arrived damaged',
  WRONG_ITEM: 'I received the wrong item',
  CHANGED_MIND: 'I changed my mind',
  OTHER: 'Something else',
};
export const outcomeLabels: Record<Outcome, string> = {
  APPROVED: 'Approved',
  DENIED: 'Denied',
  ESCALATED: 'Needs review',
};
