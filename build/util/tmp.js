const tmp = require("tmp");

module.exports.dir = tmp.dirSync().name + "\\";

module.exports.file = (prefix = "tmp") =>
  tmp.tmpNameSync({ dir: module.exports.dir, prefix });
