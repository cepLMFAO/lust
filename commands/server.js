import discord from "discord.js";
import reseller from "../tables/reseller.js";
import guilds from "../tables/guilds.js";
import * as guildutil from "../guildutil.js";

export default {
  name: "server",
  description: "Whitelist/Blacklist a server. (Reseller & Admin)",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "action",
      description: "The Action",
      type: discord.ApplicationCommandOptionType.String,
      required: true,
      choices: [
        {
          name: "add",
          value: "add"
        },
        {
          name: "remove",
          value: "rm"
        },
        {
          name: "list",
          value: "list"
        }
      ]
    },
    {
      name: "id",
      description: "The Guild ID",
      type: discord.ApplicationCommandOptionType.String,
      required: false
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

    await interaction.deferReply();

    const action = interaction.options.get("action", true).value;

    if (action === "add") {
      if (!gid) {
        return interaction.editReply({
          content: "Please fill the `id` option."
        });
      }

      if (reselling.guilds.length >= 10) {
        return interaction.editReply({
          content:
            "You already whitelisted 10 servers, please remove one of them to add other."
        });
      }

      if (reselling.guilds.includes(gid)) {
        return interaction.editReply({
          content: "You already whitelisted this server."
        });
      }

      const guildExist = await guilds.findOne({ guild: gid });

      if (guildExist || gid === config.logsGuild || gid === config.mainGuild) {
        return interaction.editReply({
          content: "You cannot whitelist this server right now..."
        });
      }

      const guildData = await new guilds({
        user: interaction.user.id,
        timestamp: Date.now(),
        guild: gid,
        whitelist: true
      });

      reselling.guilds.push(gid);

      await guildData.save();
      await reselling.save();

      const embed = new discord.EmbedBuilder()
        .setColor("Green")
        .setDescription(
          `✅ Successfully whitelisted \`${gid}\`, use **/inivte** to invite me!`
        );

      await interaction.editReply({
        content: null,
        embeds: [embed]
      });

      try {
        client.guilds.cache
          .get(config.logsGuild)
          ?.channels.cache.get(config.guildLogs)
          ?.send({
            embeds: [
              new discord.EmbedBuilder()
                .setTitle("Server Whitelisted")
                .setDescription(
                  `**Reseller: \`${interaction.user.tag}\`\nID: \`${gid}\`**`
                )
                .setColor("Green")
                .setTimestamp()
                .setThumbnail(interaction.user.displayAvatarURL())
            ]
          });
      } catch {}
    } else if (action === "rm") {
      if (!gid) {
        return interaction.editReply({
          content: "Please fill the `id` option."
        });
      }

      if (!reselling.guilds.includes(gid)) {
        return interaction.editReply({
          content: "You cant remove this server from the whitelist."
        });
      }

      const guildExist = await guilds.findOne({ guild: gid });
      const gindex = reselling.guilds.indexOf(gid);

      if (!guildExist || !(gindex > -1)) {
        return interaction.editReply({
          content: "You cant remove this server from the whitelist right now..."
        });
      }

      reselling.guilds.splice(gindex, 1);

      await guildExist.delete();
      await reselling.save();

      const embed = new discord.EmbedBuilder()
        .setColor("Green")
        .setDescription(
          `✅ Successfully removed \`${gid}\` from the whitelist.`
        );

      await interaction.editReply({
        content: null,
        embeds: [embed]
      });

      await guildutil.checkMany(client.guilds.cache);

      try {
        client.guilds.cache
          .get(config.logsGuild)
          ?.channels.cache.get(config.guildLogs)
          ?.send({
            embeds: [
              new discord.EmbedBuilder()
                .setTitle("Server Whitelist Removed")
                .setDescription(
                  `**Reseller: \`${interaction.user.tag}\`\nID: \`${gid}\`**`
                )
                .setColor("Red")
                .setTimestamp()
                .setThumbnail(interaction.user.displayAvatarURL())
            ]
          });
      } catch {}
    } else if (action === "list") {
      if (reselling.guilds.length < 1) {
        return interaction.editReply({
          content: "You don't have any whitelisted guilds."
        });
      }

      const gdata = await Promise.all(
        reselling.guilds.map(async (guild) => {
          const ins = client.guilds.cache.has(guild);

          return `**ID:** \`${guild}\` | **Joined:** \`${ins ? "Yes" : "No"}\``;
        })
      );

      const embed = new discord.EmbedBuilder()
        .setTitle("Whitelisted Servers")
        .setColor("Purple")
        .setDescription(gdata.join("\n") || "`No Data`");

      return await interaction.editReply({
        content: null,
        embeds: [embed]
      });
    } else {
      return interaction.editReply({
        content: "Invalid Action"
      });
    }
  }
};
