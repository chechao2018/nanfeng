import fs from "node:fs";
import readline from "node:readline";
import inCfcidr from "../src/cfcidr.mjs";

async function processLine(filename) {
  const fileStream = fs.createReadStream(filename);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });
  for await (const line of rl) {
    const [ip, domain] = line.split(/, *| +/);
    ip && inCfcidr(ip) && console.log(domain);
  }
}
if (process.argv[2]) processLine(process.argv[2]);
