import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  postId: z.string().min(1, "postId is required"),
  belonging: z.number().int().min(1).max(5),
  learned: z.number().int().min(1).max(5),
  connection: z.number().int().min(1).max(5),
  oneThing: z.string().max(2000).optional().nullable(),
});

// ─────────────── POST /api/pilot/reflections ───────────────
// Saves a student's reflection after an event. This is the core SO4–SO6
// educational gains evidence capture — three Likert scores plus a free-text
// articulation. Idempotent — re-saving overwrites the previous reflection.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.pilotCohort) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  let payload: z.infer<typeof bodySchema>;
  try {
    payload = bodySchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
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
    await prisma.pilotReflection.upsert({
      where: { userId_postId: { userId: session.user.id, postId: payload.postId } },
      update: {
        belonging: payload.belonging,
        learned: payload.learned,
        connection: payload.connection,
        oneThing: payload.oneThing ?? null,
      },
      create: {
        userId: session.user.id,
        postId: payload.postId,
        belonging: payload.belonging,
        learned: payload.learned,
        connection: payload.connection,
        oneThing: payload.oneThing ?? null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/pilot/reflections failed", err);
    return NextResponse.json({ error: "Could not save reflection" }, { status: 500 });
  }
}
