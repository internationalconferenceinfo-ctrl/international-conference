const serverModule = require("../dist/server.cjs");

module.exports = serverModule.default || serverModule;