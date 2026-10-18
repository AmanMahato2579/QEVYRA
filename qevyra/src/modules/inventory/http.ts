import { NextResponse } from "next/server";
import { apiError } from "@/lib/api-guard";
import { InventoryError } from "./services";

/** Map a thrown InventoryError to an HTTP response; rethrow anything unexpected. */
export function inventoryErrorResponse(error: unknown): NextResponse {
  if (error instanceof InventoryError) {
    const status = error.code === "not_found" ? 404 : error.code === "conflict" ? 409 : 400;
    return apiError(status, error.message);
  }
  throw error;
}
