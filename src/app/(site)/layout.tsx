import { Header } from "@/components/header";
import { SiteFooter } from "@/components/legal/site-footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
