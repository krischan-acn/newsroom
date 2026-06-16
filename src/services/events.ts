// services/events.ts
const NEW_API_BASE = 'https://development.acnnewswire.com';
const EVENT_IMAGE_BASE = 'https://www.acnnewswire.com/eventimages/';

export interface Event {
  id: number;
  startDate: string;
  endDate: string;
  description: string;
  location: string;
  url: string;
  pressReleaseUrl: string | null;
  photo: string | null;
}

interface AcnEvent {
  id: number;
  startDate: string;
  endDate: string;
  description: string;
  location: string;
  url: string;
  inUrl: string;
  eventImage: string;
  lid: string;
  publish: string;
  compId: number | null;
  companies: unknown[];
}

export async function fetchEvents(): Promise<Event[]> {
  const res = await fetch(
    `${NEW_API_BASE}/api/Events?pageNumber=1&pageSize=100`,
    {
      next: { revalidate: 3600 },
      headers: { Accept: 'application/json' },
    },
  );

  if (!res.ok) return [];

  const raw: AcnEvent[] = await res.json();

  return raw
    .filter((e) => e.publish === 'y')
    .map((e) => ({
      id: e.id,
      startDate: e.startDate,
      endDate: e.endDate,
      description: e.description,
      location: e.location ?? '',
      url: e.url.startsWith('http') ? e.url : `https://${e.url}`,
      pressReleaseUrl: null,
      photo: e.eventImage ? `${EVENT_IMAGE_BASE}${e.eventImage}` : null,
    }));
}
