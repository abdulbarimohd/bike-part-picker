// src/routes/builds.routes.ts
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { requireAuth, attachUserIfPresent } from '../middleware/auth.middleware';
import { loadBuildFromDb } from '../services/build.service';
import { getCompatibilityWarnings, isBuildCompatible } from '../compatibility/engine';

const router = Router();

/**
 * A build with no owner (userId null) is a guest build — anyone who
 * has its id can view and edit it, the same trust model as a shopping
 * cart identified by an unguessable URL. Once owned, only the owner
 * can. Used everywhere a route currently does
 * `build.userId !== req.user?.userId`, which would otherwise reject
 * a guest's own build (null !== undefined is true).
 */
function canAccess(build: { userId: string | null }, req: { user?: { userId: string } }): boolean {
  return build.userId === null || build.userId === req.user?.userId;
}

// ------------------------------------------------------------
// POST /builds — create a new build. Logged in or not: an anonymous
// build has no owner until POST /builds/:id/claim attaches one, so
// starting a build never requires an account up front.
// ------------------------------------------------------------
router.post('/', attachUserIfPresent, async (req, res) => {
  const build = await prisma.build.create({
    data: {
      userId: req.user?.userId ?? null,
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
      // frame: true on both -- the client needs Frame.shockEyeToEyeMm to
      // tell a rigid bike from a full-suspension one (R-SHK-* already
      // treats a null value there as "no rear-shock interface exists",
      // not just "not sourced yet"; the my-bike page uses the same
      // signal to decide whether Rear Shock is a real slot for this bike).
      buildParts: { include: { part: { include: { frame: true } } } },
      // The factory spec travels with the build so the upgrade view can
      // compare against it. Deriving "stock" from the first page load
      // instead breaks the moment the user navigates away and back.
      basedOnModel: { include: { parts: { include: { part: { include: { frame: true } } } } } },
    },
  });

  if (!build) return res.status(404).json({ error: 'Build not found' });
  if (!build.isPublic && !canAccess(build, req)) {
    return res.status(403).json({ error: 'This build is private' });
  }

  res.json({
    ...build,
    // isOwner: genuinely tied to my account (enables rename/delete/
    // publish controls). isAnonymous: not yet claimed by anyone --
    // the frontend uses this to offer "log in to save", not to gate
    // editing, since an unclaimed build is already editable by
    // whoever holds its id.
    isOwner: build.userId != null && build.userId === req.user?.userId,
    isAnonymous: build.userId === null,
  });
});

// ------------------------------------------------------------
// PATCH /builds/:id — rename, toggle public/private, or set rider
// measurements. Same access rule as everything else here: the owner
// if the build is claimed, anyone holding the id if it isn't.
// ------------------------------------------------------------
router.patch('/:id', attachUserIfPresent, async (req, res) => {
  const existing = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Build not found' });
  if (!canAccess(existing, req)) return res.status(403).json({ error: 'Not your build' });

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
// DELETE /builds/:id — owner if claimed, anyone with the id if not
// ------------------------------------------------------------
router.delete('/:id', attachUserIfPresent, async (req, res) => {
  const existing = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Build not found' });
  if (!canAccess(existing, req)) return res.status(403).json({ error: 'Not your build' });

  await prisma.build.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

// ------------------------------------------------------------
// PUT /builds/:id/parts/:partId — add or replace the part in
// whatever slot its PartType occupies. This is the core builder
// action, so it has to work for an unclaimed (anonymous) build too --
// see canAccess.
// ------------------------------------------------------------
router.put('/:id/parts/:partId', attachUserIfPresent, async (req, res) => {
  const build = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!build) return res.status(404).json({ error: 'Build not found' });
  if (!canAccess(build, req)) return res.status(403).json({ error: 'Not your build' });

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
router.delete('/:id/parts/:partId', attachUserIfPresent, async (req, res) => {
  const build = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!build) return res.status(404).json({ error: 'Build not found' });
  if (!canAccess(build, req)) return res.status(403).json({ error: 'Not your build' });

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
  if (!buildRow.isPublic && !canAccess(buildRow, req)) {
    return res.status(403).json({ error: 'This build is private' });
  }

  const build = await loadBuildFromDb(String(req.params.id));
  const warnings = getCompatibilityWarnings(build);

  res.json({
    compatible: isBuildCompatible(build),
    warnings,
  });
});

// ------------------------------------------------------------
// POST /builds/:id/claim — attach an anonymous (guest) build to the
// now-logged-in caller. This is the whole point of login being
// optional rather than a gate: someone can build first, then decide
// to log in, and their in-progress work survives that choice instead
// of being thrown away in favour of a blank build.
// ------------------------------------------------------------
router.post('/:id/claim', requireAuth, async (req, res) => {
  const build = await prisma.build.findUnique({ where: { id: req.params.id } });
  if (!build) return res.status(404).json({ error: 'Build not found' });

  if (build.userId !== null) {
    // Claiming your own build again is a harmless no-op (e.g. a
    // double-submit); claiming someone else's is not allowed.
    if (build.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'This build already belongs to someone else' });
    }
    return res.json(build);
  }

  const claimed = await prisma.build.update({
    where: { id: req.params.id },
    data: { userId: req.user!.userId },
  });
  res.json(claimed);
});

export default router;
