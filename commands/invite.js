import discord from "discord.js";
import reseller from "../tables/reseller.js";

export default {
  name: "invite",
  description: "Generate invite link. (Reseller only)",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "id",
      description: "The Server ID",
      type: discord.ApplicationCommandOptionType.String,
      required: true
    }
  ],
  run: async (client, interaction, config) => {
    const reselling = await reseller.findOne({ user: interaction.user.id });
    const gid = interaction.options.get("id")?.value;

    if (!reselling) {
      return interaction.reply({
        content: `This command is only for resellers.`,
        ephemeral: true
      });
    }

    if (!gid) {
      return interaction.reply({
        content: "Please fill the `id` option.",
        ephemeral: true
      });
    }

    if (!reselling.guilds.includes(gid)) {
      return interaction.reply({
        content: `Please whitelist this server first.`,
        ephemeral: true
      });
    }

    const admin = client.generateInvite({
      scopes: [
        discord.OAuth2Scopes.Bot,
        discord.OAuth2Scopes.ApplicationsCommands
      ],
      permissions: ["Administrator"],
      guild: gid,
      disableGuildSelect: true
    });

    const required = client.generateInvite({
      scopes: [
        discord.OAuth2Scopes.Bot,
        discord.OAuth2Scopes.ApplicationsCommands
      ],
      permissions: ["SendMessages", "ReadMessageHistory", "AttachFiles"],
      guild: gid,
      disableGuildSelect: true
    });

    const embed = new discord.EmbedBuilder()
      .setColor("Purple")
      .setAuthor({
        name: "Invite"
      })
      .addFields(
        {
          name: "Admin (better)",
          value: `**[Here](${admin})**`,
          inline: true
        },
        {
          name: "Required (may broke)",
          value: `**[Here](${required})**`,
          inline: true
        }
      );

    interaction.reply({ content: null, embeds: [embed], ephemeral: true });
  }
};
