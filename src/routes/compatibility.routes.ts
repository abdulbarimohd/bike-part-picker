// src/routes/compatibility.routes.ts
//
// Read-only compatibility CONTENT, generated from real engine output
// against real catalogue rows. Powers two things:
//   1. A rule-by-rule reference (GET /compatibility/rules[/:id]),
//      parsed straight out of COMPATIBILITY_RULES.md.
//   2. Per-part "what's this compatible with" data (GET
//      /compatibility/parts/:slug/:partId), which the SEO "what fits
//      X" pages and the part-detail FAQ block both read.
//
// Every compatibility verdict here is produced by calling the
// existing filterCompatible*/getCompatibilityWarnings functions in
// ../compatibility/engine.ts against rows loaded from Postgres --
// nothing in this file decides compatibility itself.
//
// NOTE ON DUPLICATION: parts.routes.ts already has a CATEGORIES /
// SLUG_TO_SLOTS table mapping slug -> Prisma model -> engine build
// slot. This task's file-ownership rules forbid editing that file to
// export it, so a parallel NODES table is rebuilt here rather than
// imported. If a category is ever added, both need updating -- same
// as parts.routes.ts's own comment about SLUG_TO_SLOTS/CATEGORIES
// already warns for that file.

import { Router } from 'express';
import { prisma } from '../prisma/client';
import * as engine from '../compatibility/engine';
import type { CompatibilityWarning } from '../compatibility/engine';
import type { BikeBuild } from '../types/parts';
import { getRuleCatalogue, getRuleById } from '../compatibility/rulesCatalogue';

const router = Router();

type FilterFn = (build: BikeBuild, candidates: any[]) => any[];

interface Node {
  /** Internal id. Equal to `slug` except for the paired categories, split front/rear. */
  id: string;
  slug: string;
  label: string;
  /** Prisma delegate name. */
  model: string;
  /** BikeBuild slot this node's parts occupy. Absent only for `tubes`, which nothing downstream of it reads (see EDGES). */
  buildSlot?: keyof BikeBuild;
  position?: 'front' | 'rear';
  /** The existing engine.filterCompatibleX for this category. Absent only for `frames` -- nothing in the engine constrains which frame you start with. */
  filter?: FilterFn;
}

