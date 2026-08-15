import React, { useMemo, useState } from "react";

// ============================================================
// COMPATIBILITY ENGINE (same rules as src/compatibility/engine.ts)
// ============================================================

function humanize(value) {
  return value.replace(/_/g, " ");
}

function getClearanceForDiameter(frameOrFork, tireDiameter) {
  if (tireDiameter === frameOrFork.wheelDiameter) return frameOrFork.maxTireWidthMm;
  if (tireDiameter === "ISO_584" && frameOrFork.maxTireWidthMm650b != null) {
    return frameOrFork.maxTireWidthMm650b;
  }
  return null;
}

function checkBbShellMatch(frame, bb) {
  if (!frame || !bb) return null;
  if (frame.bbShellStandard === bb.frameInterface) return null;
  return { id: "bb-shell-mismatch", severity: "critical", components: ["frame", "bottomBracket"] };
}
function checkSpindleMatch(bb, crankset) {
  if (!bb || !crankset) return null;
  if (bb.spindleInterface === crankset.spindleDiameter) return null;
  return { id: "spindle-mismatch", severity: "critical", components: ["bottomBracket", "crankset"] };
}
function checkRearBrakeMount(frame, caliper) {
  if (!frame || !caliper) return null;
  if (frame.rearBrakeMountType === caliper.mountType) return null;
  return { id: "rear-brake-mount-mismatch", severity: "critical", components: ["frame", "brakeCaliper"] };
}
function checkFrontBrakeMount(fork, caliper) {
  if (!fork || !caliper) return null;
  if (fork.brakeMountType === caliper.mountType) return null;
  return { id: "front-brake-mount-mismatch", severity: "critical", components: ["fork", "brakeCaliper"] };
}
function checkRearAxleMatch(frame, wheelset) {
  if (!frame || !wheelset) return null;
  if (frame.rearAxleType === wheelset.rearAxleType) return null;
  return { id: "rear-axle-mismatch", severity: "critical", components: ["frame", "wheelset"] };
}
function checkFrontAxleMatch(fork, wheelset) {
  if (!fork || !wheelset) return null;
  if (fork.frontAxleType === wheelset.frontAxleType) return null;
  return { id: "front-axle-mismatch", severity: "critical", components: ["fork", "wheelset"] };
}
function checkHeadsetTaper(frame, fork) {
  if (!frame || !fork) return null;
  if (frame.headsetTaper === fork.steererTubeTaper) return null;
  return { id: "headset-taper-mismatch", severity: "critical", components: ["frame", "fork"] };
}
function checkRearTireClearance(frame, wheelset, tire) {
  if (!frame || !wheelset || !tire) return null;
  if (tire.wheelDiameter !== wheelset.wheelDiameter) {
    return { id: "rear-tire-wheel-diameter-mismatch", severity: "critical", components: ["wheelset", "rearTire"] };
  }
  const limit = getClearanceForDiameter(frame, tire.wheelDiameter);
  if (limit === null) return null;
  if (tire.widthMm > limit) {
    return { id: "rear-tire-clearance-exceeded", severity: "critical", components: ["frame", "rearTire"] };
  }
  return null;
}
function checkFrontTireClearance(fork, wheelset, tire) {
  if (!fork || !wheelset || !tire) return null;
  if (tire.wheelDiameter !== wheelset.wheelDiameter) {
    return { id: "front-tire-wheel-diameter-mismatch", severity: "critical", components: ["wheelset", "frontTire"] };
  }
  const limit = getClearanceForDiameter(fork, tire.wheelDiameter);
  if (limit === null) return null;
  if (tire.widthMm > limit) {
    return { id: "front-tire-clearance-exceeded", severity: "critical", components: ["fork", "frontTire"] };
  }
  return null;
}

function getCompatibilityWarnings(build) {
  return [
    checkBbShellMatch(build.frame, build.bottomBracket),
    checkSpindleMatch(build.bottomBracket, build.crankset),
    checkRearBrakeMount(build.frame, build.brakeCaliper),
    checkFrontBrakeMount(build.fork, build.brakeCaliper),
    checkRearAxleMatch(build.frame, build.wheelset),
    checkFrontAxleMatch(build.fork, build.wheelset),
    checkHeadsetTaper(build.frame, build.fork),
    checkRearTireClearance(build.frame, build.wheelset, build.rearTire),
    checkFrontTireClearance(build.fork, build.wheelset, build.frontTire),
  ].filter(Boolean);
}

