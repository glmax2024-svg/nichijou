import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getChatThreads } from "@/lib/chat-inbox";
import { loginPath } from "@/lib/login-path";
import { MessagesInbox } from "@/components/chat/messages-inbox";

export default async function H5MessagesPage() {
  const session = await auth();
  if (!session?.user) redirect(loginPath("/h5", "/h5/messages"));

  const threads = await getChatThreads(session.user.id);

  return (
    <div className="min-h-full bg-[#fbf4f1]">
      <div className="px-[18px] pb-1 pt-2.5">
        <h2 className="font-display text-[22px] font-black text-[#3a3330]">メッセージ</h2>
        <p className="mt-0.5 text-[12.5px] text-[#b0a099]">推しキャラとの会話</p>
      </div>
      <MessagesInbox threads={threads} basePath="/h5" />
    </div>
  );
}
