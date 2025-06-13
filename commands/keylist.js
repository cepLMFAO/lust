import discord from "discord.js";
import keys from "../tables/keys.js";
import * as keyutil from "../keyutil.js";

export default {
  name: "keylist",
  description: "Get list of the keys of a user.",
  type: discord.ApplicationCommandType.ChatInput,
  run: async (client, interaction, config) => {
    await interaction.deferReply({ ephemeral: true }).catch(() => null);

    const keylist = await keys
      .find({ user: interaction.user.id })
      .catch(() => []);

    if (!keylist.length)
      return interaction.editReply(
        "You don't have any keys... Contact admin to buy"
      );

    const data = keylist.map(
      (user) =>
        `**Key:** ||\`${user.key}\`|| | **Webhook:** ${formatWebhook(
          user.webhook
        )}${formatTime(user.endTimestamp, user.ended)}`
    );

    const embed = new discord.EmbedBuilder()
      .setTitle("Your Keys")
      .setColor("Purple")
      .setDescription(data.join("\n"));

    return interaction.editReply({ embeds: [embed] });
  }
};

function formatWebhook(webhook) {
  return webhook ? `[Here](${webhook})` : "None";
}

function formatTime(time, ended) {
  if (time === Infinity) return "";

  if (ended) return "| **Expiried**";

  return ` | **Ends At:** __\`${keyutil.formatDate(new Date(time))}\`__`;
}
