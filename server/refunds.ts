import { createHash, randomUUID } from 'node:crypto';
import type { Outcome, Reason, Refund } from '../shared/types.js';
import type { Classifier } from './ai.js';
import { evaluateRefund, hardExclusion, POLICY_VERSION } from './policy.js';
import type { Repository } from './repository.js';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export class RefundService {
  constructor(
    private repo: Repository,
    private classifier: Classifier,
    private now = () => new Date(),
  ) {}

  async submit(
    customerId: string,
    input: { orderId: string; message: string; reason: Reason },
    key: string,
  ): Promise<Refund> {
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(input))
      .digest('hex');
    const replay = this.repo.replay(customerId, key);
    if (replay) {
      if (replay.fingerprint !== fingerprint)
        throw new HttpError(
          409,
          'This request key was already used for different details.',
        );
      return replay.refund;
    }
    const order = this.repo.order(input.orderId);
    if (!order || order.customerId !== customerId)
      throw new HttpError(404, 'Order not found.');
    if (this.repo.refundForOrder(order.id))
      throw new HttpError(
        409,
        'A refund request already exists for this order. Open your request history to view it.',
      );
    const analysis = await this.classifier.classify(
      input.message,
      input.reason,
    );
    const now = this.now();
    const decision = evaluateRefund(order, input.reason, analysis, now);
    const at = now.toISOString();
    const refund: Refund = {
      id: `REF-${randomUUID().slice(0, 8).toUpperCase()}`,
      orderId: order.id,
      customerId,
      message: input.message,
      selectedReason: input.reason,
      analysis,
      decision,
      originalOutcome: decision.outcome,
      amountCents: order.amountCents,
      policyVersion: POLICY_VERSION,
      createdAt: at,
      updatedAt: at,
      audit: [
        {
          at,
          actor: 'customer',
          event: 'REQUEST_RECEIVED',
          note: 'Customer ownership verified; refund amount read from the order record.',
        },
        {
          at,
          actor: analysis.mode,
          event: 'REQUEST_CLASSIFIED',
          note: analysis.summary,
        },
        {
          at,
          actor: 'policy',
          event: 'POLICY_EVALUATED',
          note: `${POLICY_VERSION}: ${decision.code}. ${decision.message}`,
        },
      ],
    };
    try {
      this.repo.insert(refund, key, fingerprint);
    } catch (error) {
      // The database constraint wins even if concurrent requests finish AI analysis together.
      const concurrent = this.repo.replay(customerId, key);
      if (concurrent?.fingerprint === fingerprint) return concurrent.refund;
      if (concurrent || this.repo.refundForOrder(order.id))
        throw new HttpError(
          409,
          'A refund request already exists for this order or request key.',
        );
      throw error;
    }
    return refund;
  }

  review(
    id: string,
    outcome: Exclude<Outcome, 'ESCALATED'>,
    note: string,
  ): Refund {
    if (!this.repo.refund(id))
      throw new HttpError(404, 'Refund request not found.');
    return this.repo.review(id, (current) => {
      if (current.decision.outcome !== 'ESCALATED')
        throw new HttpError(
          409,
          'Only requests awaiting review can be decided.',
        );
      if (outcome === 'APPROVED') {
        const exclusion = hardExclusion(
          this.repo.order(current.orderId)!,
          this.now(),
        );
        if (exclusion) throw new HttpError(409, exclusion.note);
      }
      const at = this.now().toISOString();
      return {
        ...current,
        updatedAt: at,
        decision: {
          ...current.decision,
          outcome,
          code: 'HUMAN_REVIEW',
          message:
            outcome === 'APPROVED'
              ? 'A support specialist approved your request. This demo does not move money.'
              : 'A support specialist reviewed your request and could not approve it. Contact support if you have further evidence.',
        },
        audit: [
          ...current.audit,
          { at, actor: 'support', event: `HUMAN_${outcome}`, note },
        ],
      };
    });
  }
}
