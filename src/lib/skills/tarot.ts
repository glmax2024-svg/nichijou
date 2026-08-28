export type TarotCard = {
  id: string;
  name: string;
  numeral: string;
  emoji: string;
  upright: string;
  reversed: string;
};

export type DrawnTarotCard = TarotCard & {
  position: string;
  isReversed: boolean;
};

export const TAROT_SPREAD_POSITIONS = ["過去", "現在", "未来"] as const;

export const TAROT_SPREAD = {
  id: "time-flow",
  title: "时间流牌阵",
  subtitle: "三张牌解析法",
  tagline: "适合预测未来 · 窥探未知",
  description:
    "平行流向的时间解析法，从过去延伸到未来。请在抽牌前清除杂念、保持静心，依次抽取三张牌。",
  drawHints: [
    "第一张 · 过去：请专注问题，并保持静心",
    "第二张 · 现在：请专注问题，并保持静心",
    "第三张 · 未来：请专注问题，并保持静心",
  ],
} as const;

/** Major Arcana 22 cards (demo) */
export const MAJOR_ARCANA: TarotCard[] = [
  { id: "fool", name: "愚者", numeral: "0", emoji: "🃏", upright: "新しい始まり、自由、可能性", reversed: "軽率さ、迷い、足元の不安" },
  { id: "magician", name: "魔術師", numeral: "I", emoji: "✨", upright: "意志の力、創造、チャンス", reversed: "自信過剰、未熟な計画" },
  { id: "priestess", name: "女教皇", numeral: "II", emoji: "🌙", upright: "直感、内なる声、秘密", reversed: "混乱、表面だけの判断" },
  { id: "empress", name: "女帝", numeral: "III", emoji: "👑", upright: "豊かさ、愛情、育む力", reversed: "依存、過保護、停滞" },
  { id: "emperor", name: "皇帝", numeral: "IV", emoji: "🏛️", upright: "安定、リーダーシップ、秩序", reversed: "支配、頑固、コントロール" },
  { id: "hierophant", name: "教皇", numeral: "V", emoji: "📿", upright: "伝統、信頼、学び", reversed: "型破り、価値観の衝突" },
  { id: "lovers", name: "恋人", numeral: "VI", emoji: "💕", upright: "選択、相性、結びつき", reversed: "迷い、不均衡、回避" },
  { id: "chariot", name: "戦車", numeral: "VII", emoji: "⚡", upright: "前進、勝利、決意", reversed: "方向喪失、衝突、焦り" },
  { id: "strength", name: "力", numeral: "VIII", emoji: "🦁", upright: "勇気、忍耐、優しさ", reversed: "自信喪失、疲弊" },
  { id: "hermit", name: "隠者", numeral: "IX", emoji: "🏮", upright: "内省、孤独、知恵", reversed: "孤立、閉じこもり" },
  { id: "wheel", name: "運命の輪", numeral: "X", emoji: "🎡", upright: "転機、幸運、循環", reversed: "不運、抵抗、停滞" },
  { id: "justice", name: "正義", numeral: "XI", emoji: "⚖️", upright: "公平、真実、因果", reversed: "不公平、偏見" },
  { id: "hanged", name: "吊るされた男", numeral: "XII", emoji: "🔄", upright: "視点の転換、待つ力", reversed: "停滞、無駄な犠牲" },
  { id: "death", name: "死神", numeral: "XIII", emoji: "🦋", upright: "終わりと再生、変容", reversed: "変化への恐れ、執着" },
  { id: "temperance", name: "節制", numeral: "XIV", emoji: "☯️", upright: "調和、バランス、癒し", reversed: "極端、不一致" },
  { id: "devil", name: "悪魔", numeral: "XV", emoji: "⛓️", upright: "執着、誘惑、影", reversed: "解放、気づき" },
  { id: "tower", name: "塔", numeral: "XVI", emoji: "🗼", upright: "急変、崩壊、目覚め", reversed: "回避、小さな変化" },
  { id: "star", name: "星", numeral: "XVII", emoji: "⭐", upright: "希望、インスピレーション", reversed: "失望、迷い" },
  { id: "moon", name: "月", numeral: "XVIII", emoji: "🌕", upright: "不安、幻想、潜在意識", reversed: "恐れの克服、明晰さ" },
  { id: "sun", name: "太陽", numeral: "XIX", emoji: "☀️", upright: "成功、喜び、活力", reversed: "一時的な曇り、過信" },
  { id: "judgement", name: "審判", numeral: "XX", emoji: "📯", upright: "再生、決断、呼び声", reversed: "自己批判、先延ばし" },
  { id: "world", name: "世界", numeral: "XXI", emoji: "🌍", upright: "完成、達成、統合", reversed: "未完了、足りなさ" },
];

export function shuffleDeck(cards: TarotCard[] = MAJOR_ARCANA): TarotCard[] {
  const deck = [...cards];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function buildShuffledDeck(): TarotCard[] {
  return shuffleDeck();
}

export function formatDrawnCards(cards: DrawnTarotCard[]): string {
  return cards
    .map((c) => {
      const orient = c.isReversed ? "逆位置" : "正位置";
      return `${c.position}：${c.name}（${orient}）— ${c.isReversed ? c.reversed : c.upright}`;
    })
    .join("\n");
}

export function buildDrawnCard(
  card: TarotCard,
  position: string,
): DrawnTarotCard {
  return {
    ...card,
    position,
    isReversed: Math.random() < 0.35,
  };
}

export const TAROT_SKILL_ID = "tarot";

export function isTarotSkill(skillId?: string | null) {
  return skillId === TAROT_SKILL_ID;
}
