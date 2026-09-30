import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type {
  AppConfig,
  Customer,
  Order,
  Reason,
  RefundView,
} from '../shared/types';
import { reasonLabels } from '../shared/types';
import { api, date, errorMessage, money } from './api';
import { ProductArt, RequestHistory, RequestResult } from './components';

export function CustomerPortal({
  customer,
  config,
}: {
  customer: Customer;
  config: AppConfig;
}) {
  const [token, setToken] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<RefundView[]>([]);
  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState<Reason>('DAMAGED');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<RefundView | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const requestAttempt = useRef<{ body: string; key: string } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    api<{ token: string }>('/demo/session', undefined, {
      customerId: customer.id,
    })
      .then(async (session) => {
        const [nextOrders, nextRequests] = await Promise.all([
          api<Order[]>('/orders', session.token),
          api<RefundView[]>('/refunds', session.token),
        ]);
        if (!active) return;
        setToken(session.token);
        setOrders(nextOrders);
        setRequests(nextRequests);
        setOrderId((current) => current || nextOrders[0]?.id || '');
      })
      .catch((error) => {
        if (active) setError(errorMessage(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customer.id, revision]);

  const selected = orders.find((order) => order.id === orderId);
  const existing = requests.find((request) => request.orderId === orderId);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending || !selected) return;
    setSending(true);
    setError('');
    const body = { orderId, reason, message: message.trim() };
    const serialized = JSON.stringify(body);
    if (requestAttempt.current?.body !== serialized)
      requestAttempt.current = { body: serialized, key: crypto.randomUUID() };
    try {
      const refund = await api<RefundView>(
        '/refunds',
        token,
        body,
        requestAttempt.current.key,
      );
      setResult(refund);
      setRequests((current) => [
        refund,
        ...current.filter((item) => item.id !== refund.id),
      ]);
      requestAttempt.current = null;
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
          }),
        50,
      );
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">A LITTLE CARE GOES A LONG WAY</span>
          <h1>
            Your order.
            <br />
            <span>Our attention.</span>
          </h1>
          <p>Something not quite right? Let’s make it right, together.</p>
        </div>
        <div className="heading-stamp">
          <ShieldCheck size={25} />
          <span>
            Clear policies.
            <br />
            Thoughtful decisions.
          </span>
        </div>
      </header>
      <div className="customer-layout">
        <div>
          <div className="section-heading">
            <h2>1. Choose your order</h2>
            <button
              className="text-button"
              onClick={() => setRevision((value) => value + 1)}
              disabled={loading || sending}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
          {loading ? (
            <div className="loading-state">
              <LoaderCircle className="spin" />
              Loading your orders…
            </div>
          ) : (
            <div className="order-grid">
              {orders.map((order) => (
                <button
                  key={order.id}
                  className={`order-card ${order.id === orderId ? 'selected' : ''}`}
                  disabled={sending}
                  onClick={() => {
                    setOrderId(order.id);
                    setResult(null);
                    setError('');
                  }}
                  aria-pressed={order.id === orderId}
                >
                  <ProductArt category={order.category} />
                  <span className="selection-dot">
                    {order.id === orderId && <Check size={12} />}
                  </span>
                  <div className="order-card-body">
                    <span className="order-number">{order.id}</span>
                    <h3>{order.product}</h3>
                    <div className="order-price">
                      <strong>{money(order.amountCents)}</strong>
                      <span
                        className={`order-label ${order.finalSale ? 'final-sale' : ''}`}
                      >
                        {order.finalSale
                          ? 'Final sale'
                          : order.status === 'IN_TRANSIT'
                            ? 'In transit'
                            : order.status === 'REFUNDED'
                              ? 'Refunded'
                              : 'Delivered'}
                      </span>
                    </div>
                    <p>
                      {order.deliveredAt
                        ? `Delivered ${date(order.deliveredAt)}`
                        : `Ordered ${date(order.orderedAt)}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
          <RequestHistory
            requests={requests}
            onSelect={(refund) => {
              setResult(refund);
              setOrderId(refund.orderId);
            }}
          />
          <div className="care-note">
            <ShieldCheck size={20} />
            <p>
              <strong>Fair by design.</strong> Every request follows the same
              policy. When something needs a closer look, a person steps in.
            </p>
          </div>
        </div>
        <div className="request-column">
          <form className="request-panel" onSubmit={submit}>
            <div className="section-heading">
              <h2>2. Tell us what happened</h2>
              <span className="icon-tile">
                <Sparkles size={17} />
              </span>
            </div>
            <p className="muted intro">
              A few details help us find the right next step.
            </p>
            <label htmlFor="reason">What’s the reason?</label>
            <select
              id="reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value as Reason);
                setResult(null);
              }}
              disabled={sending || !!existing}
            >
              {Object.entries(reasonLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label htmlFor="message">Tell us a little more</label>
            <textarea
              id="message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              minLength={12}
              maxLength={2000}
              required
              placeholder="For example: My mug arrived with a crack along the handle. The packaging was damaged too."
              disabled={sending || !!existing}
            />
            <div className="input-help">
              <span>Please include at least 12 characters.</span>
              <span>{message.length}/2,000</span>
            </div>
            <div className="refund-total">
              <span>Requested refund</span>
              <strong>{selected ? money(selected.amountCents) : '—'}</strong>
            </div>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
            {existing ? (
              <button
                className="primary-button"
                type="button"
                onClick={() => setResult(existing)}
              >
                View existing request <ArrowUpRight size={17} />
              </button>
            ) : (
              <button
                className="primary-button"
                type="submit"
                disabled={
                  sending || loading || !selected || message.trim().length < 12
                }
              >
                {sending ? (
                  <>
                    <LoaderCircle className="spin" size={18} />
                    Reviewing your request…
                  </>
                ) : (
                  <>
                    Submit refund request <ArrowRight size={17} />
                  </>
                )}
              </button>
            )}
            <p className="form-footnote">
              <ShieldCheck size={13} />
              {config.aiMode === 'openai'
                ? 'AI-assisted. Policy-checked. Human support when needed.'
                : 'Offline demo · no AI service connected.'}
            </p>
          </form>
          <div ref={resultRef}>
            {result && <RequestResult refund={result} />}
          </div>
          <div className="policy-summary">
            <span className="eyebrow">THE SHORT VERSION</span>
            <div>
              <strong>30 days</strong>
              <span>from delivery</span>
              <strong>$500+</strong>
              <span>human review</span>
            </div>
            <p>
              Final sale items are excluded. All amounts are USD. This is a
              synthetic demo; no payments are processed.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
