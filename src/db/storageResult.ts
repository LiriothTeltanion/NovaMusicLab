export type StorageSuccessAction = 'opened' | 'saved' | 'loaded' | 'deleted' | 'cleared' | 'unchanged';
export type StorageFailureStatus =
  | 'unavailable'
  | 'blocked'
  | 'quota-exceeded'
  | 'validation-error'
  | 'migration-error'
  | 'transaction-error'
  | 'unknown-error';

export interface StorageSuccess<T> {
  ok: true;
  status: 'success';
  action: StorageSuccessAction;
  value: T;
}

export interface StorageNotFound {
  ok: false;
  status: 'not-found';
  recoverable: true;
  message: string;
}

export interface StorageFailure {
  ok: false;
  status: StorageFailureStatus;
  recoverable: boolean;
  message: string;
  errorName: string | null;
}

export type StorageResult<T> = StorageSuccess<T> | StorageNotFound | StorageFailure;

export function storageSuccess<T>(value: T, action: StorageSuccessAction): StorageSuccess<T> {
  return { ok: true, status: 'success', action, value };
}

export function storageNotFound(message: string): StorageNotFound {
  return { ok: false, status: 'not-found', recoverable: true, message };
}

function errorDetails(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message };
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    return {
      name: typeof record.name === 'string' ? record.name : 'UnknownError',
      message: typeof record.message === 'string' ? record.message : 'Unknown storage failure.',
    };
  }
  return { name: 'UnknownError', message: String(error || 'Unknown storage failure.') };
}

/** Convert browser/Dexie failures into stable UI-facing storage states. */
export function storageFailure(error: unknown, operation: string): StorageFailure {
  const details = errorDetails(error);
  const lowerName = details.name.toLowerCase();
  const lowerMessage = details.message.toLowerCase();

  if (lowerName.includes('missingapi') || lowerName.includes('notsupported') || lowerName.includes('security')) {
    return {
      ok: false,
      status: 'unavailable',
      recoverable: false,
      message: `${operation} is unavailable in this browser context.`,
      errorName: details.name,
    };
  }

  if (lowerName.includes('blocked') || lowerMessage.includes('blocked')) {
    return {
      ok: false,
      status: 'blocked',
      recoverable: true,
      message: `${operation} is blocked by another Nova Music Lab tab. Close the other tab and retry.`,
      errorName: details.name,
    };
  }

  if (lowerName.includes('quota') || lowerMessage.includes('quota')) {
    return {
      ok: false,
      status: 'quota-exceeded',
      recoverable: true,
      message: `${operation} needs more local browser storage. Export or remove an older museum, then retry.`,
      errorName: details.name,
    };
  }

  if (lowerName.includes('version') || lowerName.includes('upgrade') || lowerName.includes('migration')) {
    return {
      ok: false,
      status: 'migration-error',
      recoverable: false,
      message: `${operation} could not migrate the local museum database safely.`,
      errorName: details.name,
    };
  }

  if (
    lowerName.includes('dataerror')
    || lowerName.includes('constraint')
    || lowerName.includes('validation')
    || lowerName.includes('typeerror')
  ) {
    return {
      ok: false,
      status: 'validation-error',
      recoverable: true,
      message: `${operation} rejected invalid or conflicting data.`,
      errorName: details.name,
    };
  }

  if (lowerName.includes('transaction') || lowerName.includes('abort') || lowerName.includes('databaseclosed')) {
    return {
      ok: false,
      status: 'transaction-error',
      recoverable: true,
      message: `${operation} did not complete. The previously active museum was preserved.`,
      errorName: details.name,
    };
  }

  return {
    ok: false,
    status: 'unknown-error',
    recoverable: true,
    message: `${operation} failed without changing the active museum.`,
    errorName: details.name || null,
  };
}
