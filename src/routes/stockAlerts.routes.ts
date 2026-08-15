// src/routes/stockAlerts.routes.ts
import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../prisma/client';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// POST /stock-alerts — create an alert: notify me when `partId`
// drops below `targetPricePence` and/or comes back in stock.
router.post('/', requireAuth, async (req, res) => {
  const { partId, vendorId, targetPricePence, notifyOnRestock } = req.body ?? {};

  if (typeof partId !== 'string') {
    return res.status(400).json({ error: 'partId is required' });
  }
  if (targetPricePence == null && !notifyOnRestock) {
    return res.status(400).json({ error: 'Provide targetPricePence and/or notifyOnRestock: true' });
  }
  // Previously only null-checked -- a string ("not-a-number") crashed with
  // a raw 500 hitting Prisma's Int column, and a negative value was
  // accepted outright (201) despite being unable to ever trigger, since a
  // price can't be negative.
  if (targetPricePence != null && (typeof targetPricePence !== 'number' || !Number.isFinite(targetPricePence) || targetPricePence <= 0)) {
    return res.status(400).json({ error: 'targetPricePence must be a positive number of pence' });
  }
  if (vendorId != null && typeof vendorId !== 'string') {
    return res.status(400).json({ error: 'vendorId must be a string' });
  }

  const part = await prisma.part.findUnique({ where: { id: partId } });
  if (!part) return res.status(404).json({ error: 'Part not found' });

  let alert;
  try {
    alert = await prisma.stockAlert.create({
      data: {
        userId: req.user!.userId,
        partId,
        vendorId: vendorId ?? null,
        targetPricePence: targetPricePence ?? null,
        notifyOnRestock: Boolean(notifyOnRestock),
      },
    });
  } catch (err) {
    // P2003 = foreign key constraint violation -- vendorId now references
    // a real Vendor row (see schema), so a made-up or typo'd id fails here
    // cleanly instead of silently creating an alert that can never match
    // a real price and so can never fire.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return res.status(400).json({ error: 'vendorId does not refer to a real vendor' });
    }
    throw err;
  }

  res.status(201).json(alert);
});

router.get('/mine', requireAuth, async (req, res) => {
  const alerts = await prisma.stockAlert.findMany({
    where: { userId: req.user!.userId },
    include: { part: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(alerts);
});

router.delete('/:id', requireAuth, async (req, res) => {
  const alert = await prisma.stockAlert.findUnique({ where: { id: req.params.id } });
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  if (alert.userId !== req.user!.userId) return res.status(403).json({ error: 'Not your alert' });

  await prisma.stockAlert.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

export default router;
