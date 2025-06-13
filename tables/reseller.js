import mongoose from "mongoose";

const reseller = mongoose.Schema({
  user: String,
  sinceTimestamp: Number,
  lastCreditTimestamp: Number,
  byUser: [String],
  banned: {
    type: Boolean,
    default: false
  },
  keys: {
    type: [String],
    default: []
  },
  guilds: {
    type: [String],
    default: []
  },
  credit: {
    all: Number,
    used: Number
  }
});

export default mongoose.model("RESELLER", reseller);
