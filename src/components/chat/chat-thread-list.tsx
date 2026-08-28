import Link from "next/link";
import { parseTags } from "@/lib/utils";
import { formatTimeAgo } from "@/lib/feed";
import { characterChatHref, type ChatThread } from "@/lib/chat-inbox";
import { CharacterAvatar } from "@/components/ui/character-avatar";
import { MIcon } from "@/components/ui/m-icon";

type ChatThreadListProps = {
  threads: ChatThread[];
  activeSlug?: string | null;
  basePath?: "" | "/h5" | "/app";
};

export function ChatThreadList({ threads, activeSlug, basePath = "" }: ChatThreadListProps) {
  const discoverHref = basePath ? `${basePath}/discover` : "/discover";

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex shrink-0 items-center justify-between border-b border-[rgba(120,72,54,0.08)] px-4 py-3.5">
        <h2 className="font-display text-[17px] font-black text-[#3a3330]">チャット</h2>
        <Link
          href={discoverHref}
          className="flex h-8 w-8 items-center justify-center rounded-full text-[#ef7488] hover:bg-[#fff2f0]"
          title="新しい会話"
        >
          <MIcon name="add" className="text-[22px]" />
        </Link>
      </div>

      {threads.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <MIcon name="chat_bubble" className="text-[40px] text-[#ef7488]/30" />
          <p className="mt-3 text-sm font-bold text-[#3a3330]">会話がありません</p>
          <Link href={discoverHref} className="btn-primary mt-4 rounded-full px-5 py-2 text-xs">
            キャラを探す
          </Link>
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto">
          {threads.map(({ character, lastMessage }) => {
            const active = character.slug === activeSlug;
            return (
              <li key={character.id}>
                <Link
                  href={characterChatHref(basePath, character.slug)}
                  className={`flex items-center gap-3 px-4 py-3 transition ${
                    active
                      ? "bg-gradient-to-r from-[#fff2f0] to-white border-l-[3px] border-[#ef7488]"
                      : "border-l-[3px] border-transparent hover:bg-[#fbf4f1]"
                  }`}
                >
                  <div className="relative shrink-0">
                    <CharacterAvatar
                      slug={character.slug}
                      src={character.avatarUrl}
                      alt={character.name}
                      size={48}
                      rounded="2xl"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#3fae76]" />
                  </div>
                  <div className="min-w-0 flex-1 leading-snug">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate font-display text-[14px] ${
                          active ? "font-black text-[#3a3330]" : "font-bold"
                        }`}
                      >
                        {character.name}
                      </span>
                      {lastMessage && (
                        <span className="shrink-0 text-[10px] text-[#b0a099]">
                          {formatTimeAgo(lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12.5px] text-[#8a7a72]">
                      {lastMessage
                        ? lastMessage.role === "user"
                          ? `あなた: ${lastMessage.content}`
                          : lastMessage.content
                        : "会話を始める"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
