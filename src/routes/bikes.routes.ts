// src/routes/bikes.routes.ts
//
// Factory bikes. The point of this route set is the clone: a complete
// bike is a build with every slot filled, so copying its spec into a
// user's Build makes the existing compatibility engine answer "what
// upgrades fit my bike?" with no new rule logic at all.

import { Router } from 'express';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth.middleware';

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

  const bikes = await prisma.bikeModel.findMany({
    where: q
      ? {
          OR: [
            { brand: { contains: q, mode: 'insensitive' } },
            { model: { contains: q, mode: 'insensitive' } },
            { variant: { contains: q, mode: 'insensitive' } },
          ],
        }
      : undefined,
    orderBy: [{ brand: 'asc' }, { model: 'asc' }, { year: 'desc' }],
    take,
    include: { _count: { select: { parts: true } } },
  });

  res.json(bikes);
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
// POST /bikes/:slug/clone — copy the factory spec into a new Build
// owned by the caller. This is what turns "I own this bike" into
// something the compatibility engine can reason about.
// ------------------------------------------------------------
router.post('/:slug/clone', requireAuth, async (req, res) => {
  const bike = await prisma.bikeModel.findUnique({
    where: { slug: req.params.slug },
    include: { parts: true },
  });
  if (!bike) return res.status(404).json({ error: 'Bike not found' });

  const name = req.body?.name ?? `${bike.brand} ${bike.model}${bike.variant ? ` ${bike.variant}` : ''}`;

  const build = await prisma.build.create({
    data: {
      userId: req.user!.userId,
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
