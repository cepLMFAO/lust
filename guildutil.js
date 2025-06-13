import guilds from "./tables/guilds.js";
import config from "./config.js";
import { setTimeout as sleep } from "timers/promises";

export async function check(id) {
  const find = await guilds.findOne({ guild: id });

  if (!find && config.logsGuild != id && config.mainGuild != id) return false;
  return true;
}

export async function checkMany(garr) {
  if (!garr?.map) return [];
  const out = await Promise.all(
    garr.map(async (g) => {
      const c = await check(g.id);
      if (c) return;

      await sleep(500);
      console.log("Left guild", g.name);

      return {
        left: await g.leave().catch(() => false)
      };
    })
  );

  return out;
}
