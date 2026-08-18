// src/routes/bikes.routes.ts
//
// Factory bikes. The point of this route set is the clone: a complete
// bike is a build with every slot filled, so copying its spec into a
// user's Build makes the existing compatibility engine answer "what
// upgrades fit my bike?" with no new rule logic at all.

import { Router } from 'express';
import { prisma } from '../prisma/client';
import { attachUserIfPresent } from '../middleware/auth.middleware';

const router = Router();

const MODEL_PARTS_INCLUDE = {
  parts: {
    include: { part: true },
  },
} as const;

// ------------------------------------------------------------
// GET /bikes?q=fuel — typeahead search across brand/model/variant
// ------------------------------------------------------------
router.get('/', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const take = Math.min(Number(req.query.limit) || 25, 50);
  const skip = Math.max(Number(req.query.offset) || 0, 0);

  const where = q
    ? {
        OR: [
          { brand: { contains: q, mode: 'insensitive' as const } },
          { model: { contains: q, mode: 'insensitive' as const } },
          { variant: { contains: q, mode: 'insensitive' as const } },
        ],
      }
    : undefined;

  // Alphabetical order means an unfiltered browse used to silently
  // truncate after the first `take` rows (Cannondale alone fills 25,
  // hiding every Canyon/Trek bike) with no way for the client to know
  // more existed -- `total` lets the frontend offer "load more" instead.
  const [bikes, total] = await Promise.all([
    prisma.bikeModel.findMany({
      where,
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { year: 'desc' }],
      take,
      skip,
      include: { _count: { select: { parts: true } } },
    }),
    prisma.bikeModel.count({ where }),
  ]);

  res.json({ items: bikes, total });
});

// ------------------------------------------------------------
// GET /bikes/:slug — the full factory spec
// ------------------------------------------------------------
router.get('/:slug', async (req, res) => {
  const bike = await prisma.bikeModel.findUnique({
    where: { slug: req.params.slug },
    include: MODEL_PARTS_INCLUDE,
  });
  if (!bike) return res.status(404).json({ error: 'Bike not found' });
  res.json(bike);
});

// ------------------------------------------------------------
// POST /bikes/:slug/clone — copy the factory spec into a new Build.
// Works logged out too, same as POST /builds — the resulting Build
// is anonymous until POST /builds/:id/claim attaches it to an
// account, so "I own this bike" doesn't require creating one first.
// ------------------------------------------------------------
router.post('/:slug/clone', attachUserIfPresent, async (req, res) => {
  const bike = await prisma.bikeModel.findUnique({
    where: { slug: req.params.slug },
    include: { parts: true },
  });
  if (!bike) return res.status(404).json({ error: 'Bike not found' });

  const name = req.body?.name ?? `${bike.brand} ${bike.model}${bike.variant ? ` ${bike.variant}` : ''}`;

  const build = await prisma.build.create({
    data: {
      userId: req.user?.userId ?? null,
      name,
      basedOnModelId: bike.id,
      buildParts: {
        create: bike.parts.map((p) => ({ partId: p.partId, slot: p.slot, quantity: 1 })),
      },
    },
    include: { buildParts: { include: { part: true } } },
  });

  res.status(201).json(build);
});

// ------------------------------------------------------------
// GET /bikes/:slug/stock — the stock spec keyed by slot, so the
// upgrade view can show "what it came with" beside "what you picked"
// without re-deriving it client-side.
// ------------------------------------------------------------
router.get('/:slug/stock', async (req, res) => {
  const bike = await prisma.bikeModel.findUnique({
    where: { slug: req.params.slug },
    include: MODEL_PARTS_INCLUDE,
  });
  if (!bike) return res.status(404).json({ error: 'Bike not found' });

  res.json({
    slug: bike.slug,
    parts: bike.parts.map((p) => ({ partId: p.partId, slot: p.slot, part: p.part })),
  });
});

export default router;
