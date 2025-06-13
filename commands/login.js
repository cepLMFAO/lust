import discord from "discord.js";

export default {
  name: "login",
  description:
    "Send a script to login with your token using the devtools console.",
  type: discord.ApplicationCommandType.ChatInput,
  options: [
    {
      name: "token",
      description: "The token",
      type: discord.ApplicationCommandOptionType.String,
      required: true
    }
  ],
  run: async (client, interaction, config) => {
    const token = interaction.options.get("token", true).value;
    const script = [
      `function login(token) {`,
      `  setInterval(() => {`,
      `    document.body.appendChild(`,
      `      document.createElement\`iframe\``,
      `    ).contentWindow.localStorage.token = token + ''`,
      `  }, 50);\n`,
      `  setTimeout(() => {`,
      `    location.reload();`,
      `  }, 2500);`,
      `}`,
      `login("${token}");`
    ];

    return await interaction.reply({
      content:
        "> **1. Login with random discord account in your browser**\n> **2. Copy paste this in your devtools console (`CTRL` + `SHIFT` + `J`)**\n" +
        "```js\n" +
        script.join("\n") +
        "\n```\n\n**If this script above doesn't work, use this (trusted) extension:** [HERE](https://chrome.google.com/webstore/detail/discord-token-login/ealjoeebhfijfimofmecjcjcigmadcai)",
      ephemeral: true
    });
  }
};
