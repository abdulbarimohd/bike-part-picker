// lib/categories.ts
//
// Single source of truth for the frontend's view of the catalogue:
// URL slug, display label, which build slot it fills, which filters
// its list page offers, and which spec fields its detail page shows.
// The builder, the category pages, the detail pages and the nav all
// read from here — with 27 categories, duplicating these lists per
// file was the main thing that would rot.

import type { FilterConfig } from '../components/FilterSidebar';

export interface SpecField {
  label: string;
  key: string;
  suffix?: string;
}

export interface CategoryConfig {
  slug: string;
  label: string;
  /** One plain-English sentence explaining what the part is/does, shown
   *  behind an (i) icon next to the category label in the Builder and on
   *  My Bike -- not a spec, so it doesn't need a dataSource/sourceUrl. */
  description: string;
  /** BikeBuild slot(s) this category fills. Paired parts list two. */
  slots: { key: string; label: string }[];
  filters: FilterConfig[];
  specs: SpecField[];
  /** Shown in the builder in this order. */
  builderOrder: number;
}

const sel = (key: string, label: string, options: [string, string][]): FilterConfig => ({
  key, label, type: 'select', options: options.map(([value, l]) => ({ value, label: l })),
});
const range = (key: string, label: string, direction: 'min' | 'max' = 'min', unit?: string): FilterConfig => ({ key, label, type: 'range', rangeDirection: direction, ...(unit && { unit }) });
const yesno = (key: string, label: string): FilterConfig => ({ key, label, type: 'boolean' });
/** Stamps a section label onto a run of filters — FilterSidebar renders a
 *  light divider + label where consecutive filters share a `group`. */
const grp = (group: string, ...fs: FilterConfig[]): FilterConfig[] => fs.map((f) => ({ ...f, group }));

