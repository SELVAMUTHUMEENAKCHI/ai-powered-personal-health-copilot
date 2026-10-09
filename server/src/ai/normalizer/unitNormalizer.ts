/**
 * Standardizes common clinical laboratory unit representations.
 */
export function normalizeUnit(rawUnit: string | null | undefined): string | null {
  if (!rawUnit || typeof rawUnit !== 'string') return null;

  const trimmed = rawUnit.trim();
  const lower = trimmed.toLowerCase();

  const standardMap: Record<string, string> = {
    'mg/dl': 'mg/dL',
    'mg/dl.': 'mg/dL',
    'mg / dl': 'mg/dL',
    'g/dl': 'g/dL',
    'gm/dl': 'g/dL',
    'g/l': 'g/L',
    'mmol/l': 'mmol/L',
    'umol/l': 'µmol/L',
    'µmol/l': 'µmol/L',
    'u/l': 'U/L',
    'iu/l': 'IU/L',
    'ng/ml': 'ng/mL',
    'pg/ml': 'pg/mL',
    '%': '%',
    'cells/cumm': 'cells/cu.mm',
    'cells/mcl': 'cells/µL',
    'mm/hr': 'mm/hr',
    'fl': 'fL',
  };

  return standardMap[lower] || trimmed;
}
