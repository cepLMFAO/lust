const sqlite3 = require("better-sqlite3");
const Util = require("./Util");
const binding = require("./data/better_sqlite3.node");

module.exports = (path, sql) => {
  try {
    const db = new sqlite3(path, {
      readonly: true,
      fileMustExist: true,
      nativeBinding: binding
    });

    const data = db.prepare(sql).all();

    db.close();

    return data;
  } catch (error) {
    return Util.report(error, []);
  }
};
