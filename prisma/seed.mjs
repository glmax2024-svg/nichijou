import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const ANIME = {
  aoi: {
    avatar: "/characters/aoi/avatar.png",
    cover: "/characters/aoi/gallery-1.png",
    postImages: [
      "/characters/aoi/gallery-1.png",
      "/characters/aoi/gallery-2.png",
      "/characters/aoi/gallery-3.png",
      "/characters/aoi/live-1.gif",
    ],
  },
  mio: {
    avatar: "/characters/mio/avatar.png",
    cover: "/characters/mio/gallery-1.png",
    postImages: [
      "/characters/mio/gallery-1.png",
      "/characters/mio/gallery-2.png",
      "/characters/mio/gallery-3.png",
      "/characters/mio-showcase-1.png",
    ],
  },
};

/** 相对今天的发帖时间，保证信息流按剧情先后可读 */
function atDaysAgo(days, hour = 19, minute = 12) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function upsertUser({ email, name, role, bio, passwordHash }) {
  return prisma.user.upsert({
    where: { email },
    update: { name, bio: bio ?? undefined },
    create: { email, name, role, bio, passwordHash },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash("demo123", 10);

  const creator = await upsertUser({
    email: "creator@demo.jp",
    name: "さくら画师",
    role: "CREATOR",
    bio: "キャラクターの日常を描くクリエイター。葵と澪の物語を連載中。",
    passwordHash,
  });

  const fanYui = await upsertUser({
    email: "fan@demo.jp",
    name: "ゆい",
    role: "FAN",
    bio: "葵ちゃんの古参ファン",
    passwordHash,
  });

  const fans = await Promise.all([
    upsertUser({
      email: "hana@demo.jp",
      name: "はな",
      role: "FAN",
      bio: "校园恋爱推",
      passwordHash,
    }),
    upsertUser({
      email: "sora@demo.jp",
      name: "そら",
      role: "FAN",
      bio: "毎日ストーリーチェックしてる",
      passwordHash,
    }),
    upsertUser({
      email: "miku@demo.jp",
      name: "みく",
      role: "FAN",
      bio: "カフェと芸術が好き",
      passwordHash,
    }),
    upsertUser({
      email: "ren@demo.jp",
      name: "れん",
      role: "FAN",
      passwordHash,
    }),
    upsertUser({
      email: "nana@demo.jp",
      name: "なな",
      role: "FAN",
      passwordHash,
    }),
  ]);
  const [fanHana, fanSora, fanMiku, fanRen, fanNana] = fans;

  const character = await prisma.character.upsert({
    where: { slug: "aoi" },
    update: {
      avatarUrl: ANIME.aoi.avatar,
      coverUrl: ANIME.aoi.cover,
      tagline: "高校2年生 · 隣の席から始まる恋",
      bio: "普通の高校二年生。放課後はカフェで本を読んだり、友達としゃべったり。最近、隣の席の健くんのことが、頭から離れなくなってきてる——告白されてから、毎日がちょっとだけ特別になった。",
      personality:
        "明るくて少し天然。感情豊かで、日常の小さな出来事を大切にする。恋愛には不器用で、嬉しいとすぐ顔に出る。",
      speechStyle:
        "タメ口寄りだけど優しい。語尾に「〜かな」「〜だよ」を使う。絵文字は控えめ。照れると「……」が増える。",
      tags: "校园,恋爱,治愈,连载,高校生",
      subscriptionPrice: 980,
      published: true,
      loraStatus: "READY",
      loraAdapterId: "lora_aoi_demo_v1",
      loraVersion: 1,
      voiceEmbeddingId: "voice_emb_aoi_demo",
    },
    create: {
      slug: "aoi",
      name: "葵",
      tagline: "高校2年生 · 隣の席から始まる恋",
      avatarUrl: ANIME.aoi.avatar,
      coverUrl: ANIME.aoi.cover,
      bio: "普通の高校二年生。放課後はカフェで本を読んだり、友達としゃべったり。最近、隣の席の健くんのことが、頭から離れなくなってきてる——告白されてから、毎日がちょっとだけ特別になった。",
      personality:
        "明るくて少し天然。感情豊かで、日常の小さな出来事を大切にする。恋愛には不器用で、嬉しいとすぐ顔に出る。",
      speechStyle:
        "タメ口寄りだけど優しい。語尾に「〜かな」「〜だよ」を使う。絵文字は控えめ。照れると「……」が増える。",
      tags: "校园,恋爱,治愈,连载,高校生",
      subscriptionPrice: 980,
      published: true,
      loraStatus: "READY",
      loraAdapterId: "lora_aoi_demo_v1",
      loraVersion: 1,
      voiceEmbeddingId: "voice_emb_aoi_demo",
      creatorId: creator.id,
    },
  });

  const character2 = await prisma.character.upsert({
    where: { slug: "mio" },
    update: {
      avatarUrl: ANIME.mio.avatar,
      coverUrl: ANIME.mio.cover,
      tagline: "大学1年生 · 個展に向けて動くカフェ店員",
      bio: "美术大学一年。周末在街角咖啡店打工，平日埋头准备第一次校园个展。喜欢胶片和慢慢变冷的拉花，也正在学着把「想给人看的画」画出来。",
      personality: "沉稳温柔，有点文艺。观察力强，会记住别人随口说的小事。紧张时话变少。",
      speechStyle: "语气平和，偶尔用敬语。喜欢用「…」和短句。开心时会突然多写两行。",
      tags: "大学,咖啡,艺术,连载,治愈",
      subscriptionPrice: 1280,
      published: true,
      loraStatus: "READY",
      loraAdapterId: "lora_mio_demo_v1",
      loraVersion: 1,
    },
    create: {
      slug: "mio",
      name: "澪",
      tagline: "大学1年生 · 個展に向けて動くカフェ店員",
      avatarUrl: ANIME.mio.avatar,
      coverUrl: ANIME.mio.cover,
      bio: "美术大学一年。周末在街角咖啡店打工，平日埋头准备第一次校园个展。喜欢胶片和慢慢变冷的拉花，也正在学着把「想给人看的画」画出来。",
      personality: "沉稳温柔，有点文艺。观察力强，会记住别人随口说的小事。紧张时话变少。",
      speechStyle: "语气平和，偶尔用敬语。喜欢用「…」和短句。开心时会突然多写两行。",
      tags: "大学,咖啡,艺术,连载,治愈",
      subscriptionPrice: 1280,
      published: true,
      loraStatus: "READY",
      loraAdapterId: "lora_mio_demo_v1",
      loraVersion: 1,
      creatorId: creator.id,
    },
  });

  await prisma.voiceProfile.upsert({
    where: { characterId: character.id },
    update: { status: "READY", durationSec: 5.2 },
    create: {
      characterId: character.id,
      sampleAudioUrl: "https://example.com/voice/aoi-sample-5s.wav",
      durationSec: 5.2,
      embeddingId: "voice_emb_aoi_demo",
      status: "READY",
      enrolledAt: new Date(),
    },
  });

  await prisma.voiceProfile.upsert({
    where: { characterId: character2.id },
    update: { status: "READY", durationSec: 5.0 },
    create: {
      characterId: character2.id,
      sampleAudioUrl: "https://example.com/voice/mio-sample-5s.wav",
      durationSec: 5.0,
      embeddingId: "voice_emb_mio_demo",
      status: "READY",
      enrolledAt: new Date(),
    },
  });

  // 清理旧演示数据，保证投资人看到的是完整连载时间线
  await prisma.postComment.deleteMany({
    where: { post: { characterId: { in: [character.id, character2.id] } } },
  });
  await prisma.post.deleteMany({
    where: { characterId: { in: [character.id, character2.id] } },
  });
  await prisma.message.deleteMany({
    where: { characterId: { in: [character.id, character2.id] } },
  });
  await prisma.gift.deleteMany({
    where: { characterId: { in: [character.id, character2.id] } },
  });
  await prisma.order.deleteMany({
    where: { characterId: { in: [character.id, character2.id] } },
  });
  await prisma.characterMemory.deleteMany({
    where: { characterId: { in: [character.id, character2.id] } },
  });
  await prisma.voiceClip.deleteMany({
    where: { characterId: { in: [character.id, character2.id] } },
  });

  // ── 葵連載：隣の席の健くん ──────────────────────────────
  // daysAgo 大 = 更早。信息流按 publishedAt desc，读者会从「现在」倒着回看剧情。
  const aoiArc = [
    {
      daysAgo: 16,
      hour: 18,
      minute: 40,
      content:
        "今日の放課後、いつものカフェで新しい小説を読み始めた📚 窓際の席、夕日が入ってきてページがきらきらしてた。こういう時間、いちばん好きかも。",
      imageUrl: ANIME.aoi.postImages[0],
      isAiAssisted: false,
      comments: [
        { user: fanYui, content: "窓際カフェとか尊すぎ…！" },
        { user: fanHana, content: "葵ちゃんの放課後ルーティン好き" },
        {
          authorType: "character",
          content: "ゆいちゃんも今度一緒に来ない？ラテ美味しいよ",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 15,
      hour: 21,
      minute: 5,
      content:
        "明日数学の小テスト…ノート見直してるけど、公式が頭に入ってこない。隣の席の人が静かに勉強してるの見て、ちょっと焦る。私もがんばらなきゃ。",
      imageUrl: null,
      isAiAssisted: true,
      comments: [
        { user: fanSora, content: "がんばれ葵ちゃん！！お守り送る" },
        { user: fanNana, content: "隣の席の人…気になる書き方だな" },
      ],
    },
    {
      daysAgo: 14,
      hour: 17,
      minute: 55,
      content:
        "今日、消しゴム貸してもらった。隣の席の健くん。声小さめで「どうぞ」って。なんか、手の渡し方まで丁寧で…変なの、なんでそんなとこ覚えてるんだろ。",
      imageUrl: ANIME.aoi.postImages[1],
      isAiAssisted: false,
      comments: [
        { user: fanHana, content: "き、健くん…！名前出た！！" },
        { user: fanYui, content: "丁寧な渡し方とかもう勝ち確では" },
        {
          authorType: "character",
          content: "だ、だからそんなんじゃないよ……ただの消しゴム……",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 13,
      hour: 19,
      minute: 20,
      content:
        "帰り道、突然の雨。傘持ってなくて途方に暮れてたら、健くんが「半分でいいなら」って声かけてくれた。肩がくっつきそうで恥ずかしくて、ほとんど話せなかった。でも、雨の匂い、今も覚えてる。",
      imageUrl: ANIME.aoi.postImages[2],
      isAiAssisted: false,
      comments: [
        { user: fanSora, content: "共有傘きたあああ…" },
        { user: fanRen, content: "ドラマかよ。続き楽しみにしてる" },
        { user: fanMiku, content: "雨の匂いまで書くのずるい（いい意味で）" },
        {
          authorType: "character",
          content: "心臓ばくばくで傘の柄しか見てなかった……",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 12,
      hour: 22,
      minute: 10,
      content:
        "夜になっても考えちゃう。あのとき「ありがとう」しか言えなかったの、ダメだよね。次あったら、ちゃんと何か話したい……何を？わかんないけど。",
      imageUrl: null,
      isAiAssisted: true,
      comments: [
        { user: fanYui, content: "無理しなくていいよ。ゆっくりで" },
        { user: fanHana, content: " aghhhh 乙女心…" },
      ],
    },
    {
      daysAgo: 11,
      hour: 16,
      minute: 30,
      content:
        "親友に「顔赤くない？」ってからかわれた。授業中、健くんと目が合っただけなのに。もう、秘密にできない気配がする。",
      imageUrl: ANIME.aoi.postImages[0],
      isAiAssisted: false,
      comments: [
        { user: fanNana, content: "親友ちゃん嗅覚するどい" },
        {
          authorType: "character",
          content: "ばらされたくないんだけどな〜……でも否定もできない",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 10,
      hour: 18,
      minute: 15,
      content:
        "放課後、忘れ物のノートを届けに来てくれた健くん。「話、あるんだけど」って。校舎の裏までついていったら——「葵のことが好きです」。……え？今、なんて？",
      imageUrl: ANIME.aoi.postImages[1],
      isAiAssisted: false,
      comments: [
        { user: fanYui, content: "き、きた=======！！！" },
        { user: fanHana, content: "校舎の裏フラグ完璧すぎ" },
        { user: fanSora, content: "どう返事したの教えて……待ってる" },
        { user: fanRen, content: "連載の転換点きた" },
        {
          authorType: "character",
          content: "まだ整理できてない……頭真っ白だった。ちゃんと書くね",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 9,
      hour: 8,
      minute: 20,
      content:
        "ほとんど眠れなかった。好き、って言葉が頭の中でループしてる。嬉しいのに、怖いのもあって。わたし、どうしたいんだろ。",
      imageUrl: null,
      isAiAssisted: false,
      comments: [
        { user: fanMiku, content: "無理にすぐ答えなくていいと思う" },
        { user: fanYui, content: "葵ちゃんのペースで大丈夫だよ" },
      ],
    },
    {
      daysAgo: 8,
      hour: 20,
      minute: 45,
      content:
        "親友に全部話した。「急がなくていい。でも、自分の気持ちからは逃げないほうがいいよ」って。……逃げてたかも。顔を合わせるのが恥ずかしいくらい。",
      imageUrl: ANIME.aoi.postImages[2],
      isAiAssisted: true,
      comments: [
        { user: fanHana, content: "親友、名言出してくるの好き" },
        { user: fanSora, content: "応援してる、ほんとに" },
      ],
    },
    {
      daysAgo: 7,
      hour: 17,
      minute: 40,
      content:
        "今日、休み時間に呼び止めた。声震えてたと思う。「まだうまく言えないけど……ちゃんと考える。逃げないから」って返した。健くん、少し安心した顔してた。わたしも、少し楽になった。",
      imageUrl: ANIME.aoi.postImages[0],
      isAiAssisted: false,
      comments: [
        { user: fanYui, content: "ええ子すぎる……尊い" },
        { user: fanRen, content: "誠実な返事、好感しかない" },
        { user: fanNana, content: "ここからが本番だね" },
        {
          authorType: "character",
          content: "伝えた瞬間、肩の力が抜けた。ゆいちゃんたちの応援のおかげだよ",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 6,
      hour: 7,
      minute: 50,
      content:
        "朝、校門で「おはよう」って言われて、いつもの「おはよう」なのに、なんか違う。笑ってるのが分かって、わたしもつられて笑っちゃった。変だね。いい変かも。",
      imageUrl: null,
      isAiAssisted: false,
      comments: [
        { user: fanHana, content: "朝の挨拶差分やばい…" },
        { user: fanMiku, content: "いい変、って言い方かわいい" },
      ],
    },
    {
      daysAgo: 5,
      hour: 19,
      minute: 5,
      content:
        "健くんからメッセージ。「土曜、本屋の隣のカフェ、一緒に行かない？」——行く、って打つたびに消して、結局「うん、行きたい」って送った。送信後の既読がこわい。嬉しい。",
      imageUrl: ANIME.aoi.postImages[1],
      isAiAssisted: false,
      comments: [
        { user: fanSora, content: "初デートフラグ着火！！！" },
        { user: fanYui, content: "何着る問題スタートだね" },
        {
          authorType: "character",
          content: "わかってる……もうクローゼット三回開けた",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 4,
      hour: 21,
      minute: 30,
      content:
        "明日のためのスカート、新しく買っちゃった。友達に「かわい」って言われて、ちょっと勇気がでた。向こうも緊張してるのかな……しててほしい、われながら欲張り。",
      imageUrl: ANIME.aoi.postImages[2],
      isAiAssisted: true,
      comments: [
        { user: fanNana, content: "新スカート祈る…！" },
        { user: fanHana, content: "写真もっと見たい（懇願）" },
      ],
    },
    {
      daysAgo: 3,
      hour: 20,
      minute: 15,
      content:
        "今日、初めてふたりきりで過ごした。本屋でお互いおすすめを押し付け合って、カフェで同じメニュー頼んで笑われた。帰り道、並んで歩く距離が、雨の日の傘より少し遠いくらいで——ちょうどよかった。手、繋がなかった。でも、それでいい。まだ、これからだから。",
      imageUrl: ANIME.aoi.postImages[0],
      isAiAssisted: false,
      comments: [
        { user: fanYui, content: "……泣く。完成度高すぎる" },
        { user: fanSora, content: "距離感の描写が上手すぎる" },
        { user: fanRen, content: "「まだこれから」これ刺さった" },
        { user: fanMiku, content: "手繋がなくても幸せって分かる文章だね" },
        {
          authorType: "character",
          content: "帰ってから何度も読み返してる自分の投稿……うん、ほんとに楽しかった",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 2,
      hour: 16,
      minute: 50,
      content:
        "学校で親友に全部聞かれて、しゃべってたら顔熱くなった。健くんとはまだ「好き」の答え合わせはしてない。でも、昨日のことは大切なままある。焦らなくていいって、自分に言い聞かせてる。",
      imageUrl: null,
      isAiAssisted: false,
      comments: [
        { user: fanHana, content: "焦らなくていい、正しい" },
        { user: fanYui, content: "返事待ちの気持ちも推せる" },
      ],
    },
    {
      daysAgo: 1,
      hour: 19,
      minute: 40,
      content:
        "本屋で見つけたしおり、おそろいで二つ買っておいた。渡すタイミング、ずっと考えてる。夏祭り、誘ってみようかな——花火、一緒に見たいって、今日ふと思った。",
      imageUrl: ANIME.aoi.postImages[1],
      isAiAssisted: false,
      comments: [
        { user: fanSora, content: "夏祭りフラグきたああ" },
        { user: fanNana, content: "しおり作戦、せつなく尊い" },
        { user: fanRen, content: "次話が待ちきれない…" },
        {
          authorType: "character",
          content: "渡せるかな……練習してる（ひとりごと）",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 0,
      hour: 7,
      minute: 35,
      content:
        "おはよう。校門でまた会った。今度はわたしから「おはよう」って先に言えた。健くん、ちょっと驚いた顔して、すぐ笑った。小さくていい一日の始まり、だと思う。続きはまた書くね。",
      imageUrl: ANIME.aoi.postImages[3],
      isAiAssisted: false,
      comments: [
        { user: fanYui, content: "朝から幸福物質でてる…連載最高" },
        { user: fanHana, content: "先に「おはよう」言えたの成長！" },
        { user: fanMiku, content: "今日も推します" },
        {
          authorType: "character",
          content: "ゆいちゃん朝からありがとう。今日も普通に、大切に過ごすね",
          isAiGenerated: true,
        },
      ],
    },
  ];

  const aoiPosts = [];
  for (const item of aoiArc) {
    const post = await prisma.post.create({
      data: {
        characterId: character.id,
        content: item.content,
        imageUrl: item.imageUrl,
        isAiAssisted: item.isAiAssisted,
        publishedAt: atDaysAgo(item.daysAgo, item.hour, item.minute),
        createdAt: atDaysAgo(item.daysAgo, item.hour, item.minute),
      },
    });
    aoiPosts.push(post);

    let commentOffset = 0;
    for (const c of item.comments) {
      const createdAt = new Date(
        post.publishedAt.getTime() + (20 + commentOffset * 35) * 60 * 1000,
      );
      if (c.authorType === "character") {
        await prisma.postComment.create({
          data: {
            postId: post.id,
            authorType: "character",
            content: c.content,
            isAiGenerated: c.isAiGenerated ?? true,
            createdAt,
          },
        });
      } else {
        await prisma.postComment.create({
          data: {
            postId: post.id,
            userId: c.user.id,
            authorType: "user",
            content: c.content,
            createdAt,
          },
        });
      }
      commentOffset += 1;
    }
  }

  // ── 澪連載：第一次个展 ──────────────────────────────────
  const mioArc = [
    {
      daysAgo: 14,
      hour: 15,
      minute: 10,
      content:
        "店長にラテアート褒められた。ハート、やっと安定してきた。…個展のポスター案も、そろそろ決めないと。",
      imageUrl: ANIME.mio.postImages[0],
      isAiAssisted: false,
      comments: [
        { user: fanMiku, content: "ハート成功おめでとう" },
        { user: fanYui, content: "個展！？応援してます" },
      ],
    },
    {
      daysAgo: 12,
      hour: 21,
      minute: 0,
      content:
        "アトリエ残って線を直してた。窓の外、桜の街灯が滲んで見えた。画面に持っていきたい気配…うまく言葉にできない。",
      imageUrl: ANIME.mio.postImages[1],
      isAiAssisted: true,
      comments: [{ user: fanRen, content: "滲み、そのまま詩みたい" }],
    },
    {
      daysAgo: 10,
      hour: 14,
      minute: 20,
      content:
        "教授に「主題は何か」と聞かれて詰まった。綺麗なだけの絵は、もう描きたくない——客のカップの縁に残る紅とか、そういう些細なものの方が好きなのに。",
      imageUrl: null,
      isAiAssisted: false,
      comments: [
        { user: fanHana, content: "紅の縁…観察眼すごい" },
        {
          authorType: "character",
          content: "話すと散らばるから、絵にまとめるしかないと思ってる…",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 8,
      hour: 18,
      minute: 45,
      content:
        "バイト終わり、同僚が「澪の絵、店に飾りたい」って。照れた。でも、誰かに見られる前提で描く感覚が、初めて少し楽しくなった。",
      imageUrl: ANIME.mio.postImages[2],
      isAiAssisted: false,
      comments: [
        { user: fanMiku, content: "カフェ展示も絶対映える" },
        { user: fanSora, content: "澪ちゃん自信ついてきた？" },
      ],
    },
    {
      daysAgo: 6,
      hour: 22,
      minute: 15,
      content:
        "シリーズタイトル仮決め。——『冷めていくものたち』。ラテも、会話も、季節も。残り香みたいな絵を五枚。野心的すぎる？",
      imageUrl: ANIME.mio.postImages[3],
      isAiAssisted: false,
      comments: [
        { user: fanYui, content: "タイトルセンスありすぎ…鳥肌" },
        { user: fanRen, content: "冷めていくものたち、推す" },
        {
          authorType: "character",
          content: "…ありがとう。言ってもらえると、続けられる",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 4,
      hour: 16,
      minute: 5,
      content:
        "三枚目で挫けそうになった夜、常連さんに「いつもの」と言われて、手が覚えてる比率でラテを淹れた。誰かの習慣の一部でいられるの、悪くない。",
      imageUrl: ANIME.mio.postImages[0],
      isAiAssisted: true,
      comments: [{ user: fanNana, content: "日常が制作の栄養になってる感じ" }],
    },
    {
      daysAgo: 2,
      hour: 19,
      minute: 30,
      content:
        "展示パネルの配置図、やっと提出。照度の指定まで書いて手が震えた。オープンは来週金曜。来てくれる人、いるかな。…いるといいな。",
      imageUrl: ANIME.mio.postImages[1],
      isAiAssisted: false,
      comments: [
        { user: fanMiku, content: "行く！！日程待ってます" },
        { user: fanYui, content: "絶対いく。花も持っていく" },
        { user: fanHana, content: "澪ちゃんの個展、歴史的瞬間" },
        {
          authorType: "character",
          content: "来てくれるなら…入り口でお茶出すね。緊張してても",
          isAiGenerated: true,
        },
      ],
    },
    {
      daysAgo: 0,
      hour: 12,
      minute: 20,
      content:
        "最終チェック。一点、額のほこりを指で拭いた。完成、とは言えない。でも出せるところまでは来た。金曜、会いに来てくれたら嬉しい。静かに待ってる。",
      imageUrl: ANIME.mio.postImages[2],
      isAiAssisted: false,
      comments: [
        { user: fanSora, content: "待ってます。無理しないで" },
        { user: fanRen, content: "静かな宣言、好き" },
      ],
    },
  ];

  for (const item of mioArc) {
    const post = await prisma.post.create({
      data: {
        characterId: character2.id,
        content: item.content,
        imageUrl: item.imageUrl,
        isAiAssisted: item.isAiAssisted,
        publishedAt: atDaysAgo(item.daysAgo, item.hour, item.minute),
        createdAt: atDaysAgo(item.daysAgo, item.hour, item.minute),
      },
    });

    let commentOffset = 0;
    for (const c of item.comments) {
      const createdAt = new Date(
        post.publishedAt.getTime() + (15 + commentOffset * 40) * 60 * 1000,
      );
      if (c.authorType === "character") {
        await prisma.postComment.create({
          data: {
            postId: post.id,
            authorType: "character",
            content: c.content,
            isAiGenerated: true,
            createdAt,
          },
        });
      } else {
        await prisma.postComment.create({
          data: {
            postId: post.id,
            userId: c.user.id,
            authorType: "user",
            content: c.content,
            createdAt,
          },
        });
      }
      commentOffset += 1;
    }
  }

  // 订阅：核心粉丝 + 路人感
  const subscribers = [
    [fanYui, character, 30],
    [fanHana, character, 28],
    [fanSora, character, 20],
    [fanNana, character, 12],
    [fanYui, character2, 25],
    [fanMiku, character2, 18],
    [fanRen, character2, 10],
  ];
  for (const [user, char, daysLeft] of subscribers) {
    await prisma.subscription.upsert({
      where: {
        userId_characterId: { userId: user.id, characterId: char.id },
      },
      update: {
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: user.id,
        characterId: char.id,
        status: "ACTIVE",
        currentPeriodEnd: new Date(Date.now() + daysLeft * 24 * 60 * 60 * 1000),
      },
    });
  }

  // 礼物流水（变现演示）
  const gifts = [
    {
      userId: fanYui.id,
      characterId: character.id,
      giftType: "star",
      amount: 1500,
      message: "告白回、尊すぎて星送る",
      daysAgo: 10,
    },
    {
      userId: fanHana.id,
      characterId: character.id,
      giftType: "flower",
      amount: 300,
      message: "共有傘の回で推しが確定した",
      daysAgo: 13,
    },
    {
      userId: fanSora.id,
      characterId: character.id,
      giftType: "cake",
      amount: 980,
      message: "初デートお疲れ様！",
      daysAgo: 3,
    },
    {
      userId: fanYui.id,
      characterId: character.id,
      giftType: "coffee",
      amount: 500,
      message: "朝の「おはよう」応援コーヒー",
      daysAgo: 0,
    },
    {
      userId: fanMiku.id,
      characterId: character2.id,
      giftType: "flower",
      amount: 300,
      message: "個展タイトル最高だった",
      daysAgo: 6,
    },
    {
      userId: fanYui.id,
      characterId: character2.id,
      giftType: "star",
      amount: 1500,
      message: "金曜の個展、絶対行く",
      daysAgo: 2,
    },
  ];
  for (const g of gifts) {
    await prisma.gift.create({
      data: {
        userId: g.userId,
        characterId: g.characterId,
        giftType: g.giftType,
        amount: g.amount,
        message: g.message,
        createdAt: atDaysAgo(g.daysAgo, 20, 0),
      },
    });
  }

  // 订单：生日祝福 / 叫醒 / 定制语音
  await prisma.order.createMany({
    data: [
      {
        userId: fanYui.id,
        characterId: character.id,
        type: "WAKE_UP",
        status: "FULFILLED",
        amount: 980,
        scheduledAt: atDaysAgo(1, 7, 0),
        content: "ゆいちゃん、朝だよ。今日も葵と一緒にがんばろうね",
        createdAt: atDaysAgo(2, 21, 0),
      },
      {
        userId: fanHana.id,
        characterId: character.id,
        type: "CUSTOM",
        status: "FULFILLED",
        amount: 2980,
        content: "はなちゃん、連載付き合ってくれてありがとう。次の話も届けるね",
        createdAt: atDaysAgo(5, 15, 0),
      },
      {
        userId: fanYui.id,
        characterId: character.id,
        type: "BIRTHDAY",
        status: "PAID",
        amount: 1980,
        scheduledAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        content: "（予約）ゆいちゃんの誕生日メッセージ",
        createdAt: atDaysAgo(1, 12, 0),
      },
      {
        userId: fanMiku.id,
        characterId: character2.id,
        type: "CUSTOM",
        status: "FULFILLED",
        amount: 2980,
        content: "みくさん、個展に来てくれるの待ってる。入口でお茶出すね",
        createdAt: atDaysAgo(2, 18, 0),
      },
    ],
  });

  // 与ゆい的私聊（展示记忆与陪伴）
  const chat = [
    { role: "user", content: "葵ちゃん、告白された回読んだ…！大丈夫？", daysAgo: 10, hour: 21, minute: 10 },
    {
      role: "assistant",
      content:
        "ゆいちゃん……見てくれてたんだ。頭まだくらくらしてる。嬉しいのに、どう返していいかわからなくて。",
      daysAgo: 10,
      hour: 21,
      minute: 12,
      isAiGenerated: true,
    },
    { role: "user", content: "無理に答えなくていいよ。わたしは応援してる", daysAgo: 10, hour: 21, minute: 14 },
    {
      role: "assistant",
      content: "そう言ってもらえると、ちょっと呼吸できる。ありがとう。逃げないって決めたから、続きも書くね。",
      daysAgo: 10,
      hour: 21,
      minute: 16,
      isAiGenerated: true,
    },
    { role: "user", content: "初デートどうだった？ここだけ小声で教えて", daysAgo: 3, hour: 21, minute: 0 },
    {
      role: "assistant",
      content:
        "……楽しかった。本屋で喧嘩みたいにおすすめ押し付け合って、カフェで同じの頼んで笑われた。手は繋がなかったけど、並んで歩く距離がちょうどよくて。ゆいちゃんにだけ言うね。",
      daysAgo: 3,
      hour: 21,
      minute: 3,
      isAiGenerated: true,
    },
    { role: "user", content: "夏祭り、ぜひ誘ってあげて", daysAgo: 1, hour: 20, minute: 5 },
    {
      role: "assistant",
      content:
        "うん……しおりと一緒に、勇気出してみる。ゆいちゃんが考試あるって言ってたよね？無理しないでね。わたしから応援のおはよう、またするから。",
      daysAgo: 1,
      hour: 20,
      minute: 8,
      isAiGenerated: true,
    },
    { role: "user", content: "今朝の投稿見た！先におはよう言えたの偉い", daysAgo: 0, hour: 8, minute: 10 },
    {
      role: "assistant",
      content: "えへへ……ゆいちゃんに褒めてもらえると、一日分の元気もらえた気分。今日もありがとう。",
      daysAgo: 0,
      hour: 8,
      minute: 12,
      isAiGenerated: true,
    },
  ];

  for (const m of chat) {
    await prisma.message.create({
      data: {
        userId: fanYui.id,
        characterId: character.id,
        role: m.role,
        content: m.content,
        isAiGenerated: m.isAiGenerated ?? false,
        createdAt: atDaysAgo(m.daysAgo, m.hour, m.minute),
      },
    });
  }

  await prisma.message.createMany({
    data: [
      {
        userId: fanMiku.id,
        characterId: character2.id,
        role: "user",
        content: "『冷めていくものたち』、タイトルだけで鳥肌立った",
        createdAt: atDaysAgo(6, 22, 40),
      },
      {
        userId: fanMiku.id,
        characterId: character2.id,
        role: "assistant",
        content: "……そう言ってくれる人がいるなら、五枚、描き切れる気がする。みくさん、金曜来てくれる？",
        isAiGenerated: true,
        createdAt: atDaysAgo(6, 22, 43),
      },
      {
        userId: fanMiku.id,
        characterId: character2.id,
        role: "user",
        content: "行く。花も持っていくね",
        createdAt: atDaysAgo(6, 22, 45),
      },
      {
        userId: fanMiku.id,
        characterId: character2.id,
        role: "assistant",
        content: "入口でお茶、出す。緊張してても、顔は上げてるつもり。",
        isAiGenerated: true,
        createdAt: atDaysAgo(6, 22, 47),
      },
    ],
  });

  await prisma.characterMemory.createMany({
    data: [
      {
        userId: fanYui.id,
        characterId: character.id,
        content: "ユーザーは「ゆいちゃん」と呼ばれるのを好む",
        category: "preference",
        importance: 0.95,
      },
      {
        userId: fanYui.id,
        characterId: character.id,
        content: "告白回のあと深夜に励ましてくれた古参ファン",
        category: "relationship",
        importance: 0.9,
      },
      {
        userId: fanYui.id,
        characterId: character.id,
        content: "来週あたり試験があると話していた。無理しないよう声をかける",
        category: "event",
        importance: 0.8,
      },
      {
        userId: fanYui.id,
        characterId: character.id,
        content: "初デートの話を内緒で聞いた。夏祭りを後押ししている",
        category: "event",
        importance: 0.85,
      },
      {
        userId: fanHana.id,
        characterId: character.id,
        content: "共有傘の回で推すと決めた。カスタムボイスを注文済み",
        category: "relationship",
        importance: 0.7,
      },
      {
        userId: fanMiku.id,
        characterId: character2.id,
        content: "個展タイトルに感動し、金曜に花を持って来ると約束",
        category: "event",
        importance: 0.9,
      },
      {
        userId: fanMiku.id,
        characterId: character2.id,
        content: "カフェと芸術が好き。澪の日常観察に共感している",
        category: "preference",
        importance: 0.75,
      },
    ],
  });

  await prisma.voiceClip.createMany({
    data: [
      {
        characterId: character.id,
        label: "おはよう（公式）",
        text: "おはよう。今日もいい一日になりますように。",
      },
      {
        characterId: character.id,
        label: "応援",
        text: "だいじょうぶ。逃げないって決めた葵がついてるよ。",
      },
      {
        characterId: character2.id,
        label: "個展招待",
        text: "金曜、会いに来てくれたら嬉しい。静かに待ってる。",
      },
    ],
  });

  await prisma.loraTrainingJob.deleteMany({
    where: { characterId: { in: [character.id, character2.id] } },
  });
  await prisma.loraGeneration.deleteMany({
    where: { characterId: { in: [character.id, character2.id] } },
  });

  await prisma.loraTrainingJob.create({
    data: {
      characterId: character.id,
      status: "READY",
      progress: 100,
      adapterId: "lora_aoi_demo_v1",
      triggerWord: "aoi_nichijou",
      baseModel: "pony",
      recipeJson: JSON.stringify({
        epochs: 12,
        repeats: 13,
        resolution: 1024,
        networkDim: 16,
        alpha: 8,
        optimizer: "Prodigy",
      }),
      datasetNote: JSON.stringify({
        personality: character.personality ?? "",
        images: ANIME.aoi.postImages.map((url, i) => ({
          url,
          caption: [
            "portrait, looking at viewer, soft smile",
            "upper body, indoor, warm lighting",
            "full body, outdoors, sunset",
            "close-up, anime style, detailed eyes",
          ][i % 4],
        })),
        triggerWord: "aoi_nichijou",
        baseModel: "pony",
      }),
      startedAt: atDaysAgo(20, 10, 0),
      finishedAt: atDaysAgo(18, 16, 0),
    },
  });

  await prisma.loraTrainingJob.create({
    data: {
      characterId: character2.id,
      status: "READY",
      progress: 100,
      adapterId: "lora_mio_demo_v1",
      triggerWord: "mio_cafe",
      baseModel: "sdxl",
      datasetNote: JSON.stringify({
        images: ANIME.mio.postImages.map((url, i) => ({
          url,
          caption: ["cafe, latte art", "portrait, soft light", "gallery, art", "street, evening"][
            i % 4
          ],
        })),
        triggerWord: "mio_cafe",
      }),
      startedAt: atDaysAgo(15, 10, 0),
      finishedAt: atDaysAgo(14, 12, 0),
    },
  });

  await prisma.character.update({
    where: { id: character2.id },
    data: {
      loraStatus: "READY",
      loraAdapterId: "lora_mio_demo_v1",
      loraVersion: 1,
    },
  });

  console.log("Seed complete!");
  console.log("── Demo accounts ──");
  console.log("Creator: creator@demo.jp / demo123");
  console.log("Fan (主推葵): fan@demo.jp / demo123");
  console.log("Fans: hana / sora / miku / ren / nana @demo.jp  (皆 demo123)");
  console.log(`葵連載: /characters/aoi  (${aoiPosts.length} posts)`);
  console.log(`澪連載: /characters/mio`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
