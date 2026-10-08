import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assessClientDeliveryPin, deliveryAreaMessageKey, haversineKm, type LatLng } from './deliveryArea.ts';

const center: LatLng = { lat: 8.38, lng: 77.61 };

function offsetByKm(origin: LatLng, distanceKm: number): LatLng {
  const angular = distanceKm / 6371;
  const lat1 = (origin.lat * Math.PI) / 180;
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular));
  const lng2 = (origin.lng * Math.PI) / 180;
  return { lat: (lat2 * 180) / Math.PI, lng: (lng2 * 180) / Math.PI };
}

describe('checkout delivery radius', () => {
  it('allows a missing pin and blocks an invalid supplied pin', () => {
    assert.equal(assessClientDeliveryPin(undefined, center, 5).kind, 'missing');
    assert.equal(assessClientDeliveryPin(null, center, 5).kind, 'missing');
    assert.equal(assessClientDeliveryPin({ lat: 0, lng: 0 }, center, 5).kind, 'invalid');
    assert.equal(assessClientDeliveryPin({ lat: Number.NaN, lng: 77 }, center, 5).kind, 'invalid');
    assert.equal(deliveryAreaMessageKey(assessClientDeliveryPin({ lat: 95, lng: 1 }, center, 5)), 'invalid');
  });

  it('allows the service center, the 5 km boundary, and rejects a farther pin', () => {
    assert.equal(assessClientDeliveryPin(center, center, 5).kind, 'inside');
    const boundary = offsetByKm(center, 5);
    assert.ok(Math.abs(haversineKm(center, boundary) - 5) < 1e-6);
    const onEdge = assessClientDeliveryPin(boundary, center, 5);
    assert.equal(onEdge.kind, 'inside');
    const outside = assessClientDeliveryPin(offsetByKm(center, 8), center, 5);
    assert.equal(outside.kind, 'outside');
    assert.equal(deliveryAreaMessageKey(outside), 'outside');
  });

  it('does not treat a coordinated order as deliverable when the center is unusable', () => {
    assert.equal(assessClientDeliveryPin(center, null, 5).kind, 'unconfigured');
    assert.equal(assessClientDeliveryPin(center, { lat: 0, lng: 0 }, 5).kind, 'unconfigured');
    assert.equal(assessClientDeliveryPin(center, center, Number.NaN).kind, 'unconfigured');
    assert.equal(assessClientDeliveryPin(undefined, null, Number.NaN).kind, 'missing');
  });
});
