import r2r from "../config/r2r";

export default async function waitForSummary(
  documentId: string,
  maxAttempts = 10,
  delayMs = 2000
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await r2r.documents.retrieve({ id: documentId });
    const { ingestionStatus, extractionStatus, summary } = response.results;
    if (
      ingestionStatus === "success" &&
      extractionStatus === "success" &&
      summary
    ) {
      return summary;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}