// Each of these option lists is meant to cover its Prisma enum completely --
// a member with no entry here is unfilterable: it still appears in the
// unfiltered list but silently drops out the moment a user picks any filter
// value for that field. Verified against the schema (scripts/import
// mappers plus a scripted enum-vs-filter diff) on 2026-08-14; re-run that
// diff after adding an enum member so this doesn't rot again.
const DIAMETERS: [string, string][] = [['ISO_622', '700c / 29"'], ['ISO_584', '650b / 27.5"'], ['ISO_559', '26"'], ['ISO_507', '24"']];
const BRAKE_MOUNTS: [string, string][] = [['FLAT_MOUNT', 'Flat Mount'], ['POST_MOUNT_160', 'Post Mount 160'], ['POST_MOUNT_180', 'Post Mount 180'], ['POST_MOUNT', 'Post Mount (size unspecified)'], ['IS_MOUNT', 'IS Mount'], ['RIM_BRAKE', 'Rim Brake']];
const SPINDLES: [string, string][] = [['DUB_29', 'DUB 29'], ['GXP', 'GXP'], ['HOLLOWTECH_II_24', 'Hollowtech II 24'], ['CINCH_30', 'CINCH 30'], ['BB30_30', 'BB30 30'], ['OCT_LINK_24', 'Octalink 24'], ['SQUARE_TAPER', 'Square taper'], ['ISIS', 'ISIS']];
// T47_85_5 (T47 internal-bearing, 85.5mm shell) and THRU_AXLE_100x12 (front
// road/gravel 12mm thru-axle) were added to the schema after the 2026-08-14
// diff -- listed here so they're filterable and so SPEC_LABELS below has a
// curated label for them ("T47 85.5", not the underscore-stripped "T47 85 5").
const SHELLS: [string, string][] = [['BSA_68', 'BSA 68'], ['BSA_73', 'BSA 73'], ['BSA_83', 'BSA 83'], ['BSA_100', 'BSA 100'], ['ITALIAN_70', 'Italian 70'], ['PF92', 'PF92'], ['PF107', 'PF107'], ['BB86', 'BB86'], ['BB90', 'BB90'], ['T47_68', 'T47 68'], ['T47_73', 'T47 73'], ['T47_85_5', 'T47 85.5'], ['BB30', 'BB30'], ['PF30', 'PF30']];
const FREEHUBS: [string, string][] = [['XD', 'SRAM XD'], ['XDR', 'SRAM XDR'], ['MICRO_SPLINE', 'Shimano Micro Spline'], ['HG_12', 'Shimano HG 12 (road)'], ['HG_11', 'Shimano HG 11'], ['HG_10', 'Shimano HG 10/9/8'], ['CAMPAGNOLO_N3W', 'Campagnolo N3W']];
const CABLE_PULLS: [string, string][] = [['SHIMANO_MTB', 'Shimano MTB'], ['SHIMANO_ROAD', 'Shimano Road'], ['SRAM_X_ACTUATION', 'SRAM X-Actuation'], ['SRAM_EXACT_ACTUATION', 'SRAM Exact Actuation'], ['SRAM_FULL_PULL', 'SRAM Full Pull'], ['ELECTRONIC_AXS', 'SRAM AXS (wireless)'], ['ELECTRONIC_DI2', 'Shimano Di2'], ['ELECTRONIC_EPS', 'Campagnolo EPS'], ['CAMPAGNOLO', 'Campagnolo (mechanical)']];
// `speeds` is a plain Int, not an enum, so "complete" here means covering
// every value actually present in the catalogue rather than every enum
// member. Checked live across cassettes/chains/shifters/rear-derailleurs
// after the SRAM import: real parts exist from 1-speed (auxiliary/brake-
// only levers) through 13-speed (SRAM XG-1391 XPLR) -- the previous
// 10/11/12-only list made a real 7-speed and a real 13-speed cassette
// permanently unreachable through this filter.
const SPEEDS: [string, string][] = [
  ['1', '1-speed'], ['2', '2-speed'], ['3', '3-speed'], ['6', '6-speed'], ['7', '7-speed'],
  ['8', '8-speed'], ['9', '9-speed'], ['10', '10-speed'], ['11', '11-speed'], ['12', '12-speed'], ['13', '13-speed'],
];
const TAPERS: [string, string][] = [['TAPERED_1_5_TO_1_125', 'Tapered 1.5"–1.125"'], ['STRAIGHT_1_125', 'Straight 1.125"'], ['STRAIGHT_1_5', 'Straight 1.5"']];
const HEADSET_CUPS: [string, string][] = [['EC34', 'EC34'], ['EC44', 'EC44'], ['EC49', 'EC49'], ['ZS44', 'ZS44'], ['ZS49', 'ZS49'], ['ZS56', 'ZS56'], ['IS41', 'IS41'], ['IS42', 'IS42'], ['IS52', 'IS52']];
// THRU_AXLE_20x110_DH and THRU_AXLE_150x12_DH/QUICK_RELEASE_130x9 are split
// front/rear by what the standard is physically for (20x110 is a front-only
// downhill spec; 150x12 and 130x9 are rear-only) -- verified via BikeRadar's
// axle-standards guides rather than mirrored symmetrically into both lists.
const AXLES_REAR: [string, string][] = [['THRU_AXLE_148x12_BOOST', 'Boost 148×12'], ['THRU_AXLE_157x12_SUPERBOOST', 'Super Boost 157×12'], ['THRU_AXLE_142x12', '142×12'], ['THRU_AXLE_150x12_DH', 'DH 150×12'], ['QUICK_RELEASE_135x9', 'QR 135×9'], ['QUICK_RELEASE_130x9', 'QR 130×9 (road)']];
const AXLES_FRONT: [string, string][] = [['THRU_AXLE_110x15_BOOST', 'Boost 110×15'], ['THRU_AXLE_100x15', '100×15'], ['THRU_AXLE_100x12', '100×12 (road)'], ['THRU_AXLE_20x110_DH', 'DH 20×110'], ['QUICK_RELEASE_100x9', 'QR 100×9']];
const ROTOR_MOUNTS: [string, string][] = [['SIX_BOLT', '6-bolt'], ['CENTERLOCK', 'Centerlock']];
const FLUIDS: [string, string][] = [['DOT', 'DOT'], ['MINERAL_OIL', 'Mineral oil'], ['NONE_MECHANICAL', 'Mechanical']];
const BAR_TYPES: [string, string][] = [['FLAT', 'Flat'], ['RISER', 'Riser'], ['DROP', 'Drop'], ['AERO', 'Aero']];
// Shared by both chainring-mount filters (cranksets' optional chainringMount
// and chainrings' required mountStandard) so the two stay in sync.
const CHAINRING_MOUNTS: [string, string][] = [
  ['BCD_104', '104 BCD'], ['BCD_96', '96 BCD'], ['BCD_94', '94 BCD'], ['BCD_110', '110 BCD'], ['BCD_76', '76 BCD'],
  ['SRAM_3_BOLT', 'SRAM 3-bolt'], ['RACE_FACE_CINCH', 'Race Face CINCH'], ['SHIMANO_DIRECT_MOUNT', 'Shimano direct'],
  ['SRAM_8_BOLT_ROAD_DM', 'SRAM 8-bolt DM (road)'], ['SRAM_8_BOLT_EAGLE_DM', 'SRAM 8-bolt DM (Eagle)'],
];
const CHAIN_STANDARDS: [string, string][] = [
  ['SHIMANO_HG_10', 'Shimano HG 10-speed'], ['SHIMANO_HG_11', 'Shimano HG 11-speed'],
  ['SHIMANO_HG_12_MTB', 'Shimano HG 12 MTB'], ['SHIMANO_HG_12_ROAD', 'Shimano HG 12 Road'],
  ['SRAM_EAGLE_12', 'SRAM Eagle 12'], ['SRAM_FLATTOP_12', 'SRAM Flattop'], ['SRAM_11', 'SRAM 11-speed'],
  ['CAMPAGNOLO_12', 'Campagnolo 12-speed'],
];

