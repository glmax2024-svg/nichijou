export type SubscriptionPerk = {
  icon: string;
  label: string;
  desc: string;
  highlight?: boolean;
};

export const SUBSCRIPTION_PACKAGE = {
  title: "推しパッケージ",
  tagline: "月額で、推しとの距離が一気に近くなる",
  perks: [
    {
      icon: "chat",
      label: "無制限メッセージ",
      desc: "毎日の上限なし — いつでも話しかけられる",
      highlight: true,
    },
    {
      icon: "lock_open",
      label: "推し限定コンテンツ",
      desc: "私密写真・動画をクリアに閲覧（即時解除）",
      highlight: true,
    },
    {
      icon: "psychology",
      label: "記憶 · 関係性",
      desc: "あなたの呼び名や出来事を覚えて会話に反映",
    },
    {
      icon: "auto_awesome",
      label: "キャラ専用スキル",
      desc: "恋愛相談 · 占い · 语音通话など IP 技能",
    },
    {
      icon: "redeem",
      label: "ギフト · 優先返信",
      desc: "ギフト送信と優先 AI 返信",
    },
  ] satisfies SubscriptionPerk[],
} as const;
