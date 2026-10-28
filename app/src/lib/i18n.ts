import { useSyncExternalStore } from "react";

export type Lang = "en" | "tr";

const KEY = "shortshi.lang";

function detect(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "en" || saved === "tr") return "en";
  } catch {
    // storage blocked: fall through to the browser language
  }
  return "en";
}

let current: Lang = typeof window === "undefined" ? "en" : detect();
const subs = new Set<() => void>();

export function setLang(_l: Lang) {
  current = "en";
  try {
    localStorage.setItem(KEY, "en");
  } catch {
    // the choice still holds for this visit
  }
  document.documentElement.lang = "en";
  subs.forEach((f) => f());
}

export function getLang(): Lang {
  return current;
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => current,
  );
}

export const useT = () => STR[useLang()];

/** English region labels retained for compatibility with existing imports. */
export const TR_COUNTRY: Record<string, [string, string]> = {
  tr: ["Turkey", "Turkey"], us: ["United States", "United States"], kr: ["South Korea", "South Korea"], br: ["Brazil", "Brazil"],
  jp: ["Japan", "Japan"], de: ["Germany", "Germany"], gb: ["United Kingdom", "United Kingdom"],
  fr: ["France", "France"], mx: ["Mexico", "Mexico"], in: ["India", "India"],
};

