import { defineCollection, z } from 'astro:content';

const locationCollection = defineCollection({
  schema: z.object({
    name: z.string(),
    neighborhood: z.string(),
    active: z.boolean().default(true),
    featured: z.boolean().default(false),
    addressLines: z.array(z.string()).default([]),
    city: z.string().default('Austin'),
    state: z.string().default('TX'),
    zip: z.string().default(''),
    directionsUrl: z.string().url().optional(),
    email: z.string().email().optional(),
    schedule: z.string(),
    details: z.string(),
    hours: z.string().optional(),
    notes: z.array(z.string()).default([]),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    heroImage: z.string().optional(),
    gallery: z.array(
      z.object({
        src: z.string(),
        alt: z.string(),
        caption: z.string().optional()
      })
    ).default([]),
    amenities: z.array(z.string()).default([]),
    inventory: z.array(
      z.object({
        title: z.string(),
        pieceCount: z.number().optional(),
        condition: z.string().optional(),
        image: z.string().optional(),
        notes: z.string().optional()
      })
    ).default([]),
    inventoryUpdated: z.string().optional(),
    socials: z.array(
      z.object({
        label: z.string(),
        href: z.string().url()
      })
    ).default([])
  })
});

const pageCollection = defineCollection({
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    updated: z.string().optional()
  })
});

export const collections = {
  locations: locationCollection,
  pages: pageCollection
};