const NODES: Node[] = [
  { id: 'frames', slug: 'frames', label: 'Frames', model: 'frame', buildSlot: 'frame' },
  { id: 'forks', slug: 'forks', label: 'Forks', model: 'fork', buildSlot: 'fork', filter: engine.filterCompatibleForks },
  { id: 'headsets', slug: 'headsets', label: 'Headsets', model: 'headset', buildSlot: 'headset', filter: engine.filterCompatibleHeadsets },
  { id: 'rear-shocks', slug: 'rear-shocks', label: 'Rear Shocks', model: 'rearShock', buildSlot: 'rearShock', filter: engine.filterCompatibleRearShocks },
  { id: 'bottom-brackets', slug: 'bottom-brackets', label: 'Bottom Brackets', model: 'bottomBracket', buildSlot: 'bottomBracket', filter: engine.filterCompatibleBottomBrackets },
  { id: 'cranksets', slug: 'cranksets', label: 'Cranksets', model: 'crankset', buildSlot: 'crankset', filter: engine.filterCompatibleCranksets },
  { id: 'chainrings', slug: 'chainrings', label: 'Chainrings', model: 'chainring', buildSlot: 'chainring', filter: engine.filterCompatibleChainrings },
  { id: 'cassettes', slug: 'cassettes', label: 'Cassettes', model: 'cassette', buildSlot: 'cassette', filter: engine.filterCompatibleCassettes },
  { id: 'chains', slug: 'chains', label: 'Chains', model: 'chain', buildSlot: 'chain', filter: engine.filterCompatibleChains },
  { id: 'shifters', slug: 'shifters', label: 'Shifters', model: 'shifter', buildSlot: 'shifter', filter: engine.filterCompatibleShifters },
  { id: 'rear-derailleurs', slug: 'rear-derailleurs', label: 'Rear Derailleurs', model: 'rearDerailleur', buildSlot: 'rearDerailleur', filter: engine.filterCompatibleRearDerailleurs },
  { id: 'front-derailleurs', slug: 'front-derailleurs', label: 'Front Derailleurs', model: 'frontDerailleur', buildSlot: 'frontDerailleur', filter: engine.filterCompatibleFrontDerailleurs },
  { id: 'wheelsets', slug: 'wheelsets', label: 'Wheelsets', model: 'wheelset', buildSlot: 'wheelset', filter: engine.filterCompatibleWheelsets },
  { id: 'tyres:front', slug: 'tyres', label: 'Front Tyres', model: 'tyre', buildSlot: 'frontTyre', position: 'front', filter: engine.filterCompatibleFrontTyres },
  { id: 'tyres:rear', slug: 'tyres', label: 'Rear Tyres', model: 'tyre', buildSlot: 'rearTyre', position: 'rear', filter: engine.filterCompatibleRearTyres },
  { id: 'tubes', slug: 'tubes', label: 'Tubes', model: 'tube', filter: engine.filterCompatibleTubes },
  { id: 'brake-calipers', slug: 'brake-calipers', label: 'Brake Calipers', model: 'brakeCaliper', buildSlot: 'brakeCaliper', filter: engine.filterCompatibleBrakeCalipers },
  { id: 'brake-levers', slug: 'brake-levers', label: 'Brake Levers', model: 'brakeLever', buildSlot: 'brakeLever', filter: engine.filterCompatibleBrakeLevers },
  { id: 'rotors:front', slug: 'rotors', label: 'Front Rotors', model: 'rotor', buildSlot: 'frontRotor', position: 'front', filter: (b, c) => engine.filterCompatibleRotors(b, c, 'front') },
  { id: 'rotors:rear', slug: 'rotors', label: 'Rear Rotors', model: 'rotor', buildSlot: 'rearRotor', position: 'rear', filter: (b, c) => engine.filterCompatibleRotors(b, c, 'rear') },
  { id: 'handlebars', slug: 'handlebars', label: 'Handlebars', model: 'handlebar', buildSlot: 'handlebar', filter: engine.filterCompatibleHandlebars },
  { id: 'stems', slug: 'stems', label: 'Stems', model: 'stem', buildSlot: 'stem', filter: engine.filterCompatibleStems },
  { id: 'seatposts', slug: 'seatposts', label: 'Seatposts', model: 'seatpost', buildSlot: 'seatpost', filter: engine.filterCompatibleSeatposts },
  { id: 'seat-clamps', slug: 'seat-clamps', label: 'Seat Clamps', model: 'seatClamp', buildSlot: 'seatClamp', filter: engine.filterCompatibleSeatClamps },
  { id: 'saddles', slug: 'saddles', label: 'Saddles', model: 'saddle', buildSlot: 'saddle', filter: engine.filterCompatibleSaddles },
  { id: 'pedals', slug: 'pedals', label: 'Pedals', model: 'pedal', buildSlot: 'pedal', filter: engine.filterCompatiblePedals },
  { id: 'shoes', slug: 'shoes', label: 'Shoes', model: 'shoe', buildSlot: 'shoe', filter: engine.filterCompatibleShoes },
  { id: 'chain-guides', slug: 'chain-guides', label: 'Chain Guides', model: 'chainGuide', buildSlot: 'chainGuide', filter: engine.filterCompatibleChainGuides },
  { id: 'derailleur-hangers', slug: 'derailleur-hangers', label: 'Derailleur Hangers', model: 'derailleurHanger', buildSlot: 'derailleurHanger', filter: engine.filterCompatibleDerailleurHangers },
];

/** The category's own name, without a Front/Rear prefix -- for the paired categories, whose two NODES entries exist only to carry different engine slots/filters. */
const NEUTRAL_LABEL: Record<string, string> = { tyres: 'Tyres', rotors: 'Rotors' };

const NODE_BY_ID = new Map(NODES.map((n) => [n.id, n]));
const NODES_BY_SLUG = new Map<string, Node[]>();
for (const n of NODES) {
  const arr = NODES_BY_SLUG.get(n.slug) ?? [];
  arr.push(n);
  NODES_BY_SLUG.set(n.slug, arr);
}

/**
 * [fromNodeId, toNodeId] means `toNode.filter` reads
 * `build[fromNode.buildSlot]` somewhere in its body -- i.e. the "to"
 * category's compatible-candidate list is constrained by the "from"
 * category. Read directly off every filterCompatible* function body
 * in ../compatibility/engine.ts on 2026-08-16 (see that file for the
 * source of truth); this describes that existing wiring, it doesn't
 * add any.
 */
