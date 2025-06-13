const Constants = {
  color: 0x974cfc,
  name: "@luststealer",
  logo: "https://i.imgur.com/Gu62top.jpeg"
};

class Embed {
  constructor(data = {}) {
    this.backtick = data.backtick ?? true;

    this.fields = [];

    this.color = Constants.color;

    this.footer = {
      text: Constants.name,
      iconURL: Constants.logo
    };
  }

  get length() {
    return (
      (this.title?.length ?? 0) +
      (this.description?.length ?? 0) +
      (this.fields.length >= 1
        ? this.fields.reduce(
            (prev, curr) => prev + curr.name.length + curr.value.length,
            0
          )
        : 0) +
      (this.footer?.text.length ?? 0) +
      (this.author?.name.length ?? 0)
    );
  }

  addBlankField(inline = false) {
    return this.addField("\u200B", "\u200B", inline, false);
  }

  addField(name, value, inline, backtick) {
    return this.addFields({ name, value, inline, backtick });
  }

  addFields(...fields) {
    this.fields.push(
      ...this.constructor.normalizeFields(this.backtick, fields)
    );
    return this;
  }

  setAuthor(options, diconURL, URL) {
    if (options === null) {
      this.author = {};
      return this;
    }

    if (typeof options === "string")
      options = {
        name: options,
        url: URL,
        iconURL: diconURL
      };

    const { name, url, iconURL } = options;
    this.author = {
      name,
      url,
      iconURL
    };
    return this;
  }

  setDescription(description) {
    this.description = description;
    return this;
  }

  setImage(url) {
    this.image = { url };
    return this;
  }

  setThumbnail(url) {
    this.thumbnail = { url };
    return this;
  }

  setTimestamp(timestamp = Date.now()) {
    if (timestamp instanceof Date) timestamp = timestamp.getTime();
    this.timestamp = timestamp;
    return this;
  }

  setTitle(title) {
    this.title = title;
    return this;
  }

  setURL(url) {
    this.url = url;
    return this;
  }

  addFooter(...footers) {
    const text = " • " + footers.join(" • ");
    this.footer.text += text;

    return this;
  }

  toJSON() {
    return {
      title: this.title,
      type: "rich",
      description: this.description,
      url: this.url,
      timestamp: this.timestamp && new Date(this.timestamp),
      color: this.color,
      fields: this.fields,
      thumbnail: this.thumbnail,
      image: this.image,
      author: this.author && {
        name: this.author.name,
        url: this.author.url,
        icon_url: this.author.iconURL
      },
      footer: this.footer && {
        text: this.footer.text,
        icon_url: this.footer.iconURL
      }
    };
  }

  static normalizeField(name, value, inline = false, backtick = true) {
    value = value ?? "No Data";
    return {
      name: name,
      value: backtick ? "```" + value + "```" : value,
      inline
    };
  }

  static normalizeFields(backtick, ...fields) {
    return fields
      .flat(2)
      .map((field) =>
        this.normalizeField(
          field.name,
          field.value,
          typeof field.inline === "boolean" ? field.inline : false,
          field.backtick ?? backtick
        )
      );
  }
}

module.exports = Embed;
