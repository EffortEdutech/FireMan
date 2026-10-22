export const correctiveRepairPhotoLimit = 4;
export const correctiveRepairPhotoMaxBytes = 6 * 1024 * 1024;
export const correctiveRepairPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function isValidRepairSubmission(notes: string | null, partsUsed: string | null) {
  const trimmedNotes = notes?.trim() ?? "";
  const trimmedParts = partsUsed?.trim() ?? "";

  return trimmedNotes.length >= 10 && trimmedNotes.length <= 5000 && trimmedParts.length <= 2000;
}

export function isValidVerificationNotes(notes: string | null) {
  const trimmed = notes?.trim() ?? "";
  return trimmed.length >= 10 && trimmed.length <= 2000;
}

export function isValidCorrectiveRepairPhoto(file: { type: string; size: number }) {
  return correctiveRepairPhotoTypes.has(file.type) && file.size > 0 && file.size <= correctiveRepairPhotoMaxBytes;
}
