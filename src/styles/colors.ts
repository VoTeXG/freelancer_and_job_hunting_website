// Centralized brand colors to import in components
// Primary blue matches Tailwind blue-600
export const Colors = {
  primaryBlue: '#2563EB', // Tailwind blue-600
  accentAmber: '#F59E0B', // Tailwind amber-500 (complementary accent)
  accentTeal: '#14B8A6',  // Tailwind teal-500 (fresh accent)
  accentPurple: '#9333EA', // Tailwind purple-600 (analogous)
  neutralText: '#0F172A', // slate-900
  neutralBg: '#F1F5F9',   // slate-100
} as const;

export type ColorKey = keyof typeof Colors;
