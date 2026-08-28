import { bustCharacterAssetCache } from "@/lib/character-media";
import type { Locale } from "@/i18n/config";
import { DEFAULT_LOCALE } from "@/i18n/config";

export type DayPeriod = "night" | "morning" | "school" | "afternoon" | "evening";

export type LiveStatus = {
  id: string;
  title: string;
  caption: string;
  detail: string;
  timeIcon: "dark_mode" | "light_mode" | "wb_twilight" | "school";
  aiPrompt: string;
};

export type DailyMediaItem = {
  id: string;
  type: "image" | "video";
  url: string;
  posterUrl?: string;
  label: string;
};

type Copy = { title: string; caption: string; detail: string; idleCaption?: string; idleDetail?: string };

function asset(slug: string, file: string) {
  return bustCharacterAssetCache(`/characters/${slug}/${file}`);
}

/** Bucket by Japan Standard Time of day. */
export function getDayPeriod(hourJst: number): DayPeriod {
  if (hourJst >= 21 || hourJst < 6) return "night";
  if (hourJst < 9) return "morning";
  if (hourJst < 15) return "school";
  if (hourJst < 18) return "afternoon";
  return "evening";
}

export function getJstHour(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "numeric",
      hour12: false,
    }).format(date),
  );
}

const COPY: Record<string, Record<Locale, Copy>> = {
  "night-chat": {
    ja: {
      title: "いま · 深夜",
      caption: "布団のなかでこっそり返信してる",
      detail: "部屋は小さな常夜灯だけ。スマホを布団に隠し、画面の光が顔を照らしてる。",
      idleCaption: "布団でアニメ見てて、まだ起きてる",
      idleDetail: "常夜灯だけつけて、たまにスマホをいじってる。",
    },
    "zh-Hant": {
      title: "現在 · 深夜",
      caption: "躲在被窩裡偷偷回你的訊息",
      detail: "房間只開著小夜燈，她把手機藏在被子裡，螢幕光映在臉上。",
      idleCaption: "窩在被子裡追番，還沒睡",
      idleDetail: "房間只開著小夜燈，偶爾滑一下手機。",
    },
    en: {
      title: "Now · Late night",
      caption: "Replying under the blanket, quietly",
      detail: "Only a night light is on. Her phone is tucked under the duvet, screen light on her face.",
      idleCaption: "Watching anime under the covers — still awake",
      idleDetail: "Just the night light on; she scrolls once in a while.",
    },
  },
  "morning-commute": {
    ja: {
      title: "いま · 朝",
      caption: "通学電車であなたのメッセージを見てくすっ",
      detail: "ランドセルを背負って、スマホを握りしめ、朝の満員電車に小さな秘密。",
      idleCaption: "通学中。好きな曲を聴きながら",
      idleDetail: "カバンを背負い、朝の通勤ラッシュでぼんやり。",
    },
    "zh-Hant": {
      title: "現在 · 早晨",
      caption: "上學路上看到你的訊息，在電車裡偷偷笑",
      detail: "背著書包，握緊了手機，早高峰的電車裡藏著小秘密。",
      idleCaption: "上學路上，耳機裡放著喜歡的歌",
      idleDetail: "背著書包，早高峰的電車裡發呆。",
    },
    en: {
      title: "Now · Morning",
      caption: "Smiling at your message on the school train",
      detail: "Bag on, phone clenched — a tiny secret on the crowded morning train.",
      idleCaption: "Commute mode · favorite song in the headphones",
      idleDetail: "Bag on, zoning out in the morning rush.",
    },
  },
  "school-secret-chat": {
    ja: {
      title: "いま · 授業中",
      caption: "机の下でこっそりスマホ返信中",
      detail: "先生が話してるあいだ、教科書の下に隠したスマホを指が走ってる。",
      idleCaption: "授業中。ノートに真剣",
      idleDetail: "教科書はマーカーだらけ。スマホは筆箱の中。",
    },
    "zh-Hant": {
      title: "現在 · 上課中",
      caption: "從課桌裡悄悄掏出手機回你",
      detail: "老師在講課，她把手機藏在課本下面，指尖飛快地打字。",
      idleCaption: "上課中，認真做筆記",
      idleDetail: "課本上畫滿重點，手機收在筆袋裡。",
    },
    en: {
      title: "Now · In class",
      caption: "Replying under the desk, secretively",
      detail: "While the teacher talks, her phone hides under the textbook — fingertips flying.",
      idleCaption: "In class · focused on notes",
      idleDetail: "Textbook marked up; phone tucked in the pencil case.",
    },
  },
  "afternoon-cafe": {
    ja: {
      title: "いま · 放課後",
      caption: "いつものカフェで待ちながら返信",
      detail: "アイスコーヒーを頼んで、窓際の席。スマホはコースターの横。",
      idleCaption: "放課後、いつものカフェで読書中",
      idleDetail: "アイスコーヒーと窓際席。",
    },
    "zh-Hant": {
      title: "現在 · 放學後",
      caption: "在常去的咖啡館邊等你邊回訊息",
      detail: "點了冰美式，佔著靠窗的位子，手機立在杯墊旁。",
      idleCaption: "放學後，在常去的咖啡館看書",
      idleDetail: "點了冰美式，佔著靠窗的位子。",
    },
    en: {
      title: "Now · After school",
      caption: "Waiting at the usual café, replying as she sits",
      detail: "Iced Americano, window seat, phone leaning on the coaster.",
      idleCaption: "After school · reading at the usual café",
      idleDetail: "Iced Americano, window seat.",
    },
  },
  "evening-room": {
    ja: {
      title: "いま · 夕方",
      caption: "帰ったらまずあなたの既読を確認",
      detail: "カバンを下ろす前にベッドに座り、チャットを開く。",
      idleCaption: "帰宅後、今日のノートを整理中",
      idleDetail: "カバンを下ろしたばかり。窓の外は夕暮れ。",
    },
    "zh-Hant": {
      title: "現在 · 傍晚",
      caption: "回到家，第一件事是看看你有沒有發訊息",
      detail: "書包還沒放下，就盤腿坐在床上劃開聊天框。",
      idleCaption: "回到家，在房間整理今天的筆記",
      idleDetail: "書包剛放下，窗外是傍晚的天色。",
    },
    en: {
      title: "Now · Evening",
      caption: "Home first — checking if you texted",
      detail: "Bag still on, she sits cross-legged on the bed and opens chat.",
      idleCaption: "Home · sorting today’s notes",
      idleDetail: "Bag just set down. Sunset outside the window.",
    },
  },
  "mio-night": {
    ja: {
      title: "いま · 深夜",
      caption: "原稿終わってベッド端で返信中",
      detail: "液タブがまだ光ってる。毛布にくるまって文字を打つ。",
    },
    "zh-Hant": {
      title: "現在 · 深夜",
      caption: "畫完稿子在床沿回你的訊息",
      detail: "數位板還亮著，她蜷在毯子裡敲字。",
    },
    en: {
      title: "Now · Late night",
      caption: "Done with the draft — replying from the edge of the bed",
      detail: "The tablet still glows. She’s bundled in a blanket typing.",
    },
  },
  "mio-morning": {
    ja: {
      title: "いま · 朝",
      caption: "カフェ開店前に、ひとこと返信",
      detail: "エプロンもまだなのに、先にスマホを見た。",
    },
    "zh-Hant": {
      title: "現在 · 早晨",
      caption: "咖啡店開工前，先回覆你一條",
      detail: "圍裙還沒繫好，已經先看了一眼手機。",
    },
    en: {
      title: "Now · Morning",
      caption: "Before the café opens — a quick reply",
      detail: "Apron not even on yet, but she checked her phone first.",
    },
  },
  "mio-class": {
    ja: {
      title: "いま · アトリエ",
      caption: "休み時間、イーゼルの影で返信",
      detail: "絵の具の匂いが残る影で、画面を隠す。",
    },
    "zh-Hant": {
      title: "現在 · 畫室",
      caption: "課間躲在畫架後面回訊息",
      detail: "顏料味道還沒散，她借陰影遮住螢幕。",
    },
    en: {
      title: "Now · Studio",
      caption: "Between classes — replying behind the easel",
      detail: "Paint smell still in the air; she hides the screen in the shadow.",
    },
  },
  "mio-afternoon": {
    ja: {
      title: "いま · 昼過ぎ",
      caption: "スナップ歩き中に立ち止まって返信",
      detail: "フィルムカメラが胸に。シャッターより先に画面を見た。",
    },
    "zh-Hant": {
      title: "現在 · 午後",
      caption: "掃街途中停下來回你",
      detail: "膠片機掛在胸前，快門還沒按就先看了螢幕。",
    },
    en: {
      title: "Now · Afternoon",
      caption: "Paused street snaps to reply",
      detail: "Film camera on her chest — she checked the screen before the shutter.",
    },
  },
  "mio-evening": {
    ja: {
      title: "いま · 夕方",
      caption: "帰り道、今日の夕焼けを共有したくて",
      detail: "空がピーチ色。歩きながらタイプ中。",
    },
    "zh-Hant": {
      title: "現在 · 傍晚",
      caption: "收工路上，想和你分享今天的晚霞",
      detail: "天邊是粉橘色，她邊走邊打字。",
    },
    en: {
      title: "Now · Evening",
      caption: "On the way home — wants to share today’s sunset",
      detail: "Peach sky. Typing while she walks.",
    },
  },
};

