import mongoose from "mongoose";

const keys = mongoose.Schema({
  user: String,
  key: String,
  publicKey: String,
  webhook: String,
  createdTimestamp: Number,
  updatedTimestamp: Number,
  endTimestamp: Number,
  ended: Boolean,
  notified: Boolean,
  reseller: String,
  plan: Number,
  builds: [String],

  // Config
  blockVm: {
    type: Boolean,
    default: true
  },
  blockHost: {
    type: Boolean,
    default: false
  },
  blockHttpSim: {
    type: Boolean,
    default: true
  },
  blockRdp: {
    type: Boolean,
    default: false
  },
  blockDocker: {
    type: Boolean,
    default: false
  }
});

export default mongoose.model("KEYS", keys);
