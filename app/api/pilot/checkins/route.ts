import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  postId: z.string().min(1, "postId is required"),
});

// ─────────────── POST /api/pilot/checkins ───────────────
// Records that the calling student actually attended a past event.
// Distinct from attendance: attendance is "I plan to come", checkin is "I came".
// Idempotent — re-checking-in is a no-op.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.pilotCohort) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const post = await prisma.pilotPost.findUnique({
    where: { id: payload.postId },
    select: { cohort: true },
  });
  if (!post || post.cohort !== session.user.pilotCohort) {
    return NextResponse.json({ error: "Post not found in your cohort" }, { status: 404 });
  }

  try {
    await prisma.pilotCheckin.upsert({
      where: { userId_postId: { userId: session.user.id, postId: payload.postId } },
      update: {},
      create: { userId: session.user.id, postId: payload.postId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/pilot/checkins failed", err);
    return NextResponse.json({ error: "Could not check in" }, { status: 500 });
  }
}
