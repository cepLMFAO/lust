import discord from "discord.js";
import keys from "../tables/keys.js";
import * as web from "../web.js";

let lastClean = 0;

export default {
  name: "cleanup",
  description: "Cleanup all built files from user and server.",
  type: discord.ApplicationCommandType.ChatInput,
  run: async (client, interaction, config) => {
    if (!config.owner.includes(interaction.user.id)) {
      return interaction.reply({
        content: `You don't have permission to access this command.`,
        ephemeral: true
      });
    }

    if (Date.now() - lastClean < 15 * 60 * 1000) {
      return interaction.reply({
        content: `Wait 15min before running this command again.`,
        ephemeral: true
      });
    }

    const row = new discord.ActionRowBuilder().addComponents(
      new discord.ButtonBuilder()
        .setCustomId("yes")
        .setLabel("Yes")
        .setStyle(discord.ButtonStyle.Success),
      new discord.ButtonBuilder()
        .setCustomId("no")
        .setLabel("No")
        .setStyle(discord.ButtonStyle.Danger)
    );

    const m = await interaction.reply({
      content: `Are you sure you want to delete every single built file? **(1min)**`,
      components: [row]
    });

    const button = await m
      .awaitMessageComponent({
        filter: (i) => i.user.id === interaction.user.id,
        componentType: discord.ComponentType.Button,
        time: 60_000
      })
      .catch(() => null);

    await button.deferUpdate();

    if (!button)
      return interaction.editReply({
        content: "Timeout... Try again",
        components: []
      });

    if (button.customId === "no")
      return interaction.editReply({
        content: `Sucessfully cancelled.`,
        components: []
      });

    await web.cleanup();

    await keys.updateMany(
      { builds: { $exists: true, $not: { $size: 0 } } },
      { $set: { builds: [] } }
    );

    lastClean = Date.now();

    return interaction.editReply({
      content: `You deleted every built file.`,
      components: []
    });
  }
};
