export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  console.log("EVENT:", body);
  return Response.json({ ok: true });
}
