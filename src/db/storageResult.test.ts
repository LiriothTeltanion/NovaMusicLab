import { describe, expect, it } from 'vitest';
import { storageFailure } from './storageResult';

describe('storageFailure', () => {
  it.each([
    ['MissingAPIError', 'unavailable'],
    ['DatabaseBlockedError', 'blocked'],
    ['QuotaExceededError', 'quota-exceeded'],
    ['UpgradeError', 'migration-error'],
    ['DataError', 'validation-error'],
    ['TransactionInactiveError', 'transaction-error'],
  ])('maps %s to %s', (name, status) => {
    const error = new Error('storage test');
    error.name = name;
    expect(storageFailure(error, 'Testing storage')).toMatchObject({ ok: false, status });
  });
});
