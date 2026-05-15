import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Reflection body: either a completed reflection with Likert + optional one-thing,
// or a skipped reflection (skipped: true, no Likert needed). The `.refine` at the
// end enforces that Likert values are present when not skipped.
const bodySchema = z
  .object({
    postId: z.string().min(1, "postId is required"),
    skipped: z.boolean().optional().default(false),
    belonging: z.number().int().min(1).max(5).optional().nullable(),
    learned: z.number().int().min(1).max(5).optional().nullable(),
    connection: z.number().int().min(1).max(5).optional().nullable(),
    oneThing: z.string().max(2000).optional().nullable(),
  })
  .refine(
    (data) =>
      data.skipped ||
      (typeof data.belonging === "number" &&
        typeof data.learned === "number" &&
        typeof data.connection === "number"),
    {
      message: "Likert scores are required unless reflection is skipped",
    }
  );

// ─────────────── POST /api/pilot/reflections ───────────────
// Two flows: save a real reflection (Likert + one-thing), OR explicitly
// skip the reflection (skipped: true). Both result in a row in PilotReflection
// — the difference is that skipped rows have null Likert values and the
// skipped flag set true. UI hides the post in both cases — the student has
// handled it either way.
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

  // When skipped, write null Likert values regardless of what the client sent.
  // When not skipped, write the validated Likert values.
  const dataPayload = payload.skipped
    ? {
        skipped: true,
        belonging: null,
        learned: null,
        connection: null,
        oneThing: null,
      }
    : {
        skipped: false,
        belonging: payload.belonging!,
        learned: payload.learned!,
        connection: payload.connection!,
        oneThing: payload.oneThing ?? null,
      };

  try {
    await prisma.pilotReflection.upsert({
      where: { userId_postId: { userId: session.user.id, postId: payload.postId } },
      update: dataPayload,
      create: {
        userId: session.user.id,
        postId: payload.postId,
        ...dataPayload,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/pilot/reflections failed", err);
    return NextResponse.json({ error: "Could not save reflection" }, { status: 500 });
  }
}
