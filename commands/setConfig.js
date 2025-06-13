import discord from "discord.js";
import * as keyutil from "../keyutil.js";

export default {
  name: "setconfig",
  description: "Update your advanced config.",
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
    const key = interaction.options.get("key", true).value?.trim();

    const userprofile = await keyutil.get(key, interaction.user.id);
    const keyexist = keyutil.checkOnly(userprofile);

    if (!keyexist)
      return interaction.reply({
        content: "Invalid key!",
        ephemeral: true
      });

    const btext = {
      true: "yes",
      false: "no"
    };

    const modal = new discord.ModalBuilder()
      .setCustomId(`config-${key}`)
      .setTitle("Advanced Options");

    const VMInput = new discord.TextInputBuilder()
      .setCustomId("blockvm")
      .setLabel("Block VM (yes/no)")
      .setValue(btext[userprofile.blockVm])
      .setStyle(discord.TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(4);

    const HostInput = new discord.TextInputBuilder()
      .setCustomId("blockhost")
      .setLabel("Block Hosting Based Devices (yes/no)")
      .setValue(btext[userprofile.blockHost])
      .setStyle(discord.TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(4);

    const HttpSimInput = new discord.TextInputBuilder()
      .setCustomId("blockhttpsim")
      .setLabel("Block HTTP Simulations (yes/no)")
      .setValue(btext[userprofile.blockHttpSim])
      .setStyle(discord.TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(4);

    const RDPInput = new discord.TextInputBuilder()
      .setCustomId("blockrdp")
      .setLabel("Block RDP's (yes/no)")
      .setValue(btext[userprofile.blockRdp])
      .setStyle(discord.TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(4);

    const DockerInput = new discord.TextInputBuilder()
      .setCustomId("blockdocker")
      .setLabel("Block running in Docker (yes/no)")
      .setValue(btext[userprofile.blockRdp])
      .setStyle(discord.TextInputStyle.Short)
      .setRequired(true)
      .setMaxLength(4);

    modal.addComponents(
      new discord.ActionRowBuilder().addComponents(VMInput),
      new discord.ActionRowBuilder().addComponents(HostInput),
      new discord.ActionRowBuilder().addComponents(HttpSimInput),
      new discord.ActionRowBuilder().addComponents(RDPInput),
      new discord.ActionRowBuilder().addComponents(DockerInput)
    );

    await interaction.showModal(modal).catch(() => {});
  }
};
