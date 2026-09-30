import type {
  Analysis,
  Decision,
  Order,
  PolicyCheck,
  Reason,
} from '../shared/types.js';

export const POLICY_VERSION = '2026-09-30.v1';
export const REFUND_WINDOW_DAYS = 30;
export const REVIEW_THRESHOLD_CENTS = 50_000;
const DAY_MS = 86_400_000;

// These exclusions also apply to human approvals. Exceptions need a separate policy.
export function hardExclusion(
  order: Order,
  now: Date,
): { code: string; note: string } | null {
  if (order.status === 'REFUNDED')
    return {
      code: 'ALREADY_REFUNDED',
      note: 'This order has already been refunded.',
    };
  if (order.finalSale)
    return {
      code: 'FINAL_SALE',
      note: 'This item was sold as final sale and is not eligible for a refund.',
    };
  if (
    order.deliveredAt &&
    now.getTime() - Date.parse(order.deliveredAt) > REFUND_WINDOW_DAYS * DAY_MS
  ) {
    return {
      code: 'OUTSIDE_WINDOW',
      note: 'This order is outside the 30-day refund window from delivery.',
    };
  }
  return null;
}

export function evaluateRefund(
  order: Order,
  selectedReason: Reason,
  analysis: Analysis,
  now: Date,
): Decision {
  const checks: PolicyCheck[] = [];
  const check = (code: string, passed: boolean, note: string) =>
    checks.push({ code, passed, note });
  const result = (
    outcome: Decision['outcome'],
    code: string,
    message: string,
  ): Decision => ({ outcome, code, message, checks });
  const exclusion = hardExclusion(order, now);
  check(
    'ELIGIBLE_ORDER',
    !exclusion,
    exclusion?.note ??
      'No final-sale, completed-refund or expired-window exclusion.',
  );
  if (exclusion) return result('DENIED', exclusion.code, exclusion.note);

  const delivered =
    order.status === 'DELIVERED' &&
    order.deliveredAt !== null &&
    Date.parse(order.deliveredAt) <= now.getTime();
  check(
    'DELIVERY_CONFIRMED',
    delivered,
    delivered
      ? 'Delivery is confirmed in the order record.'
      : 'Delivery needs to be checked by support.',
  );
  if (!delivered)
    return result(
      'ESCALATED',
      'DELIVERY_UNCONFIRMED',
      'Our support team needs to check the delivery status before making a decision.',
    );

  const safe = !analysis.suspicious && !analysis.conflicting;
  check(
    'REQUEST_CONSISTENT',
    safe,
    safe
      ? 'No conflicting claims or policy-bypass signals detected.'
      : 'The request contains conflicting claims or a policy-bypass signal.',
  );
  if (!safe)
    return result(
      'ESCALATED',
      'REQUEST_REVIEW',
      'Your request needs a closer look. Our support team will review the details.',
    );

  const withinLimit = order.amountCents <= REVIEW_THRESHOLD_CENTS;
  check(
    'AUTOMATION_LIMIT',
    withinLimit,
    withinLimit
      ? 'The order is within the $500 automatic approval limit.'
      : 'Refunds above $500 require a human decision.',
  );
  if (!withinLimit)
    return result(
      'ESCALATED',
      'HIGH_VALUE',
      'Refunds above $500 need a support specialist’s approval. Your request is in the review queue.',
    );

  const understood =
    analysis.mode !== 'unavailable' &&
    analysis.confidence >= 0.8 &&
    analysis.reason !== 'OTHER' &&
    analysis.reason === selectedReason;
  check(
    'REASON_UNDERSTOOD',
    understood,
    understood
      ? `Request classified as ${analysis.reason.toLowerCase().replaceAll('_', ' ')}.`
      : 'The reason could not be confidently reconciled with your selection.',
  );
  if (!understood)
    return result(
      'ESCALATED',
      'REASON_UNCLEAR',
      'We need a little more context to decide. A support specialist will review your request.',
    );
  return result(
    'APPROVED',
    'WITHIN_POLICY',
    'Your refund request is approved. In this demo, no money is moved. In a live store, the next step would be return instructions and payment processing.',
  );
}