const EDGES: [string, string][] = [
  // -> forks
  ['frames', 'forks'], ['brake-calipers', 'forks'], ['wheelsets', 'forks'], ['tyres:front', 'forks'],
  ['headsets', 'forks'], ['stems', 'forks'], ['rotors:front', 'forks'],
  // -> headsets
  ['frames', 'headsets'], ['forks', 'headsets'],
  // -> rear-shocks
  ['frames', 'rear-shocks'],
  // -> bottom-brackets
  ['frames', 'bottom-brackets'], ['cranksets', 'bottom-brackets'],
  // -> cranksets
  ['bottom-brackets', 'cranksets'], ['frames', 'cranksets'], ['chainrings', 'cranksets'], ['pedals', 'cranksets'],
  // -> chainrings
  ['cranksets', 'chainrings'], ['frames', 'chainrings'],
  // -> cassettes
  ['wheelsets', 'cassettes'], ['rear-derailleurs', 'cassettes'], ['chains', 'cassettes'], ['shifters', 'cassettes'],
  // -> chains
  ['cassettes', 'chains'], ['rear-derailleurs', 'chains'],
  // -> shifters
  ['rear-derailleurs', 'shifters'], ['cassettes', 'shifters'], ['handlebars', 'shifters'], ['brake-levers', 'shifters'],
  // -> rear-derailleurs
  ['shifters', 'rear-derailleurs'], ['cassettes', 'rear-derailleurs'], ['frames', 'rear-derailleurs'],
  // -> front-derailleurs
  ['frames', 'front-derailleurs'],
  // -> wheelsets
  ['frames', 'wheelsets'], ['forks', 'wheelsets'], ['cassettes', 'wheelsets'], ['rotors:front', 'wheelsets'],
  ['rotors:rear', 'wheelsets'], ['brake-calipers', 'wheelsets'], ['tyres:rear', 'wheelsets'], ['tyres:front', 'wheelsets'],
  // -> tyres:front / tyres:rear
  ['forks', 'tyres:front'], ['wheelsets', 'tyres:front'],
  ['frames', 'tyres:rear'], ['wheelsets', 'tyres:rear'],
  // -> tubes
  ['tyres:front', 'tubes'], ['tyres:rear', 'tubes'], ['wheelsets', 'tubes'],
  // -> brake-calipers
  ['frames', 'brake-calipers'], ['forks', 'brake-calipers'], ['brake-levers', 'brake-calipers'], ['wheelsets', 'brake-calipers'],
  // -> brake-levers
  ['brake-calipers', 'brake-levers'], ['handlebars', 'brake-levers'], ['shifters', 'brake-levers'],
  // -> rotors:front / rotors:rear
  ['wheelsets', 'rotors:front'], ['forks', 'rotors:front'], ['brake-calipers', 'rotors:front'],
  ['wheelsets', 'rotors:rear'], ['frames', 'rotors:rear'], ['brake-calipers', 'rotors:rear'],
  // -> handlebars
  ['stems', 'handlebars'], ['shifters', 'handlebars'], ['brake-levers', 'handlebars'],
  // -> stems
  ['handlebars', 'stems'], ['forks', 'stems'],
  // -> seatposts
  ['frames', 'seatposts'], ['saddles', 'seatposts'],
  // -> seat-clamps
  ['frames', 'seat-clamps'],
  // -> saddles
  ['seatposts', 'saddles'],
  // -> pedals
  ['cranksets', 'pedals'], ['shoes', 'pedals'],
  // -> shoes
  ['pedals', 'shoes'],
  // -> chain-guides
  ['frames', 'chain-guides'],
  // -> derailleur-hangers
  ['frames', 'derailleur-hangers'],
];

const OUTGOING = new Map<string, string[]>();
const INCOMING = new Map<string, string[]>();
for (const [from, to] of EDGES) {
  if (!NODE_BY_ID.has(from) || !NODE_BY_ID.has(to)) {
    // Fails fast at startup rather than silently dropping a relation.
    throw new Error(`compatibility.routes: EDGES references unknown node in "${from} -> ${to}"`);
  }
  if (!OUTGOING.has(from)) OUTGOING.set(from, []);
  OUTGOING.get(from)!.push(to);
  if (!INCOMING.has(to)) INCOMING.set(to, []);
  INCOMING.get(to)!.push(from);
}

function shapeRow(row: any) {
  return { ...row, brand: row.part.brand, name: row.part.name };
}

async function fetchCandidates(node: Node): Promise<any[]> {
  const rows = await (prisma as any)[node.model].findMany({ include: { part: true } });
  return rows.map(shapeRow);
}

async function fetchOne(node: Node, partId: string): Promise<any | null> {
  const row = await (prisma as any)[node.model].findUnique({ where: { partId }, include: { part: true } });
  return row ? shapeRow(row) : null;
}

interface RelationResult {
  direction: 'downstream' | 'upstream';
  categorySlug: string;
  categoryLabel: string;
  position?: 'front' | 'rear';
  totalCandidates: number;
  compatibleCount: number;
  examplesCompatible: { partId: string; brand: string; name: string }[];
  examplesBlocked: { partId: string; brand: string; name: string; reasons: { id: string; title: string }[] }[];
  blockingRules: { id: string; title: string; count: number }[];
}