function isOptionCompatible(build, slotKey, candidate) {
  const hypothetical = { ...build, [slotKey]: candidate };
  const warnings = getCompatibilityWarnings(hypothetical);
  return !warnings.some((w) => w.severity === "critical" && w.components.includes(slotKey));
}

// ============================================================
// CATALOG
// ============================================================

const catalog = {
  frame: [
    { id: "f1", brand: "Santa Cruz", name: "Hightower CC (2024)", price: 3199, bbShellStandard: "BSA_73", rearAxleType: "THRU_AXLE_148x12_BOOST", headsetTaper: "TAPERED_1_5_TO_1_125", rearBrakeMountType: "POST_MOUNT_180", wheelDiameter: "ISO_622", maxTireWidthMm: 63 },
    { id: "f2", brand: "Trek", name: "Fuel EX 9.8 Frameset", price: 2999, bbShellStandard: "PF92", rearAxleType: "THRU_AXLE_148x12_BOOST", headsetTaper: "TAPERED_1_5_TO_1_125", rearBrakeMountType: "POST_MOUNT_180", wheelDiameter: "ISO_622", maxTireWidthMm: 66 },
    { id: "f3", brand: "Specialized", name: "Epic 8 Expert Frameset", price: 2799, bbShellStandard: "BSA_73", rearAxleType: "THRU_AXLE_148x12_BOOST", headsetTaper: "TAPERED_1_5_TO_1_125", rearBrakeMountType: "FLAT_MOUNT", wheelDiameter: "ISO_622", maxTireWidthMm: 58 },
  ],
  fork: [
    { id: "fk1", brand: "RockShox", name: "Pike Ultimate (140mm)", price: 1099, steererTubeTaper: "TAPERED_1_5_TO_1_125", frontAxleType: "THRU_AXLE_110x15_BOOST", brakeMountType: "POST_MOUNT_160", wheelDiameter: "ISO_622", maxTireWidthMm: 66 },
    { id: "fk2", brand: "FOX", name: "36 Factory GRIP2 (160mm)", price: 1199, steererTubeTaper: "TAPERED_1_5_TO_1_125", frontAxleType: "THRU_AXLE_110x15_BOOST", brakeMountType: "POST_MOUNT_180", wheelDiameter: "ISO_622", maxTireWidthMm: 66 },
    { id: "fk3", brand: "RockShox", name: "SID SL Ultimate (100mm)", price: 999, steererTubeTaper: "TAPERED_1_5_TO_1_125", frontAxleType: "THRU_AXLE_110x15_BOOST", brakeMountType: "POST_MOUNT_160", wheelDiameter: "ISO_622", maxTireWidthMm: 58 },
  ],
  bottomBracket: [
    { id: "bb1", brand: "SRAM", name: "DUB BSA Threaded", price: 40, frameInterface: "BSA_73", spindleInterface: "DUB_29" },
    { id: "bb2", brand: "Shimano", name: "SM-BB52 BSA Threaded", price: 35, frameInterface: "BSA_73", spindleInterface: "HOLLOWTECH_II_24" },
    { id: "bb3", brand: "Wheels Mfg", name: "PF92 for HollowTech II", price: 60, frameInterface: "PF92", spindleInterface: "HOLLOWTECH_II_24" },
  ],
  crankset: [
    { id: "cr1", brand: "SRAM", name: "XX SL Eagle Transmission", price: 600, spindleDiameter: "DUB_29" },
    { id: "cr2", brand: "Shimano", name: "Deore XT M8100", price: 150, spindleDiameter: "HOLLOWTECH_II_24" },
    { id: "cr3", brand: "SRAM", name: "GX Eagle DUB", price: 150, spindleDiameter: "DUB_29" },
  ],
  wheelset: [
    { id: "w1", brand: "Roval", name: "Control SL", price: 1900, wheelDiameter: "ISO_622", frontAxleType: "THRU_AXLE_110x15_BOOST", rearAxleType: "THRU_AXLE_148x12_BOOST" },
    { id: "w2", brand: "DT Swiss", name: "XM1700 Spline", price: 550, wheelDiameter: "ISO_622", frontAxleType: "THRU_AXLE_110x15_BOOST", rearAxleType: "THRU_AXLE_148x12_BOOST" },
    { id: "w3", brand: "Stan's NoTubes", name: "Flow S2 (Super Boost)", price: 500, wheelDiameter: "ISO_622", frontAxleType: "THRU_AXLE_110x15_BOOST", rearAxleType: "THRU_AXLE_157x12_SUPERBOOST" },
  ],
  rearTire: [
    { id: "rt1", brand: "Maxxis", name: "Minion DHR II 29x2.4\"", price: 80, wheelDiameter: "ISO_622", widthMm: 61 },
    { id: "rt2", brand: "Maxxis", name: "Rekon Race 29x2.25\"", price: 65, wheelDiameter: "ISO_622", widthMm: 57 },
    { id: "rt3", brand: "Continental", name: "Kryptotal Fr 29x2.4\"", price: 90, wheelDiameter: "ISO_622", widthMm: 61 },
  ],
  frontTire: [
    { id: "ft1", brand: "Maxxis", name: "Minion DHF 29x2.5\"", price: 85, wheelDiameter: "ISO_622", widthMm: 63 },
    { id: "ft2", brand: "Maxxis", name: "Rekon Race 29x2.25\"", price: 65, wheelDiameter: "ISO_622", widthMm: 57 },
  ],
  brakeCaliper: [
    { id: "bc1", brand: "SRAM", name: "Level Ultimate", price: 200, mountType: "FLAT_MOUNT" },
    { id: "bc2", brand: "Shimano", name: "Deore XT M8120 4-Piston", price: 150, mountType: "POST_MOUNT_180" },
    { id: "bc3", brand: "SRAM", name: "Code RSC", price: 180, mountType: "POST_MOUNT_160" },
  ],
};

