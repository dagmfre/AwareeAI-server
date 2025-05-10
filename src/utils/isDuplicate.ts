import fs from "fs";
import crypto from "crypto";
import SharedDoc from "../models/SharedDoc";

export default async function isDuplicateContent(
  filePath: string
): Promise<string | null> {
  try {
    // Generate a hash of the file content
    const fileContent = fs.readFileSync(filePath);
    const contentHash = crypto
      .createHash("sha256")
      .update(fileContent)
      .digest("hex");

    // Check if any document with the same content hash exists
    const existingDoc = await SharedDoc.findOne({ contentHash });

    if (existingDoc) {
      return existingDoc.r2rDocumentId;
    }

    return null;
  } catch (error) {
    console.error("Error checking for duplicate content:", error);
    return null;
  }
}
