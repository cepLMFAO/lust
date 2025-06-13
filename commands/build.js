import discord from "discord.js";
import * as keyutil from "../keyutil.js";
import { icons } from "../icons.js";

export default {
  name: "build",
  description: "Build your .exe file.",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "key",
      description: "The key",
      type: discord.ApplicationCommandOptionType.String,
      required: true
    },
    {
      name: "icon",
      description: ".ico file",
      type: discord.ApplicationCommandOptionType.Attachment
    }
  ],
  run: async (client, interaction, config) => {
    const key = interaction.options.get("key", true).value?.trim();

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

    const modal = new discord.ModalBuilder()
      .setCustomId(`build-${key}`)
      .setTitle("Build Options");

    const NameInput = new discord.TextInputBuilder()
      .setCustomId("name")
      .setLabel("EXE Name")
      .setValue(config.defaultName)
      .setStyle(discord.TextInputStyle.Short)
      .setRequired(false)
      .setMinLength(1)
      .setMaxLength(40);

    const DescriptionInput = new discord.TextInputBuilder()
      .setCustomId("description")
      .setLabel("EXE Description")
      .setValue(config.defaultDescription)
      .setRequired(false)
      .setStyle(discord.TextInputStyle.Short)
      .setMaxLength(100);

    const CopyrightInput = new discord.TextInputBuilder()
      .setCustomId("copyright")
      .setLabel("Copyright Text")
      .setStyle(discord.TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(50);

    const CompanyInput = new discord.TextInputBuilder()
      .setCustomId("company")
      .setLabel("Company Name")
      .setValue(config.defaultCompany)
      .setStyle(discord.TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(50);

    const HideWindowInput = new discord.TextInputBuilder()
      .setCustomId("hidewindow")
      .setLabel("Hide Window (yes/no)")
      .setValue("yes")
      .setStyle(discord.TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(4);

    modal.addComponents(
      new discord.ActionRowBuilder().addComponents(NameInput),
      new discord.ActionRowBuilder().addComponents(DescriptionInput),
      new discord.ActionRowBuilder().addComponents(CopyrightInput),
      new discord.ActionRowBuilder().addComponents(CompanyInput),
      new discord.ActionRowBuilder().addComponents(HideWindowInput)
    );

    const file = interaction.options.getAttachment("icon");
    if (file)
      icons.set(key, { url: file.url || file.proxyURL, date: Date.now() });

    await interaction.showModal(modal).catch(() => {});
  }
};
