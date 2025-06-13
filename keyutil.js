import keys from "./tables/keys.js";
import randomstring from "randomstring";
import discord from "discord.js";

async function genPRK() {
  const keyid = randomstring.generate(12);
  const check = await get(keyid);
  if (check) return await genPRK();
  else return keyid;
}

async function genPBK() {
  const keyid = randomstring.generate({
    length: 19,
    charset: "numeric"
  });
  const check = await getByPBK(keyid);
  if (check) return await genPBK();
  else return keyid;
}

/**
 * PLANS
 * 0 - 1 week
 * 1 - 1 month
 * 2 - 1 year
 * 3 - unlimited
 */

export function genPlan(plan, createdTimestamp) {
  let endTimestamp = 0;
  switch (plan) {
    case 0:
      endTimestamp = createdTimestamp + 7 * 24 * 60 * 60 * 1000;
      break;
    case 1:
      const date1 = new Date(createdTimestamp);
      date1.setMonth(date1.getMonth() + 1);
      endTimestamp = date1.getTime();
      break;
    case 2:
      const date2 = new Date(createdTimestamp);
      date2.setFullYear(date2.getFullYear() + 1);
      endTimestamp = date2.getTime();
      break;
    default:
      endTimestamp = Infinity;
      break;
  }

  return endTimestamp;
}

export async function create(user, plan, reselling) {
  const keyid = await genPRK();
  const publicKeyid = await genPBK();

  const createdTimestamp = Date.now();
  const endTimestamp = genPlan(plan, createdTimestamp);

  const data = new keys({
    user,
    key: keyid,
    publicKey: publicKeyid,
    createdTimestamp,
    endTimestamp,
    plan,
    ended: false,
    notified: false,

    blockVm: true,
    blockHost: false,
    blockHttpSim: true,
    blockRdp: false,
    blockDocker: false
  });

  if (reselling?.user) data.reseller = reselling.user;

  const saved = await data.save().catch((e) => null);

  if (!saved) return null;
  else return { id: keyid, endTimestamp };
}

/**
 * 2 - key doesn't exist
 * 3 - failed to delete key
 * 4 - success
 */

export async function remove(keyid) {
  const keyexist = await keys.findOne({ key: keyid });
  if (!keyexist) return 2;

  const deleted = await keys.deleteOne({ key: keyid }).catch((e) => null);

  if (!deleted) return 3;
  else return 4;
}

/**
 * 2 - key doesn't exist
 * 3 - key is active
 */

export async function renew(keyid, plan) {
  const keyexist = await keys.findOne({ key: keyid });
  if (!keyexist) return 2;

  const checked = await check(keyexist.user, keyid);

  if (checked === 2) return 2;

  if (checked === 4 || checked === 5) return 3;

  if (checked !== 3) return 2;

  const updatedTimestamp = Date.now();
  const endTimestamp = genPlan(plan, updatedTimestamp);

  const currentData = await keys.findOne({ key: keyid });
  Object.assign(currentData, {
    updatedTimestamp,
    endTimestamp,
    ended: false,
    notified: false
  });

  const saved = await currentData.save().catch((e) => null);

  if (!saved) return null;
  else
    return {
      oldEndTimestamp: keyexist.endTimestamp,
      endTimestamp,
      id: keyid,
      user: currentData.user
    };
}

/**
 * 2 - key doesn't exist
 * 3 - key already ended
 */

export async function deactivate(keyid, client) {
  const keyexist = await keys.findOne({ key: keyid });
  if (!keyexist) return 2;

  const checked = await check(keyexist.user, keyid);

  if (checked === 2) return 2;

  if (checked === 3) return 3;

  keyexist.ended = true;

  if (client)
    await notify(client, keyexist.user, "deactivate", keyid).catch((e) => null);

  if (!keyexist.webhook) {
    const notif = await checkWebhook(
      keyexist.webhook,
      `⏱️ Your key was deactivated, contact admin to renew it lol`
    ).catch((e) => {});

    if (!!notif) keyexist.notified = true;
  }

  await keyexist.save().catch((e) => null);
  return true;
}

