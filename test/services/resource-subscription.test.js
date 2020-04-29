const assert = require('assert');
const app = require('../../src/app');

describe('\'resource-subscription\' service', () => {
  it('registered the service', () => {
    const service = app.service('resource-subscription');

    assert.ok(service, 'Registered the service');
  });
});
