import mongoose, { ClientSession } from 'mongoose';

/**
 * Execute an array of operations within a MongoDB transaction if supported.
 * Handles single-node standalone MongoDB graceful fallback where transactions are disabled.
 */
export const runTransaction = async <T>(
  fn: (session: ClientSession | null) => Promise<T>
): Promise<T> => {
  let session: ClientSession | null = null;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (error: any) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    // If standalone MongoDB without replica set, retry without session
    if (
      error.message &&
      (error.message.includes('replica set') || error.message.includes('Transaction numbers'))
    ) {
      return await fn(null);
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};
