const assert = require('assert');
const app = require('../../src/app');

describe('\'beacons\' service', () => {
  it('registered the service', () => {
    const service = app.service('beacons');

    assert.ok(service, 'Registered the service');
  });
});
