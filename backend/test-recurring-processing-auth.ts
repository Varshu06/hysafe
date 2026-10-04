import assert from 'assert';
import customerRoutes from './src/routes/customer.routes';
import { processDueDeliveries } from './src/controllers/recurringDelivery.controller';

const findPostRoute = (router: any, path: string) => router.stack
  .map((layer: any) => layer.route)
  .find((route: any) => route?.path === path && route.methods.post);

const processingRoute = findPostRoute(customerRoutes, '/recurring-deliveries/process-due');
assert.ok(processingRoute, 'existing admin processing endpoint should remain available');
assert.equal(processingRoute.stack.length, 3, 'processing route should authenticate, authorize, then invoke its handler');
assert.equal(processingRoute.stack[2].handle, processDueDeliveries, 'admin route should invoke the existing processing controller');

const roleGuard = processingRoute.stack[1].handle;
const authorize = (role: string) => {
  let statusCode: number | undefined;
  let body: unknown;
  let continued = false;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
  };

  roleGuard({ user: { role } }, response, () => { continued = true; });
  return { statusCode, body, continued };
};

assert.equal(authorize('customer').statusCode, 403, 'customers must be forbidden');
assert.equal(authorize('staff').statusCode, 403, 'staff must not trigger global processing');
assert.equal(authorize('admin').continued, true, 'admins should reach the existing processing handler');

console.log('Recurring processing authorization tests passed.');
