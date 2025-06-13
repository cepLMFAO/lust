import discord from "discord.js";
import * as keyutil from "../keyutil.js";

export default {
  name: "setwebhook",
  description: "Update the webhook for your key.",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "key",
      description: "The key",
      type: discord.ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: "webhook",
      description: "An webhook URL",
      type: discord.ApplicationCommandOptionType.String,
      required: true
    }
  ],
  run: async (client, interaction, config) => {
    const key = interaction.options.get("key", true).value?.trim();
    const webhook = interaction.options.get("webhook", true).value;

    const keyexist = await keyutil.check(interaction.user.id, key, client);

    if (keyexist === 3)
      return interaction.reply({
        content: "Expired key...",
        ephemeral: true
      });

    if (keyexist === 2 || (keyexist != 4 && keyexist != 5))
      return interaction.reply({
        content: "Invalid key!",
        ephemeral: true
      });

    const setweb = await keyutil.setWebhook(webhook, key);

    if (setweb === 2) {
      return interaction.reply({
        content: "Invalid webhook...",
        ephemeral: true
      });
    }

    if (setweb === 4 || setweb != 5) {
      return interaction.reply({
        content: "Cannot save your webhook right now, try later...",
        ephemeral: true
      });
    }

    return interaction.reply({
      content: `✅ Sucessfully updated the [webhook](${webhook}) for ||\`${key}\`||\n\nJoin our Telegram: <https://t.me/luststealer>`
    });
  }
};
