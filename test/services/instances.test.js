const assert = require('assert');
const app = require('../../src/app');

describe('\'instances\' service', () => {
  it('registered the service', () => {
    const service = app.service('instances');

    assert.ok(service, 'Registered the service');
  });
});
