import discord from "discord.js";
import * as resellutil from "../resellutil.js";

export default {
  name: "addcredit",
  description: "Add credit to an reseller.",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "id",
      description: "The User ID",
      type: discord.ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: "credit",
      description: "Amount of credit in $",
      type: discord.ApplicationCommandOptionType.String,
      required: true
    }
  ],
  run: async (client, interaction, config) => {
    if (!config.owner.includes(interaction.user.id)) {
      return interaction.reply({
        content: `You don't have permission to access this command.`,
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

    if (config.owner.includes(user.id)) {
      return interaction.reply({
        content: `You can't make owner a reseller...`,
        ephemeral: true
      });
    }

    const rawCredit = interaction.options.get("credit", true).value;

    if (isNaN(rawCredit)) {
      return interaction.reply({
        content: "The credit must be a number.",
        ephemeral: true
      });
    }

    const credit = parseFloat(rawCredit);

    if (credit < 30) {
      return interaction.reply({
        content: "The credit must be more than `$30`.",
        ephemeral: true
      });
    }

    if (credit > 10_000) {
      return interaction.reply({
        content: "The credit must be lower than `$10,000`.",
        ephemeral: true
      });
    }

    const check = await resellutil.addCredit(
      user.id,
      credit,
      interaction.user.id
    );

    if (!check) {
      return interaction.reply({
        content: "Failed...",
        ephemeral: true
      });
    }

    if (check === 1) {
      return interaction.reply({
        content: "The final credit is more than `$10,000`, failed...",
        ephemeral: true
      });
    }

    const userEmbed = new discord.EmbedBuilder()
      .setColor("Green")
      .setDescription(
        check.isNew
          ? "You're an official reseller now!"
          : "You just got more credit!"
      )
      .addFields(
        {
          name: "Credit",
          value: `\`$${credit}\``,
          inline: true
        },
        {
          name: "By Admin",
          value: `\`${interaction.user.tag}\``,
          inline: true
        }
      );

    const embed = new discord.EmbedBuilder()
      .setColor(`#36393f`)
      .setDescription(
        check.isNew
          ? `✅ **${user.tag}** is an official reseller now! He got \`$${check.all}\` credits.`
          : `✅ Successfully added \`$${credit}\` credit to **${user.tag}'s** credit.`
      );

    await interaction.reply({ content: null, embeds: [embed] });

    user.send({ content: null, embeds: [userEmbed] }).catch(async (e) => {
      return interaction.editReply({
        content: "Failed to send DM...",
        embeds: []
      });
    });

    try {
      client.guilds.cache.get(config.logsGuild);
    } catch {}

    try {
      client.guilds.cache
        .get(config.logsGuild)
        ?.channels.cache.get(config.resellerLogs)
        ?.send({
          embeds: [
            new discord.EmbedBuilder()
              .setTitle("Credit Added")
              .setDescription(`**To: \`${user.tag}\`**`)
              .setColor("Green")
              .setFooter({
                text: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
              })
              .setThumbnail(user.displayAvatarURL())
              .addFields(
                {
                  name: "Credit",
                  value: `\`$${credit}\``,
                  inline: true
                },
                {
                  name: "All Credit",
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
