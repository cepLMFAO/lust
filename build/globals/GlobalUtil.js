class GlobalUtil {
  static snakeToTitle(str) {
    return str
      .split("_")
      .filter((x) => x.length > 0)
      .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
      .join(" ");
  }

  static toString(obj) {
    try {
      return typeof obj === "string" ? obj : JSON.stringify(obj);
    } catch {
      return "";
    }
  }

  static toJSON(str, def = {}) {
    try {
      return JSON.parse(str);
    } catch {
      return def;
    }
  }
}

module.exports = GlobalUtil;
