import 'dotenv/config';
import { createApp } from './app.js';
import { createClassifier } from './ai.js';
import { Repository } from './repository.js';

const repo = new Repository(
  process.env.DATABASE_PATH ?? './data/refunds.sqlite',
);
const classifier = createClassifier(
  process.env.OPENAI_API_KEY,
  process.env.OPENAI_MODEL,
);
const app = createApp(
  repo,
  classifier,
  process.env.SUPPORT_TOKEN || 'demo-support-key',
);
const port = Number(process.env.PORT ?? 4311);
const server = app.listen(port, '0.0.0.0', () =>
  console.log(`Refund API on port ${port}; classifier: ${classifier.mode}`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      repo.close();
      process.exit(0);
    }),
  );