const slotLabels = {
  frame: "Frame",
  fork: "Fork",
  bottomBracket: "Bottom Bracket",
  crankset: "Crankset",
  wheelset: "Wheelset",
  frontTire: "Front Tire",
  rearTire: "Rear Tire",
  brakeCaliper: "Brake Calipers",
};

const slotOrder = Object.keys(slotLabels);

function getLockReason(slotKey, build) {
  if (slotKey === "frame") return null;
  if (!build.frame) return "Select a frame first";
  if ((slotKey === "frontTire" || slotKey === "rearTire") && !build.wheelset) {
    return "Select a wheelset first";
  }
  return null;
}

// ============================================================
// ICONS
// Simple original line-art per category rather than real product
// photography — actual manufacturer photos would mean hotlinking
// to retailer CDNs (unreliable, and not something to reproduce
// without a license). These are generic and safe to ship inline.
// ============================================================

const iconStroke = "#4b5563";

function FrameIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36">
      <circle cx="12" cy="34" r="7" fill="none" stroke={iconStroke} strokeWidth="2.5" />
      <circle cx="36" cy="34" r="7" fill="none" stroke={iconStroke} strokeWidth="2.5" />
      <path d="M12 34 L22 14 L36 34 M22 14 L28 14 M12 34 L28 14" fill="none" stroke={iconStroke} strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}
function ForkIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36">
      <path d="M18 8 L18 24 M30 8 L30 24 M18 24 Q24 30 24 40 M30 24 Q24 30 24 40" fill="none" stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="42" r="3" fill={iconStroke} />
    </svg>
  );
}
function BottomBracketIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36">
      <circle cx="24" cy="24" r="10" fill="none" stroke={iconStroke} strokeWidth="2.5" />
      <circle cx="24" cy="24" r="3" fill={iconStroke} />
    </svg>
  );
}
function CranksetIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36">
      <circle cx="24" cy="24" r="14" fill="none" stroke={iconStroke} strokeWidth="2" strokeDasharray="3 3" />
      <line x1="24" y1="24" x2="24" y2="6" stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="3" fill={iconStroke} />
    </svg>
  );
}
function WheelsetIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36">
      <circle cx="24" cy="24" r="16" fill="none" stroke={iconStroke} strokeWidth="2.5" />
      <circle cx="24" cy="24" r="3" fill={iconStroke} />
      {[0, 60, 120].map((deg) => (
        <line key={deg} x1="24" y1="24" x2={24 + 16 * Math.cos((deg * Math.PI) / 180)} y2={24 + 16 * Math.sin((deg * Math.PI) / 180)} stroke={iconStroke} strokeWidth="1.5" />
      ))}
    </svg>
  );
}
function TireIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36">
      <circle cx="24" cy="24" r="16" fill="none" stroke={iconStroke} strokeWidth="5" strokeDasharray="2 3" />
      <circle cx="24" cy="24" r="9" fill="none" stroke={iconStroke} strokeWidth="1.5" />
    </svg>
  );
}
function BrakeIcon() {
  return (
    <svg viewBox="0 0 48 48" width="36" height="36">
      <path d="M16 10 L16 38 M32 10 L32 38" stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12 18 L20 18 M28 18 L36 18 M12 30 L20 30 M28 30 L36 30" stroke={iconStroke} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

const slotIcons = {
  frame: FrameIcon,
  fork: ForkIcon,
  bottomBracket: BottomBracketIcon,
  crankset: CranksetIcon,
  wheelset: WheelsetIcon,
  frontTire: TireIcon,
  rearTire: TireIcon,
  brakeCaliper: BrakeIcon,
};

// ============================================================
// STYLE
// ============================================================

const colors = {
  textPrimary: "#1a1a1a",
  textSecondary: "#6b6b6b",
  textDisabled: "#b0b0ae",
  link: "#2563eb",
  border: "#e2e2e0",
  surface: "#ffffff",
  surfaceDisabled: "#f7f7f6",
  successBg: "#eaf3de",
  successBorder: "#97c459",
  successText: "#27500a",
};

const styles = {
  container: { maxWidth: 640, margin: "0 auto", padding: "1.5rem 1rem", fontFamily: "system-ui, sans-serif" },
  heading: { fontSize: 18, fontWeight: 600, margin: "0 0 4px", color: colors.textPrimary },
  subheading: { fontSize: 14, color: colors.textSecondary, margin: "0 0 20px" },
  statusBar: {
    borderRadius: 8, padding: "0.75rem 1rem", marginBottom: "1.25rem",
    background: colors.successBg, border: `1px solid ${colors.successBorder}`, color: colors.successText,
    display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500,
  },
  partsList: { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: "0 1rem", marginBottom: "0.75rem" },
  partRow: (isFirst) => ({
    display: "flex", alignItems: "center", gap: 14,
    padding: "12px 0", borderTop: isFirst ? "none" : `1px solid ${colors.border}`,
  }),
  iconBox: (disabled) => ({
    width: 44, height: 44, borderRadius: 8, background: disabled ? colors.surfaceDisabled : "#f4f4f2",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, opacity: disabled ? 0.4 : 1,
  }),
  labelButton: (disabled) => ({
    fontSize: 13, fontWeight: 500, background: "none", border: "none", padding: 0, textAlign: "left",
    color: disabled ? colors.textDisabled : colors.link,
    cursor: disabled ? "not-allowed" : "pointer",
    textDecoration: disabled ? "none" : "underline",
    textUnderlineOffset: "2px",
  }),
  selectionText: (empty) => ({ fontSize: 13, color: empty ? colors.textDisabled : colors.textPrimary, marginTop: 2 }),
  lockHint: { fontSize: 11, color: colors.textDisabled, fontStyle: "italic", marginTop: 2 },
  totals: { display: "flex", justifyContent: "space-between", fontSize: 13, color: colors.textSecondary, padding: "0 4px", marginBottom: "1.25rem" },
  backButton: { fontSize: 13, color: colors.link, background: "none", border: "none", padding: 0, cursor: "pointer", marginBottom: 16, display: "flex", alignItems: "center", gap: 4 },
  optionCard: {
    display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", border: `1px solid ${colors.border}`,
    borderRadius: 10, marginBottom: 8, cursor: "pointer", background: colors.surface, width: "100%", textAlign: "left",
  },
  optionIconBox: { width: 48, height: 48, borderRadius: 8, background: "#f4f4f2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
};

// ============================================================
// UI
// ============================================================

export default function BikeBuilderMock() {
  const [selection, setSelection] = useState({});
  // `null` = main builder view; a slot key = browsing that category
  const [browsingSlot, setBrowsingSlot] = useState(null);

  const build = useMemo(() => {
    const result = {};
    for (const key of slotOrder) {
      const id = selection[key];
      if (id) result[key] = catalog[key].find((p) => p.id === id);
    }
    return result;
  }, [selection]);

  const filledCount = slotOrder.filter((k) => build[k]).length;
  const totalPrice = slotOrder.reduce((sum, key) => sum + (build[key]?.price ?? 0), 0);

  function handleSelect(key, id) {
    setSelection((prev) => {
      const next = { ...prev, [key]: id };
      const hypotheticalBuild = {};
      for (const k of slotOrder) {
        const partId = next[k];
        if (partId) hypotheticalBuild[k] = catalog[k].find((p) => p.id === partId);
      }
      for (const k of slotOrder) {
        if (k === key || !hypotheticalBuild[k]) continue;
        if (!isOptionCompatible({ ...hypotheticalBuild, [k]: undefined }, k, hypotheticalBuild[k])) {
          delete next[k];
        }
      }
      return next;
    });
    setBrowsingSlot(null);
  }

  // ----------------------------------------------------------
  // CATEGORY BROWSE PAGE
  // ----------------------------------------------------------
  if (browsingSlot) {
    const Icon = slotIcons[browsingSlot];
    const options = catalog[browsingSlot].filter((opt) => isOptionCompatible(build, browsingSlot, opt));

    return (
      <div style={styles.container}>
        <button style={styles.backButton} onClick={() => setBrowsingSlot(null)}>
          ← Back to builder
        </button>
        <h2 style={styles.heading}>{slotLabels[browsingSlot]}</h2>
        <p style={styles.subheading}>
          Showing all {options.length} compatible products
        </p>

        {options.map((opt) => (
          <button key={opt.id} style={styles.optionCard} onClick={() => handleSelect(browsingSlot, opt.id)}>
            <div style={styles.optionIconBox}>
              <Icon />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: colors.textSecondary }}>{opt.brand}</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: colors.textPrimary }}>{opt.name}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>${opt.price}</div>
          </button>
        ))}
      </div>
    );
  }

  // ----------------------------------------------------------
  // MAIN BUILDER VIEW
  // ----------------------------------------------------------
  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Bike Builder</h2>
      <p style={styles.subheading}>Click a part name to browse compatible options.</p>

      <div style={styles.statusBar}>
        <span>✓</span>
        {filledCount === 0 ? "Start by picking a frame" : `${filledCount} of ${slotOrder.length} slots filled — every option shown fits`}
      </div>

      <div style={styles.partsList}>
        {slotOrder.map((key, i) => {
          const lockReason = getLockReason(key, build);
          const disabled = Boolean(lockReason);
          const Icon = slotIcons[key];
          const selectedPart = build[key];

          return (
            <div key={key} style={styles.partRow(i === 0)}>
              <div style={styles.iconBox(disabled)}>
                <Icon />
              </div>
              <div style={{ flex: 1 }}>
                <button
                  style={styles.labelButton(disabled)}
                  disabled={disabled}
                  onClick={() => setBrowsingSlot(key)}
                >
                  {slotLabels[key]}
                </button>
                <div style={styles.selectionText(!selectedPart)}>
                  {selectedPart ? `${selectedPart.brand} ${selectedPart.name} — $${selectedPart.price}` : "None selected"}
                </div>
                {lockReason && <div style={styles.lockHint}>{lockReason}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.totals}>
        <span>{filledCount} of {slotOrder.length} slots filled</span>
        <span>Total: <strong style={{ color: colors.textPrimary }}>${totalPrice.toLocaleString()}</strong></span>
      </div>
    </div>
  );
}
