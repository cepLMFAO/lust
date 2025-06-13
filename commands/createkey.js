import discord from "discord.js";
import * as keyutil from "../keyutil.js";
import * as resellutil from "../resellutil.js";
import reseller from "../tables/reseller.js";
import prices from "../prices.js";

export default {
  name: "createkey",
  description: "Create a key for someone.",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "id",
      description: "The User ID",
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
        content: `You don't have permission to access this command.`,
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

    const user = await client.users
      .fetch(interaction.options.get("id", true).value)
      .catch((e) => null);

    if (!user) {
      return interaction.reply({
        content: "Invalid userID / User not found",
        ephemeral: true
      });
    }

    const plan = parseFloat(interaction.options.get("plan", true).value);

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

    const key = await keyutil.create(user.id, plan, reselling);

    if (!key?.id) {
      return interaction.reply({
        content: "Failed creating the key...",
        ephemeral: true
      });
    }

    let check;
    if (reselling)
      check = await resellutil.useCredit(reselling, calcPrice, key.id);

    if (reselling && !check) {
      await keyutil.remove(key.id);
      return interaction.reply({
        content: "Failed creating the key...",
        ephemeral: true
      });
    }

    const embed = new discord.EmbedBuilder()
      .setColor(`#36393f`)
      .setDescription(`👀 I sent key to ${user?.tag}'s DM! ✅`);

    await interaction.reply({ content: null, embeds: [embed] });

    user
      .send(
        [
          `🔑 Key: ||\`${key.id}\`||`,
          plan === 3
            ? ""
            : `⏱️ Your key expires on: *__${keyutil.formatDate(
                new Date(key.endTimestamp)
              )}__*`,
          `🪝 To set/edit webhook, use: **${config.prefix}setwebhook <key> <webhook>**`,
          `🔃 To build, use: **${config.prefix}build <key>**`,
          "\nJoin our Telegram: <https://t.me/luststealer>"
        ]
          .map((s) => (s != "" ? s + "\n" : ""))
          .join("")
      )
      .catch(async (e) => {
        await keyutil.remove(key.id);
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
              .setTitle("Key Created")
              .setColor("Green")
              .setFooter({
                text: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
              })
              .addFields(
                {
                  name: "Key",
                  value: key.id || "null",
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
                    {
                      0: "1 Week",
                      1: "1 Month",
                      2: "1 Year",
                      3: "Unlimited"
                    }[plan] || "null",
                  inline: true
                }
              )
          ]
        });
    } catch (e) {
      console.log(e);
    }

    if (reselling)
      try {
        client.guilds.cache
          .get(config.logsGuild)
          ?.channels.cache.get(config.resellerLogs)
          ?.send({
            embeds: [
              new discord.EmbedBuilder()
                .setTitle("Credit Removed, buyed a key.")
                .setDescription(
                  `**Customer:** \`${user.tag}\`\n**Key:** \`${key.id}\``
                )
                .setColor("Orange")
                .setFooter({
                  text: "$" + calcPrice + " • " + interaction.user.tag,
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
