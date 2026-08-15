import { PrismaClient } from "@prisma/client";
import { getCompatibilityWarnings } from "../src/compatibility/engine";
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.frame.findMany({ include: { part: true } });
  const frames = rows.map((r: any) => ({ ...r, brand: r.part.brand, name: r.part.name }));
  const t0 = Date.now();
  let n = 0;
  for (let i = 0; i < 20000; i++) { getCompatibilityWarnings({ frame: frames[i % frames.length] } as any); n++; }
  const ms = Date.now() - t0;
  console.log(`engine only: ${n} full 103-rule evaluations in ${ms}ms  =  ${(ms / n * 1000).toFixed(1)} microseconds each`);
  await prisma.$disconnect();
})();
