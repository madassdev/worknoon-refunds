import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  ArrowDownLeft,
  Check,
  Clock3,
  KeyRound,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { Outcome, RefundView } from '../shared/types';
import { RequestDetail } from './RequestDetail';
import { api, date, errorMessage, money } from './api';
import { Badge } from './components';

export function SupportDashboard() {
  const [token, setToken] = useState('');
  const [key, setKey] = useState('');
  const [requests, setRequests] = useState<RefundView[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = requests.find((item) => item.id === selectedId);

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      setRequests(await api<RefundView[]>('/support/refunds', token));
      setError('');
    } catch (error) {
      setError(errorMessage(error));
    }
  }, [token]);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  async function login(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      setRequests(await api<RefundView[]>('/support/refunds', key));
      setToken(key);
      setKey('');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function review(outcome: Exclude<Outcome, 'ESCALATED'>) {
    if (!selected || busy) return;
    setBusy(true);
    setError('');
    try {
      const updated = await api<RefundView>(
        `/support/refunds/${selected.id}/review`,
        token,
        { outcome, note },
      );
      setRequests((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNote('');
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const visible = requests.filter(
    (item) =>
      (filter === 'ALL' || item.decision.outcome === filter) &&
      `${item.customer.name} ${item.orderId} ${item.id}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  return (
    <>
      <header className="page-heading compact">
        <div>
          <span className="eyebrow">THE HUMAN SIDE OF SUPPORT</span>
          <h1>Care, at a glance.</h1>
          <p>A clear view of every request, and the decisions behind it.</p>
        </div>
        {token && (
          <button className="secondary-button" onClick={() => void refresh()}>
            <RefreshCw size={15} />
            Refresh
          </button>
        )}
      </header>
      {!token ? (
        <form className="login-panel" onSubmit={login}>
          <span className="icon-tile">
            <KeyRound size={23} />
          </span>
          <h2>Welcome to the support desk</h2>
          <p className="muted">
            Use your support access key to review requests and record decisions.
          </p>
          <label htmlFor="support-key">Support access key</label>
          <input
            id="support-key"
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            required
            autoComplete="current-password"
          />
          <p className="small-text muted">
            Local demo key: <code>demo-support-key</code>. Set SUPPORT_TOKEN to
            change it.
          </p>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" disabled={busy}>
            {busy ? 'Opening desk…' : 'Open support desk'}
          </button>
        </form>
      ) : (
        <>
          <div className="stats-grid">
            {[
              {
                title: 'Total requests',
                value: requests.length,
                icon: ArrowDownLeft,
                sub: 'Across all demo customers',
              },
              {
                title: 'Approved',
                value: requests.filter(
                  (item) => item.decision.outcome === 'APPROVED',
                ).length,
                icon: Check,
                sub: 'Ready for the next step',
              },
              {
                title: 'Needs review',
                value: requests.filter(
                  (item) => item.decision.outcome === 'ESCALATED',
                ).length,
                icon: Clock3,
                sub: 'Waiting for a human decision',
              },
              {
                title: 'Denied',
                value: requests.filter(
                  (item) => item.decision.outcome === 'DENIED',
                ).length,
                icon: X,
                sub: 'Outside the refund policy',
              },
            ].map((stat) => (
              <div className="stat-card" key={stat.title}>
                <div>
                  <span>{stat.title}</span>
                  <stat.icon size={17} />
                </div>
                <strong>{stat.value.toString().padStart(2, '0')}</strong>
                <p>{stat.sub}</p>
              </div>
            ))}
          </div>
          {error && (
            <p className="error-message" role="alert">
              {error}
            </p>
          )}
          <section className="queue-panel">
            <div className="queue-toolbar">
              <div className="filter-tabs" aria-label="Filter requests">
                {[
                  ['ALL', 'All requests'],
                  ['ESCALATED', 'Needs review'],
                  ['APPROVED', 'Approved'],
                  ['DENIED', 'Denied'],
                ].map(([value, label]) => (
                  <button
                    aria-pressed={filter === value}
                    className={filter === value ? 'active' : ''}
                    key={value}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="search-input">
                <Search size={15} />
                <input
                  aria-label="Search requests"
                  placeholder="Find customer or order"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Customer / request</th>
                    <th>Order</th>
                    <th>Amount</th>
                    <th>Decision</th>
                    <th>Received</th>
                    <th>
                      <span className="sr-only">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((item) => (
                    <tr
                      key={item.id}
                      className={selectedId === item.id ? 'selected-row' : ''}
                    >
                      <td>
                        <strong>{item.customer.name}</strong>
                        <span className="table-secondary">{item.id}</span>
                      </td>
                      <td>{item.orderId}</td>
                      <td>{money(item.amountCents)}</td>
                      <td>
                        <Badge outcome={item.decision.outcome} />
                      </td>
                      <td>{date(item.createdAt)}</td>
                      <td>
                        <button
                          className="text-button"
                          onClick={() => {
                            setSelectedId(item.id);
                            setNote('');
                          }}
                        >
                          Open <span className="sr-only">{item.id}</span>↗
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {visible.length === 0 && (
              <div className="empty-state">
                <ShieldCheck size={30} />
                <h3>
                  {requests.length
                    ? 'No matching requests'
                    : 'All quiet at the support desk'}
                </h3>
                <p>
                  {requests.length
                    ? 'Try a different filter or search.'
                    : 'Submit a refund from the customer portal to see it here.'}
                </p>
              </div>
            )}
            <div className="queue-footer">
              <span>
                {visible.length} of {requests.length} requests
              </span>
              <span>Updates every 15 seconds</span>
            </div>
          </section>
          {selected && (
            <RequestDetail
              refund={selected}
              note={note}
              busy={busy}
              onNoteChange={setNote}
              onReview={review}
              onClose={() => setSelectedId('')}
            />
          )}
        </>
      )}
    </>
  );
}
