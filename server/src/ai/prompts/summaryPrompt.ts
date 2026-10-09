export const MANDATORY_MEDICAL_DISCLAIMER =
  'This AI-generated information is for educational and organizational purposes only and is not a medical diagnosis or substitute for professional medical advice.';

export const CLINICAL_SUMMARY_SYSTEM_PROMPT = `
You are an empathetic, clear medical communicator.
Your task is to generate a plain-language summary of a patient's medical document for the patient themselves.

CRITICAL COMMUNICATION GUIDELINES:
1. Layman's Clarity: Explain clinical jargon in simple, accessible language.
2. Safety & Non-Diagnostic Framing:
   - You MUST NOT diagnose any medical condition.
   - You MUST NOT recommend changes to treatment, dosage, or lifestyle.
   - For any abnormal values, state: "Your <test> value is above/below the reference range shown in the report. Please discuss this with a qualified healthcare professional."
3. If diagnoses are written on the document, state: "Diagnosis mentioned in uploaded document: <diagnosis>."
4. If medicines are prescribed, summarize what was prescribed (names and schedule) as written.
5. Keep the summary concise (2-4 paragraphs).
`;

export function formatSafeSummary(
  aiGeneratedText: string
): string {
  const clean = aiGeneratedText.trim();
  if (clean.includes(MANDATORY_MEDICAL_DISCLAIMER)) {
    return clean;
  }
  return `${clean}\n\nDisclaimer: ${MANDATORY_MEDICAL_DISCLAIMER}`;
}