export const CATEGORIES: CategoryConfig[] = [
  {
    slug: 'frames', label: 'Frames', builderOrder: 1,
    description: 'The main structure the rest of the bike attaches to — it sets wheel size, suspension travel, and nearly every other fit standard.',
    slots: [{ key: 'frame', label: 'Frame' }],
    filters: [
      sel('material', 'Material', [['CARBON', 'Carbon'], ['ALUMINIUM', 'Aluminium'], ['STEEL', 'Steel'], ['TITANIUM', 'Titanium']]),
      ...grp('Interfaces',
        sel('brakeMount', 'Rear Brake Mount', BRAKE_MOUNTS),
        sel('bbShell', 'BB Shell', SHELLS),
        sel('axleType', 'Rear Axle', AXLES_REAR),
        sel('hanger', 'Hanger', [['UDH', 'UDH'], ['PROPRIETARY', 'Proprietary'], ['DIRECT_MOUNT', 'Direct mount']]),
      ),
      range('minTyreClearance', 'Min. Tyre Clearance', 'min', 'mm'),
    ],
    specs: [
      { label: 'BB Standard', key: 'bbShellStandard' }, { label: 'Rear Axle', key: 'rearAxleType' },
      { label: 'Headset Taper', key: 'headsetTaper' }, { label: 'Max Tyre', key: 'maxTyreWidthMm', suffix: 'mm' },
      { label: 'Hanger', key: 'hangerStandard' }, { label: 'Max Fork Travel', key: 'maxForkTravelMm', suffix: 'mm' },
      { label: 'Shock', key: 'shockEyeToEyeMm', suffix: 'mm e2e' }, { label: 'Shock Stroke', key: 'shockStrokeMm', suffix: 'mm' },
      { label: 'Shock Mount', key: 'shockMountType' }, { label: 'Seatpost', key: 'seatpostDiameterMm', suffix: 'mm' },
      { label: 'Max Rotor (rear)', key: 'maxRotorMmRear', suffix: 'mm' }, { label: 'Max Chainring', key: 'maxChainringTeeth', suffix: 't' },
      // These back real engine rules (R-AXL-04, R-FRK-04, R-DRV-09,
      // R-MNT-01/04/05, R-FD-01/02, plus the R-FIT-* rider-fit checks) but
      // were never surfaced anywhere -- a frame could trip one of these
      // warnings with no way for a user to see which field caused it.
      { label: 'Dropout', key: 'dropoutType' }, { label: 'Mullet Approved', key: 'mulletApproved' },
      { label: 'Chainstay', key: 'chainstayLengthMm', suffix: 'mm' }, { label: 'ISCG', key: 'iscgStandard' },
      { label: 'Bottle Mounts', key: 'bottleMounts' }, { label: 'Rack/Guard Eyelets', key: 'hasEyelets' },
      { label: 'Front Derailleur Mount', key: 'fdMountType' }, { label: 'Front Derailleur Pull', key: 'fdPullDirection' },
      { label: 'Shock Leverage Ratio', key: 'leverageRatio' }, { label: 'Coil Shock Suitable', key: 'suitableForCoil' },
      { label: 'Frame Size', key: 'frameSize' }, { label: 'Standover', key: 'standoverMm', suffix: 'mm' },
      { label: 'Reach', key: 'reachMm', suffix: 'mm' }, { label: 'Stack', key: 'stackMm', suffix: 'mm' },
      { label: 'Rider Height Min', key: 'riderMinHeightCm', suffix: 'cm' }, { label: 'Rider Height Max', key: 'riderMaxHeightCm', suffix: 'cm' },
    ],
  },
  {
    slug: 'forks', label: 'Forks', builderOrder: 2,
    description: 'Holds the front wheel and steers the bike; on mountain bikes it also absorbs impacts through suspension travel.',
    slots: [{ key: 'fork', label: 'Fork' }],
    filters: [...grp('Interfaces', sel('brakeMount', 'Brake Mount', BRAKE_MOUNTS), sel('taper', 'Steerer Taper', TAPERS), sel('axleType', 'Front Axle', AXLES_FRONT)), sel('diameter', 'Wheel Size', DIAMETERS), range('maxTravel', 'Max Travel', 'max', 'mm')],
    specs: [
      { label: 'Steerer', key: 'steererTubeTaper' }, { label: 'Front Axle', key: 'frontAxleType' },
      { label: 'Brake Mount', key: 'brakeMountType' }, { label: 'Travel', key: 'travelMm', suffix: 'mm' },
      { label: 'Axle-to-Crown', key: 'axleToCrownMm', suffix: 'mm' }, { label: 'Offset', key: 'offsetMm', suffix: 'mm' },
      { label: 'Max Rotor', key: 'maxRotorMm', suffix: 'mm' }, { label: 'Max Tyre', key: 'maxTyreWidthMm', suffix: 'mm' },
    ],
  },
  {
    slug: 'headsets', label: 'Headsets', builderOrder: 3,
    description: "The bearings that let the fork — and the handlebars with it — rotate smoothly inside the frame's head tube.",
    slots: [{ key: 'headset', label: 'Headset' }],
    // HeadsetCupStandard is one shared enum for both upperStandard and
    // lowerStandard (schema doesn't split it by cup position), so either
    // filter genuinely can match any of its 9 members -- the previous 3-
    // of-9 lists on each side made a real headset using EC49/ZS49/IS41 on
    // either cup unfilterable no matter which dropdown it was searched from.
    filters: [sel('upper', 'Upper Cup', HEADSET_CUPS), sel('lower', 'Lower Cup', HEADSET_CUPS)],
    specs: [{ label: 'Upper', key: 'upperStandard' }, { label: 'Lower', key: 'lowerStandard' }, { label: 'Crown Race', key: 'crownRaceDiameterMm', suffix: 'mm' }, { label: 'Stack', key: 'stackHeightMm', suffix: 'mm' }],
  },
  {
    slug: 'rear-shocks', label: 'Rear Shocks', builderOrder: 4,
    description: "The rear suspension unit on full-suspension bikes, absorbing impact between the frame's front and rear triangles.",
    slots: [{ key: 'rearShock', label: 'Rear Shock' }],
    filters: [...grp('Size', range('eyeToEye', 'Eye-to-Eye', 'min', 'mm'), range('stroke', 'Stroke', 'min', 'mm')), sel('mount', 'Mount', [['STANDARD_EYELET', 'Standard eyelet'], ['TRUNNION', 'Trunnion']]), yesno('coil', 'Coil')],
    specs: [{ label: 'Eye-to-Eye', key: 'eyeToEyeMm', suffix: 'mm' }, { label: 'Stroke', key: 'strokeMm', suffix: 'mm' }, { label: 'Mount', key: 'mountType' }, { label: 'Hardware', key: 'hardwareWidthMm', suffix: 'mm' }, { label: 'Spring', key: 'isCoil' }, { label: 'Spring Rate', key: 'springRate', suffix: 'lb' }],
  },
  {
    slug: 'bottom-brackets', label: 'Bottom Brackets', builderOrder: 5,
    description: "The bearing unit inside the frame's shell that lets the crankset spin freely.",
    slots: [{ key: 'bottomBracket', label: 'Bottom Bracket' }],
    filters: [sel('shell', 'Frame Interface', SHELLS), sel('spindle', 'Spindle Interface', SPINDLES)],
    specs: [{ label: 'Frame Interface', key: 'frameInterface' }, { label: 'Shell Width', key: 'shellWidthMm', suffix: 'mm' }, { label: 'Spindle', key: 'spindleInterface' }],
  },
  {
    slug: 'cranksets', label: 'Cranksets', builderOrder: 6,
    description: 'The arms and chainring(s) the pedals attach to — turns your pedalling into chain motion.',
    slots: [{ key: 'crankset', label: 'Crankset' }],
    filters: [sel('spindle', 'Spindle', SPINDLES), sel('chainringMount', 'Ring Mount', CHAINRING_MOUNTS), range('crankLength', 'Crank Length', 'min', 'mm')],
    specs: [{ label: 'Spindle', key: 'spindleDiameter' }, { label: 'Chainline', key: 'chainlineMm', suffix: 'mm' }, { label: 'Crank Length', key: 'crankLengthMm', suffix: 'mm' }, { label: 'Q-Factor', key: 'qFactorMm', suffix: 'mm' }, { label: 'Ring Mount', key: 'chainringMount' }, { label: 'Pedal Thread', key: 'pedalThread' }],
  },
  {
    slug: 'chainrings', label: 'Chainrings', builderOrder: 7,
    description: 'The toothed ring(s) bolted to the crankset that the chain wraps around at the front.',
    slots: [{ key: 'chainring', label: 'Chainring' }],
    filters: [sel('mount', 'Mount', CHAINRING_MOUNTS), range('teeth', 'Teeth', 'min', 't'), yesno('narrowWide', 'Narrow-Wide')],
    specs: [{ label: 'Mount', key: 'mountStandard' }, { label: 'Teeth', key: 'teeth', suffix: 't' }, { label: 'Narrow-Wide', key: 'narrowWide' }, { label: 'Offset', key: 'offsetMm', suffix: 'mm' }],
  },
  {
    slug: 'cassettes', label: 'Cassettes', builderOrder: 8,
    description: 'The stack of toothed sprockets on the rear wheel that the chain shifts across.',
    slots: [{ key: 'cassette', label: 'Cassette' }],
    filters: [sel('speeds', 'Speeds', SPEEDS), sel('freehub', 'Freehub Body', FREEHUBS), range('maxCog', 'Max Cog', 'max', 't')],
    specs: [{ label: 'Speeds', key: 'speeds' }, { label: 'Freehub', key: 'freehubBodyType' }, { label: 'Range', key: 'smallestCogTeeth', suffix: 't smallest' }, { label: 'Largest Cog', key: 'largestCogTeeth', suffix: 't' }],
  },
  {
    slug: 'chains', label: 'Chains', builderOrder: 9,
    description: 'The link chain that transmits power from the chainring to the cassette.',
    slots: [{ key: 'chain', label: 'Chain' }],
    filters: [sel('speeds', 'Speeds', SPEEDS), sel('standard', 'Standard', CHAIN_STANDARDS)],
    specs: [{ label: 'Speeds', key: 'speeds' }, { label: 'Standard', key: 'chainStandard' }, { label: 'Links', key: 'links' }],
  },
  {
    slug: 'shifters', label: 'Shifters', builderOrder: 10,
    description: 'The handlebar controls that move the derailleurs to change gear.',
    slots: [{ key: 'shifter', label: 'Shifter' }],
    filters: [sel('speeds', 'Speeds', SPEEDS), sel('cablePull', 'Actuation', CABLE_PULLS), sel('barType', 'Bar Type', BAR_TYPES)],
    specs: [{ label: 'Speeds', key: 'speeds' }, { label: 'Actuation', key: 'cablePullStandard' }, { label: 'Clamp', key: 'clampDiameterMm', suffix: 'mm' }],
  },
  {
    slug: 'rear-derailleurs', label: 'Rear Derailleurs', builderOrder: 11,
    description: "Moves the chain across the cassette's sprockets to change rear gears.",
    slots: [{ key: 'rearDerailleur', label: 'Rear Derailleur' }],
    filters: [sel('maxSpeeds', 'Speeds', SPEEDS), sel('cablePull', 'Actuation', CABLE_PULLS), ...grp('Cage & Mount', sel('cage', 'Cage', [['SHORT_SS', 'Short (SS)'], ['MEDIUM_GS', 'Medium (GS)'], ['LONG_SGS', 'Long (SGS)']]), sel('mount', 'Mount', [['STANDARD_HANGER', 'Standard hanger'], ['UDH_DIRECT_MOUNT', 'UDH direct (Transmission)'], ['DIRECT_MOUNT', 'Direct mount']]), range('minCogCapacity', 'Min. Cog Capacity', 'min', 't'))],
    specs: [{ label: 'Speeds', key: 'maxSpeeds' }, { label: 'Actuation', key: 'cablePullStandard' }, { label: 'Max Cog', key: 'maxCassetteCogTeeth', suffix: 't' }, { label: 'Capacity', key: 'totalCapacityTeeth', suffix: 't' }, { label: 'Cage', key: 'cageLength' }, { label: 'Mount', key: 'mountStandard' }],
  },
  {
    slug: 'front-derailleurs', label: 'Front Derailleurs', builderOrder: 12,
    description: 'Moves the chain between chainrings on bikes with more than one at the front.',
    slots: [{ key: 'frontDerailleur', label: 'Front Derailleur' }],
    filters: [sel('mount', 'Mount', [['BRAZE_ON', 'Braze-on'], ['CLAMP_28_6', 'Clamp 28.6'], ['CLAMP_31_8', 'Clamp 31.8'], ['CLAMP_34_9', 'Clamp 34.9'], ['DIRECT_MOUNT', 'Direct mount']]), sel('pull', 'Pull', [['TOP_PULL', 'Top pull'], ['BOTTOM_PULL', 'Bottom pull'], ['DUAL_PULL', 'Dual pull'], ['SIDE_SWING', 'Side Swing']])],
    specs: [{ label: 'Speeds', key: 'speeds' }, { label: 'Mount', key: 'mountType' }, { label: 'Pull', key: 'pullDirection' }, { label: 'Max Ring', key: 'maxChainringTeeth', suffix: 't' }],
  },
  {
    slug: 'wheelsets', label: 'Wheelsets', builderOrder: 13,
    description: 'The pair of wheels — hub, spokes and rim — that the tyres mount to.',
    slots: [{ key: 'wheelset', label: 'Wheelset' }],
    filters: [sel('diameter', 'Diameter', DIAMETERS), ...grp('Hub', sel('hubSpacing', 'Rear Hub', AXLES_REAR), sel('freehub', 'Freehub', FREEHUBS), sel('rotorMount', 'Rotor Mount', ROTOR_MOUNTS)), ...grp('Rim', yesno('tubelessReady', 'Tubeless Ready'), yesno('hookless', 'Hookless'))],
    specs: [{ label: 'Diameter', key: 'wheelDiameter' }, { label: 'Front Hub', key: 'frontAxleType' }, { label: 'Rear Hub', key: 'rearAxleType' }, { label: 'Freehub', key: 'freehubBodyType' }, { label: 'Rotor Mount', key: 'rotorMountStandard' }, { label: 'Internal Rim', key: 'internalRimWidthMm', suffix: 'mm' }, { label: 'Hookless', key: 'hookless' }, { label: 'Max Pressure', key: 'maxPressurePsi', suffix: 'psi' }],
  },
  {
    slug: 'tyres', label: 'Tyres', builderOrder: 14,
    description: 'The rubber that grips the road or trail and holds the air, or sealant, in.',
    slots: [{ key: 'frontTyre', label: 'Front Tyre' }, { key: 'rearTyre', label: 'Rear Tyre' }],
    filters: [sel('diameter', 'Diameter', DIAMETERS), range('minWidth', 'Min. Width', 'min', 'mm'), yesno('tubeless', 'Tubeless'), yesno('hooklessSafe', 'Hookless-Safe')],
    specs: [{ label: 'Diameter', key: 'wheelDiameter' }, { label: 'Width', key: 'widthMm', suffix: 'mm' }, { label: 'Tubeless', key: 'tubeless' }, { label: 'Hookless-Safe', key: 'hooklessSafe' }, { label: 'Max Pressure', key: 'maxPressurePsi', suffix: 'psi' }],
  },
  {
    slug: 'tubes', label: 'Tubes', builderOrder: 15,
    description: 'The inflatable inner tube that fits inside a non-tubeless tyre.',
    slots: [{ key: 'frontTube', label: 'Front Tube' }, { key: 'rearTube', label: 'Rear Tube' }],
    filters: [sel('diameter', 'Diameter', DIAMETERS), sel('valve', 'Valve', [['PRESTA', 'Presta'], ['SCHRADER', 'Schrader']])],
    specs: [{ label: 'Diameter', key: 'wheelDiameter' }, { label: 'Fits From', key: 'minWidthMm', suffix: 'mm' }, { label: 'Fits To', key: 'maxWidthMm', suffix: 'mm' }, { label: 'Valve', key: 'valveType' }, { label: 'Valve Length', key: 'valveLengthMm', suffix: 'mm' }],
  },
  {
    slug: 'brake-calipers', label: 'Brake Calipers', builderOrder: 16,
    description: 'The unit that squeezes the rotor, or rim, to slow the wheel.',
    slots: [{ key: 'brakeCaliper', label: 'Brake Calipers' }],
    filters: [sel('mountType', 'Mount', BRAKE_MOUNTS), sel('fluid', 'Fluid', FLUIDS), yesno('hydraulic', 'Hydraulic')],
    specs: [{ label: 'Mount', key: 'mountType' }, { label: 'Native Rotor', key: 'nativeRotorMm', suffix: 'mm' }, { label: 'Fluid', key: 'fluidType' }, { label: 'System', key: 'brakeSystemFamily' }, { label: 'Pad Shape', key: 'padShape' }],
  },
  {
    slug: 'brake-levers', label: 'Brake Levers', builderOrder: 17,
    description: 'The handlebar controls that activate the brake calipers.',
    slots: [{ key: 'brakeLever', label: 'Brake Levers' }],
    filters: [sel('fluid', 'Fluid', FLUIDS), sel('barType', 'Bar Type', BAR_TYPES), yesno('hydraulic', 'Hydraulic')],
    specs: [{ label: 'Fluid', key: 'fluidType' }, { label: 'System', key: 'brakeSystemFamily' }, { label: 'Hydraulic', key: 'isHydraulic' }, { label: 'Clamp', key: 'clampDiameterMm', suffix: 'mm' }],
  },
  {
    slug: 'rotors', label: 'Rotors', builderOrder: 18,
    description: 'The metal disc bolted to the wheel hub that the brake caliper clamps onto.',
    slots: [{ key: 'frontRotor', label: 'Front Rotor' }, { key: 'rearRotor', label: 'Rear Rotor' }],
    filters: [range('diameter', 'Diameter', 'min', 'mm'), sel('mount', 'Mount', ROTOR_MOUNTS)],
    specs: [{ label: 'Diameter', key: 'diameterMm', suffix: 'mm' }, { label: 'Mount', key: 'mountStandard' }, { label: 'Lockring', key: 'lockringType' }, { label: 'Thickness', key: 'thicknessMm', suffix: 'mm' }],
  },
  {
    slug: 'handlebars', label: 'Handlebars', builderOrder: 19,
    description: 'What you hold to steer — also sets your hand position and reach.',
    slots: [{ key: 'handlebar', label: 'Handlebar' }],
    filters: [range('clamp', 'Clamp Diameter', 'min', 'mm'), sel('barType', 'Type', BAR_TYPES), range('minWidth', 'Min. Width', 'min', 'mm')],
    specs: [{ label: 'Clamp', key: 'clampDiameterMm', suffix: 'mm' }, { label: 'Control Area', key: 'controlClampDiameterMm', suffix: 'mm' }, { label: 'Type', key: 'barType' }, { label: 'Width', key: 'widthMm', suffix: 'mm' }, { label: 'Rise', key: 'riseMm', suffix: 'mm' }],
  },
  {
    slug: 'stems', label: 'Stems', builderOrder: 20,
    description: "Connects the handlebars to the fork's steerer tube, setting reach and handling.",
    slots: [{ key: 'stem', label: 'Stem' }],
    filters: [range('clamp', 'Bar Clamp', 'min', 'mm'), range('length', 'Length', 'min', 'mm')],
    specs: [{ label: 'Bar Clamp', key: 'barClampDiameterMm', suffix: 'mm' }, { label: 'Steerer', key: 'steererClampMm', suffix: 'mm' }, { label: 'Length', key: 'lengthMm', suffix: 'mm' }, { label: 'Rise', key: 'riseDegrees', suffix: '°' }],
  },
  {
    slug: 'seatposts', label: 'Seatposts', builderOrder: 21,
    description: "Holds the saddle at the right height inside the frame's seat tube.",
    slots: [{ key: 'seatpost', label: 'Seatpost' }],
    filters: [range('diameter', 'Diameter', 'min', 'mm'), ...grp('Dropper', yesno('dropper', 'Dropper'), range('minTravel', 'Min. Travel', 'min', 'mm'), sel('routing', 'Routing', [['INTERNAL', 'Internal'], ['EXTERNAL', 'External'], ['MIXED', 'Mixed'], ['NONE', 'Wireless']]))],
    specs: [{ label: 'Diameter', key: 'diameterMm', suffix: 'mm' }, { label: 'Length', key: 'totalLengthMm', suffix: 'mm' }, { label: 'Dropper', key: 'isDropper' }, { label: 'Travel', key: 'travelMm', suffix: 'mm' }, { label: 'Routing', key: 'routingType' }, { label: 'Remote', key: 'remoteType' }],
  },
  {
    slug: 'seat-clamps', label: 'Seat Clamps', builderOrder: 22,
    description: "Clamps the seatpost in place at the top of the frame's seat tube.",
    slots: [{ key: 'seatClamp', label: 'Seat Clamp' }],
    filters: [range('diameter', 'Diameter', 'min', 'mm')],
    specs: [{ label: 'Diameter', key: 'diameterMm', suffix: 'mm' }],
  },
  {
    slug: 'saddles', label: 'Saddles', builderOrder: 23,
    description: 'What you sit on — bolts to the top of the seatpost.',
    slots: [{ key: 'saddle', label: 'Saddle' }],
    filters: [sel('rail', 'Rails', [['ROUND_7MM', 'Round 7mm'], ['OVAL_7X9MM', 'Oval 7×9mm'], ['ROUND_8MM', 'Round 8mm']]), range('width', 'Width', 'min', 'mm')],
    specs: [{ label: 'Rails', key: 'railType' }, { label: 'Width', key: 'widthMm', suffix: 'mm' }],
  },
  {
    slug: 'pedals', label: 'Pedals', builderOrder: 24,
    description: 'Where your feet connect to the crankset, either flat or clipped in.',
    slots: [{ key: 'pedal', label: 'Pedals' }],
    filters: [sel('cleat', 'Cleat System', [['SPD', 'Shimano SPD'], ['SPD_SL', 'SPD-SL'], ['LOOK_KEO', 'Look Keo'], ['CRANK_BROTHERS', 'Crank Brothers'], ['TIME', 'Time'], ['SPEEDPLAY', 'Speedplay'], ['FLAT_NONE', 'Flat / none']]), sel('thread', 'Thread', [['NINE_SIXTEENTHS', '9/16"'], ['HALF_INCH', '1/2"']])],
    specs: [{ label: 'Thread', key: 'thread' }, { label: 'Cleat', key: 'cleatSystem' }],
  },
  {
    slug: 'shoes', label: 'Shoes', builderOrder: 25,
    description: 'Cycling shoes, sometimes with a sole cleat that locks into clipless pedals.',
    slots: [{ key: 'shoe', label: 'Shoes' }],
    filters: [sel('drilling', 'Sole Drilling', [['TWO_BOLT', '2-bolt'], ['THREE_BOLT', '3-bolt'], ['TWO_AND_THREE_BOLT', '2 & 3-bolt'], ['FLAT_NONE', 'Flat / none']])],
    specs: [{ label: 'Sole Drilling', key: 'soleDrilling' }],
  },
  {
    slug: 'chain-guides', label: 'Chain Guides', builderOrder: 26,
    description: 'Keeps the chain from derailing off the front chainring on rough terrain.',
    slots: [{ key: 'chainGuide', label: 'Chain Guide' }],
    filters: [sel('mount', 'Mount', [['ISCG_05', 'ISCG-05'], ['ISCG_OLD', 'ISCG old'], ['BB_MOUNT', 'BB mount']])],
    specs: [{ label: 'Mount', key: 'mountStandard' }, { label: 'Min Ring', key: 'minChainringTeeth', suffix: 't' }, { label: 'Max Ring', key: 'maxChainringTeeth', suffix: 't' }],
  },
  {
    slug: 'derailleur-hangers', label: 'Derailleur Hangers', builderOrder: 27,
    description: 'A small, sacrificial bracket bolting the rear derailleur to the frame — designed to bend or snap before the frame does in a crash.',
    slots: [{ key: 'derailleurHanger', label: 'Derailleur Hanger' }],
    filters: [sel('standard', 'Standard', [['UDH', 'UDH'], ['PROPRIETARY', 'Proprietary'], ['DIRECT_MOUNT', 'Direct mount']])],
    specs: [{ label: 'Standard', key: 'hangerStandard' }, { label: 'Model', key: 'model' }],
  },
];

