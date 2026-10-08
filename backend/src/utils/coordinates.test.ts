import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCoordinates } from './coordinates';

describe('stored coordinates', () => {
  it('accepts numeric latitude and longitude inside the valid range', () => {
    assert.deepEqual(parseCoordinates({ lat: 8.38, lng: 77.61 }), { lat: 8.38, lng: 77.61 });
    assert.deepEqual(parseCoordinates({ latitude: -33.8, longitude: 151.2 }), { lat: -33.8, lng: 151.2 });
  });

  it('rejects missing and out-of-range coordinates', () => {
    assert.equal(parseCoordinates(undefined), null);
    assert.equal(parseCoordinates({ lat: 95, lng: 10 }), null);
    assert.equal(parseCoordinates({ lat: 10, lng: 200 }), null);
    assert.equal(parseCoordinates({ lat: '8', lng: 'west' }), null);
  });
});
