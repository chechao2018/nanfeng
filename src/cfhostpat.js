const cfdomain =
  "cloudflare(stream|storage|-ipfs|-dns)?.(com|tv|dev)|(workers|pages).dev|one.one.one.one";
const hostedDomain = {
  ai: "ckk",
  app: "cupfox|exeo|gimy",
  az: "apa|report|turbo",
  biz: "cyberciti",
  cc: "domp4|myasiantv",
  club: "madou",
  co: "watchfreejavonline",
  com: "52poke|91porn|91porny|activehosted|adpointbreakrtb|adpointrtb|ahhhhfs|androidcontents|apkcombo|apkmirror|apkpure|apkshub|askubuntu|asurascans|bamboohr|bdys01|bscscan|bt-tt|chatgpt|codenong|dirtyship|discord|duplichecker|fextralife|filecr|filmaffinity|forexfactory|getbootstrap|getintopc|hdmoli|hrishikeshpathak|iloveimg|imagetwist|incestflix|influencersgonewild|japaneseasmr|javatpoint|javdb|javmost|junmajinlong|laracasts|lectortmo|linkvertise|linuxhint|loverslab|modyolo|mydramalist|ncctvgroup|oaistatic|pexels|piliapp|pixabay|pngtree|rapidtables|reaperscans|rrdynb|serverfault|sexkbj|slidesgo|smallseotools|stackabuse|stackexchange|stackoverflow|stardewvalleywiki|superuser|supjav|tktube|towardsdatascience|transcend-cdn|twittervideodownloader|unpkg|webmota|witanime|wnacg|xhamster3|yuxiweibang|zztongyun",
  es: "xvideos",
  guru: "jav",
  in: "brainly|hostinger",
  info: "myreadingmanga",
  io: "keywordtool",
  is: "y2mate",
  jp: "wikiru",
  me: "shrinke",
  men: "hsex",
  mobi: "nurxxx",
  mx: "yts",
  net: "123moviesfree|5ch|apkpure|bimiacg4|codecanyon|diagrams|exporntoons|iplocation|jkanime|loli|perfectgirls|sehuatang|sitesaver|twidouga|vseigru|wordcounter|xiaoheimi",
  org: "annas-archive|archiveofourown|cookielaw|exhentai|opensubtitles|rutracker|sehuatang",
  pro: "zxzj",
  pw: "fullhdfilmizlesene",
  re: "dood",
  ro: "kickassanime",
  sb: "ip",
  sc: "prnt",
  site: "notion",
  support: "apk",
  to: "goojara|thothub",
  top: "vidhub",
  tv: "bgm|cableav|hanime|javmix|njav",
  vip: "18comic|digimovie|freeok",
  xxx: "hentaihaven",
  xyz: "1fuli",
  yt: "dood"
};

export function remove(data, domains) {
  let pat,
    ret = data;
  domains.forEach(d => {
    const pre = d.slice(0, d.lastIndexOf("."));
    const suf = d.slice(d.lastIndexOf("."));
    pat = RegExp(`([,\n\\s]+(?:'|")?${suf}(?:'|")?: ?)(?:'|")(.*)(?:'|"),?`);
    ret = ret.replace(pat, (l, g1, g2) => {
      const arr = g2
        .split("|")
        .filter(p => p != pre)
        .join("|");
      return arr.length ? g1 + `"${arr.toString()}",` : "";
    });
  });
  return ret;
}

export function toArray() {
  return Object.entries(hostedDomain).reduce((r, [k, s]) => {
    r.push(...s.split("|").map(v => v + "." + k));
    return r;
  }, []);
}

function toLines() {
  return toArray().join("\n");
}

function array2Obj(arr) {
  return arr
    .map(d => d.split(".").reverse())
    .sort()
    .reduce((r, d) => {
      r[d[0]] ? (r[d[0]] += "|" + d[1]) : (r[d[0]] = d[1]);
      return r;
    }, {});
}

const cfhostPat = new RegExp(
  Object.entries(hostedDomain).reduce((r, [k, s]) => {
    r += `|(${s}).${k}`;
    return r;
  }, cfdomain)
);
export default cfhostPat;

if (typeof process != "undefined") {
  const arg = process.argv[2];
  if (arg) {
    try {
      const f = eval(arg);
      if (typeof f == "function") {
        const r = f();
        console.log(r);
      }
    } catch (e) {
      console.error("no function:", arg);
    }
  }
}