const en = {
  nav: { today: "Home", browse: "Markets", me: "My picks", leaders: "Leaderboard" },
  home: {
    title: "Predict the next big YouTube Shorts.",
    sub: "Will a @WarehouseJobz video reach 1 million views in 24 hours? Can it gain 250,000 views in six hours? Predict YouTube performance with test dollars. Verified results determine who shares the pool.",
    start: "Start with 1,000 test dollars",
    browse: "See all markets",
    stats: { volume: "In pools", bets: "Picks made", players: "Players", open: "Open markets" },
    deckHint: "Tap a pick to see what it pays",
    deckCta: "Make this pick",
    deckPays: (m: string) => `pays ${m} per tUSD`,
    deckFresh: "nobody's on it yet",
    prev: "Previous market",
    next: "Next market",
    tickerBet: (u: string, a: string, l: string) => `${u} put ${a} tUSD on ${l}`,
    tickerClaim: (u: string, a: string) => `${u} collected ${a} tUSD`,
    howTitle: "How it works",
    how: [
      ["Pick", "Choose YES or NO on a YouTube Shorts video milestone, or predict which tracked creator gains the most views."],
      ["Put in", "Your test dollars join the market's single pool. The fewer people on your pick, the more it pays."],
      ["YouTube data decides", "Open code checks YouTube Data API statistics and recorded view snapshots, then submits the result to UMA for disputes. Correct picks split the pool."],
    ],
    closing: "Closing soon",
    leadersTitle: "Top players",
    won: "won",
    staked: "staked",
    picks: (n: number) => `${n} picks`,
    leadersEmpty: "No results yet. YouTube markets settle at their scheduled resolution times.",
    activityTitle: "Live picks",
    activityEmpty: "Picks show up here a few seconds after they land onchain.",
    tokenTitle: "tUSD, the test dollar YouTube Shorts markets use",
    tokenBody: "Every market on testnet is played in tUSD, our own ERC-20 on Arbitrum Sepolia. Approvals are signatures, not extra transactions (EIP-2612). Anyone can claim 1,000 a day, with a little test ETH for gas. On mainnet USDC takes its place.",
    tokenAdd: "Add tUSD to my wallet",
    tokenContract: "Token contract",
    supply: "Decimals",
    footer: "Testnet only. Test dollars have no value.",
    cats: { all: "All", music: "24-hour views", youtube: "View velocity", views: "Likes and engagement", fast: "Creator growth", soon: "More markets" },
    catNote: {
      all: "Every open market",
      music: "Will a video reach 1,000,000 views in 24 hours?",
      youtube: "Will a video gain 250,000 views in six hours?",
      views: "Will a video earn 50,000 likes or exceed a 5% engagement rate?",
      fast: "Which tracked YouTube creator will gain the most views?",
      soon: "Explore all five YouTube performance markets",
    },
    search: "Search Warehouse Jobs videos, creators, or milestones",
    sort: { closing: "Closing soon", pool: "Biggest pool", fresh: "Newest" },
    gridTitle: "Markets",
    noMatch: "Nothing matches. Try another word or category.",
    viewsSoon: "Opens when a tracked YouTube video qualifies.",
    poolLabel: "pool",
    bettors: (n: number) => (n === 1 ? "1 player" : `${n} players`),
    autoplay: "Playing through markets",
  },
  chart: {
    title: "How the pool moved",
    empty: "The chart starts with the first pick.",
    ranges: { h1: "1H", h6: "6H", d1: "1D", all: "All" },
  },
  tabs: { recent: "Recent picks", top: "Biggest picks", related: "More like this" },
  foot: {
    tagline: "Predict YouTube Shorts viral milestones. Markets use public YouTube statistics, recorded snapshots, and UMA.",
    markets: "Markets",
    product: "Product",
    verify: "Verify",
    build: "Built with",
    how: "How it works",
    token: "tUSD faucet",
    engine: "Engine API",
    source: "Resolver code",
    hackathon: "Built By Wizard of Hahz",
    legal: "A game on Arbitrum Sepolia. Test dollars only, no real money, not audited, not investment advice.",
    block: "Arbitrum Sepolia, block",
  },
  picker: {
    title: "How do you want to play?",
    instant: "Instant wallet",
    instantDesc: "Nothing to install. A test wallet opens in this browser and 1,000 tUSD plus gas arrive automatically.",
    fastest: "Fastest",
    or: "Or connect your own wallet",
    none: "No browser wallet found. MetaMask, Rabby and OKX Wallet work with Arbitrum Sepolia.",
    noTestnet: "No Arbitrum Sepolia support",
    close: "Close",
    errors: {
      unsupported: (w: string) => `${w || "This wallet"} can't switch to Arbitrum Sepolia. Use the instant wallet, or MetaMask, Rabby or OKX Wallet.`,
      rejected: () => "You closed the wallet request.",
      none: () => "Connect a wallet first.",
    },
    menuInstant: "Instant wallet in this browser",
    logout: "Disconnect",
  },
  lang: { label: "Language", other: "EN" },
  family: { music: "Warehouse Jobs", youtube: "YouTube KPIs" },
  engineDown: "Can't reach the market engine right now. Retrying every 30 seconds.",
  loadingMarkets: "Loading markets",
  today: {
    kicker: (when: string) => `Today's YouTube prediction. Results are checked ${when}.`,
    closesIn: "Betting closes in",
    pool: "In the pool",
    outcomes: "Outcomes",
    cta: "Make your pick",
    board: "Where the money is",
    multHint: "multiplier if it wins",
    how: [
      ["Everyone pays into one pot", "People who pick the right answer split the whole pool, minus a 2% fee."],
      ["YouTube data decides", "When the market resolves, code checks YouTube statistics and required baseline snapshots. No person selects the winner."],
      ["Anyone can check it", "The result sits on UMA's oracle for a while. If it's wrong, anyone can dispute it."],
    ],
    alsoOpen: "Also open",
    nMarkets: (n: number) => `${n} markets`,
    deciding: "Being decided",
    decidingHint: "results checked on UMA",
    empty: "New markets open when eligible videos and tracking windows are available.",
  },
  market: {
    cantLoad: (id: number, e: string) => `Market ${id} could not be loaded. ${e}`,
    loading: (id: number) => `Loading market ${id}`,
    kicker: (family: string, when: string) => `${family}. The result is read ${when}.`,
    demo: "demo, real data on a short clock",
    status: ["Open", "Locked", "Being checked", "Decided", "Cancelled"],
    statusLabel: "Status",
    boardOpen: "Make your pick",
    boardResolved: "The result",
    boardClosed: "The picks",
    refunded: (v: string) => `Refunded ${v} tUSD.`,
    collected: (v: string) => `Collected ${v} tUSD.`,
    cancelledTitle: "This market was cancelled",
    wonTitle: "You called it",
    cancelledBody: "The source wasn't available, so every stake is refunded.",
    wonBody: "Your YouTube prediction was correct. Collect your share of the pool.",
    refundBtn: "Get my refund",
    collectBtn: (v: string) => `Collect ${v} tUSD`,
    howTitle: "How the result is decided",
    fingerprint: "Resolver code fingerprint, stored onchain:",
    loadingShort: "loading",
    evidence: "See the raw evidence",
    contract: "Contract on Arbiscan",
    share: "Share on X",
    tweet: (q: string) => `${q} I made my pick on Shortshi.`,
    live: { "Views now": "Views now", "#1 right now": "Leading creator" } as Record<string, string>,
    rules: {
      YT_VIEWS_24H: "YES if the tracked video reaches at least 1,000,000 views within 24 hours of publication, verified with YouTube Data API statistics. Missing or unverifiable data voids the market.",
      YT_VIEW_VELOCITY: "YES if the tracked video gains at least 250,000 views during the defined six-hour window, measured using timestamped YouTube view-count snapshots. Missing baseline or final data voids the market.",
      YT_LIKES_24H: "YES if the tracked video reaches at least 50,000 likes within 24 hours of publication, verified with YouTube Data API statistics. Missing or unverifiable data voids the market.",
      YT_ENGAGEMENT_RATE: "YES if likes divided by views is strictly greater than 5% at resolution. Both counts must be available and views must be greater than zero; otherwise the market is void.",
      YT_CREATOR_VIEWS: "The tracked creator with the greatest increase in total channel views over the defined period wins, based on timestamped baseline and final snapshots. Missing comparison data voids the market.",
    } as Record<string, string>,
  },
  option: {
    other: "Other creator",
    mine: (v: string) => `You have ${v} on this`,
    fresh: "new",
    ofPool: (p: string) => `${p}% of the pool`,
    noPicks: "no picks",
    first: "be the first",
  },
  slip: {
    pick: "Pick an outcome above",
    then: "Then choose how much to put in.",
    win: ["If you're right you get ", " tUSD"],
    min: " · minimum 1",
    max: " · maximum 500 per market",
    amount: "Amount",
    custom: "Custom amount",
    other: "other",
    confirm: "Confirm in wallet",
    bet: (n: number) => `Bet ${n} tUSD`,
    placed: (title: string) => `Bet placed on ${title}. View it on Arbiscan.`,
  },
  steps: {
    title: "Where this market is",
    open: "Betting open",
    closes: "Betting closes",
    posted: "Result posted to UMA, open to disputes",
    paid: "Winners paid",
    cancelled: "Cancelled, everyone refunded",
  },
  tile: {
    closesIn: (c: string) => `Closes in ${c}`,
    checking: "Result being checked on UMA",
    decided: "Decided",
    closed: "Closed",
    demo: "demo",
  },
  wallet: {
    connect: "Connect wallet",
    sending: "Sending",
    get: "Get 1,000 test dollars",
    sent: "1,000 test dollars and a little gas are on the way.",
    addressCooldown: "You already got test dollars today. Come back tomorrow.",
    ipCooldown: "This network already used the faucet today. Come back tomorrow.",
    faucetDown: "The faucet didn't answer. Try again in a minute.",
  },
  browse: {
    title: "Browse markets",
    category: "Category",
    soonTab: "More markets",
    soonNote: "Coming soon",
    soon: [
      ["24-hour views", "Will the next Warehouse Jobs video reach 1,000,000 views within 24 hours?"],
      ["View velocity", "Will a @WarehouseJobz  video gain 250,000 views within six hours?"],
      ["24-hour likes", "Will a @WarehouseJobz  video reach 50,000 likes within 24 hours?"],
      ["Engagement rate", "Will likes exceed 5% of views at resolution?"],
      ["Creator views", "Which tracked YouTube creator will gain the most views during the market window?"],
    ],
    emptyYt: "@WarehouseJobz YouTube markets open when eligible videos and measurement windows are available.",
    emptyMusic: "No 24-hour view markets are open right now. Check back after the next tracked upload.",
  },
  me: {
    title: "My picks",
    connect: "Connect wallet to see your picks",
    reading: "Reading your picks from the chain",
    empty: "No picks yet. Today's big market is a good place to start.",
    staked: (v: string) => `${v} tUSD in`,
    status: { open: "Open", settled: "Decided", void: "Refunded", other: "Being checked" },
    collect: (v: string) => `Collect ${v}`,
    view: "View",
  },
};


