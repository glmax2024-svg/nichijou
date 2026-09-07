export const LEGAL_SLUGS = ["terms", "privacy", "tokushoho"] as const;
export type LegalSlug = (typeof LEGAL_SLUGS)[number];

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value);
}

export function getLegalOperator() {
  return {
    name: process.env.LEGAL_OPERATOR_NAME || "日常 Nichijou 運営事務局（準備中）",
    representative: process.env.LEGAL_OPERATOR_REPRESENTATIVE || "準備中",
    address: process.env.LEGAL_OPERATOR_ADDRESS || "準備中（公開時に記載します）",
    email: process.env.LEGAL_OPERATOR_EMAIL || "support@nichijou.app",
    phone: process.env.LEGAL_OPERATOR_PHONE || "請求があった場合に遅滞なく開示します",
    priceNote:
      process.env.LEGAL_PRICE_NOTE ||
      "月額 980円（税込）より。ギフトおよび音声オーダーは都度課金です。",
  };
}

const TITLES: Record<LegalSlug, string> = {
  terms: "利用規約",
  privacy: "プライバシーポリシー",
  tokushoho: "特定商取引法に基づく表記",
};

export function legalTitle(slug: LegalSlug): string {
  return TITLES[slug];
}

export type LegalSection = { heading: string; body: string[] };

export function legalSections(slug: LegalSlug): LegalSection[] {
  const op = getLegalOperator();
  if (slug === "terms") {
    return [
      {
        heading: "第1条（適用）",
        body: [
          `本規約は、${op.name}（以下「当社」）が提供する「日常 Nichijou」（以下「本サービス」）の利用条件を定めるものです。ユーザーは本規約に同意のうえ本サービスを利用するものとします。`,
        ],
      },
      {
        heading: "第2条（年齢）",
        body: [
          "本サービスは満18歳以上の方に限定して提供します。登録時に生年月日の申告が必要です。虚偽の申告が判明した場合、当社はアカウントを停止または削除できます。",
        ],
      },
      {
        heading: "第3条（アカウント）",
        body: [
          "ユーザーは正確な情報を登録し、ログイン情報を自己の責任で管理します。アカウントの譲渡、貸与、共有はできません。",
        ],
      },
      {
        heading: "第4条（有料サービス）",
        body: [
          `${op.priceNote} 決済は Stripe 等の決済事業者を通じて行われます。課金の成立後、デジタル役務の性質上、法令で認められる場合を除き返金しません。`,
          "サブスクリプションは決済完了時点から約30日間有効です。継続課金の導入後は、解約手続が完了するまで更新される場合があります。",
        ],
      },
      {
        heading: "第5条（生成AI・キャラクター）",
        body: [
          "本サービス上のキャラクターはフィクションです。実在の人物を表すものではなく、生成される文章・画像・音声はAIにより作成される場合があります。",
          "出力は正確性・適法性・特定の結果を保証しません。ユーザーは出力を自己の責任で利用します。",
        ],
      },
      {
        heading: "第6条（禁止事項）",
        body: [
          "法令または公序良俗に反する行為、未成年者を性的対象とする表現の投稿、他者の権利侵害、なりすまし、不正アクセス、過度な負荷、本サービスの運営を妨害する行為を禁止します。",
          "当社は、違反が疑われる内容を拒否・削除し、アカウントを制限できます。",
        ],
      },
      {
        heading: "第7条（知的財産）",
        body: [
          "本サービスおよび画师が投稿したキャラクター・画像等の権利は、当社または正当な権利者に帰属します。ユーザーは、本サービスが予定する範囲を超えて複製・再配布できません。",
        ],
      },
      {
        heading: "第8条（データの取扱い）",
        body: [
          "チャット履歴および記憶データはサービス提供・品質改善・安全確保のために処理されます。ユーザーは設定画面から特定のキャラクターとの会話・記憶・関係スナップショットを削除できます。詳細はプライバシーポリシーによります。",
        ],
      },
      {
        heading: "第9条（免責）",
        body: [
          "当社は、本サービスの中断、障害、データの消失、第三者との紛争について、当社に故意または重過失がある場合を除き責任を負いません。",
        ],
      },
      {
        heading: "第10条（準拠法・管轄）",
        body: [
          "本規約は日本法に準拠します。本サービスに関する紛争は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
        ],
      },
    ];
  }

  if (slug === "privacy") {
    return [
      {
        heading: "1. 事業者",
        body: [`個人情報の取扱事業者：${op.name}`, `お問い合わせ：${op.email}`],
      },
      {
        heading: "2. 取得する情報",
        body: [
          "アカウント情報（表示名、メールアドレス、パスワードのハッシュ、生年月日、利用規約への同意日時）",
          "利用情報（チャット、投稿、コメント、ギフト、注文、購読、端末・ログ、決済識別子）",
          "画师がアップロードする画像・音声など制作物",
        ],
      },
      {
        heading: "3. 利用目的",
        body: [
          "本サービスの提供、本人確認および年齢確認、課金処理、不正利用の防止、お問い合わせ対応、品質改善、法令に基づく対応。",
          "生成AIの応答作成のため、会話内容の一部を外部のAI処理事業者へ送信する場合があります。",
        ],
      },
      {
        heading: "4. 第三者提供・委託",
        body: [
          "決済（Stripe 等）、インフラ、オブジェクトストレージ、AIゲートウェイへ、目的達成に必要な範囲で委託または提供します。法令に基づく場合を除き、本人の同意なく第三者へ販売しません。",
        ],
      },
      {
        heading: "5. 保管期間",
        body: [
          "アカウントが有効な間および退会後、法令・紛争対応に必要な期間保管することがあります。不要となったデータは合理的な方法で削除または匿名化します。チャット・記憶・関係スナップショットは設定画面から随時削除できます。",
        ],
      },
      {
        heading: "6. 安全管理",
        body: [
          "アクセス制御、通信の暗号化、権限最小化など、取り扱う情報の性質に応じた安全管理措置を講じます。",
        ],
      },
      {
        heading: "7. 開示等の請求",
        body: [
          `保有個人データの開示・訂正・利用停止等のご請求は ${op.email} までご連絡ください。チャット・記憶・関係スナップショットは設定画面からご自身で削除できます。法令に従い対応します。`,
        ],
      },
    ];
  }

  return [
    {
      heading: "販売業者",
      body: [op.name],
    },
    {
      heading: "運営統括責任者",
      body: [op.representative],
    },
    {
      heading: "所在地",
      body: [op.address],
    },
    {
      heading: "電話番号",
      body: [op.phone],
    },
    {
      heading: "メールアドレス",
      body: [op.email],
    },
    {
      heading: "販売価格",
      body: [op.priceNote, "表示価格は税込です。決済事業者が別途手数料を定める場合があります。"],
    },
    {
      heading: "支払方法・時期",
      body: [
        "クレジットカード等、Stripe が提供する決済手段。注文または加入手続の完了時に課金されます。",
      ],
    },
    {
      heading: "役務の提供時期",
      body: [
        "決済完了後、直ちにデジタル役務（閲覧、チャット、ギフト記録、音声オーダー等）を提供します。音声オーダーは生成完了後に提供します。",
      ],
    },
    {
      heading: "返品・キャンセル",
      body: [
        "デジタルコンテンツおよび役務の性質上、提供開始後の返品・返金には原則として応じられません。法令に基づく場合を除きます。",
      ],
    },
    {
      heading: "動作環境",
      body: ["推奨ブラウザの最新版、および当社が指定するモバイルアプリケーション。"],
    },
  ];
}
