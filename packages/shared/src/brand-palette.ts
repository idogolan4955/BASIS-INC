// The BASIS palette as numbered data: the same 24 tones as the tokens in
// packages/ui/src/theme.css and the sheet in docs/design/palette.png, in the
// same order, so a tone is named by its number everywhere, on screen, in
// conversation and on a document put in front of a supplier.

export type PaletteGroup = 'material' | 'status' | 'rail';

export interface PaletteTone {
  /** Two-digit number on the sheet, 01 to 24. */
  readonly number: string;
  readonly name: string;
  readonly hex: string;
  readonly group: PaletteGroup;
  readonly use: string;
}

const tone = (number: number, name: string, hex: string, group: PaletteGroup, use: string): PaletteTone => ({ number: String(number).padStart(2, '0'), name, hex, group, use });

export const BRAND_PALETTE: readonly PaletteTone[] = [
  tone(1, 'milk', '#FBF8F3', 'material', 'Panels. Paper, lining'),
  tone(2, 'bone', '#F3EEE6', 'material', 'The page'),
  tone(3, 'linen', '#ECE5D9', 'material', 'Sunken areas, title band'),
  tone(4, 'sand', '#E3D8C8', 'material', 'Selection, strong tints'),
  tone(5, 'powder', '#F0DFD5', 'material', 'Light powder. Tints that read as skin'),
  tone(6, 'powder-deep', '#E5C9BA', 'material', 'Deeper powder. Selection in skin context'),
  tone(7, 'nude', '#C4A88E', 'material', 'Brand skin tone. Selvedge, avatars'),
  tone(8, 'nude-deep', '#9F7A5C', 'material', 'Accent on light surfaces'),
  tone(9, 'cocoa', '#6B4F3F', 'material', 'Secondary text'),
  tone(10, 'charcoal', '#2B2724', 'material', 'Primary text'),
  tone(11, 'black', '#171310', 'material', 'Deepest tone, restrained'),
  tone(12, 'stone', '#6F655C', 'material', 'Muted text'),
  tone(13, 'moss', '#56633F', 'status', 'Positive: pass, released, on track, delivered, paid'),
  tone(14, 'ochre', '#875C14', 'status', 'Caution: conditional, at risk, expiring, awaiting'),
  tone(15, 'madder', '#8F3A2B', 'status', 'Critical: fail, delayed, blocked, overdue'),
  tone(16, 'slate', '#4B5661', 'status', 'Transit: in progress, in transit, in production'),
  tone(17, 'stone', '#6F655C', 'status', 'Neutral: draft, planned, archived'),
  tone(18, 'rail', '#2B2522', 'rail', 'The index rail'),
  tone(19, 'rail-raised', '#3B322D', 'rail', 'The open row'),
  tone(20, 'rail-line', '#453B35', 'rail', 'Dividers on the rail'),
  tone(21, 'rail-ink', '#EFE6DA', 'rail', 'Text on the rail'),
  tone(22, 'rail-muted', '#A8998B', 'rail', 'Muted text on the rail'),
  tone(23, 'line', '#E2DACD', 'rail', 'Hairlines'),
  tone(24, 'line-strong', '#C9BDAD', 'rail', 'Strong hairlines, underlines'),
];

export const PALETTE_GROUP_LABEL: Record<PaletteGroup, string> = { material: 'Material · surfaces and ink', status: 'Status · earth pigments', rail: 'Rail and hairlines' };