type Dict = typeof en;

const tr: Dict = {
  nav: { today: "Home", browse: "Markets", me: "My picks", leaders: "Leaderboard" },
  home: {
    title: "Predict the next big YouTube Shorts.",
    sub: "Will a  @WarehouseJobz video reach 1 million views in 24 hours? Can it gain 250,000 views in six hours? Predict YouTube performance with test dollars. Verified results determine who shares the pool.",
    start: "Start with 1,000 test dollars",
    browse: "See all markets",
    stats: { volume: "In pools", bets: "Picks made", players: "Players", open: "Open markets" },
    deckHint: "Tap a pick to see what it pays",
    deckCta: "Make this pick",
    deckPays: (m: string) => `pays ${m} per tUSD`,
    deckFresh: "nobody's on it yet",
    prev: "Previous market",
    next: "Next market",
    tickerBet: (u: string, a: string, l: string) => `${u} put ${a} tUSD on ${l}`,
    tickerClaim: (u: string, a: string) => `${u} collected ${a} tUSD`,
    howTitle: "How it works",
    how: [
      ["Pick", "Choose YES or NO on a YouTube Shorts video milestone, or predict which tracked creator gains the most views."],
      ["Put in", "Your test dollars join the market's single pool. The fewer people on your pick, the more it pays."],
      ["YouTube data decides", "Open code checks YouTube Data API statistics and recorded view snapshots, then submits the result to UMA for disputes. Correct picks split the pool."],
    ],
    closing: "Closing soon",
    leadersTitle: "Top players",
    won: "won",
    staked: "staked",
    picks: (n: number) => `${n} picks`,
    leadersEmpty: "No results yet. YouTube markets settle at their scheduled resolution times.",
    activityTitle: "Live picks",
    activityEmpty: "Picks show up here a few seconds after they land onchain.",
    tokenTitle: "tUSD, the test dollar YouTube Shorts markets use",
    tokenBody: "Every market on testnet is played in tUSD, our own ERC-20 on Arbitrum Sepolia. Approvals are signatures, not extra transactions (EIP-2612). Anyone can claim 1,000 a day, with a little test ETH for gas. On mainnet USDC takes its place.",
    tokenAdd: "Add tUSD to my wallet",
    tokenContract: "Token contract",
    supply: "Decimals",
    footer: "Testnet only. Test dollars have no value.",
    cats: { all: "All", music: "24-hour views", youtube: "View velocity", views: "Likes and engagement", fast: "Creator growth", soon: "More markets" },
    catNote: {
      all: "Every open market",
      music: "Will a video reach 1,000,000 views in 24 hours?",
      youtube: "Will a video gain 250,000 views in six hours?",
      views: "Will a video earn 50,000 likes or exceed a 5% engagement rate?",
      fast: "Which tracked YouTube creator will gain the most views?",
      soon: "Explore all five YouTube performance markets",
    },
    search: "Search @WarehouseJobz videos, creators, or milestones",
    sort: { closing: "Closing soon", pool: "Biggest pool", fresh: "Newest" },
    gridTitle: "Markets",
    noMatch: "Nothing matches. Try another word or category.",
    viewsSoon: "Opens when a tracked YouTube video qualifies.",
    poolLabel: "pool",
    bettors: (n: number) => (n === 1 ? "1 player" : `${n} players`),
    autoplay: "Playing through markets",
  },
  chart: {
    title: "How the pool moved",
    empty: "The chart starts with the first pick.",
    ranges: { h1: "1H", h6: "6H", d1: "1D", all: "All" },
  },
  tabs: { recent: "Recent picks", top: "Biggest picks", related: "More like this" },
  foot: {
    tagline: "Predict YouTube Shorts milestones. Markets use public YouTube statistics, recorded snapshots, and UMA.",
    markets: "Markets",
    product: "Product",
    verify: "Verify",
    build: "Built with",
    how: "How it works",
    token: "tUSD faucet",
    engine: "Engine API",
    source: "Resolver code",
    hackathon: "Colosseum Crypto World's Fair, Arbitrum track",
    legal: "A game on Arbitrum Sepolia. Test dollars only, no real money, not audited, not investment advice.",
    block: "Arbitrum Sepolia, block",
  },
  picker: {
    title: "How do you want to play?",
    instant: "Instant wallet",
    instantDesc: "Nothing to install. A test wallet opens in this browser and 1,000 tUSD plus gas arrive automatically.",
    fastest: "Fastest",
    or: "Or connect your own wallet",
    none: "No browser wallet found. MetaMask, Rabby and OKX Wallet work with Arbitrum Sepolia.",
    noTestnet: "No Arbitrum Sepolia support",
    close: "Close",
    errors: {
      unsupported: (w: string) => `${w || "This wallet"} can't switch to Arbitrum Sepolia. Use the instant wallet, or MetaMask, Rabby or OKX Wallet.`,
      rejected: () => "You closed the wallet request.",
      none: () => "Connect a wallet first.",
    },
    menuInstant: "Instant wallet in this browser",
    logout: "Disconnect",
  },
  lang: { label: "Language", other: "EN" },
  family: { music: "Warehouse Jobs", youtube: "YouTube KPIs" },
  engineDown: "Can't reach the market engine right now. Retrying every 30 seconds.",
  loadingMarkets: "Loading markets",
  today: {
    kicker: (when: string) => `Today's YouTube prediction. Results are checked ${when}.`,
    closesIn: "Betting closes in",
    pool: "In the pool",
    outcomes: "Outcomes",
    cta: "Make your pick",
    board: "Where the money is",
    multHint: "multiplier if it wins",
    how: [
      ["Everyone pays into one pot", "People who pick the right answer split the whole pool, minus a 2% fee."],
      ["YouTube data decides", "When the market resolves, code checks YouTube statistics and required baseline snapshots. No person selects the winner."],
      ["Anyone can check it", "The result sits on UMA's oracle for a while. If it's wrong, anyone can dispute it."],
    ],
    alsoOpen: "Also open",
    nMarkets: (n: number) => `${n} markets`,
    deciding: "Being decided",
    decidingHint: "results checked on UMA",
    empty: "New markets open when eligible videos and tracking windows are available.",
  },
  market: {
    cantLoad: (id: number, e: string) => `Market ${id} could not be loaded. ${e}`,
    loading: (id: number) => `Loading market ${id}`,
    kicker: (family: string, when: string) => `${family}. The result is read ${when}.`,
    demo: "demo, real data on a short clock",
    status: ["Open", "Locked", "Being checked", "Decided", "Cancelled"],
    statusLabel: "Status",
    boardOpen: "Make your pick",
    boardResolved: "The result",
    boardClosed: "The picks",
    refunded: (v: string) => `Refunded ${v} tUSD.`,
    collected: (v: string) => `Collected ${v} tUSD.`,
    cancelledTitle: "This market was cancelled",
    wonTitle: "You called it",
    cancelledBody: "The source wasn't available, so every stake is refunded.",
    wonBody: "Your YouTube prediction was correct. Collect your share of the pool.",
    refundBtn: "Get my refund",
    collectBtn: (v: string) => `Collect ${v} tUSD`,
    howTitle: "How the result is decided",
    fingerprint: "Resolver code fingerprint, stored onchain:",
    loadingShort: "loading",
    evidence: "See the raw evidence",
    contract: "Contract on Arbiscan",
    share: "Share on X",
    tweet: (q: string) => `${q} I made my pick on Shortshi.`,
    live: { "Views now": "Views now", "#1 right now": "Leading creator" } as Record<string, string>,
    rules: {
      YT_VIEWS_24H: "YES if the tracked video reaches at least 1,000,000 views within 24 hours of publication, verified with YouTube Data API statistics. Missing or unverifiable data voids the market.",
      YT_VIEW_VELOCITY: "YES if the tracked video gains at least 250,000 views during the defined six-hour window, measured using timestamped YouTube view-count snapshots. Missing baseline or final data voids the market.",
      YT_LIKES_24H: "YES if the tracked video reaches at least 50,000 likes within 24 hours of publication, verified with YouTube Data API statistics. Missing or unverifiable data voids the market.",
      YT_ENGAGEMENT_RATE: "YES if likes divided by views is strictly greater than 5% at resolution. Both counts must be available and views must be greater than zero; otherwise the market is void.",
      YT_CREATOR_VIEWS: "The tracked creator with the greatest increase in total channel views over the defined period wins, based on timestamped baseline and final snapshots. Missing comparison data voids the market.",
    } as Record<string, string>,
  },
  option: {
    other: "Other creator",
    mine: (v: string) => `You have ${v} on this`,
    fresh: "new",
    ofPool: (p: string) => `${p}% of the pool`,
    noPicks: "no picks",
    first: "be the first",
  },
  slip: {
    pick: "Pick an outcome above",
    then: "Then choose how much to put in.",
    win: ["If you're right you get ", " tUSD"],
    min: " · minimum 1",
    max: " · maximum 500 per market",
    amount: "Amount",
    custom: "Custom amount",
    other: "other",
    confirm: "Confirm in wallet",
    bet: (n: number) => `Bet ${n} tUSD`,
    placed: (title: string) => `Bet placed on ${title}. View it on Arbiscan.`,
  },
  steps: {
    title: "Where this market is",
    open: "Betting open",
    closes: "Betting closes",
    posted: "Result posted to UMA, open to disputes",
    paid: "Winners paid",
    cancelled: "Cancelled, everyone refunded",
  },
  tile: {
    closesIn: (c: string) => `Closes in ${c}`,
    checking: "Result being checked on UMA",
    decided: "Decided",
    closed: "Closed",
    demo: "demo",
  },
  wallet: {
    connect: "Connect wallet",
    sending: "Sending",
    get: "Get 1,000 test dollars",
    sent: "1,000 test dollars and a little gas are on the way.",
    addressCooldown: "You already got test dollars today. Come back tomorrow.",
    ipCooldown: "This network already used the faucet today. Come back tomorrow.",
    faucetDown: "The faucet didn't answer. Try again in a minute.",
  },
  browse: {
    title: "Browse markets",
    category: "Category",
    soonTab: "More markets",
    soonNote: "Coming after the hackathon",
    soon: [
      ["24-hour views", "Will the next @WarehouseJobz video reach 1,000,000 views within 24 hours?"],
      ["View velocity", "Will a @WarehouseJobz  video gain 250,000 views within six hours?"],
      ["24-hour likes", "Will a @WarehouseJobz  video reach 50,000 likes within 24 hours?"],
      ["Engagement rate", "Will likes exceed 5% of views at resolution?"],
      ["Creator views", "Which tracked YouTube creator will gain the most views during the market window?"],
    ],
    emptyYt: "@WarehouseJobz YouTube markets open when eligible videos and measurement windows are available.",
    emptyMusic: "No 24-hour view markets are open right now. Check back after the next tracked upload.",
  },
  me: {
    title: "My picks",
    connect: "Connect wallet to see your picks",
    reading: "Reading your picks from the chain",
    empty: "No picks yet. Today's big market is a good place to start.",
    staked: (v: string) => `${v} tUSD in`,
    status: { open: "Open", settled: "Decided", void: "Refunded", other: "Being checked" },
    collect: (v: string) => `Collect ${v}`,
    view: "View",
  },
};

