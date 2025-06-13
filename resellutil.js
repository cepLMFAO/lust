import reseller from "./tables/reseller.js";

export async function addCredit(user, credit, admin) {
  let resell = await reseller.findOne({ user });

  let isNew = false;
  if (!resell) {
    isNew = true;
    resell = new reseller({
      user,
      sinceTimestamp: Date.now(),
      lastCreditTimestamp: Date.now(),
      byUser: [admin],
      credit: {
        all: credit,
        used: 0
      }
    });
  } else {
    resell.lastCreditTimestamp = Date.now();
    if (!Array.isArray(resell.byUser)) resell.byUser = [];
    resell.byUser.push(admin);
    resell.credit.all += credit;
  }

  if (resell.credit.all > 10_000) return 1;

  const final = await resell.save().catch((e) => null);

  if (!final) return false;
  return Object.assign(resell.credit, { isNew });
}

/**
 * 1 - user not found
 * 2 - not enough credit to remove
 * 3 - out credit not enough
 * 4 - error
 */
export async function removeCredit(user, credit) {
  const resell = await reseller.findOne({ user });

  if (!resell) return 1;

  if (resell.credit?.all < 1) return 2;

  const finalCredit = (resell.credit.all -= credit);

  if (finalCredit < 0) return 3;

  resell.credit.all = finalCredit;

  const final = await resell.save().catch((e) => null);

  if (!final) return 4;
  return resell.credit;
}

export async function useCredit(rexist, credit, key) {
  rexist.credit.all -= credit;
  rexist.credit.used += credit;

  if (key) rexist.keys.push(key);

  const final = rexist.save().catch((e) => null);

  if (!final) return false;
  return rexist.credit;
}
