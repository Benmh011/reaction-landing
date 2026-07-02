import type { Metadata } from "next";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import RegisterForm from "./RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Reaction account — passwordless, one link, done.",
};

export default function RegisterPage() {
  return (
    <>
      <SiteNav />
      <section style={{ padding: "90px 0 110px", minHeight: "62vh" }}>
        <div className="container" style={{ maxWidth: 560 }}>
          <div className="page-eyebrow">Account</div>
          <h1 className="page-title">
            Create an <em>account</em>.
          </h1>
          <p className="page-lede" style={{ marginBottom: 36 }}>
            Passwordless, on purpose: enter your email and we send a magic link —
            clicking it creates your account and signs you in. One key, held in
            your inbox, nothing to remember or leak.
          </p>
          <div className="panel">
            <RegisterForm />
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
