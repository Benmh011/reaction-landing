import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  postId: z.string().min(1, "postId is required"),
});

async function verifyPostInCohort(postId: string, cohort: string) {
  const post = await prisma.pilotPost.findUnique({
    where: { id: postId },
    select: { cohort: true },
  });
  return post !== null && post.cohort === cohort;
}

// ─────────────── POST /api/pilot/attendance ───────────────
// Records that the calling student has RSVP'd to the given post.
// Idempotent — re-RSVP'ing is a no-op.
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

  if (!(await verifyPostInCohort(payload.postId, session.user.pilotCohort))) {
    return NextResponse.json({ error: "Post not found in your cohort" }, { status: 404 });
  }

  try {
    await prisma.pilotAttendance.upsert({
      where: { userId_postId: { userId: session.user.id, postId: payload.postId } },
      update: {},
      create: { userId: session.user.id, postId: payload.postId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/pilot/attendance failed", err);
    return NextResponse.json({ error: "Could not RSVP" }, { status: 500 });
  }
}

// ─────────────── DELETE /api/pilot/attendance ───────────────
// Removes the calling student's RSVP. Idempotent — un-RSVP'ing twice is a no-op.
export async function DELETE(req: Request) {
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

  try {
    await prisma.pilotAttendance.deleteMany({
      where: { userId: session.user.id, postId: payload.postId },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/pilot/attendance failed", err);
    return NextResponse.json({ error: "Could not un-RSVP" }, { status: 500 });
  }
}