export const STR: Record<Lang, Dict> = { en, tr };

const LOCALE: Record<Lang, string> = { en: "en-US", tr: "en-US" };
export const locale = (l: Lang) => LOCALE[l];

/** Keep the original helper export while returning an English UTC time. */
export function trClock(hhmm: string): string {
  return `${hhmm} UTC`;
}

/** "on Oct 13 at 12:00 UTC" */
export function decidedAt(t: number, _l: Lang): string {
  const d = new Date(t * 1000);
  const hhmm = d.toISOString().slice(11, 16);
  return `on ${d.toLocaleString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} at ${hhmm} UTC`;
}

/** "3 min. ago" */
export function ago(t: number, l: Lang, now = Date.now() / 1000): string {
  const s = Math.max(0, Math.round(now - t));
  const f = new Intl.RelativeTimeFormat(locale(l), { numeric: "auto", style: "short" });
  if (s < 60) return f.format(-s, "second");
  if (s < 3600) return f.format(-Math.floor(s / 60), "minute");
  if (s < 86400) return f.format(-Math.floor(s / 3600), "hour");
  return f.format(-Math.floor(s / 86400), "day");
}

/** A wallet or chain error as one readable sentence. */
export function errorText(e: unknown, l: Lang): string {
  const code = (e as { code?: unknown }).code;
  const name = (e as { wallet?: string }).wallet ?? "";
  if (code === "unsupported" || code === "rejected" || code === "none") return STR[l].picker.errors[code](name);
  if (code === 4001) return STR[l].picker.errors.rejected();
  // viem puts the decoded revert reason on the lines after its first one; keep them together
  const err = e as { shortMessage?: string; message?: string };
  return String(err.shortMessage ?? err.message ?? e).split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 2).join(" ").slice(0, 160);
}
