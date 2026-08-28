import { MobileHomeHeader } from "@/components/mobile/mobile-home-header";
import { FeedPage } from "@/components/feed/feed-page";

export default function AppHomePage() {
  return (
    <>
      <MobileHomeHeader basePath="/app" />
      <FeedPage basePath="/app" variant="mobile" />
    </>
  );
}
