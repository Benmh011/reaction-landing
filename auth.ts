import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { emailShell, buildListUnsubscribeHeader } from "@/lib/email-templates";

// Extend the Session type so `session.user.role`, `.demoVersion`, `.pilotCohort` are typed
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CLIENT" | "STUDENT";
      demoVersion: string | null;
      organisation: string | null;
      pilotCohort: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "CLIENT" | "STUDENT";
    demoVersion?: string | null;
    organisation?: string | null;
    pilotCohort?: string | null;
  }
}

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
    verifyRequest: "/auth/verify-request",
  },

  providers: [
    // ─── Magic link via Resend (primary) ───
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM,
      // Override the default email so it matches the Reaction brand
      sendVerificationRequest: async ({ identifier: email, url, provider }) => {
        const { Resend: ResendSdk } = await import("resend");
        const resend = new ResendSdk(provider.apiKey as string);

        // Build the email using the shared template helper.
        // Magic-link is transactional — no unsubscribe link (users can't unsubscribe
        // from auth emails without locking themselves out of their account).
        // But we still include List-Unsubscribe headers for spam-filter reputation.
        const html = emailShell({
          eyebrow: "Sign in to your demo",
          bodyHtml: `
            <p style="margin:0 0 14px;">Click the button below to sign in to your Reaction preview.</p>
            <p style="margin:0;">This link is single-use and expires in 24 hours.</p>
          `,
          ctaText: "Sign in to Reaction",
          ctaUrl: url,
          ctaFootnote: `If the button doesn't work, copy this URL into your browser: ${url}`,
          recipientEmail: email,
          includeUnsubscribe: false,
        });

        const text = `Sign in to Reaction\n\nClick this link to sign in:\n${url}\n\nThis link is single-use and expires in 24 hours.\n\nIf you didn't request this email, you can safely ignore it.\n\n— Reaction`;

        const result = await resend.emails.send({
          from: provider.from as string,
          to: email,
          subject: `Sign in to Reaction`,
          html,
          text,
          headers: buildListUnsubscribeHeader(email),
        });

        if (result.error) {
          throw new Error(`Resend error: ${result.error.message}`);
        }
      },
    }),

    // ─── Password fallback ───
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user || !user.passwordHash) return null;

        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          demoVersion: user.demoVersion,
          organisation: user.organisation,
          pilotCohort: user.pilotCohort,
        };
      },
    }),
  ],

  callbacks: {
    // Persist role + demoVersion + pilotCohort on the JWT so we don't hit the DB on every request
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "CLIENT";
        token.demoVersion = user.demoVersion ?? null;
        token.organisation = user.organisation ?? null;
        token.pilotCohort = user.pilotCohort ?? null;
      }
      // On every sign-in, refresh role/demoVersion/pilotCohort in case admin updated them
      if (trigger === "signIn" || trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, demoVersion: true, organisation: true, pilotCohort: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.demoVersion = dbUser.demoVersion;
          token.organisation = dbUser.organisation;
          token.pilotCohort = dbUser.pilotCohort;
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "ADMIN" | "CLIENT" | "STUDENT") ?? "CLIENT";
        session.user.demoVersion = (token.demoVersion as string | null) ?? null;
        session.user.organisation = (token.organisation as string | null) ?? null;
        session.user.pilotCohort = (token.pilotCohort as string | null) ?? null;
      }
      return session;
    },
  },
});