export const CATEGORY_BY_SLUG: Record<string, CategoryConfig> = Object.fromEntries(
  CATEGORIES.map((c) => [c.slug, c])
);

// ------------------------------------------------------------
// SUBSYSTEM GROUPING
//
// 27 flat categories is too many to scan. Grouping them by the
// subsystem they belong to — and giving each group a hue — makes the
// catalogue navigable and colour-codes warnings back to their area.
// ------------------------------------------------------------

export type GroupKey = 'chassis' | 'drive' | 'wheel' | 'brake' | 'cockpit' | 'contact' | 'misc';

export const GROUPS: Record<GroupKey, { label: string; accent: string; soft: string; slugs: string[] }> = {
  chassis: {
    // Kept in sync with tailwind.config.ts's `chassis` colour by hand.
    label: 'Frame & Suspension', accent: '#A18800', soft: '#f1f5f9',
    slugs: ['frames', 'forks', 'headsets', 'rear-shocks'],
  },
  drive: {
    label: 'Drivetrain', accent: '#ea580c', soft: '#fff7ed',
    slugs: ['bottom-brackets', 'cranksets', 'chainrings', 'cassettes', 'chains', 'shifters', 'rear-derailleurs', 'front-derailleurs'],
  },
  wheel: {
    label: 'Wheels & Tyres', accent: '#059669', soft: '#ecfdf5',
    slugs: ['wheelsets', 'tyres', 'tubes'],
  },
  brake: {
    label: 'Brakes', accent: '#e11d48', soft: '#fff1f2',
    slugs: ['brake-calipers', 'brake-levers', 'rotors'],
  },
  cockpit: {
    label: 'Cockpit & Seating', accent: '#0284c7', soft: '#f0f9ff',
    slugs: ['handlebars', 'stems', 'seatposts', 'seat-clamps', 'saddles'],
  },
  contact: {
    // Kept in sync with the `contact` colour in tailwind.config.ts by hand
    // -- this file can't import Tailwind's resolved theme, so the two hex
    // values are duplicated deliberately rather than computed.
    label: 'Contact Points', accent: '#C8461E', soft: '#f1f5f9',
    slugs: ['pedals', 'shoes'],
  },
  misc: {
    label: 'Hardware', accent: '#475569', soft: '#f8fafc',
    slugs: ['chain-guides', 'derailleur-hangers'],
  },
};

