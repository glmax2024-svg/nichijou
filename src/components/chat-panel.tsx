"use client";

import { ChatThread, type ChatMessage } from "@/components/chat/chat-thread";
import type { ChatAccess } from "@/lib/chat-quota";

/** @deprecated Use ChatThread instead */
export function ChatPanel(props: {
  characterId: string;
  characterSlug: string;
  characterName: string;
  characterAvatar?: string;
  initialMessages: ChatMessage[];
  chatAccess: ChatAccess;
  subscriptionPrice: number;
}) {
  return <ChatThread {...props} variant="embedded" />;
}
