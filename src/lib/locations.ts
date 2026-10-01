import { getCollection } from 'astro:content';

export async function getActiveLocations() {
  const locations = await getCollection('locations', ({ data }) => data.active);
  return locations.sort((a, b) => a.data.name.localeCompare(b.data.name));
}

export function formatAddress(data: {
  addressLines: string[];
  city: string;
  state: string;
  zip: string;
}) {
  return [...data.addressLines, `${data.city}, ${data.state} ${data.zip}`]
    .filter(Boolean)
    .join(', ');
}
