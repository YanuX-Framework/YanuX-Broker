// A hook that logs service method before, after and error
// See https://github.com/winstonjs/winston for documentation
// about the logger.
const { createLogger, format, transports } = require('winston');

// Configure the Winston logger. For the complete documentation see https://github.com/winstonjs/winston
const logger = createLogger({
  // To see more detailed errors, change this to 'debug'
  level: 'debug',
  format: format.combine(
    format.splat(),
    format.simple()
  ),
  transports: [new transports.Console()],
});
const util = require('util');

module.exports = function () {
  return context => {
    // logger.debug(`${context.type}: app.service('${context.path}').${context.method}()`);
    // if (context.error) {
    //   logger.error(`error: ${util.inspect(context.error, { colors: false })}`);
    // }
    // if (typeof context.toJSON === 'function' && logger.level === 'silly') {
    //   logger.silly(`context: ${util.inspect(context, { colors: false })}`);
    // }
  };
};
