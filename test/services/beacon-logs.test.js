const assert = require('assert');
const app = require('../../src/app');

describe('\'beaconLogs\' service', () => {
  it('registered the service', () => {
    const service = app.service('beacon-logs');

    assert.ok(service, 'Registered the service');
  });
});
