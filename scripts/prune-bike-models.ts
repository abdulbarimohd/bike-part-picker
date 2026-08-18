// scripts/prune-bike-models.ts
//
// One-off cleanup: the "I already own a bike" catalogue has 122 seeded
// BikeModel rows, but only 3 have a substantially complete stock build
// (23-24 of 30 slots -- the rest is rider-choice items like pedals/shoes
// that no factory bike ships with, or slots that don't apply to that
// drivetrain). The other 119 range from "missing most of the bike" to
// "frame only". Keeping only the near-complete ones so the page doesn't
// show visitors a bike that's obviously an unfinished stub.
//
// Safe to run: Build.basedOnModelId is `onDelete: SetNull` (schema.prisma),
// so any real user Build that was cloned from a deleted BikeModel keeps
// its own parts intact -- it just loses the "based on X" back-reference.
// BikeModelPart rows cascade-delete with their parent, which is correct
// (they're just the stock-part list, not user data).

import { PrismaClient } from '@prisma/client';

const KEEP_SLUGS = [
  'santa-cruz-hightower-c-s-2024',
  'specialized-epic-8-expert-2024',
  'trek-fuel-ex-9-8-xt-2025',
];

async function main() {
  const prisma = new PrismaClient();
  const before = await prisma.bikeModel.count();

  const toDelete = await prisma.bikeModel.findMany({
    where: { slug: { notIn: KEEP_SLUGS } },
    select: { id: true, slug: true },
  });

  if (toDelete.length !== before - KEEP_SLUGS.length) {
    throw new Error(
      `Sanity check failed: expected to delete ${before - KEEP_SLUGS.length}, computed ${toDelete.length}. Aborting without deleting anything.`
    );
  }

  const result = await prisma.bikeModel.deleteMany({
    where: { slug: { notIn: KEEP_SLUGS } },
  });

  const after = await prisma.bikeModel.count();
  console.log(JSON.stringify({ before, deleted: result.count, after, kept: KEEP_SLUGS }, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
