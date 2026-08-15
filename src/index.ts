// src/index.ts
//
// NOTE: `express-async-errors` must be imported before the routers.
// Express 4 does not catch rejected promises from async handlers — an
// unhandled rejection kills the process, so any database error in any
// route took the whole API down rather than returning a 500. This
// patches Router so those rejections reach the error handler below.
import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import partsRoutes from './routes/parts.routes';
import buildsRoutes from './routes/builds.routes';
import bikesRoutes from './routes/bikes.routes';
import stockAlertsRoutes from './routes/stockAlerts.routes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/parts', partsRoutes);
app.use('/builds', buildsRoutes);
app.use('/bikes', bikesRoutes);
app.use('/stock-alerts', stockAlertsRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Every route in this API returns {"error": "..."} JSON on failure --
// an unmatched route (e.g. an unregistered /parts/<slug>) used to fall
// through to Express's built-in 404, which is plain HTML
// ("Cannot GET /parts/widgets") rather than that JSON shape. A frontend
// that generically parses {error} from any non-2xx response broke on
// this one path. Must sit after every real route and before the error
// handler.
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Centralized error handler — catches anything thrown/rejected
// inside a route that wasn't already caught, so the API returns
// JSON instead of an HTML stack trace.
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // eslint-disable-next-line no-console
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT ?? 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Bike PartPicker API listening on :${PORT}`);
});
