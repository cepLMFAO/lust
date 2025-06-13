import fs from "fs";
import * as v9 from "discord-api-types/v9";
import { REST } from "@discordjs/rest";
import AsciiTable from "ascii-table";
import config from "./config.js";

const { Routes } = v9;
const table = new AsciiTable().setHeading("Slash Commands", "Stats");

const rest = new REST({ version: "9" }).setToken(config.login);

export default async (client) => {
  const slashCommands = [];
  const files = fs
    .readdirSync(`./commands/`)
    .filter((file) => file.endsWith(".js"));

  for (const file of files) {
    const rawCommand = await import(`./commands/${file}`);
    const slashCommand = rawCommand.default;
    const beta = config.dev ? "beta-" : "";

    slashCommands.push({
      name: beta + slashCommand.name,
      description: slashCommand.description || "No Description.",
      type: slashCommand.type,
      options: slashCommand.options ? slashCommand.options : null
    });

    if (slashCommand.name) {
      client.slashCommands.set(beta + slashCommand.name, slashCommand);
      table.addRow(file.split(".js")[0], "✅");
    } else {
      table.addRow(file.split(".js")[0], "⛔");
    }
  }

  (async () => {
    try {
      await rest.put(Routes.applicationCommands(client.user.id), {
        body: slashCommands
      });
      console.log(table.toString());
    } catch (error) {
      console.log(error);
    }
  })();
};
