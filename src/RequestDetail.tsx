import { Check, X } from 'lucide-react';
import type { Outcome, RefundView } from '../shared/types';
import { reasonLabels } from '../shared/types';
import { money } from './api';
import { Badge } from './components';

type Props = {
  refund: RefundView;
  note: string;
  busy: boolean;
  onNoteChange: (note: string) => void;
  onReview: (outcome: Exclude<Outcome, 'ESCALATED'>) => void;
  onClose: () => void;
};

export function RequestDetail({
  refund,
  note,
  busy,
  onNoteChange,
  onReview,
  onClose,
}: Props) {
  return (
    <section className="detail-panel">
      <div className="section-heading">
        <div>
          <span className="eyebrow">REQUEST DETAILS</span>
          <h2>
            {refund.id} <span className="muted">/ {refund.customer.name}</span>
          </h2>
        </div>
        <button
          aria-label="Close request details"
          className="icon-button"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </div>
      <div className="detail-grid">
        <div>
          <Badge outcome={refund.decision.outcome} />
          <h3>
            {refund.order.product} · {money(refund.amountCents)}
          </h3>
          <span className="eyebrow">CUSTOMER’S WORDS</span>
          <blockquote>{refund.message}</blockquote>
          <p className="small-text muted">
            Selected reason: {reasonLabels[refund.selectedReason]}
          </p>
          <div className="analysis-note">
            <strong>
              {refund.analysis.mode === 'openai'
                ? 'AI classification'
                : refund.analysis.mode === 'demo'
                  ? 'Offline demo classification'
                  : 'AI unavailable'}
            </strong>
            <p>{refund.analysis.summary}</p>
            <span>
              {refund.analysis.reason} · Confidence{' '}
              {Math.round(refund.analysis.confidence * 100)}%
              {refund.analysis.model ? ` · ${refund.analysis.model}` : ''}
            </span>
          </div>
          <p className="small-text muted">
            Classification is decision support, not verified evidence. Customer
            and AI text are untrusted.
          </p>
          {refund.decision.outcome === 'ESCALATED' && (
            <div className="review-form">
              <label htmlFor="review-note">Review note</label>
              <textarea
                id="review-note"
                placeholder="Record what you checked and why this decision is appropriate…"
                value={note}
                onChange={(event) => onNoteChange(event.target.value)}
                minLength={12}
                maxLength={1000}
              />
              <p className="small-text muted">
                At least 12 characters. Your decision and note will be added to
                the audit trail.
              </p>
              <div className="review-actions">
                <button
                  className="primary-button"
                  disabled={busy || note.trim().length < 12}
                  onClick={() => onReview('APPROVED')}
                >
                  <Check size={16} />
                  Approve
                </button>
                <button
                  className="secondary-button"
                  disabled={busy || note.trim().length < 12}
                  onClick={() => onReview('DENIED')}
                >
                  <X size={16} />
                  Deny
                </button>
              </div>
            </div>
          )}
        </div>
        <div>
          <span className="eyebrow">
            POLICY CHECKS · {refund.policyVersion}
          </span>
          <ul className="checks">
            {refund.decision.checks.map((check) => (
              <li key={check.code}>
                <span className={check.passed ? 'check-pass' : 'check-review'}>
                  {check.passed ? '✓' : '–'}
                </span>
                {check.note}
              </li>
            ))}
          </ul>
          <span className="eyebrow">AUDIT TRAIL</span>
          <ol className="audit-timeline">
            {refund.audit.map((entry, i) => (
              <li key={i}>
                <strong>
                  {entry.event.replaceAll('_', ' ').toLowerCase()}
                </strong>
                <span>
                  {entry.actor} · {new Date(entry.at).toLocaleTimeString()}
                </span>
                <p>{entry.note}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
