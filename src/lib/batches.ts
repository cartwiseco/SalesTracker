export const FIRESTORE_BATCH_LIMIT = 500;

export const splitIntoBatches = <T>(items: T[], limit = FIRESTORE_BATCH_LIMIT): T[][] => {
  if (!Number.isInteger(limit) || limit < 1 || limit > FIRESTORE_BATCH_LIMIT) {
    throw new Error(`Batch size must be an integer from 1 to ${FIRESTORE_BATCH_LIMIT}.`);
  }
  const batches: T[][] = [];
  for (let offset = 0; offset < items.length; offset += limit) {
    batches.push(items.slice(offset, offset + limit));
  }
  return batches;
};
