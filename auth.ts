import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// Extend the Session type so `session.user.role` and `.demoVersion` are typed
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CLIENT";
      demoVersion: string | null;
      organisation: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: "ADMIN" | "CLIENT";
    demoVersion?: string | null;
    organisation?: string | null;
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
        const { host } = new URL(url);
        const result = await resend.emails.send({
          from: provider.from as string,
          to: email,
          subject: `Sign in to Reaction`,
          html: magicLinkEmail({ url, host }),
          text: `Sign in to Reaction\n\nClick this link to sign in:\n${url}\n\nIf you didn't request this email, you can safely ignore it.\n\n— Reaction`,
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
        };
      },
    }),
  ],

  callbacks: {
    // Persist role + demoVersion on the JWT so we don't hit the DB on every request
    jwt: async ({ token, user, trigger }) => {
      if (user) {
        token.id = user.id;
        token.role = user.role ?? "CLIENT";
        token.demoVersion = user.demoVersion ?? null;
        token.organisation = user.organisation ?? null;
      }
      // On every sign-in, refresh role/demoVersion in case admin updated them
      if (trigger === "signIn" || trigger === "update") {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, demoVersion: true, organisation: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.demoVersion = dbUser.demoVersion;
          token.organisation = dbUser.organisation;
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as "ADMIN" | "CLIENT") ?? "CLIENT";
        session.user.demoVersion = (token.demoVersion as string | null) ?? null;
        session.user.organisation = (token.organisation as string | null) ?? null;
      }
      return session;
    },
  },
});

function magicLinkEmail({ url, host }: { url: string; host: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:48px 24px;background:#f4ede0;font-family:Georgia,serif;color:#0a0908;">
  <div style="max-width:560px;margin:0 auto;background:#fbf7ed;padding:48px 40px;border-radius:12px;border:1px solid rgba(10,9,8,0.12);">
    <div style="font-family:Georgia,serif;font-style:italic;font-size:32px;color:#b91c1c;margin-bottom:8px;letter-spacing:-0.02em;">Reaction</div>
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#756a5d;margin-bottom:32px;">Sign in to your demo</div>

    <p style="font-size:18px;line-height:1.5;margin:0 0 24px;color:#0a0908;">
      Click the button below to sign in to your Reaction preview.
    </p>

    <div style="text-align:center;margin:36px 0;">
      <a href="${url}" style="display:inline-block;background:#0a0908;color:#fbf7ed;padding:14px 28px;border-radius:999px;text-decoration:none;font-family:'Helvetica Neue',Arial,sans-serif;font-size:15px;font-weight:500;">Sign in to Reaction →</a>
    </div>

    <p style="font-size:14px;line-height:1.6;color:#3a342d;margin:24px 0;">
      This link is valid for 24 hours and can only be used once. If you didn't request this email, you can safely ignore it.
    </p>

    <hr style="border:none;border-top:1px solid rgba(10,9,8,0.12);margin:36px 0;" />

    <p style="font-size:12px;line-height:1.6;color:#756a5d;margin:0;">
      If the button doesn't work, copy and paste this URL into your browser:<br />
      <span style="word-break:break-all;color:#3a342d;">${url}</span>
    </p>
  </div>
  <div style="max-width:560px;margin:24px auto 0;text-align:center;font-family:'Helvetica Neue',Arial,sans-serif;font-size:11px;color:#756a5d;letter-spacing:0.06em;">
    Sent from ${host} · Reaction is a university platform that connects students on and off campus.
  </div>
</body>
</html>`;
}
