import { EventDetailPage } from "@/components/events/event-detail-page";

export default async function H5EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailPage id={id} basePath="/h5" />;
}
