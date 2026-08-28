import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getChatThreads } from "@/lib/chat-inbox";
import { ChatWorkspace } from "@/components/chat/chat-workspace";

export default async function SiteMessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/messages");

  const { slug } = await searchParams;

  if (!slug) {
    const threads = await getChatThreads(session.user.id);
    if (threads.length > 0) {
      redirect(`/characters/${threads[0].character.slug}/chat`);
    }
  }

  return <ChatWorkspace activeSlug={slug ?? null} />;
}
