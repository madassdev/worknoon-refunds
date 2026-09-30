import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Customer, Order, Refund, RefundView } from '../shared/types.js';
import { makeSeed } from './seed.js';

export class Repository {
  private db: DatabaseSync;

  constructor(path = ':memory:', now = new Date()) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, customer_id TEXT NOT NULL REFERENCES customers(id), data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS refunds (
        id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE REFERENCES orders(id),
        customer_id TEXT NOT NULL REFERENCES customers(id), request_key TEXT NOT NULL,
        fingerprint TEXT NOT NULL, data TEXT NOT NULL,
        UNIQUE(customer_id, request_key)
      );
    `);
    this.transaction(() => {
      const count = this.db
        .prepare('SELECT count(*) AS n FROM customers')
        .get() as { n: number };
      if (count.n) return;
      const seed = makeSeed(now);
      for (const customer of seed.customers)
        this.db
          .prepare('INSERT INTO customers VALUES (?, ?)')
          .run(customer.id, JSON.stringify(customer));
      for (const order of seed.orders)
        this.db
          .prepare('INSERT INTO orders VALUES (?, ?, ?)')
          .run(order.id, order.customerId, JSON.stringify(order));
    });
  }

  private transaction<T>(run: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = run();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private decode<T>(row: unknown): T | undefined {
    return row ? (JSON.parse((row as { data: string }).data) as T) : undefined;
  }
  customers(): Customer[] {
    return this.db
      .prepare('SELECT data FROM customers ORDER BY rowid')
      .all()
      .map((row) => this.decode<Customer>(row)!);
  }
  customer(id: string): Customer | undefined {
    return this.decode(
      this.db.prepare('SELECT data FROM customers WHERE id = ?').get(id),
    );
  }
  orders(customerId: string): Order[] {
    return this.db
      .prepare('SELECT data FROM orders WHERE customer_id = ? ORDER BY id')
      .all(customerId)
      .map((row) => this.decode<Order>(row)!);
  }
  order(id: string): Order | undefined {
    return this.decode(
      this.db.prepare('SELECT data FROM orders WHERE id = ?').get(id),
    );
  }
  refund(id: string): Refund | undefined {
    return this.decode(
      this.db.prepare('SELECT data FROM refunds WHERE id = ?').get(id),
    );
  }
  refundForOrder(id: string): Refund | undefined {
    return this.decode(
      this.db.prepare('SELECT data FROM refunds WHERE order_id = ?').get(id),
    );
  }
  replay(
    customerId: string,
    key: string,
  ): { refund: Refund; fingerprint: string } | undefined {
    const row = this.db
      .prepare(
        'SELECT data, fingerprint FROM refunds WHERE customer_id = ? AND request_key = ?',
      )
      .get(customerId, key) as
      { data: string; fingerprint: string } | undefined;
    return row
      ? { refund: JSON.parse(row.data), fingerprint: row.fingerprint }
      : undefined;
  }
  list(customerId?: string): Refund[] {
    const rows = customerId
      ? this.db
          .prepare(
            'SELECT data FROM refunds WHERE customer_id = ? ORDER BY rowid DESC',
          )
          .all(customerId)
      : this.db.prepare('SELECT data FROM refunds ORDER BY rowid DESC').all();
    return rows.map((row) => this.decode<Refund>(row)!);
  }
  view(refund: Refund): RefundView {
    return {
      ...refund,
      order: this.order(refund.orderId)!,
      customer: this.customer(refund.customerId)!,
    };
  }
  insert(refund: Refund, requestKey: string, fingerprint: string): void {
    this.db
      .prepare('INSERT INTO refunds VALUES (?, ?, ?, ?, ?, ?)')
      .run(
        refund.id,
        refund.orderId,
        refund.customerId,
        requestKey,
        fingerprint,
        JSON.stringify(refund),
      );
  }
  review(id: string, update: (current: Refund) => Refund): Refund {
    return this.transaction(() => {
      const current = this.refund(id);
      if (!current) throw new Error('Refund not found');
      const next = update(current);
      this.db
        .prepare('UPDATE refunds SET data = ? WHERE id = ?')
        .run(JSON.stringify(next), id);
      return next;
    });
  }
  close(): void {
    this.db.close();
  }
}
