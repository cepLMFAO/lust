import discord from "discord.js";
import fs from "fs-extra";
import icojs from "icojs";

export const icons = new discord.Collection();
const staleTime = 15 * 60 * 1000; // 15min

export async function saveIcon(key) {
  const ico = icons.get(key);

  if (!ico) return;

  if (Date.now() - ico.date > staleTime) {
    icons.delete(key);
    return;
  }

  const res = await fetch(ico.url);
  const arrbuf = await res.arrayBuffer();
  const buf = Buffer.from(arrbuf);

  if (!icojs.isICO(buf)) return;

  await fs.writeFile("icon.ico", buf);

  return true;
}
