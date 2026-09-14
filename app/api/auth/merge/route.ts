import { NextResponse } from "next/server";
import { getUser, mergeGuestToUser } from "@/lib/auth";

/**
 * Folds a guest's prior activity into the account they just signed in to.
 *
 * /auth/callback already does this for the link and OAuth flows. The six-digit
 * code flow finishes inside the browser rather than on a redirect, so it has no
 * callback to hang the merge on and calls this instead. The user id is taken
 * from the session cookie, never from the request body, so this cannot be used
 * to attach one person's guest history to someone else's account.
 */
export async function POST(request: Request) {
  const user = await getUser();
  if (!user) return NextResponse.json({ merged: false }, { status: 401 });

  let anonId = "";
  try {
    const body = (await request.json()) as { anonId?: unknown };
    if (typeof body.anonId === "string") anonId = body.anonId;
  } catch {
    // no body, nothing to merge
  }

  if (!anonId || anonId === "unknown") return NextResponse.json({ merged: false });

  await mergeGuestToUser(anonId, user.id);
  return NextResponse.json({ merged: true });
}
