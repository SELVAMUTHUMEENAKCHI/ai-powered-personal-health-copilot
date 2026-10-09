import { Interpretation, AbnormalFinding } from '@health-copilot/shared';

export interface ReferenceRange {
  low: number | null;
  high: number | null;
  rawText?: string | null;
}

/**
 * Deterministic code-based evaluation of a laboratory test value against its printed reference range.
 * NEVER uses an LLM for classification.
 * If no reference range exists or is incomplete, returns 'UNSPECIFIED' (do NOT flag as abnormal).
 */
export function evaluateTestValue(
  value: number | string,
  referenceRange?: ReferenceRange | null
): Interpretation {
  if (!referenceRange || (referenceRange.low === null && referenceRange.high === null)) {
    return 'UNSPECIFIED'; // No printed reference range in report -> never flag
  }

  // Parse numerical value
  const numVal =
    typeof value === 'number'
      ? value
      : parseFloat(String(value).replace(/[^0-9.-]/g, ''));

  if (isNaN(numVal)) {
    return 'UNSPECIFIED';
  }

  // Check bounds
  if (referenceRange.low !== null && numVal < referenceRange.low) {
    return 'LOW';
  }

  if (referenceRange.high !== null && numVal > referenceRange.high) {
    return 'HIGH';
  }

  return 'NORMAL';
}

/**
 * Generates a medically safe, non-diagnostic plain-language note for an abnormal finding.
 */
export function generateAbnormalNote(
  testName: string,
  value: number | string,
  unit: string | null,
  interpretation: Interpretation,
  referenceRange?: ReferenceRange | null
): string {
  const unitStr = unit ? ` ${unit}` : '';
  const rangeStr =
    referenceRange && referenceRange.low !== null && referenceRange.high !== null
      ? ` (reference range: ${referenceRange.low}–${referenceRange.high}${unitStr})`
      : '';

  if (interpretation === 'HIGH') {
    return `Your ${testName} value (${value}${unitStr}) is above the reference range shown in the report${rangeStr}. Please discuss this with a qualified healthcare professional.`;
  }

  if (interpretation === 'LOW') {
    return `Your ${testName} value (${value}${unitStr}) is below the reference range shown in the report${rangeStr}. Please discuss this with a qualified healthcare professional.`;
  }

  return `Your ${testName} value is within the report's reference range.`;
}

/**
 * Evaluates an entire list of extracted tests and returns abnormal findings.
 */
export function processAbnormalFindings(
  tests: Array<{
    name: string;
    value: number | string;
    unit: string | null;
    referenceRange: ReferenceRange | null;
  }>
): AbnormalFinding[] {
  const abnormalList: AbnormalFinding[] = [];

  for (const test of tests) {
    const interpretation = evaluateTestValue(test.value, test.referenceRange);
    if (interpretation === 'HIGH' || interpretation === 'LOW') {
      abnormalList.push({
        testName: test.name,
        value: test.value,
        unit: test.unit,
        referenceRange: test.referenceRange,
        interpretation,
        plainLanguageNote: generateAbnormalNote(
          test.name,
          test.value,
          test.unit,
          interpretation,
          test.referenceRange
        ),
      });
    }
  }

  return abnormalList;
}
