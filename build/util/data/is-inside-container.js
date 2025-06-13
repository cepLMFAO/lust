const fs = require("node:fs");
const isDocker = require("is-docker");

let cachedResult;

// Podman detection
const hasContainerEnv = () => {
  try {
    fs.statSync("/run/.containerenv");
    return true;
  } catch {
    return false;
  }
};

module.exports = function isInsideContainer() {
  if (cachedResult === undefined)
    cachedResult = hasContainerEnv() || isDocker();

  return cachedResult;
};
