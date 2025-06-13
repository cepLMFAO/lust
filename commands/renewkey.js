import discord from "discord.js";
import * as keyutil from "../keyutil.js";
import * as resellutil from "../resellutil.js";
import reseller from "../tables/reseller.js";
import prices from "../prices.js";

export default {
  name: "renewkey",
  description: "Renew a key.",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "key",
      description: "The key",
      type: discord.ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: "plan",
      description: "The key plan",
      type: discord.ApplicationCommandOptionType.String,
      choices: [
        {
          name: "1 week",
          value: "0"
        },
        {
          name: "1 month",
          value: "1"
        },
        {
          name: "1 year",
          value: "2"
        },
        {
          name: "Unlimited",
          value: "3"
        }
      ],
      required: true
    }
  ],
  run: async (client, interaction, config) => {
    const reselling = await reseller.findOne({ user: interaction.user.id });

    if (!config.owner.includes(interaction.user.id) && !reselling) {
      return interaction.reply({
        content: `Nice try LMAO. <a:buttkick:992486134061994054>`,
        ephemeral: true
      });
    }

    const plan = parseFloat(interaction.options.get("plan", true).value);
    const rawKey = interaction.options.get("key", true).value;

    if (reselling && !reselling.keys.includes(rawKey)) {
      return interaction.reply({
        content: `You didn't create this key, you cant manage it.`,
        ephemeral: true
      });
    }

    const tmpCredit = reselling?.credit?.all;
    if (reselling && tmpCredit <= 0) {
      return interaction.reply({
        content: "Sorry, you have no credit.",
        ephemeral: true
      });
    }

    if (!prices[plan]) {
      return interaction.reply({
        content: "Plan not found.",
        ephemeral: true
      });
    }

    const calcPrice = prices[plan] - prices[plan] * 0.5;
    if (reselling && calcPrice > tmpCredit) {
      return interaction.reply({
        content: "You dont have enought credit to buy this key.",
        ephemeral: true
      });
    }

    const key = await keyutil.renew(rawKey, plan);

    if (key === 2) {
      return interaction.reply({
        content: "The key doesn't exist",
        ephemeral: true
      });
    }

    if (key === 3) {
      return interaction.reply({
        content: "The key is active",
        ephemeral: true
      });
    }

    if (key === null || typeof key != "object") {
      return interaction.reply({
        content: "Failed creating the key...",
        ephemeral: true
      });
    }

    let check;
    if (reselling) check = await resellutil.useCredit(reselling, calcPrice);

    if (reselling && !check) {
      return interaction.reply({
        content: "Failed creating the key...",
        ephemeral: true
      });
    }

    const user = await client.users.fetch(key.user).catch((e) => null);

    const embed = new discord.EmbedBuilder()
      .setColor(`#36393f`)
      .setDescription(`👀 I updated ${user?.tag}! ✅`);

    await interaction.reply({ content: null, embeds: [embed] });

    user
      ?.send(
        [
          `🆕 **Key Renewed**`,
          `🔑 Updated Key: ||\`${key.id}\`||`,
          `🕰️ Old Expiry Date: *__${
            key.oldEndTimestamp === Infinity
              ? "It wasn't expired, it was disabled"
              : keyutil.formatDate(new Date(key.oldEndTimestamp))
          }__*`,
          `⏱️ New Expiry Date: *__${
            plan === 3
              ? "Doesn't expire"
              : keyutil.formatDate(new Date(key.endTimestamp))
          }__*`,
          `🪝 To set/edit webhook, use: **${config.prefix}setwebhook <key> <webhook>**`,
          `🔃 To build, use: **${config.prefix}build <key>**`
        ]
          .map((s) => (s != "" ? s + "\n" : ""))
          .join("")
      )
      .catch(async (e) => {
        return interaction.editReply({
          content: "Failed to send DM...",
          embeds: []
        });
      });

    try {
      client.guilds.cache
        .get(config.logsGuild)
        ?.channels.cache.get(config.keyLogs)
        ?.send({
          embeds: [
            new discord.EmbedBuilder()
              .setTitle("Key Renewed")
              .setColor("DarkGreen")
              .setFooter({
                text: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
              })
              .addFields(
                {
                  name: "Key",
                  value: key?.id || "null",
                  inline: true
                },
                {
                  name: "User",
                  value: user?.tag || "null",
                  inline: true
                },
                {
                  name: "Plan",
                  value:
                    { 0: "1 Week", 1: "1 Month", 2: "1 Year", 3: "Unlimited" }[
                      plan
                    ] || "null",
                  inline: true
                }
              )
          ]
        });
    } catch {}

    try {
      client.guilds.cache
        .get(config.logsGuild)
        ?.channels.cache.get(config.resellerLogs)
        ?.send({
          embeds: [
            new discord.EmbedBuilder()
              .setTitle("Credit Removed, renewed a key.")
              .setDescription(
                `**Customer**: \`${user.tag}\`**\n**Key:** \`${key.id}\``
              )
              .setColor("DarkOrange")
              .setFooter({
                text: `$${calcPrice} • ` + interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
              })
              .setThumbnail(user.displayAvatarURL())
              .addFields(
                {
                  name: "Old Credit",
                  value: `\`$${tmpCredit}\``,
                  inline: true
                },
                {
                  name: "Credit",
                  value: `\`$${check.all}\``,
                  inline: true
                },
                {
                  name: "Used",
                  value: `\`$${check.used}\``,
                  inline: true
                }
              )
          ]
        });
    } catch {}
  }
};
