import type { Customer, Order } from '../shared/types.js';

const names = [
  'Alex Morgan',
  'Jamie Chen',
  'Sam Rivera',
  'Jordan Ellis',
  'Taylor Brooks',
  'Riley Patel',
  'Casey Park',
  'Avery James',
  'Quinn Davis',
  'Drew Okafor',
  'Robin Lee',
  'Charlie Wilson',
  'Emery Scott',
  'Finley Thomas',
  'Sage Lewis',
];
const products: {
  product: string;
  category: Order['category'];
  amountCents: number;
}[] = [
  { product: 'Everyday ceramic mug', category: 'home', amountCents: 3800 },
  {
    product: 'Studio wireless headphones',
    category: 'tech',
    amountCents: 18900,
  },
  { product: 'Linen weekend shirt', category: 'wear', amountCents: 7400 },
  { product: 'Arc reading lamp', category: 'home', amountCents: 12800 },
  { product: 'Pro mechanical keyboard', category: 'tech', amountCents: 14900 },
];

export function makeSeed(now = new Date()): {
  customers: Customer[];
  orders: Order[];
} {
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 86_400_000).toISOString();
  const customers = names.map((name, i) => ({
    id: `customer-${i + 1}`,
    name,
    email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
  }));
  const orders = customers.flatMap((customer, i) =>
    [0, 1].map((j): Order => ({
      id: `ORD-${1001 + i * 2 + j}`,
      customerId: customer.id,
      ...products[(i + j) % products.length],
      currency: 'USD',
      orderedAt: daysAgo(9 + j * 5),
      deliveredAt: daysAgo(6 + j * 5),
      finalSale: false,
      status: 'DELIVERED',
    })),
  );
  // Predictable scenarios for a reviewer; dates are relative to the first database seed.
  Object.assign(orders[1], { finalSale: true });
  Object.assign(orders[2], {
    product: 'Studio display 27-inch',
    amountCents: 74900,
    category: 'tech',
  });
  Object.assign(orders[4], {
    orderedAt: daysAgo(49),
    deliveredAt: daysAgo(45),
  });
  Object.assign(orders[6], { status: 'IN_TRANSIT', deliveredAt: null });
  Object.assign(orders[8], { status: 'REFUNDED' });
  Object.assign(orders[10], {
    product: 'Desk essentials bundle',
    amountCents: 50000,
  });
  return { customers, orders };
}
