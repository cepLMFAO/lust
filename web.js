import config from "./config.js";

export async function upload({ source, filename }) {
  try {
    const form = new FormData();
    form.set("file", source, filename);

    const options = {
      method: "POST",
      body: form,
      headers: { Authorization: config.auth }
    };

    const res = await fetch(config.uploadURL + "/upload", options);

    const body = String.prototype.toJSON(await res.text());

    if (body.success != true) return false;
    else return body.link;
  } catch {
    return false;
  }
}

export async function cleanup() {
  try {
    const options = {
      method: "POST",
      headers: { Authorization: config.auth }
    };

    await fetch(config.uploadURL + "/cleanup", options);
  } catch {
    return false;
  }
}
