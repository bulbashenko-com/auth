export function GET() {
  return new Response("ok\n", { headers: { "content-type": "text/plain" } })
}
