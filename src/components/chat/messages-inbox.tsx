import Link from "next/link";
import { formatTimeAgo } from "@/lib/feed";
import { characterChatHref, type ChatThread } from "@/lib/chat-inbox";
import { CharacterAvatar } from "@/components/ui/character-avatar";
import { MIcon } from "@/components/ui/m-icon";

type MessagesInboxProps = {
  threads: ChatThread[];
  basePath: "" | "/h5" | "/app";
  variant?: "mobile" | "web";
};

export function MessagesInbox({ threads, basePath, variant = "mobile" }: MessagesInboxProps) {
  if (threads.length === 0) {
    return (
      <div className={`text-center ${variant === "mobile" ? "px-[18px] py-16" : "py-20"}`}>
        <MIcon name="chat_bubble" className="mx-auto text-[48px] text-[#ef7488]/30" />
        <p className="mt-4 font-display font-bold text-[#3a3330]">まだメッセージがありません</p>
        <p className="mt-2 text-sm text-[#8a7a72]">推しキャラとチャットを始めましょう</p>
        <Link
          href={basePath ? `${basePath}/discover` : "/discover"}
          className="btn-primary mt-5 inline-block rounded-full px-6 py-2.5 text-sm"
        >
          キャラクターを探す
        </Link>
      </div>
    );
  }

  return (
    <ul className={variant === "mobile" ? "divide-y divide-[rgba(120,72,54,0.06)]" : "flex flex-col gap-2 p-4"}>
      {threads.map(({ character, lastMessage }) => (
        <li key={character.id}>
          <Link
            href={characterChatHref(basePath, character.slug)}
            className={`flex items-center gap-3 transition hover:bg-white/80 ${
              variant === "mobile" ? "px-[18px] py-3.5" : "rounded-[18px] border border-[rgba(120,72,54,0.06)] bg-white p-4"
            }`}
          >
            <div className="relative shrink-0">
              <CharacterAvatar
                slug={character.slug}
                src={character.avatarUrl}
                alt={character.name}
                size={52}
                rounded="2xl"
              />
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#3fae76]" />
            </div>
            <div className="min-w-0 flex-1 leading-snug">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate font-display text-[15px] font-bold">{character.name}</span>
                {lastMessage && (
                  <span className="shrink-0 text-[11px] text-[#b0a099]">
                    {formatTimeAgo(lastMessage.createdAt)}
                  </span>
                )}
              </div>
              <p className="truncate text-[13px] text-[#8a7a72]">
                {lastMessage
                  ? lastMessage.role === "user"
                    ? `あなた: ${lastMessage.content}`
                    : lastMessage.content
                  : "会話を始める"}
              </p>
            </div>
            <MIcon name="chevron_right" className="shrink-0 text-[20px] text-[#c9bdb5]" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
