import {
  Check,
  Clock3,
  Coffee,
  Headphones,
  Shirt,
  X,
  ArrowUpRight,
} from 'lucide-react';
import type { Order, Outcome, RefundView } from '../shared/types';
import { outcomeLabels } from '../shared/types';
import { date, money } from './api';

export function Badge({ outcome }: { outcome: Outcome }) {
  const Icon =
    outcome === 'APPROVED' ? Check : outcome === 'DENIED' ? X : Clock3;
  return (
    <span className={`badge ${outcome.toLowerCase()}`}>
      <Icon size={13} />
      {outcomeLabels[outcome]}
    </span>
  );
}

export function ProductArt({
  category,
  small = false,
}: {
  category: Order['category'];
  small?: boolean;
}) {
  const Icon =
    category === 'tech' ? Headphones : category === 'wear' ? Shirt : Coffee;
  return (
    <div
      aria-hidden="true"
      className={`product-art ${category} ${small ? 'small' : ''}`}
    >
      <div className="art-disc" />
      <Icon strokeWidth={1.1} />
    </div>
  );
}

export function RequestResult({ refund }: { refund: RefundView }) {
  return (
    <section className="result" aria-live="polite">
      <div className="section-heading">
        <span className="eyebrow">YOUR REQUEST · {refund.id}</span>
        <Badge outcome={refund.decision.outcome} />
      </div>
      <h3>
        {refund.decision.outcome === 'APPROVED'
          ? 'We’ll take it from here.'
          : refund.decision.outcome === 'DENIED'
            ? 'Here’s what our policy says.'
            : 'A little human attention.'}
      </h3>
      <p>{refund.decision.message}</p>
      <div className="result-meta">
        <span>{refund.order.product}</span>
        <strong>{money(refund.amountCents)}</strong>
      </div>
      <div className="muted small-text">
        {refund.analysis.mode === 'openai'
          ? 'AI-assisted classification'
          : refund.analysis.mode === 'demo'
            ? 'Offline demo classification'
            : 'AI unavailable · sent for review'}{' '}
        · Policy {refund.policyVersion}
      </div>
      <details>
        <summary>
          How this decision was reached <ArrowUpRight size={14} />
        </summary>
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
      </details>
    </section>
  );
}

export function RequestHistory({
  requests,
  onSelect,
}: {
  requests: RefundView[];
  onSelect: (refund: RefundView) => void;
}) {
  return (
    <section className="history">
      <div className="section-heading">
        <h2>Your requests</h2>
        <span className="muted small-text">{requests.length} total</span>
      </div>
      {requests.length === 0 ? (
        <div className="empty-inline">
          <Clock3 size={21} />
          <div>
            <strong>A fresh start.</strong>
            <p>Your refund requests and their updates will appear here.</p>
          </div>
        </div>
      ) : (
        requests.map((refund) => (
          <button
            className="history-row"
            key={refund.id}
            onClick={() => onSelect(refund)}
          >
            <ProductArt category={refund.order.category} small />
            <span className="history-description">
              <strong>{refund.order.product}</strong>
              <span>
                {refund.id} · {date(refund.createdAt)}
              </span>
            </span>
            <Badge outcome={refund.decision.outcome} />
            <ArrowUpRight size={17} />
          </button>
        ))
      )}
    </section>
  );
}
