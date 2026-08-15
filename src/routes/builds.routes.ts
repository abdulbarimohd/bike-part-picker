// src/routes/builds.routes.ts
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { requireAuth, attachUserIfPresent } from '../middleware/auth.middleware';
import { loadBuildFromDb } from '../services/build.service';
import { getCompatibilityWarnings, isBuildCompatible } from '../compatibility/engine';

const router = Router();

// ------------------------------------------------------------
// POST /builds — create a new (empty) build for the logged-in user
// ------------------------------------------------------------
router.post('/', requireAuth, async (req, res) => {
  const build = await prisma.build.create({
    data: {
      userId: req.user!.userId,
      name: req.body?.name ?? 'Untitled Build',
    },
  });
  res.status(201).json(build);
});

// ------------------------------------------------------------
// GET /builds/mine — every build owned by the logged-in user
// ------------------------------------------------------------
router.get('/mine', requireAuth, async (req, res) => {
  const builds = await prisma.build.findMany({
    where: { userId: req.user!.userId },
    orderBy: { updatedAt: 'desc' },
    include: { buildParts: { include: { part: true } } },
  });
  res.json(builds);
});

// ------------------------------------------------------------
// GET /builds/:id — view a build. Public builds are viewable by
// anyone; private builds only by their owner.
// ------------------------------------------------------------
router.get('/:id', attachUserIfPresent, async (req, res) => {
  const build = await prisma.build.findUnique({
    where: { id: req.params.id },
    include: {
      buildParts: { include: { part: true } },
      // The factory spec travels with the build so the upgrade view can
      // compare against it. Deriving "stock" from the first page load
      // instead breaks the moment the user navigates away and back.
      basedOnModel: { include: { parts: { include: { part: true } } } },
    },
  });

  if (!build) return res.status(404).json({ error: 'Build not found' });
  if (!build.isPublic && build.userId !== req.user?.userId) {
    return res.status(403).json({ error: 'This build is private' });
  }

  res.json({ ...build, isOwner: build.userId === req.user?.userId });
});

// ------------------------------------------------------------
// PATCH /builds/:id — rename or toggle public/private. Owner only.
// ------------------------------------------------------------
router.patch('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Build not found' });
  if (existing.userId !== req.user!.userId) return res.status(403).json({ error: 'Not your build' });

  const { name, isPublic, riderHeightCm, riderInseamCm, riderWeightKg } = req.body ?? {};
  const updated = await prisma.build.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(isPublic !== undefined && { isPublic }),
      // Rider measurements drive the advisory fit rules (R-FIT-*).
      // Explicit null clears them; undefined leaves them untouched.
      ...(riderHeightCm !== undefined && { riderHeightCm }),
      ...(riderInseamCm !== undefined && { riderInseamCm }),
      ...(riderWeightKg !== undefined && { riderWeightKg }),
    },
  });
  res.json(updated);
});

// ------------------------------------------------------------
// DELETE /builds/:id — owner only
// ------------------------------------------------------------
router.delete('/:id', requireAuth, async (req, res) => {
  const existing = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Build not found' });
  if (existing.userId !== req.user!.userId) return res.status(403).json({ error: 'Not your build' });

  await prisma.build.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ------------------------------------------------------------
// PUT /builds/:id/parts/:partId — add or replace the part in
// whatever slot its PartType occupies. Owner only.
// ------------------------------------------------------------
router.put('/:id/parts/:partId', requireAuth, async (req, res) => {
  const build = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!build) return res.status(404).json({ error: 'Build not found' });
  if (build.userId !== req.user!.userId) return res.status(403).json({ error: 'Not your build' });

  const part = await prisma.part.findUnique({ where: { id: req.params.partId } });
  if (!part) return res.status(404).json({ error: 'Part not found' });

  const quantity = Number(req.body?.quantity ?? 1);
  // `slot` names which end a paired part goes on ('front'/'rear' for
  // tyres, tubes and rotors). Null for single-slot categories.
  const slot = typeof req.body?.slot === 'string' ? req.body.slot : null;

  // One occupant per slot: swapping the front tyre replaces whatever
  // was on the front, and leaves the rear alone. Matching on
  // (slot, part.type) rather than partId is what allows the same tyre
  // model to sit at both ends.
  const sameSlot = await prisma.buildPart.findMany({
    where: { buildId: req.params.id, slot, part: { type: part.type } },
  });
  for (const existing of sameSlot) {
    if (existing.partId !== req.params.partId) {
      await prisma.buildPart.delete({ where: { id: existing.id } });
    }
  }

  // Not an upsert: the compound key includes a nullable `slot`, which
  // Postgres treats as distinct rather than equal, so upsert can't
  // reliably match an existing row.
  //
  // The find-then-branch above isn't atomic, so two concurrent PUTs for
  // the same new (buildId, partId, slot) can both read "no existing row"
  // and both attempt `create` -- the loser then violates the
  // @@unique([buildId, partId, slot]) constraint. Same race shape as the
  // one fixed in auth.routes.ts registration; same fix here: catch the
  // constraint violation and retry as an update rather than let it fall
  // through to a raw 500 (not reproduced under 20 parallel local requests
  // in this environment, but the code was unsound regardless of whether
  // the window happened to be hit).
  const existing = sameSlot.find((bp) => bp.partId === req.params.partId);
  let buildPart;
  if (existing) {
    buildPart = await prisma.buildPart.update({ where: { id: existing.id }, data: { quantity, slot } });
  } else {
    try {
      buildPart = await prisma.buildPart.create({
        data: { buildId: req.params.id, partId: req.params.partId, quantity, slot },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const winner = await prisma.buildPart.findFirst({
          where: { buildId: req.params.id, partId: req.params.partId, slot },
        });
        if (!winner) throw err; // genuinely unexpected; don't swallow it
        buildPart = await prisma.buildPart.update({ where: { id: winner.id }, data: { quantity, slot } });
      } else {
        throw err;
      }
    }
  }

  res.status(201).json(buildPart);
});

// ------------------------------------------------------------
// DELETE /builds/:id/parts/:partId — remove a part from a build
// ------------------------------------------------------------
router.delete('/:id/parts/:partId', requireAuth, async (req, res) => {
  const build = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!build) return res.status(404).json({ error: 'Build not found' });
  if (build.userId !== req.user!.userId) return res.status(403).json({ error: 'Not your build' });

  await prisma.buildPart.deleteMany({ where: { buildId: req.params.id, partId: req.params.partId } });
  res.status(204).send();
});

// ------------------------------------------------------------
// GET /builds/:id/validate — run the compatibility engine
// against the build's current parts. This is what the frontend
// polls after every add/remove to refresh the warning banner.
// ------------------------------------------------------------
router.get('/:id/validate', attachUserIfPresent, async (req, res) => {
  const buildRow = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!buildRow) return res.status(404).json({ error: 'Build not found' });
  if (!buildRow.isPublic && buildRow.userId !== req.user?.userId) {
    return res.status(403).json({ error: 'This build is private' });
  }

  const build = await loadBuildFromDb(String(req.params.id));
  const warnings = getCompatibilityWarnings(build);

  res.json({
    compatible: isBuildCompatible(build),
    warnings,
  });
});

export default router;
