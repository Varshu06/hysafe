import mongoose, { ClientSession } from 'mongoose';

const MAX_TRANSACTION_ATTEMPTS = 3;

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : '';

const isReplicaSetUnavailable = (error: unknown): boolean => {
  const message = errorMessage(error);
  return message.includes('replica set') || message.includes('Transaction numbers');
};

/** Aborted transactions are safe to run again. A commit whose result is unknown is not. */
const isRetryableTransactionError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: number; codeName?: string; errorLabels?: string[] };
  if (candidate.code === 112 || candidate.codeName === 'WriteConflict') return true;
  return (
    Array.isArray(candidate.errorLabels) &&
    candidate.errorLabels.includes('TransientTransactionError')
  );
};

/**
 * Execute operations within a MongoDB transaction when the server supports them.
 * Standalone MongoDB falls back to a non-transactional call. Write conflicts are retried
 * because the aborted transaction did not commit.
 */
export const runTransaction = async <T>(
  fn: (session: ClientSession | null) => Promise<T>,
): Promise<T> => {
  const attempt = async (attemptNumber: number): Promise<T> => {
    let session: ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (error: unknown) {
      if (session?.inTransaction()) {
        await session.abortTransaction();
      }
      if (isReplicaSetUnavailable(error)) {
        return await fn(null);
      }
      if (attemptNumber + 1 < MAX_TRANSACTION_ATTEMPTS && isRetryableTransactionError(error)) {
        if (session) {
          await session.endSession();
          session = null;
        }
        return attempt(attemptNumber + 1);
      }
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  };

  return attempt(0);
};
