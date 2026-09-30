import express, {
  type ErrorRequestHandler,
  type RequestHandler,
} from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Classifier } from './ai.js';
import type { Repository } from './repository.js';
import { RefundService, HttpError } from './refunds.js';
import { POLICY_VERSION } from './policy.js';

const requestSchema = z
  .object({
    orderId: z.string().max(50),
    reason: z.enum(['DAMAGED', 'WRONG_ITEM', 'CHANGED_MIND', 'OTHER']),
    message: z.string().trim().min(12).max(2000),
  })
  .strict();
const reviewSchema = z
  .object({
    outcome: z.enum(['APPROVED', 'DENIED']),
    note: z.string().trim().min(12).max(1000),
  })
  .strict();

export function createApp(
  repo: Repository,
  classifier: Classifier,
  supportToken: string,
  now = () => new Date(),
) {
  const app = express();
  const service = new RefundService(repo, classifier, now);
  const signingKey = randomBytes(32);
  const sign = (customerId: string) =>
    createHmac('sha256', signingKey).update(customerId).digest('hex');
  const equal = (a: string, b: string) => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  };
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb' }));
  app.use('/api', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(
    '/api',
    rateLimit({
      windowMs: 60_000,
      limit: 180,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Too many requests. Please try again shortly.' },
    }),
  );
  const mutationLimit = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: {
      error: 'Please wait a moment before submitting another request.',
    },
  });
  const support: RequestHandler = (req, _res, next) => {
    const token = req.get('authorization')?.replace(/^Bearer /, '') ?? '';
    if (!equal(token, supportToken))
      return next(new HttpError(401, 'Enter a valid support access key.'));
    next();
  };
  const customer: RequestHandler = (req, res, next) => {
    const token = req.get('authorization')?.replace(/^Bearer /, '') ?? '';
    const [id, signature] = token.split('.');
    if (!id || !signature || !equal(signature, sign(id)) || !repo.customer(id))
      return next(new HttpError(401, 'Please choose a demo customer again.'));
    res.locals.customerId = id;
    next();
  };

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/config', (_req, res) =>
    res.json({
      aiMode: classifier.mode,
      policyVersion: POLICY_VERSION,
      demo: true,
    }),
  );
  app.get('/api/demo/customers', (_req, res) => res.json(repo.customers()));
  // Deliberately public impersonation of synthetic customers for this local assessment.
  app.post('/api/demo/session', (req, res) => {
    const { customerId } = z
      .object({ customerId: z.string() })
      .strict()
      .parse(req.body);
    if (!repo.customer(customerId))
      throw new HttpError(404, 'Demo customer not found.');
    res.json({ token: `${customerId}.${sign(customerId)}` });
  });
  app.get('/api/orders', customer, (_req, res) =>
    res.json(repo.orders(res.locals.customerId)),
  );
  app.get('/api/refunds', customer, (_req, res) =>
    res.json(
      repo.list(res.locals.customerId).map((refund) => repo.view(refund)),
    ),
  );
  app.post('/api/refunds', customer, mutationLimit, async (req, res) => {
    const input = requestSchema.parse(req.body);
    const key = z.string().uuid().parse(req.get('idempotency-key'));
    const refund = await service.submit(res.locals.customerId, input, key);
    res.status(201).json(repo.view(refund));
  });
  app.get('/api/support/refunds', support, (_req, res) =>
    res.json(repo.list().map((refund) => repo.view(refund))),
  );
  app.post(
    '/api/support/refunds/:id/review',
    support,
    mutationLimit,
    (req, res) => {
      const input = reviewSchema.parse(req.body);
      res.json(
        repo.view(
          service.review(String(req.params.id), input.outcome, input.note),
        ),
      );
    },
  );
  app.use('/api', (_req, _res, next) =>
    next(new HttpError(404, 'Endpoint not found.')),
  );
  const errors: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error:
          'Check your input. A valid order, reason and 12–2,000 character message are required; reviews need a note of at least 12 characters.',
      });
      return;
    }
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message });
      return;
    }
    if (
      error?.type === 'entity.parse.failed' ||
      error?.type === 'entity.too.large'
    ) {
      res
        .status(error.status)
        .json({ error: 'The request body is invalid or too large.' });
      return;
    }
    console.error(
      'Request failed:',
      error instanceof Error ? error.name : 'Unknown error',
    );
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  };
  app.use(errors);
  return app;
}