/** Every critical warning naming at least one of the two slots in play. */
function blockersTouching(build: BikeBuild, slots: string[]): CompatibilityWarning[] {
  return engine.getCompatibilityWarnings(build)
    .filter((w) => w.severity === 'critical' && w.components.some((c) => slots.includes(c)));
}

function summarise(
  direction: 'downstream' | 'upstream',
  node: Node,
  total: number,
  compatible: any[],
  blocked: any[],
  reasonsFor: (blockedCandidate: any) => CompatibilityWarning[],
): RelationResult {
  const ruleTally = new Map<string, { id: string; title: string; count: number }>();
  const tally = (warnings: CompatibilityWarning[]) => {
    for (const w of warnings) {
      const existing = ruleTally.get(w.id);
      if (existing) existing.count += 1; else ruleTally.set(w.id, { id: w.id, title: w.title, count: 1 });
    }
  };

  const examplesBlocked = blocked.slice(0, 3).map((c) => {
    const warnings = reasonsFor(c);
    tally(warnings);
    return { partId: c.partId, brand: c.brand, name: c.name, reasons: warnings.map((w) => ({ id: w.id, title: w.title })) };
  });
  // The rest of the blocked set isn't shown as examples, but still
  // counts toward the rule breakdown -- otherwise "blocked by X" would
  // only reflect whichever 3 happened to be listed first.
  for (const c of blocked.slice(3)) tally(reasonsFor(c));

  return {
    direction,
    categorySlug: node.slug,
    categoryLabel: NEUTRAL_LABEL[node.slug] ?? node.label,
    position: node.position,
    totalCandidates: total,
    compatibleCount: compatible.length,
    examplesCompatible: compatible.slice(0, 3).map((c) => ({ partId: c.partId, brand: c.brand, name: c.name })),
    examplesBlocked,
    blockingRules: [...ruleTally.values()].sort((a, b) => b.count - a.count),
  };
}

/** What does knowing `part` (in `fromNode`) narrow down elsewhere in the catalogue? */
async function computeDownstream(fromNode: Node, part: any): Promise<RelationResult[]> {
  const results: RelationResult[] = [];
  for (const toId of OUTGOING.get(fromNode.id) ?? []) {
    const toNode = NODE_BY_ID.get(toId)!;
    const candidates = await fetchCandidates(toNode);
    const build = { [fromNode.buildSlot!]: part } as BikeBuild;
    const compatible = toNode.filter!(build, candidates);
    const compatibleIds = new Set(compatible.map((c: any) => c.partId));
    const blocked = candidates.filter((c) => !compatibleIds.has(c.partId));

    results.push(summarise('downstream', toNode, candidates.length, compatible, blocked, (blockedCandidate) =>
      blockersTouching({ ...build, [toNode.buildSlot!]: blockedCandidate } as BikeBuild, [fromNode.buildSlot!, toNode.buildSlot!] as string[])));
  }
  return results;
}

/** What elsewhere in the catalogue does `part` (in `node`) itself require? */
async function computeUpstream(node: Node, part: any): Promise<RelationResult[]> {
  if (!node.filter) return [];
  const results: RelationResult[] = [];
  for (const fromId of INCOMING.get(node.id) ?? []) {
    const fromNode = NODE_BY_ID.get(fromId)!;
    const candidates = await fetchCandidates(fromNode);
    const compatible: any[] = [];
    const blocked: any[] = [];
    for (const candidate of candidates) {
      const build = { [fromNode.buildSlot!]: candidate } as BikeBuild;
      const pass = node.filter!(build, [part]);
      (pass.length === 1 ? compatible : blocked).push(candidate);
    }

    results.push(summarise('upstream', fromNode, candidates.length, compatible, blocked, (blockedCandidate) =>
      blockersTouching({ [fromNode.buildSlot!]: blockedCandidate, [node.buildSlot!]: part } as BikeBuild, [fromNode.buildSlot!, node.buildSlot!] as string[])));
  }
  return results;
}

function singular(label: string): string {
  return label.endsWith('s') ? label.slice(0, -1) : label;
}

function describePart(p: { brand: string; name: string }): string {
  return `${p.brand} ${p.name}`.trim();
}

