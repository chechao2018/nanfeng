const cfdomain =
  "cloudflare(stream|storage|-ipfs|-dns)?.(com|tv|dev)|(workers|pages).dev|one.one.one.one";
const hostedDomains = {
  ".ai": ["ckk"],
  ".app": ["cupfox", "exeo", "gimy"],
  ".az": ["apa", "report", "turbo"],
  ".biz": ["cyberciti"],
  ".cc": ["domp4", "myasiantv"],
  ".club": ["madou"],
  ".co": ["watchfreejavonline"],
  ".com": [
    "52poke|91porny|91porn",
    "asurascans|ahhhhfs|activehosted|androidcontents|apkcombo|apkshub|apkpure|apkmirror|askubuntu|adpointbreakrtb|adpointrtb",
    "bdys01|bt-tt|bscscan|bamboohr",
    "chatgpt|codenong",
    "discord|duplichecker|dirtyship",
    "forexfactory|fextralife|filecr|filmaffinity",
    "getbootstrap|getintopc",
    "hdmoli|huijiwiki|hrishikeshpathak",
    "iloveimg|imagetwist|incestflix|influencersgonewild",
    "javdb|javatpoint|javmost|japaneseasmr|junmajinlong",
    "lectortmo|linkvertise|loverslab|linuxhint|laracasts",
    "mydramalist|modyolo",
    "ncctvgroup",
    "oaistatic",
    "pexels|pixabay|pngtree|piliapp",
    "rrdynb|rapidtables|reaperscans",
    "stackexchange|stackoverflow|superuser|serverfault|supjav|stackabuse|smallseotools|slidesgo|stardewvalleywiki|sexkbj",
    "tktube|towardsdatascience|transcend-cdn|twittervideodownloader",
    "unpkg",
    "webmota|wnacg|witanime",
    "xhamster3",
    "yuxiweibang",
    "zztongyun",
  ],
  ".es": ["xvideos"],
  ".guru": ["jav"],
  ".in": ["brainly", "hostinger"],
  ".info": ["myreadingmanga"],
  ".io": ["keywordtool"],
  ".is": ["y2mate"],
  ".jp": ["wikiru"],
  ".me": ["shrinke"],
  ".men": ["hsex"],
  ".mobi": ["nurxxx"],
  ".mx": ["yts"],
  ".net": [
    "123moviesfree|5ch",
    "apkpure",
    "bimiacg4",
    "codecanyon",
    "diagrams",
    "exporntoons",
    "iplocation",
    "jkanime",
    "loli",
    "perfectgirls",
    "sehuatang|sitesaver",
    "twidouga",
    "vseigru",
    "wordcounter",
    "xiaoheimi",
  ],
  ".org": [
    "annas-archive|archiveofourown",
    "cookielaw",
    "exhentai",
    "opensubtitles",
    "rutracker",
    "sehuatang",
  ],
  ".pro": ["zxzj"],
  ".pw": ["fullhdfilmizlesene"],
  ".re": ["dood"],
  ".ro": ["kickassanime"],
  ".sb": ["ip"],
  ".sc": ["prnt"],
  ".site": ["notion"],
  ".support": ["apk"],
  ".to": ["goojara", "thothub"],
  ".top": ["vidhub"],
  ".tv": ["bgm", "cableav", "hanime", "javmix", "njav"],
  ".vip": ["18comic", "digimovie", "freeok"],
  ".xxx": ["hentaihaven"],
  ".xyz": ["1fuli"],
  ".yt": ["dood"],
};

// console.log(Object.keys(hostedDomains).reduce((r, k) => {
//   r += hostedDomains[k].flatMap(v => {
//     return v.split('|').map(v=>v+k+' ')
//   }).join(' ');
//   return r
// },'').replace(/ +$/g, '').replace(/ +/g, '\n'))

const cfhostPat = new RegExp(
  Object.keys(hostedDomains).reduce((r, k) => {
    r += `|(${hostedDomains[k].join("|")})${k}`;
    return r;
  }, cfdomain)
);
export default cfhostPat;
