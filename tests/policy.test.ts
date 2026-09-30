import { describe, expect, it } from 'vitest';
import { evaluateRefund } from '../server/policy';
import type { Analysis, Order } from '../shared/types';

const now = new Date('2026-09-30T12:00:00Z');
const order: Order = {
  id: 'ORD-1',
  customerId: 'c1',
  product: 'Mug',
  category: 'home',
  amountCents: 3800,
  currency: 'USD',
  orderedAt: '2026-09-20T12:00:00Z',
  deliveredAt: '2026-09-24T12:00:00Z',
  finalSale: false,
  status: 'DELIVERED',
};
const analysis: Analysis = {
  reason: 'DAMAGED',
  confidence: 0.95,
  suspicious: false,
  conflicting: false,
  summary: 'The customer says the mug arrived cracked.',
  mode: 'openai',
  model: 'test-model',
};

describe('refund policy', () => {
  it('approves an eligible damaged item with an explainable policy trace', () => {
    const result = evaluateRefund(order, 'DAMAGED', analysis, now);
    expect(result.outcome).toBe('APPROVED');
    expect(result.checks).toHaveLength(5);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });
  it.each([
    ['FINAL_SALE', { finalSale: true }],
    ['ALREADY_REFUNDED', { status: 'REFUNDED' }],
    ['OUTSIDE_WINDOW', { deliveredAt: '2026-08-30T12:00:00Z' }],
  ])('denies %s even with a confident model', (code, patch) => {
    expect(
      evaluateRefund({ ...order, ...patch } as Order, 'DAMAGED', analysis, now),
    ).toMatchObject({ outcome: 'DENIED', code });
  });
  it('allows the exact 30-day boundary, but denies one millisecond past it', () => {
    const boundary = { ...order, deliveredAt: '2026-08-31T12:00:00.000Z' };
    expect(evaluateRefund(boundary, 'DAMAGED', analysis, now).outcome).toBe(
      'APPROVED',
    );
    expect(
      evaluateRefund(boundary, 'DAMAGED', analysis, new Date(now.getTime() + 1))
        .code,
    ).toBe('OUTSIDE_WINDOW');
  });
  it('allows exactly $500 and escalates $500.01', () => {
    expect(
      evaluateRefund(
        { ...order, amountCents: 50_000 },
        'DAMAGED',
        analysis,
        now,
      ).outcome,
    ).toBe('APPROVED');
    expect(
      evaluateRefund(
        { ...order, amountCents: 50_001 },
        'DAMAGED',
        analysis,
        now,
      ).code,
    ).toBe('HIGH_VALUE');
  });
  it.each([
    { status: 'IN_TRANSIT' as const, deliveredAt: null },
    { deliveredAt: null },
    { deliveredAt: '2026-10-01T12:00:00Z' },
  ])('escalates unconfirmed delivery: %j', (patch) => {
    expect(
      evaluateRefund({ ...order, ...patch }, 'DAMAGED', analysis, now).code,
    ).toBe('DELIVERY_UNCONFIRMED');
  });
  it.each([
    { suspicious: true },
    { conflicting: true },
    { confidence: 0.79 },
    { reason: 'OTHER' as const },
    { reason: 'WRONG_ITEM' as const },
    { mode: 'unavailable' as const },
  ])('cannot approve unsafe or unclear classification: %j', (patch) => {
    expect(
      evaluateRefund(order, 'DAMAGED', { ...analysis, ...patch }, now).outcome,
    ).toBe('ESCALATED');
  });
  it.each(['WRONG_ITEM', 'CHANGED_MIND'] as const)(
    'supports %s under the same exclusions',
    (reason) => {
      expect(
        evaluateRefund(order, reason, { ...analysis, reason }, now).outcome,
      ).toBe('APPROVED');
    },
  );
});
