/* eslint-disable no-unused-vars */
class Service {
  constructor(options) {
    this.options = options || {};
    this.events = this.options.events || [];
  }
  async create(data, params) {
    if (Array.isArray(data)) {
      return Promise.all(data.map(current => this.create(current, params)));
    }
    return data;
  }
}
module.exports = function (options) {
  return new Service(options);
};
module.exports.Service = Service;
