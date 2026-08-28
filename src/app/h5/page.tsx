import { MobileHomeHeader } from "@/components/mobile/mobile-home-header";
import { FeedPage } from "@/components/feed/feed-page";

export default function H5HomePage() {
  return (
    <>
      <MobileHomeHeader basePath="/h5" />
      <FeedPage basePath="/h5" variant="mobile" />
    </>
  );
}
