/**
 * Shared CORS handling for all edge functions in this project.
 */

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Returns a preflight response if the request is an OPTIONS request,
 * otherwise returns null so the caller can continue handling it.
 */
export function handleOptions(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Standard error envelope for this API: `{ "error": { "code", "message" } }`.
 * `code` is a stable, machine-readable identifier (e.g. "VALIDATION_ERROR");
 * `message` is human-readable and safe to show to a client.
 */
export function errorResponse(
  code: string,
  message: string,
  status: number,
): Response {
  return jsonResponse({ error: { code, message } }, status);
}