const MEDIA_LABELS: Record<string, Record<Locale, string>> = {
  "aoi-d1": { ja: "オンライン立ち絵", "zh-Hant": "線上立繪", en: "Online portrait" },
  "aoi-d2": { ja: "休み時間の一枚", "zh-Hant": "課間随手拍", en: "Between-class snap" },
  "aoi-d3": { ja: "下校の vlog", "zh-Hant": "放學路上的 vlog", en: "After-school vlog" },
  "aoi-d4": { ja: "部屋の日常", "zh-Hant": "房間裡的日常", en: "Room daily" },
  "mio-d1": { ja: "カフェ開店前", "zh-Hant": "咖啡店開工前", en: "Before the café opens" },
  "mio-d2": { ja: "街歩きスナップ", "zh-Hant": "掃街随拍", en: "Street snap" },
  "mio-d3": { ja: "アトリエ記録", "zh-Hant": "畫室創作記錄", en: "Studio diary" },
  "mio-d4": { ja: "今日のコーデ", "zh-Hant": "今日穿搭", en: "Today’s fit" },
};

function copyFor(id: string, locale: Locale): Copy {
  return COPY[id]?.[locale] ?? COPY[id]?.[DEFAULT_LOCALE] ?? COPY["school-secret-chat"][DEFAULT_LOCALE];
}

