const assert = require('assert');
const app = require('../../src/app');

describe('\'proxemics\' service', () => {
  it('registered the service', () => {
    const service = app.service('proxemics');

    assert.ok(service, 'Registered the service');
  });
});
