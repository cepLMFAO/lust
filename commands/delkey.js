import discord from "discord.js";
import * as keyutil from "../keyutil.js";
import reseller from "../tables/reseller.js";

export default {
  name: "delkey",
  description: "Deactivate someone's key.",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "key",
      description: "The key",
      type: discord.ApplicationCommandOptionType.String,
      required: true
    }
  ],
  run: async (client, interaction, config) => {
    const reselling = await reseller.findOne({ user: interaction.user.id });

    if (!config.owner.includes(interaction.user.id) && !reselling) {
      return interaction.reply({
        content: `You don't have permission to do that`,
        ephemeral: true
      });
    }

    const key = interaction.options.get("key", true).value;

    if (reselling && !reselling.keys.includes(key)) {
      return interaction.reply({
        content: `You didn't create this key, you cant manage it.`,
        ephemeral: true
      });
    }

    await interaction.deferReply();

    const deleted = await keyutil.deactivate(key, client);

    if (deleted === 2) return interaction.editReply("Key not found...");

    if (deleted === 3 || deleted !== true)
      return interaction.editReply(`Key already ended`);

    const embed = new discord.EmbedBuilder()
      .setColor("#ff2c2c")
      .setDescription(`Deactivated the key, use \`/renew\` to renew it`);

    await interaction.editReply({ content: null, embeds: [embed] });

    try {
      const s = await keyutil.get(key).catch((e) => {});
      client.guilds.cache
        .get(config.logsGuild)
        ?.channels.cache.get(config.keyLogs)
        ?.send({
          embeds: [
            new discord.EmbedBuilder()
              .setTitle("Key Deactivated")
              .setColor("Red")
              .setFooter({
                text: interaction.user.tag,
                iconURL: interaction.user.displayAvatarURL()
              })
              .addFields(
                {
                  name: "Key",
                  value: key || "null",
                  inline: true
                },
                {
                  name: "User",
                  value:
                    (await client.users.fetch(s.user).catch((e) => null))
                      ?.tag || "null",
                  inline: true
                }
              )
          ]
        });
    } catch {}
  }
};