export async function addBuild(key, build) {
  if (typeof build != "string") throw new Error("Not a string.");

  const keyexist = await keys.findOne({ key: key });
  if (!keyexist) throw new Error("Key doesn't exist.");

  if (!keyexist.builds) keyexist.builds = [];

  keyexist.builds.push(build);

  const saved = await keyexist.save().catch((e) => null);
  if (!saved) throw new Error("Failed to save the new build.");
  else return true;
}

/**
 * 2 - invalid webhook
 * 3 - key doesn't exist
 * 4 - cannot save webhook
 * 5 - success
 */

export async function setWebhook(url, key) {
  const valid = await checkWebhook(url);
  if (!valid) return 2;

  const keyexist = await keys.findOne({ key: key });
  if (!keyexist) return 3;

  keyexist.webhook = url;

  const saved = await keyexist.save().catch((e) => null);
  if (!saved) return 4;
  else return 5;
}

export function checkWebhook(url, message) {
  return new Promise(async (resolve) => {
    try {
      const webhook = new discord.WebhookClient({ url });
      if (message) await webhook.send(message);
      resolve(true);
    } catch {
      resolve(false);
    }
  });
}

/**
 * 2 - invalid type
 * 3 - invalid user
 * 4 - cannot notify user
 * true - success
 */

export async function notify(client, user, type, data, tries = 0) {
  if (tries > 0) return 4;
  let embed = new discord.EmbedBuilder();

  switch (type) {
    case "deactivate":
      embed
        .setDescription(
          `😒 Sorry but your key ||\`${data}\`|| was deactivated, contact admin to renew it.`
        )
        .setColor("Red");
      break;
    case "end":
      embed
        .setDescription(
          `😔 Your key ||\`${data}\`|| expired, contact admin to renew it!`
        )
        .setColor("Red");
      break;
    default:
      return 2;
  }

  const userf = await client?.users?.fetch(user).catch((e) => null);
  if (!userf) return 3;

  const send = await userf.send({ embeds: [embed] }).catch(() => null);

  if (!send) notify(client, user, type, data, tries++);

  return true;
}

export async function get(keyid, user) {
  let keyexist = {};
  if (user) keyexist = await keys.findOne({ key: keyid, user });
  else keyexist = await keys.findOne({ key: keyid });

  return keyexist;
}

export async function getByPBK(publicKey) {
  return await keys.findOne({ publicKey });
}

export function checkOnly(keyexist) {
  if (!keyexist) return false;

  if (keyexist.ended === true) return false;

  if (keyexist.endTimestamp === Infinity) return true;

  if (keyexist.endTimestamp < Date.now()) return false;

  return true;
}

/**
 * 2 - key doesn't exist
 * 3 - already ended
 * 4 - unlimited key
 * 5 - key valid
 */

export async function check(user, keyid, client) {
  const keyexist = await keys.findOne({ user, key: keyid });
  if (!keyexist) return 2;

  if (keyexist.ended === true) return 3;

  if (keyexist.endTimestamp === Infinity) return 4;

  if (keyexist.endTimestamp < Date.now()) {
    if (client) await notify(client, user, "end", keyid).catch((e) => null);
    if (!keyexist.notified && keyexist.webhook) {
      const notif = await checkWebhook(
        keyexist.webhook,
        `⏱️ Your key just expired, you can renew it when you want!`
      ).catch((e) => {});

      if (!!notif) keyexist.notified = true;
    }

    keyexist.ended = true;
    keyexist.save().catch(() => {});
    return 3;
  }

  return 5;
}

export function formatDate(date) {
  return [
    padTo2Digits(date.getDate()),
    padTo2Digits(date.getMonth() + 1),
    date.getFullYear()
  ].join("/");
}

export function padTo2Digits(num) {
  return num.toString().padStart(2, "0");
}
