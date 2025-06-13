import discord from "discord.js";
import reseller from "../tables/reseller.js";

export default {
  name: "credit",
  description: "Get your credit",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "user",
      description: "(Admin only)",
      type: discord.ApplicationCommandOptionType.String,
      required: false
    }
  ],
  run: async (client, interaction, config) => {
    let user = interaction.user;
    const isOwner = config.owner.includes(interaction.user.id);

    if (isOwner && interaction.options?.get("user")?.value) {
      const tuser = await client.users
        .fetch(interaction.options.get("user").value)
        .catch((e) => null);

      if (!tuser) {
        return interaction.reply({
          content: "Invalid userID / User not found",
          ephemeral: true
        });
      }

      user = tuser;
    }

    const reselling = await reseller.findOne({ user: user.id });

    if (!reselling) {
      return interaction.reply({
        content: isOwner
          ? "Invalid userID / User not found"
          : "You're not a reseller.",
        ephemeral: true
      });
    }

    const embed = new discord.EmbedBuilder()
      .setTitle("Reseller Info")
      .setColor("Purple")
      .setTimestamp(reselling.sinceTimestamp)
      .setFooter({
        text: user.tag,
        iconURL: user.displayAvatarURL()
      })
      .addFields([
        {
          name: "Credit",
          value: `\`$${reselling.credit.all}\``,
          inline: true
        },
        {
          name: "Used",
          value: `\`$${reselling.credit.used}\``,
          inline: true
        },
        {
          name: "Keys Created",
          value: `\`${reselling.keys.length}\``,
          inline: true
        }
      ]);

    interaction.reply({ content: null, embeds: [embed] });
  }
};
