import { z } from "zod";

// Request shapes shared by the track admin routes. Prices are optional and
// bounded; a line item with no `unitPrice` simply carries no amount.
export const ticketItemSchema = z.object({
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().max(500).optional().nullable(),
  quantity: z.number().int().positive().max(100000).optional().nullable(),
  unitPrice: z.number().nonnegative().max(100000000).optional().nullable(),
  currency: z.string().trim().max(8).optional().nullable(),
});

export const ticketItemsSchema = z.array(ticketItemSchema).max(50);