function statusFrom(
  id: string,
  periodIcon: LiveStatus["timeIcon"],
  aiPrompt: string,
  locale: Locale,
  chatting: boolean,
): LiveStatus {
  const c = copyFor(id, locale);
  return {
    id,
    title: c.title,
    caption: chatting ? c.caption : (c.idleCaption ?? c.caption),
    detail: chatting ? c.detail : (c.idleDetail ?? c.detail),
    timeIcon: periodIcon,
    aiPrompt,
  };
}

const AOI_BUILDERS: Record<DayPeriod, (locale: Locale, chatting: boolean) => LiveStatus> = {
  night: (l, c) =>
    statusFrom(
      "night-chat",
      "dark_mode",
      "anime girl in school pajamas under blanket at night, holding smartphone, soft moonlight, cozy bedroom",
      l,
      c,
    ),
  morning: (l, c) =>
    statusFrom(
      "morning-commute",
      "wb_twilight",
      "anime schoolgirl on morning train commute, holding phone, soft sunrise light",
      l,
      c,
    ),
  school: (l, c) =>
    statusFrom(
      "school-secret-chat",
      "school",
      "anime girl in classroom secretly using smartphone under desk",
      l,
      c,
    ),
  afternoon: (l, c) =>
    statusFrom(
      "afternoon-cafe",
      "light_mode",
      "anime girl at cozy cafe after school, smartphone on table",
      l,
      c,
    ),
  evening: (l, c) =>
    statusFrom(
      "evening-room",
      "wb_twilight",
      "anime girl in bedroom evening, sitting on bed with phone",
      l,
      c,
    ),
};

