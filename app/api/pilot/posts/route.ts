import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Only categories the pilot UI exposes. Opportunities is locked client-side
// and rejected server-side too, defence in depth.
const ALLOWED_CATEGORIES = ["Sport", "Study", "Board Games", "Community"] as const;

const createPostSchema = z.object({
  category: z.enum(ALLOWED_CATEGORIES),
  activity: z.string().min(1, "Activity is required").max(120),
  location: z.string().min(1, "Location is required").max(200),
  date: z.string().min(1).max(20),
  time: z.string().min(1).max(20),
  description: z.string().max(2000).optional().nullable(),
  // Anything category-specific the modal collected (mode, perTeam, maxPeople,
  // skillLevel, society, players, cause, etc.) rides along in metadata.
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

// Shape a Prisma row into the same flat object the Vite demo uses for
// in-memory posts. The metadata object is spread back to top-level so all the
// existing render code that reads p.mode / p.maxPeople / etc. keeps working.
function shapePost(p: {
  id: string;
  category: string;
  activity: string;
  location: string;
  date: string;
  time: string;
  description: string | null;
  metadata: unknown;
  createdAt: Date;
  author: { name: string | null; email: string };
}) {
  const meta =
    typeof p.metadata === "object" && p.metadata !== null && !Array.isArray(p.metadata)
      ? (p.metadata as Record<string, unknown>)
      : {};
  return {
    id: p.id,
    user: p.author.name ?? p.author.email,
    category: p.category,
    activity: p.activity,
    location: p.location,
    date: p.date,
    time: p.time,
    description: p.description ?? "",
    ...meta,
    createdAt: p.createdAt.toISOString(),
  };
}

// ─────────────── GET /api/pilot/posts ───────────────
// Returns all posts in the calling student's cohort, newest first.
export async function GET() {
  const session = await auth();
  if (!session?.user?.pilotCohort) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  try {
    const posts = await prisma.pilotPost.findMany({
      where: { cohort: session.user.pilotCohort },
      orderBy: { createdAt: "desc" },
      include: { author: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ posts: posts.map(shapePost) });
  } catch (err) {
    console.error("GET /api/pilot/posts failed", err);
    return NextResponse.json({ error: "Could not load posts" }, { status: 500 });
  }
}

// ─────────────── POST /api/pilot/posts ───────────────
// Creates one post in the calling student's cohort.
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.pilotCohort) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  let payload: z.infer<typeof createPostSchema>;
  try {
    const body = await req.json();
    payload = createPostSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const post = await prisma.pilotPost.create({
      data: {
        cohort: session.user.pilotCohort,
        authorId: session.user.id,
        category: payload.category,
        activity: payload.activity,
        location: payload.location,
        date: payload.date,
        time: payload.time,
        description: payload.description ?? null,
        metadata: payload.metadata ?? undefined,
      },
      include: { author: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ post: shapePost(post) });
  } catch (err) {
    console.error("POST /api/pilot/posts failed", err);
    return NextResponse.json({ error: "Could not create post" }, { status: 500 });
  }
}
