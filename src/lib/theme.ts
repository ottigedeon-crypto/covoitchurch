/**
 * Palette Covoit'Church.
 *
 * La couleur principale est celle du logo : le bleu marine profond de la rose
 * des vents, relevé au pixel sur l'icône du site (#032451). Le violet ICC reste
 * comme accent — sélections, points forts — et le blanc porte le reste.
 * Pas de vert.
 */
export const C = {
  white: "#FFFFFF",

  // Bleu du logo — la couleur d'action
  brand: "#032451",
  brandDeep: "#011A3D",
  brandLight: "#1B4A8F",
  brandSoft: "#E8EEF7",
  brandLine: "#BACCE4",

  // Violet ICC — l'accent
  violet: "#5B2D8E",
  violetSoft: "#F0E9F9",
  violetLine: "#D9C7F0",

  // Bleu marine de texte, plus sourd que celui du logo
  navy: "#0D1B2A",
  navySoft: "#E8EAEE",
  navyLine: "#C3C9D2",

  // Signal d'attente, réservé aux statuts de pointage
  sunny: "#C8860D",
  sunnySoft: "#FBF1DE",

  // Encre et surfaces
  ink: "#0D1B2A",
  inkSoft: "#54617A",
  inkFaint: "#8B95A8",
  line: "#E3E8F0",
  canvas: "#F8FAFD",

  // États
  danger: "#C0322B",
  dangerSoft: "#FBEBEA",
  ok: "#032451",
  okSoft: "#E8EEF7",
  warnBg: "#FBF1DE",
  warnInk: "#7A5209",
};

/** Dégradés des boutons, en-têtes et fonds animés. */
export const G = {
  brand: ["#1B4A8F", "#022350"] as const,
  night: ["#0D1B2A", "#011A3D"] as const,
  violet: ["#7B4FB8", "#4A1F7A"] as const,
};

/** Accent par statut de pointage : bleu = présent, ambre = en route, violet = plus tard. */
export const STATUS_TONE = {
  here: { bg: C.brandSoft, ink: C.brandDeep, solid: C.brand },
  eta_5: { bg: C.sunnySoft, ink: C.warnInk, solid: C.sunny },
  eta_10plus: { bg: C.violetSoft, ink: "#4A1F7A", solid: C.violet },
} as const;