export const GROUP_OF: Record<string, GroupKey> = Object.fromEntries(
  (Object.entries(GROUPS) as [GroupKey, { slugs: string[] }][])
    .flatMap(([key, g]) => g.slugs.map((s) => [s, key]))
);

export function accentFor(slug: string): { accent: string; soft: string; group: GroupKey } {
  const group = GROUP_OF[slug] ?? 'misc';
  return { accent: GROUPS[group].accent, soft: GROUPS[group].soft, group };
}

/** Every builder row, in display order — one per slot, so tyres/tubes/rotors appear twice. */
export const BUILDER_SLOTS: { slot: string; label: string; slug: string; position?: 'front' | 'rear' }[] =
  [...CATEGORIES]
    .sort((a, b) => a.builderOrder - b.builderOrder)
    .flatMap((c) => c.slots.map((s, i) => ({
      slot: s.key,
      label: s.label,
      slug: c.slug,
      ...(c.slots.length > 1 && { position: (i === 0 ? 'front' : 'rear') as 'front' | 'rear' }),
    })));

// ------------------------------------------------------------
// ENUM → LABEL
//
// Every option list above already pairs an enum member with its curated
// human label ("TAPERED_1_5_TO_1_125" → 'Tapered 1.5"–1.125"'). Spec lines
// used to ignore all of that and just strip underscores, which turned
// "T47_85_5" into "T47 85 5" -- punctuation lost on a tool whose whole
// pitch is exact specs. This collects every [value, label] pair from every
// category's filters into one lookup so a spec line renders the same words
// the filter dropdown does.
//
// Deliberately skipped: pure-numeric values (the SPEEDS list's '12' →
// '12-speed' would mislabel any other field that happened to hold a
// numeric string) and NONE, whose filter label 'Wireless' is only true for
// seatpost routing -- DropperRemoteType and IscgStandard both have a NONE
// too. Any value in more than one list must have one agreed label; a
// conflict is dropped from the map so it falls through to the generic
// formatter rather than picking a side silently.
// ------------------------------------------------------------
const SPEC_LABELS: Record<string, string> = (() => {
  const seen = new Map<string, string>();
  const conflicts = new Set<string>(['NONE']);
  for (const c of CATEGORIES) {
    for (const f of c.filters) {
      for (const o of f.options ?? []) {
        if (/^\d+$/.test(o.value)) continue;
        const prev = seen.get(o.value);
        if (prev !== undefined && prev !== o.label) conflicts.add(o.value);
        else seen.set(o.value, o.label);
      }
    }
  }
  for (const k of conflicts) seen.delete(k);
  return Object.fromEntries(seen);
})();