/** Plain-English FAQ pairs from real counts and real part names only -- no invented specifics. */
function buildFaqs(selfCategoryLabel: string, relations: RelationResult[]): { question: string; answer: string }[] {
  const selfSingular = singular(selfCategoryLabel).toLowerCase();
  const faqs: { question: string; answer: string }[] = [];

  for (const rel of relations) {
    if (rel.totalCandidates === 0) continue; // nothing in the catalogue yet to compare against
    const targetSingular = singular(rel.categoryLabel).toLowerCase();
    const posNote = rel.position ? ` as the ${rel.position}` : '';
    const plural = (n: number) => (n === 1 ? targetSingular : `${targetSingular}s`);
    const question = `Which ${targetSingular}s${posNote ? ` (used${posNote})` : ''} work with this ${selfSingular}?`;
    const blockList = rel.blockingRules.map((r) => `${r.title} (${r.id})`).join(', ');

    let answer: string;
    if (rel.compatibleCount === rel.totalCandidates) {
      answer = `All ${rel.totalCandidates} ${plural(rel.totalCandidates)} currently in the catalogue are compatible` +
        (rel.examplesCompatible.length ? `, including ${rel.examplesCompatible.map(describePart).join(', ')}.` : '.');
    } else if (rel.compatibleCount === 0) {
      answer = `None of the ${rel.totalCandidates} ${plural(rel.totalCandidates)} in the catalogue are compatible` +
        (blockList ? `, blocked by ${blockList}.` : '.');
    } else {
      answer = `${rel.compatibleCount} of ${rel.totalCandidates} ${plural(rel.totalCandidates)} in the catalogue are compatible` +
        (rel.examplesCompatible.length ? ` — for example ${rel.examplesCompatible.map(describePart).join(', ')}.` : '.') +
        (blockList ? ` The rest are blocked by ${blockList}.` : '');
    }
    faqs.push({ question, answer });
  }
  return faqs;
}

// ------------------------------------------------------------
// GET /compatibility/parts/:slug/:partId
// ------------------------------------------------------------
router.get('/parts/:slug/:partId', async (req, res) => {
  const { slug, partId } = req.params;
  const nodes = NODES_BY_SLUG.get(slug);
  if (!nodes) return res.status(404).json({ error: `Unknown category ${slug}` });

  const part = await fetchOne(nodes[0], partId);
  if (!part) return res.status(404).json({ error: `Not found in ${slug}` });

  // Keyed by target category+position ONLY, not direction: several pairs
  // are mutual (e.g. bottom brackets <-> cranksets both reference each
  // other via R-BB-02's spindle match), so a part's downstream relation
  // into a category and its upstream relation from that same category
  // test the identical pairwise predicate and produce the identical
  // result -- reporting both would just be the same fact printed twice.
  // Downstream is computed first per node, so it wins the dedup.
  const relations: RelationResult[] = [];
  const seen = new Set<string>();
  for (const node of nodes) {
    for (const r of await computeDownstream(node, part)) {
      const key = `${r.categorySlug}:${r.position ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      relations.push(r);
    }
    for (const r of await computeUpstream(node, part)) {
      const key = `${r.categorySlug}:${r.position ?? ''}`;
      if (seen.has(key)) continue;
      seen.add(key);
      relations.push(r);
    }
  }

  const categoryLabel = NEUTRAL_LABEL[slug] ?? nodes[0].label;

  res.json({
    part: { partId: part.partId, brand: part.brand, name: part.name, categorySlug: slug, categoryLabel },
    relations,
    faqs: buildFaqs(categoryLabel, relations),
  });
});

// ------------------------------------------------------------
// GET /compatibility/rules — full rule-by-rule reference, grouped by
// section, parsed live from COMPATIBILITY_RULES.md.
// ------------------------------------------------------------
router.get('/rules', (req, res) => {
  const { rules, forms } = getRuleCatalogue();
  const sectionParam = req.query.section ? Number(req.query.section) : undefined;
  const filtered = Number.isFinite(sectionParam) && sectionParam !== undefined
    ? rules.filter((r) => r.sectionNumber === sectionParam)
    : rules;

  const bySection = new Map<number, { number: number; title: string; rules: typeof rules }>();
  for (const r of filtered) {
    if (!bySection.has(r.sectionNumber)) bySection.set(r.sectionNumber, { number: r.sectionNumber, title: r.sectionTitle, rules: [] });
    bySection.get(r.sectionNumber)!.rules.push(r);
  }

  res.json({
    totalRules: rules.length,
    forms,
    sections: [...bySection.values()].sort((a, b) => a.number - b.number),
  });
});

// ------------------------------------------------------------
// GET /compatibility/rules/:id — a single rule's full entry.
// ------------------------------------------------------------
router.get('/rules/:id', (req, res) => {
  const rule = getRuleById(req.params.id);
  if (!rule) return res.status(404).json({ error: `No such rule ${req.params.id}` });
  res.json(rule);
});

export default router;