const MIO_BUILDERS: Record<DayPeriod, (locale: Locale, chatting: boolean) => LiveStatus> = {
  night: (l, c) =>
    statusFrom(
      "mio-night",
      "dark_mode",
      "anime art student at night in bed with tablet and phone",
      l,
      c,
    ),
  morning: (l, c) =>
    statusFrom(
      "mio-morning",
      "wb_twilight",
      "anime girl barista morning cafe, smartphone",
      l,
      c,
    ),
  school: (l, c) =>
    statusFrom(
      "mio-class",
      "school",
      "anime art student hiding behind easel with phone",
      l,
      c,
    ),
  afternoon: (l, c) =>
    statusFrom(
      "mio-afternoon",
      "light_mode",
      "anime girl street photography afternoon, film camera and phone",
      l,
      c,
    ),
  evening: (l, c) =>
    statusFrom(
      "mio-evening",
      "wb_twilight",
      "anime girl walking at sunset with phone",
      l,
      c,
    ),
};

const BUILDERS: Record<string, Record<DayPeriod, (locale: Locale, chatting: boolean) => LiveStatus>> = {
  aoi: AOI_BUILDERS,
  mio: MIO_BUILDERS,
};

export function getPrimaryLiveStatus(
  slug: string,
  opts?: { chatting?: boolean; hourJst?: number; locale?: Locale },
): LiveStatus {
  const hour = opts?.hourJst ?? getJstHour();
  const period = getDayPeriod(hour);
  const locale = opts?.locale ?? DEFAULT_LOCALE;
  const chatting = !!opts?.chatting;
  const builder = BUILDERS[slug]?.[period] ?? BUILDERS.aoi[period];
  return builder(locale, chatting);
}

export function getCharacterDailyMedia(slug: string, locale: Locale = DEFAULT_LOCALE): DailyMediaItem[] {
  const base =
    slug === "mio"
      ? ([
          { id: "mio-d1", type: "image" as const, url: asset("mio", "gallery-1.png") },
          { id: "mio-d2", type: "image" as const, url: asset("mio", "gallery-2.png") },
          {
            id: "mio-d3",
            type: "video" as const,
            url: asset("mio", "gallery-3.png"),
            posterUrl: asset("mio", "gallery-3.png"),
          },
          { id: "mio-d4", type: "image" as const, url: asset("mio", "avatar.png") },
        ] as const)
      : ([
          { id: "aoi-d1", type: "image" as const, url: asset("aoi", "live-1.gif") },
          { id: "aoi-d2", type: "image" as const, url: asset("aoi", "gallery-2.png") },
          {
            id: "aoi-d3",
            type: "video" as const,
            url: asset("aoi", "gallery-3.png"),
            posterUrl: asset("aoi", "gallery-3.png"),
          },
          { id: "aoi-d4", type: "image" as const, url: asset("aoi", "avatar.png") },
        ] as const);

  return base.map((item) => ({
    ...item,
    label: MEDIA_LABELS[item.id]?.[locale] ?? MEDIA_LABELS[item.id]?.ja ?? item.id,
  }));
}

/** Ambient palette that slowly shifts with the IP time-of-day. */
export function getAmbientGradient(period: DayPeriod): string {
  switch (period) {
    case "night":
      return "linear-gradient(165deg,#2a2438 0%,#4a3d5c 38%,#6b5a7a 100%)";
    case "morning":
      return "linear-gradient(165deg,#ffe8df 0%,#fde0d4 42%,#f9ece7 100%)";
    case "school":
      return "linear-gradient(165deg,#e8f0ff 0%,#f5eeea 45%,#fff6e6 100%)";
    case "afternoon":
      return "linear-gradient(165deg,#fff0e0 0%,#fde8d0 42%,#f9ece7 100%)";
    case "evening":
      return "linear-gradient(165deg,#ffd8c8 0%,#f0c8e0 42%,#e8d8f0 100%)";
  }
}
