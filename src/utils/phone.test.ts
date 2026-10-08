import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeIndianMobilePhone } from './phone.ts';

describe('signup phone normalization', () => {
  it('accepts exactly 10 digits and a +91 prefix', () => {
    assert.equal(normalizeIndianMobilePhone('9876543210'), '9876543210');
    assert.equal(normalizeIndianMobilePhone('+91 98765 43210'), '9876543210');
  });

  it('rejects shorter, longer, and non-numeric numbers', () => {
    assert.equal(normalizeIndianMobilePhone('987654321'), null);
    assert.equal(normalizeIndianMobilePhone('98765432101'), null);
    assert.equal(normalizeIndianMobilePhone('123456789012'), null);
  });
});
