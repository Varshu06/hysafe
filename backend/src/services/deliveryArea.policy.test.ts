import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  assessDeliveryLocation,
  haversineKm,
  serviceAreaFromEnv,
  type LatLng,
} from './deliveryArea.policy.ts';

const center: LatLng = { lat: 8.38, lng: 77.61 };

function offsetByKm(origin: LatLng, distanceKm: number): LatLng {
  const angular = distanceKm / 6371;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lng1 = (origin.lng * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular));
  const lng2 = lng1 + Math.atan2(0, Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

const configured = { center, radiusKm: 5 };

describe('delivery area policy', () => {
  it('allows an order with no coordinates and does not require a service center', () => {
    const decision = assessDeliveryLocation(undefined, { center: null, radiusKm: null });
    assert.deepEqual(decision, { ok: true });
    assert.deepEqual(assessDeliveryLocation(null, configured), { ok: true });
  });

  it('allows a pin inside the radius and a pin on the 5 km boundary', () => {
    assert.equal(assessDeliveryLocation(center, configured).ok, true);
    const boundary = offsetByKm(center, 5);
    const distance = haversineKm(center, boundary);
    assert.ok(Math.abs(distance - 5) < 1e-6);
    const decision = assessDeliveryLocation(boundary, configured);
    assert.equal(decision.ok, true);
    if (decision.ok) assert.deepEqual(decision.location, boundary);
  });

  it('rejects a pin beyond 5 km without returning a stored location', () => {
    const outside = offsetByKm(center, 8);
    const decision = assessDeliveryLocation(outside, configured);
    assert.deepEqual(decision, {
      ok: false,
      status: 400,
      message: 'Delivery location is outside the 5 km service area.',
    });
  });

  it('rejects out-of-range, non-numeric, empty, infinite, and null-island coordinates', () => {
    const rejected = [
      { lat: 95, lng: 10 },
      { lat: 10, lng: 200 },
      { lat: 'south', lng: 77 },
      { lat: null, lng: 77 },
      { lng: 77 },
      { lat: Number.NaN, lng: 77 },
      { lat: Number.POSITIVE_INFINITY, lng: 77 },
      { lat: 0, lng: 0 },
      '8.38,77.61',
      [],
    ];
    for (const location of rejected) {
      const decision = assessDeliveryLocation(location, configured);
      assert.equal(decision.ok, false);
      if (!decision.ok) {
        assert.equal(decision.status, 400);
        assert.equal(decision.message, 'Delivery coordinates are invalid.');
      }
    }
  });

  it('does not invent a service center when configuration is missing or invalid', () => {
    for (const env of [
      {},
      { FACTORY_LAT: '', FACTORY_LNG: '' },
      { FACTORY_LAT: '8.38' },
      { FACTORY_LAT: 'nope', FACTORY_LNG: '77.61' },
      { FACTORY_LAT: '0', FACTORY_LNG: '0' },
      { FACTORY_LAT: '8.38', FACTORY_LNG: '77.61', SERVICE_RADIUS_KM: '0' },
    ]) {
      const decision = assessDeliveryLocation(center, serviceAreaFromEnv(env));
      assert.equal(decision.ok, false);
      if (!decision.ok) {
        assert.equal(decision.status, 500);
        assert.equal(decision.message, 'Delivery area is not configured.');
        assert.equal(decision.message.includes('13.0827'), false);
      }
    }
    const ready = serviceAreaFromEnv({ FACTORY_LAT: '8.38', FACTORY_LNG: '77.61' });
    assert.deepEqual(ready, { center: { lat: 8.38, lng: 77.61 }, radiusKm: 5 });
  });
});
