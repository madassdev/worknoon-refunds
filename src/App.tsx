import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  CircleHelp,
  Headset,
  Leaf,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import type { AppConfig, Customer } from '../shared/types';
import { api, errorMessage } from './api';
import { CustomerPortal } from './CustomerPortal';
import { SupportDashboard } from './SupportDashboard';

export function App() {
  const [page, setPage] = useState<'customer' | 'support' | 'policy'>(
    'customer',
  );
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api<Customer[]>('/demo/customers'), api<AppConfig>('/config')])
      .then(([people, settings]) => {
        setCustomers(people);
        setCustomerId(people[0]?.id ?? '');
        setConfig(settings);
      })
      .catch((error) => setError(errorMessage(error)));
  }, []);
  const customer = customers.find((item) => item.id === customerId);
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          href="#"
          className="brand"
          onClick={(event) => {
            event.preventDefault();
            setPage('customer');
          }}
        >
          <span className="brand-mark">
            <RotateCcw size={22} />
          </span>
          returnly<span className="brand-period">.</span>
        </a>
        <div className="workspace-tag">THE CUSTOMER CARE WORKSPACE</div>
        <nav aria-label="Main navigation">
          {[
            {
              id: 'customer' as const,
              label: 'Customer portal',
              icon: ShoppingBag,
            },
            { id: 'support' as const, label: 'Support desk', icon: Headset },
            { id: 'policy' as const, label: 'Refund policy', icon: BookOpen },
          ].map((item) => (
            <button
              key={item.id}
              aria-current={page === item.id ? 'page' : undefined}
              className={page === item.id ? 'active' : ''}
              onClick={() => setPage(item.id)}
            >
              <item.icon size={18} />
              {item.label}
              {page === item.id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="thoughtful-card">
            <Leaf size={24} />
            <h3>
              Good support
              <br />
              starts with care.
            </h3>
            <p>
              Technology for the routine.
              <br />
              People for the moments
              <br />
              that matter.
            </p>
          </div>
          <div className="build-label">
            <span />
            WORKNOON ASSESSMENT <ArrowUpRight size={12} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>
              {page === 'customer'
                ? 'Customer portal'
                : page === 'support'
                  ? 'Support desk'
                  : 'Refund policy'}
            </strong>
          </div>
          <div className="topbar-right">
            <span
              className={`mode-label ${config?.aiMode === 'openai' ? 'live' : ''}`}
            >
              <span />
              {config?.aiMode === 'openai' ? 'OpenAI mode' : 'Offline demo'}
            </span>
            <span className="topbar-divider" />
            <div className="avatar">
              {customer?.name
                .split(' ')
                .map((part) => part[0])
                .join('') ?? 'AM'}
            </div>
            <div className="customer-switch">
              <label htmlFor="customer-select">DEMO CUSTOMER</label>
              <select
                id="customer-select"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
              >
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>
        <main>
          {error ? (
            <div className="error-message" role="alert">
              {error}{' '}
              <button className="text-button" onClick={() => location.reload()}>
                Try again
              </button>
            </div>
          ) : !config || !customer ? (
            <p className="loading-state">Opening your workspace…</p>
          ) : page === 'customer' ? (
            <CustomerPortal
              key={customerId}
              customer={customer}
              config={config}
            />
          ) : page === 'support' ? (
            <SupportDashboard />
          ) : (
            <PolicyPage />
          )}
        </main>
        <footer className="page-footer">
          <span>Made for the moments after checkout.</span>
          <span>
            <CircleHelp size={13} />
            Synthetic data · No real refunds
          </span>
        </footer>
      </div>
    </div>
  );
}

function PolicyPage() {
  return (
    <>
      <header className="page-heading compact">
        <div>
          <span className="eyebrow">NO FINE PRINT, JUST CLARITY</span>
          <h1>A fair return.</h1>
          <p>One policy. Consistent decisions. A human when it matters.</p>
        </div>
      </header>
      <section className="policy-page">
        {[
          [
            '01',
            'A 30-day window',
            'Requests are eligible up to exactly 30 × 24 hours after recorded delivery. Older orders are denied. Orders without confirmed delivery go to support.',
          ],
          [
            '02',
            'Final means final',
            'Final-sale items and orders already refunded are not eligible. These exclusions also apply to human approvals.',
          ],
          [
            '03',
            'A thoughtful review above $500',
            'Eligible requests above $500 require human review. Exactly $500 remains within the automatic limit. Amounts come from the order database and are stored as integer USD cents.',
          ],
          [
            '04',
            'Tell us what happened',
            'Damaged items, incorrect items and changes of mind can qualify within the window. Unclear reasons, conflicting details, suspected policy manipulation or unavailable AI classification go to a support specialist.',
          ],
          [
            '05',
            'One request, a complete history',
            'Each order has one refund request. Repeated submissions cannot create another approval. Support decisions retain the original automated result and append a review note.',
          ],
          [
            '06',
            'An honest demo',
            'All customers and orders are fictional. Approval records eligibility only; this app does not issue payments, verify physical damage or arrange shipping. Customer switching and the default support key are for local evaluation, not production authentication.',
          ],
        ].map(([number, title, text]) => (
          <article key={number}>
            <span>{number}</span>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
