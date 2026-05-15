import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";

// Hardcoded for v1 — single pilot cohort. When we run a second cohort
// (Exeter, future Plymouth iteration, etc.) we'll switch to dynamic routing
// at /pilot/[cohort] and pass the cohort from the page through to here.
const PILOT_COHORT = "plymouth-pilot-2026-q2";
const PILOT_DEMO_VERSION = "plymouth-pilot";

// Where the user lands after clicking the magic link in their inbox.
// /portal is the existing post-auth landing for any role — it'll render
// fine for STUDENT users and surface the demoVersion-aware "Launch demo"
// link. Once the cloned pilot demo build ships, we'll redirect directly
// to /demos/plymouth-pilot/ instead.
const POST_SIGNIN_REDIRECT = "/portal";

const signupSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address.")
    .transform((s) => s.toLowerCase().trim()),
  firstName: z.string().min(1, "First name is required.").max(60).trim(),
  lastName: z.string().min(1, "Last name is required.").max(60).trim(),
});

export async function POST(req: Request) {
  // 1 ── Parse and validate the request body
  let payload: z.infer<typeof signupSchema>;
  try {
    const body = await req.json();
    payload = signupSchema.parse(body);
  } catch (err) {
    if (err instanceof z.ZodError) {
      // Surface the first validation error to the client
      const firstIssue = err.issues[0];
      return NextResponse.json(
        { error: firstIssue?.message ?? "Invalid input." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "Invalid request. Please check your details and try again." },
      { status: 400 }
    );
  }

  const { email, firstName, lastName } = payload;

  // 2 ── Guard: don't let CLIENT or ADMIN accounts get re-classified as STUDENT.
  // If someone signs up with an email already used by a founder or admin,
  // reject — they should sign in via /auth/signin with their existing role.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.role !== "STUDENT") {
    return NextResponse.json(
      {
        error:
          "This email is already registered as a non-pilot user. Please use a different email or sign in through your existing account.",
      },
      { status: 409 }
    );
  }

  // 3 ── Upsert the pilot user. If they're new, create them with STUDENT role.
  // If they're returning, refresh cohort/demoVersion in case we've moved them.
  // Do NOT overwrite their name on returning visits — they may have updated it.
  try {
    await prisma.user.upsert({
      where: { email },
      update: {
        pilotCohort: PILOT_COHORT,
        demoVersion: PILOT_DEMO_VERSION,
      },
      create: {
        email,
        name: `${firstName} ${lastName}`.trim(),
        role: "STUDENT",
        pilotCohort: PILOT_COHORT,
        demoVersion: PILOT_DEMO_VERSION,
        requestType: "UNIVERSITY",
      },
    });
  } catch (err) {
    console.error("Pilot signup — Prisma upsert failed", err);
    return NextResponse.json(
      { error: "Could not register you for the pilot. Please try again." },
      { status: 500 }
    );
  }

  // 4 ── Trigger Auth.js's Resend provider to send the magic-link email.
  // redirect: false → don't throw a redirect response, return normally.
  // redirectTo → the URL baked into the magic link as callbackUrl;
  //              user lands here after clicking through.
  try {
    await signIn("resend", {
      email,
      redirect: false,
      redirectTo: POST_SIGNIN_REDIRECT,
    });
  } catch (err) {
    console.error("Pilot signup — signIn (magic link) failed", err);
    return NextResponse.json(
      { error: "Could not send your sign-in email. Please try again in a moment." },
      { status: 500 }
    );
  }

  // 5 ── All good. The form on /pilot will switch to its "check your inbox" state.
  return NextResponse.json({
    ok: true,
    message: `Sign-in link sent to ${email}.`,
  });
}
