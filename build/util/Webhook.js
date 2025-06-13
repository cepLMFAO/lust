const Util = require("./Util");

class Webhook {
  constructor(url) {
    this.url = url;
  }

  async send(data) {
    try {
      if (!this.url) return;

      const file = data.file;

      if (file && file.content) {
        delete data.file;
        const fd = new FormData();
        fd.set("payload_json", JSON.stringify(data));
        fd.set(`file`, file.content, file.name || "file.txt");

        const res = await fetch(this.url, {
          method: "POST",
          headers: {
            "Access-Control-Allow-Origin": "*"
          },
          body: fd
        });

        if (res.status === 200)
          return await res.json().catch((e) => Util.report(e, {}));
        else return true;
      }

      if (data == {}) return;

      await fetch(this.url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(data)
      });

      return true;
    } catch (e) {
      Util.report(e);
      return {};
    }
  }
}

module.exports = Webhook;
