const DiscordUser = require("../globals/DiscordUser");
const Util = require("./Util");

module.exports = new DiscordUser(fetch, Util.report);
