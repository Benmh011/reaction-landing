import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_CATEGORIES = ["Sport", "Study", "Board Games", "Community"] as const;

const createPostSchema = z.object({
  category: z.enum(ALLOWED_CATEGORIES),
  activity: z.string().min(1, "Activity is required").max(120),
  location: z.string().min(1, "Location is required").max(200),
  date: z.string().min(1).max(20),
  time: z.string().min(1).max(20),
  description: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional().nullable(),
});

function userDisplayName(user: { name: string | null; email: string }) {
  return user.name ?? user.email;
}

type PostRowWithAuthor = {
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
};

function shapePost(p: PostRowWithAuthor) {
  const meta =
    typeof p.metadata === "object" && p.metadata !== null && !Array.isArray(p.metadata)
      ? (p.metadata as Record<string, unknown>)
      : {};
  return {
    id: p.id,
    user: userDisplayName(p.author),
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
// Returns posts, attendance, checkedIn, and reflections all in one shot.
// Front-end consumes the four keys and populates its in-memory state from them.
export async function GET() {
  const session = await auth();
  if (!session?.user?.pilotCohort) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  try {
    const posts = await prisma.pilotPost.findMany({
      where: { cohort: session.user.pilotCohort },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true, email: true } },
        attendances: { include: { user: { select: { name: true, email: true } } } },
        checkins: { include: { user: { select: { name: true, email: true } } } },
        reflections: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    const attendance: Record<string, string[]> = {};
    const checkedIn: Record<string, string[]> = {};
    const reflections: Record<string, Record<string, unknown>> = {};

    for (const p of posts) {
      attendance[p.id] = p.attendances.map((a) => userDisplayName(a.user));
      checkedIn[p.id] = p.checkins.map((c) => userDisplayName(c.user));
      reflections[p.id] = {};
      for (const r of p.reflections) {
        reflections[p.id][userDisplayName(r.user)] = {
          belonging: r.belonging,
          learned: r.learned,
          connection: r.connection,
          oneThing: r.oneThing,
          timestamp: r.createdAt.toISOString(),
        };
      }
    }

    return NextResponse.json({
      posts: posts.map(shapePost),
      attendance,
      checkedIn,
      reflections,
    });
  } catch (err) {
    console.error("GET /api/pilot/posts failed", err);
    return NextResponse.json({ error: "Could not load posts" }, { status: 500 });
  }
}

// ─────────────── POST /api/pilot/posts ───────────────
// Creates one post and auto-RSVPs the author so they show as attending.
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

    // Author auto-RSVPs so the post creator shows as attending their own event.
    // Try/catch on the inner write — a constraint failure shouldn't kill the post creation.
    try {
      await prisma.pilotAttendance.create({
        data: { userId: session.user.id, postId: post.id },
      });
    } catch (innerErr) {
      console.warn("Auto-RSVP for post author failed (non-fatal)", innerErr);
    }

    return NextResponse.json({ post: shapePost(post) });
  } catch (err) {
    console.error("POST /api/pilot/posts failed", err);
    return NextResponse.json({ error: "Could not create post" }, { status: 500 });
  }
}
