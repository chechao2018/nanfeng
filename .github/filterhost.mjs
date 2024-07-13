import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { pathToFileURL } from "url";
import { createRequire } from "module";

import inCfcidr from "../src/cfcidr.js";

//https://forum.linuxfoundation.org/discussion/861047/lab-7-1-err-unsupported-esm-url-scheme
const { resolve } = createRequire(import.meta.url);
async function dynamicImport(file) {
  const filepath = path.resolve(process.cwd(), file);
  return await import(pathToFileURL(resolve(filepath)).toString());
}

async function handleLine(filename) {
  const fileStream = fs.createReadStream(filename);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    const [ip, domain] = line.split(/, *| +/);
    ip && inCfcidr(ip) && console.log(domain);
  }
}

//https://stackoverflow.com/questions/14177087/replace-a-string-in-a-file-with-nodejs
async function handlePat(filename) {
  const toRemove = [];
  const fileStream = fs.createReadStream(filename);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
  for await (const line of rl) {
    const [ip, domain] = line.split(/, *| +/);
    (ip && inCfcidr(ip)) || toRemove.push(domain);
  }

  if (!toRemove.length) return;

  const file = "src/cfhostpat.js";
  const { remove } = await dynamicImport(file);
  fs.readFile(file, "utf8", (err, data) => {
    if (err) return console.error(err);

    const result = remove(data, toRemove);

    fs.writeFile(file, result, "utf8", err => {
      if (err) return console.error(err);
    });
  });
}

const argv = process.argv.slice(2);
if (argv.length == 1) handleLine(argv[0]);
if (argv.length == 2) {
  let i = argv.findIndex(a => /cfhostpat/.test(a));
  i > -1 && handlePat(argv[argv.length - i]);
}
