import discord from "discord.js";
import * as resellutil from "../resellutil.js";

export default {
  name: "delcredit",
  description: "Remove credit to an reseller.",
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
        content: `You don't have permission to do that`,
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

    const rawCredit = interaction.options.get("credit", true).value;

    if (isNaN(rawCredit)) {
      return interaction.reply({
        content: "The credit must be a number.",
        ephemeral: true
      });
    }

    const credit = parseFloat(rawCredit);

    const check = await resellutil.removeCredit(user.id, credit);

    if (check === 1) {
      return interaction.reply({
        content: "User is not a reseller.",
        ephemeral: true
      });
    }

    if (check === 2) {
      return interaction.reply({
        content: "User's credit is too low to remove.",
        ephemeral: true
      });
    }

    if (check === 3) {
      return interaction.reply({
        content:
          "If you remove this amount credit user's credit will be below 0, failed",
        ephemeral: true
      });
    }

    if (check === 4) {
      return interaction.reply({
        content: "Failed because of an error...",
        ephemeral: true
      });
    }

    const userEmbed = new discord.EmbedBuilder()
      .setColor("Red")
      .setDescription("Some of your credit has been removed.")
      .addFields(
        {
          name: "Credit",
          value: `\`$${check.all}\``,
          inline: true
        },
        {
          name: "Removed",
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
        `✅ Removed \`$${credit}\` from **${user.tag}'s** credit, now he has \`$${check.all}\` credit`
      );

    await interaction.reply({ content: null, embeds: [embed] });

    user.send({ content: null, embeds: [userEmbed] }).catch(async (e) => {
      return interaction.editReply({
        content: "Failed to send DM...",
        embeds: []
      });
    });

    try {
      client.guilds.cache
        .get(config.logsGuild)
        ?.channels.cache.get(config.resellerLogs)
        ?.send({
          embeds: [
            new discord.EmbedBuilder()
              .setTitle("Credit Removed")
              .setDescription(`**From: \`${user.tag}\`**`)
              .setColor("Red")
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
