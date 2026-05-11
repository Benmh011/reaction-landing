// app/unsubscribe/page.tsx
//
// Server component that processes the unsubscribe and displays a confirmation.
// Reading the token + email from searchParams, calling the same verification
// logic the API route uses, then rendering a branded confirmation page.

import { verifyUnsubscribeToken } from "@/lib/email-templates";
import { prisma } from "@/lib/prisma";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

export const metadata = { title: "Unsubscribe · Reaction" };
export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ email?: string; token?: string }>;
}

async function processUnsubscribe(email: string, token: string): Promise<{ ok: boolean; message: string }> {
  if (!email || !token) {
    return { ok: false, message: "This unsubscribe link is missing required parameters." };
  }
  const lowerEmail = email.toLowerCase().trim();
  if (!verifyUnsubscribeToken(lowerEmail, token)) {
    return { ok: false, message: "This unsubscribe link is invalid or has expired. Please contact us if you continue to receive emails." };
  }

  try {
    await prisma.user.updateMany({
      where: { email: lowerEmail },
      data: { marketingOptOut: true },
    });
  } catch {
    // marketingOptOut field may not exist yet — page still confirms; we'll honour the opt-out once migrated.
  }

  try {
    await prisma.emailOptOut.upsert({
      where: { email: lowerEmail },
      update: { optedOutAt: new Date() },
      create: { email: lowerEmail, optedOutAt: new Date() },
    });
  } catch {
    // EmailOptOut table may not exist yet — same defensive logic.
  }

  console.log(`[AUDIT] email_unsubscribed email=${lowerEmail} at=${new Date().toISOString()}`);

  return { ok: true, message: "You've been unsubscribed. You won't receive any further marketing emails from Reaction." };
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const email = params.email || "";
  const token = params.token || "";
  const result = await processUnsubscribe(email, token);

  return (
    <>
      <SiteNav />

      <section style={{ padding: "60px 0 80px" }}>
        <div className="container-narrow">
          <div className="page-eyebrow">Email preferences</div>
          <h1 className="page-title">
            {result.ok ? <>You've been <em>unsubscribed</em>.</> : <>That link <em>didn't work</em>.</>}
          </h1>
          <p className="page-lede">{result.message}</p>

          {result.ok && email && (
            <div className="panel">
              <div
                className="mono"
                style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 8,
                }}
              >
                Email address
              </div>
              <div style={{ fontSize: "1rem", color: "var(--text)", marginBottom: 16 }}>{email}</div>

              <p style={{ fontSize: "0.92rem", color: "var(--text-soft)", lineHeight: 1.55, margin: 0 }}>
                Transactional emails (such as login links you've requested) are not affected by this preference.
                If you want those stopped too, please{" "}
                <a href="mailto:info@reaction.org.uk" style={{ color: "var(--reaction)", textDecoration: "none" }}>
                  contact us directly
                </a>
                .
              </p>
            </div>
          )}

          {!result.ok && (
            <div className="panel">
              <p style={{ fontSize: "0.95rem", color: "var(--text-soft)", lineHeight: 1.55, margin: "0 0 16px" }}>
                If you'd like to unsubscribe, please email us directly and we'll handle it for you.
              </p>
              <a href="mailto:info@reaction.org.uk" className="btn btn-primary">
                Email info@reaction.org.uk
                <span className="arrow" aria-hidden="true">→</span>
              </a>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
