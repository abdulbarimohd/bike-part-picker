// src/services/stockAlert.service.ts
//
// Run this on a schedule (e.g. `node dist/jobs/checkStockAlerts.js`
// via cron, or a queue worker) — NOT inside a request handler.
// Checking alerts is a pull against the latest Price rows, which
// is exactly the kind of bulk background work that shouldn't
// block an HTTP response.

import { prisma } from '../prisma/client';

export interface TriggeredAlert {
  alertId: string;
  userId: string;
  partId: string;
  reason: 'price_drop' | 'restock';
  pricePence?: number;
}

export async function checkStockAlerts(): Promise<TriggeredAlert[]> {
  const pendingAlerts = await prisma.stockAlert.findMany({
    where: { triggeredAt: null },
  });

  const triggered: TriggeredAlert[] = [];

  for (const alert of pendingAlerts) {
    const latestPrice = await prisma.price.findFirst({
      where: {
        partId: alert.partId,
        ...(alert.vendorId && { vendorId: alert.vendorId }),
      },
      orderBy: { recordedAt: 'desc' },
    });

    if (!latestPrice) continue;

    const priceDropped =
      alert.targetPricePence != null && latestPrice.pricePence <= alert.targetPricePence;
    const restocked = alert.notifyOnRestock && latestPrice.inStock;

    if (priceDropped || restocked) {
      await prisma.stockAlert.update({
        where: { id: alert.id },
        data: { triggeredAt: new Date() },
      });

      triggered.push({
        alertId: alert.id,
        userId: alert.userId,
        partId: alert.partId,
        reason: priceDropped ? 'price_drop' : 'restock',
        pricePence: latestPrice.pricePence,
      });
    }
  }

  // Hand off to whatever actually notifies the user — email,
  // push, in-app. Kept as a stub since the notification channel
  // is a separate infra decision (e.g. SES, Resend, web push)
  // outside the scope of the compatibility/data layer.
  for (const t of triggered) {
    await sendNotification(t);
  }

  return triggered;
}

async function sendNotification(alert: TriggeredAlert): Promise<void> {
  // TODO: wire to a real email/push provider.
  // eslint-disable-next-line no-console
  console.log(`[stock-alert] user ${alert.userId}: part ${alert.partId} — ${alert.reason}`);
}