/** Fallback for enum strings with no curated label. Restores the
 *  punctuation the enum encoding stripped, then underscore → space:
 *    M12_x_1_0    → "M12 x 1.0"      (`_x_` is a literal ×; 1_0 a decimal)
 *    T47_85_5     → "T47 85.5"
 *    CLAMP_31_8   → "CLAMP 31.8"
 *    POST_MOUNT_180 → "POST MOUNT 180" (single numeric token: no decimal)
 *  A decimal is only ever two *whole* numeric tokens side by side, so
 *  "BB30_30" (token BB30 isn't numeric) stays "BB30 30", not "BB30.30". */
function humaniseEnum(value: string): string {
  return value
    .replace(/(^|_)(\d+)_(\d+)(?=_|$)/g, '$1$2.$3')
    .replace(/_x_/g, ' x ')
    .replace(/_/g, ' ');
}

/** Enum values print via their curated filter label where one exists
 *  ("Post Mount 180", 'Straight 1.125"'), else via humaniseEnum
 *  ("T47 85.5"); booleans as Yes/No.
 *
 *  Self-test (run against this file with tsx on 2026-08-17, all pass):
 *    formatSpecValue('TAPERED_1_5_TO_1_125') === 'Tapered 1.5"–1.125"'
 *    formatSpecValue('T47_85_5')             === 'T47 85.5'
 *    formatSpecValue('BB30_30')              === 'BB30 30'
 *    formatSpecValue('M12_x_1_0')            === 'M12 x 1.0'
 *    formatSpecValue('M12_x_1_75')           === 'M12 x 1.75'
 *    formatSpecValue('CLAMP_31_8')           === 'Clamp 31.8'
 *    formatSpecValue('STRAIGHT_1_125')       === 'Straight 1.125"'
 *    formatSpecValue('POST_MOUNT_180')       === 'Post Mount 180'
 *    formatSpecValue('THRU_AXLE_148x12_BOOST') === 'Boost 148×12'
 *    formatSpecValue('NONE')                 === 'NONE'   (ambiguous, not mapped)
 *    formatSpecValue('SOME_UNKNOWN_1_5')     === 'SOME UNKNOWN 1.5'
 *    formatSpecValue(160, 'mm')              === '160mm'
 *    formatSpecValue(true)                   === 'Yes'
 *    formatSpecValue(null)                   === '—' */
export function formatSpecValue(value: unknown, suffix?: string): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return `${SPEC_LABELS[value] ?? humaniseEnum(value)}${suffix ?? ''}`;
  return `${value}${suffix ?? ''}`;
}
