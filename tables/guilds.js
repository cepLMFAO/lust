import mongoose from "mongoose";

const guilds = mongoose.Schema({
  user: String,
  timestamp: Number,
  guild: String,
  whitelist: Boolean
});

export default mongoose.model("GUILDS", guilds);
