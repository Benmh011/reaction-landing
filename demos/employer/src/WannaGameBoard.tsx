// Employer Dashboard Demo (v2)
// Adds: smart salary icon (no double-£), application link field on posts,
// review-applications view with expandable applicant cards.

import React, { useState, useMemo } from "react";
import {
  Briefcase,
  Plus,
  TrendingUp,
  Users,
  Eye,
  Calendar,
  MapPin,
  Clock,
  PoundSterling,
  Building2,
  X,
  Check,
  Sparkles,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Mail,
  GraduationCap,
  FileText,
  Link as LinkIcon,
} from "lucide-react";

// ──────── BRAND CONSTANTS ────────
const REACTION_RED = "#b91c1c";
const REACTION_RED_DARK = "#991b1b";

// Read employer name from URL hash (e.g. #name=Tamar%20Defence%20Engineering).
// Falls back to a generic placeholder if not provided.
function getEmployerName() {
  if (typeof window === "undefined") return "Your Business";
  try {
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const name = params.get("name");
    return name ? decodeURIComponent(name) : "Your Business";
  } catch {
    return "Your Business";
  }
}

// ──────── TYPES ────────
type Applicant = {
  id: string;
  name: string;
  university: string;
  year: string; // "Year 2", "Year 3", "Final year", "Graduate", etc.
  course: string;
  appliedAt: string; // ISO date
  email: string;
  coverLetter: string;
};

type Post = {
  id: string;
  title: string;
  type: string;
  location: string;
  duration?: string;
  salary: string;
  deadline: string;
  posted: string;
  views: number;
  applicants: number;
  status: "Live" | "Closed";
  description: string;
  requirements?: string;
  universities: string[];
  applicationLink?: string;       // External application URL (optional)
  externallyManaged?: boolean;    // If true, applications are on company's own site
  applicantList?: Applicant[];    // Fictional applicant data, only present if internal
};

// ──────── FICTIONAL APPLICANTS ────────
// Realistic-feeling but obviously fictional names + course pairings.
// Pulled into post seeds below so each post has its own list.

const APPLICANT_POOL: Applicant[] = [
  { id: "a01", name: "Maya Patel", university: "Plymouth", year: "Year 3", course: "BSc Computer Science",
    appliedAt: "2026-05-04", email: "maya.p@students.plymouth.ac.uk",
    coverLetter: "I'm a third-year Computer Science student with experience in Python and TypeScript from coursework and a recent personal project. I'd love to bring that to a real engineering team this summer." },
  { id: "a02", name: "Jordan Chen", university: "Plymouth", year: "Year 2", course: "BSc Software Engineering",
    appliedAt: "2026-05-03", email: "j.chen5@students.plymouth.ac.uk",
    coverLetter: "Coming from a software engineering background with internship experience at a local startup last summer. Comfortable with agile workflows and have shipped features end-to-end." },
  { id: "a03", name: "Tomas Hartley", university: "Exeter", year: "Year 3", course: "BSc Mathematics",
    appliedAt: "2026-05-02", email: "t.hartley@students.exeter.ac.uk",
    coverLetter: "Maths student with strong Python skills, particularly in data analysis. Looking to apply quantitative thinking to real engineering problems." },
  { id: "a04", name: "Aisha Banda", university: "Plymouth", year: "Year 2", course: "BSc Computer Science",
    appliedAt: "2026-05-01", email: "a.banda2@students.plymouth.ac.uk",
    coverLetter: "Currently building a side project in TypeScript and Node — would love mentorship from senior engineers and the chance to ship code that actually gets used." },
  { id: "a05", name: "Liam O'Connor", university: "Plymouth", year: "Year 3", course: "BEng Computer Systems",
    appliedAt: "2026-04-30", email: "liam.oc@students.plymouth.ac.uk",
    coverLetter: "Hardware-software interface is my interest — especially networked embedded systems. Looking for a summer placement that blends systems thinking with code." },
  { id: "a06", name: "Priya Shah", university: "Plymouth", year: "Final year", course: "BSc Information Systems",
    appliedAt: "2026-04-29", email: "p.shah@students.plymouth.ac.uk",
    coverLetter: "Final-year project on real-time analytics dashboards. Hoping to translate that experience into a meaningful summer role and develop my engineering skills further." },

  // Marketing / part-time pool
  { id: "a07", name: "Alex Reeves", university: "Plymouth", year: "Year 2", course: "BA Marketing",
    appliedAt: "2026-05-05", email: "a.reeves4@students.plymouth.ac.uk",
    coverLetter: "Marketing student with experience running social channels for our department society — grew our Instagram from 200 to 1,400 followers this year. I'd bring real campaign experience." },
  { id: "a08", name: "Sienna Whitford", university: "Plymouth", year: "Year 3", course: "BA Communications",
    appliedAt: "2026-05-04", email: "s.whitford@students.plymouth.ac.uk",
    coverLetter: "Looking for a part-time role I can fit around my final year. Strong written English, comfortable with Canva, Figma, and basic video editing." },
  { id: "a09", name: "Daniel Park", university: "Plymouth", year: "Year 1", course: "BA English Literature",
    appliedAt: "2026-05-03", email: "d.park2@students.plymouth.ac.uk",
    coverLetter: "Keen writer, looking for a flexible part-time role to develop professional content skills alongside my degree." },
  { id: "a10", name: "Ruby Sutton", university: "Exeter", year: "Year 2", course: "BA Liberal Arts",
    appliedAt: "2026-05-02", email: "r.sutton@students.exeter.ac.uk",
    coverLetter: "Strong interest in brand storytelling. Built a personal Substack (340 subscribers) — would love to apply that voice to a marketing context." },

  // Graduate scheme pool
  { id: "a11", name: "Marcus Etemadi", university: "Plymouth", year: "Final year", course: "BEng Mechanical Engineering",
    appliedAt: "2026-03-08", email: "m.etemadi@students.plymouth.ac.uk",
    coverLetter: "Final-year mechanical engineering student with internship experience in marine engineering at a local firm. Specifically interested in your rotational structure and the path to chartership." },
  { id: "a12", name: "Hana Nakamura", university: "Plymouth", year: "Final year", course: "MEng Marine Engineering",
    appliedAt: "2026-03-05", email: "h.nakamura@students.plymouth.ac.uk",
    coverLetter: "Marine engineering MEng student with my dissertation on hull efficiency simulations. Familiar with the defence sector through my placement year." },
  { id: "a13", name: "Joseph Aldridge", university: "Plymouth", year: "Final year", course: "BEng Electrical Engineering",
    appliedAt: "2026-02-28", email: "j.aldridge@students.plymouth.ac.uk",
    coverLetter: "Electrical engineering background with summer placement at a renewables firm. Eligible for SC clearance through prior MoD-related work experience." },
  { id: "a14", name: "Imogen Reed", university: "Exeter", year: "Final year", course: "BEng Engineering",
    appliedAt: "2026-02-25", email: "i.reed3@students.exeter.ac.uk",
    coverLetter: "Engineering generalist looking for a structured graduate programme that lets me explore disciplines before specialising. Your rotational scheme is exactly what I want." },
  { id: "a15", name: "Sebastian Voigt", university: "Plymouth", year: "Final year", course: "MEng Naval Architecture",
    appliedAt: "2026-02-20", email: "s.voigt@students.plymouth.ac.uk",
    coverLetter: "Naval architecture MEng student. Final project on stability optimisation for service vessels. Specifically interested in defence applications and your Devonport site." },
];

// ──────── MOCK DATA ────────
// "My posts" — pretending the demo employer has already posted these.
// The "applicants" count drives badges; the "applicantList" is the real data
// shown when an employer drills into a post.
const MY_POSTS_SEED: Post[] = [
  {
    id: "mine-1",
    title: "Software Engineering Summer Internship",
    type: "Summer Internship",
    location: "Plymouth · Hybrid",
    duration: "12 weeks (Jun–Sep)",
    salary: "£26,000 pro-rata",
    deadline: "2026-04-30",
    posted: "2026-04-28",
    views: 287,
    applicants: 24,
    status: "Live",
    description:
      "Join our engineering team for a structured 12-week internship. You'll ship real features alongside senior engineers, work in agile sprints, and present your work to leadership at the end of summer.",
    requirements: "Year 2+ Computer Science or related. Confident with at least one of Python, TypeScript, or Java.",
    universities: ["Plymouth", "Exeter"],
    applicantList: APPLICANT_POOL.slice(0, 6),
  },
  {
    id: "mine-2",
    title: "Marketing Assistant — Part-Time",
    type: "Part-time",
    location: "Plymouth city centre",
    duration: "12 hrs/week (term-time)",
    salary: "£12.50/hr",
    deadline: "2026-05-21",
    posted: "2026-05-02",
    views: 142,
    applicants: 11,
    status: "Live",
    description:
      "Support our marketing team with social content, event prep, and campaign analytics. Flexible hours around your timetable.",
    requirements: "Any course. Strong written English. Comfortable with Canva or Figma a plus.",
    universities: ["Plymouth"],
    applicantList: APPLICANT_POOL.slice(6, 10),
  },
  {
    id: "mine-3",
    title: "Graduate Engineering Scheme 2026",
    type: "Graduate Scheme",
    location: "Plymouth · Devonport",
    duration: "2 years rotational",
    salary: "£32,000 + benefits",
    deadline: "2026-03-15",
    posted: "2026-02-12",
    views: 421,
    applicants: 67,
    status: "Closed",
    description:
      "Our flagship graduate scheme: four six-month rotations across mechanical, electrical, marine systems, and project engineering. Mentorship, accreditation pathway, sponsorship for chartership.",
    requirements: "2:1 in Engineering, Physics, or related. Eligibility for SC clearance.",
    universities: ["Plymouth", "Exeter"],
    // This one is externally managed — applications go to the company portal
    externallyManaged: true,
    applicationLink: "https://example.com/careers/graduate-scheme",
  },
];

// "Marketplace" — what other employers have posted, shown for context.
const OTHER_POSTS = [
  {
    id: "other-1",
    employer: "Tamar Marine Yachts",
    title: "Naval Architecture Placement Year",
    type: "Placement Year",
    location: "Plymouth",
    salary: "£21,000",
    deadline: "2026-03-31",
    applicants: 19,
  },
  {
    id: "other-2",
    employer: "Sound Marine Research Institute",
    title: "Research Assistant — Marine Biology",
    type: "Summer Internship",
    location: "Plymouth · Hoe",
    salary: "£23,000 pro-rata",
    deadline: "2026-04-15",
    applicants: 31,
  },
  {
    id: "other-3",
    employer: "West Devon Water Co",
    title: "Environmental Science Graduate",
    type: "Graduate Scheme",
    location: "Exeter",
    salary: "£29,500",
    deadline: "2026-03-28",
    applicants: 42,
  },
  {
    id: "other-4",
    employer: "Devonport Athletic FC",
    title: "Community Programmes Coordinator (PT)",
    type: "Part-time",
    location: "Plymouth · Home Park",
    salary: "£12.00/hr",
    deadline: "2026-05-08",
    applicants: 14,
  },
  {
    id: "other-5",
    employer: "Saltash Innovation Centre",
    title: "Innovation Fellowship",
    type: "Graduate Scheme",
    location: "Plymouth · Derriford",
    salary: "Competitive",
    deadline: "2026-04-22",
    applicants: 8,
  },
];

const POST_TYPES = ["Summer Internship", "Placement Year", "Graduate Scheme", "Part-time", "Volunteering"];
const UNIVERSITIES = ["Plymouth", "Exeter", "Bath", "Bristol", "Cardiff"];

// ──────── HELPER: Smart salary display ────────
// Some salary strings include the £ already ("£12.50/hr", "£26,000"). Some don't
// ("Competitive", "DOE"). And a £ icon shouldn't appear next to non-numeric values
// because it implies a number is coming. This helper decides whether to show the icon.
function shouldShowPoundIcon(salary: string): boolean {
  if (!salary) return false;
  const trimmed = salary.trim();
  // If salary already starts with £ (or contains one early), the icon is redundant
  if (trimmed.startsWith("£")) return false;
  // If the value is text-only ("Competitive", "DOE", "TBC", etc.), icon is misleading
  if (!/\d/.test(trimmed)) return false;
  // Otherwise, salary is something like "26,000 pro-rata" or "12.50/hr" — show icon
  return true;
}

// ──────── ROOT COMPONENT ────────
export default function EmployerDashboard() {
  const employerName = useMemo(() => getEmployerName(), []);
  const [myPosts, setMyPosts] = useState<Post[]>(MY_POSTS_SEED);
  const [showPostModal, setShowPostModal] = useState(false);
  const [recentlyPostedId, setRecentlyPostedId] = useState<string | null>(null);
  // When set, shows the applications view for that post.
  // null = main dashboard.
  const [viewingApplicationsFor, setViewingApplicationsFor] = useState<Post | null>(null);

  const handlePost = (post: Partial<Post>) => {
    const newPost: Post = {
      id: `mine-${Date.now()}`,
      title: post.title || "",
      type: post.type || "Summer Internship",
      location: post.location || "",
      duration: post.duration,
      salary: post.salary || "Competitive",
      deadline: post.deadline || "",
      posted: new Date().toISOString().slice(0, 10),
      views: 0,
      applicants: 0,
      status: "Live",
      description: post.description || "",
      requirements: post.requirements,
      universities: post.universities || ["Plymouth"],
      applicationLink: post.applicationLink,
      externallyManaged: post.externallyManaged,
      // New posts have no applicants yet; for internal posts we start with empty array
      applicantList: post.externallyManaged ? undefined : [],
    };
    setMyPosts([newPost, ...myPosts]);
    setShowPostModal(false);
    setRecentlyPostedId(newPost.id);
    setTimeout(() => setRecentlyPostedId(null), 4500);
  };

  const livePosts = myPosts.filter((p) => p.status === "Live");
  const totalViews = myPosts.reduce((s, p) => s + (p.views ?? 0), 0);
  const totalApplicants = myPosts.reduce((s, p) => s + (p.applicants ?? 0), 0);

  // If we're viewing applications for a specific post, render that screen instead
  if (viewingApplicationsFor) {
    return (
      <ApplicationsView
        post={viewingApplicationsFor}
        employerName={employerName}
        onBack={() => setViewingApplicationsFor(null)}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#fbf7ed", fontFamily: "'Geist', system-ui, sans-serif" }}>
      <Header employerName={employerName} />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Hero CTA panel */}
        <section
          style={{
            background: `linear-gradient(135deg, ${REACTION_RED_DARK} 0%, ${REACTION_RED} 100%)`,
            borderRadius: 20,
            padding: "40px 36px",
            color: "#fff",
            marginBottom: 28,
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -40,
              width: 220,
              height: 220,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: "0.72rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              opacity: 0.85,
              marginBottom: 14,
            }}
          >
            Your employer dashboard
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: "italic",
              fontWeight: 600,
              fontVariationSettings: '"opsz" 144',
              fontSize: "clamp(2rem, 4.5vw, 3.2rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              margin: "0 0 14px",
              maxWidth: "20ch",
            }}
          >
            Post opportunities. Reach students.
          </h1>
          <p style={{ fontSize: "1.05rem", lineHeight: 1.55, opacity: 0.92, maxWidth: "56ch", margin: "0 0 28px" }}>
            Reaction connects local businesses with university students looking for internships, part-time roles, and
            graduate schemes. Post once — reach the universities you've selected.
          </p>
          <button
            onClick={() => setShowPostModal(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#fff",
              color: REACTION_RED,
              padding: "14px 26px",
              borderRadius: 999,
              border: "none",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,0,0,0.18)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.15)";
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            Post a new opportunity
          </button>
        </section>

        {/* Stats strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 32,
          }}
        >
          <StatCard icon={<Briefcase size={18} />} label="Live posts" value={livePosts.length} />
          <StatCard icon={<Eye size={18} />} label="Total views" value={totalViews.toLocaleString()} />
          <StatCard icon={<Users size={18} />} label="Total applicants" value={totalApplicants} />
          <StatCard icon={<TrendingUp size={18} />} label="Avg. response rate" value="8.4%" subtle="↑ 12% vs last month" />
        </div>

        {/* My posts */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader
            title="Your opportunities"
            subtitle={`Posts attributed to ${employerName}`}
            count={myPosts.length}
          />
          <div style={{ display: "grid", gap: 14 }}>
            {myPosts.map((post) => (
              <MyPostCard
                key={post.id}
                post={post}
                highlighted={post.id === recentlyPostedId}
                onReviewApplications={() => setViewingApplicationsFor(post)}
              />
            ))}
          </div>
        </section>

        {/* Marketplace - other employers */}
        <section>
          <SectionHeader
            title="Other opportunities students are seeing"
            subtitle="What else is in the marketplace right now"
            count={OTHER_POSTS.length}
          />
          <div style={{ display: "grid", gap: 10 }}>
            {OTHER_POSTS.map((post) => (
              <OtherPostRow key={post.id} post={post} />
            ))}
          </div>
        </section>

        {/* Demo data disclaimer */}
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(10,9,8,0.06)", textAlign: "center" }}>
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: 0, letterSpacing: "0.04em" }}>
            Sample marketplace data. Posts and employers shown are illustrative.
          </p>
        </div>
      </main>

      {showPostModal && (
        <PostModal onClose={() => setShowPostModal(false)} onPost={handlePost} employerName={employerName} />
      )}
    </div>
  );
}

// ──────── HEADER ────────
function Header({ employerName }: { employerName: string }) {
  return (
    <header
      style={{
        background: "#fff",
        borderBottom: "1px solid rgba(10,9,8,0.08)",
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 24,
        }}
      >
        <a
          href={import.meta.env.BASE_URL}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            textDecoration: "none",
          }}
        >
          <span
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: "italic",
              fontWeight: 600,
              fontVariationSettings: '"opsz" 144',
              fontSize: "1.7rem",
              color: REACTION_RED,
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            Reaction
          </span>
          <span
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: "0.7rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#6b6b6b",
              padding: "3px 9px",
              borderRadius: 999,
              background: "rgba(185,28,28,0.08)",
              border: "1px solid rgba(185,28,28,0.18)",
            }}
          >
            Employer
          </span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.78rem", color: "#6b6b6b", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.06em" }}>
              Signed in as
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#0a0908" }}>{employerName}</div>
          </div>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: REACTION_RED,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "0.95rem",
            }}
          >
            <Building2 size={18} />
          </div>
        </div>
      </div>
    </header>
  );
}

// ──────── SHARED COMPONENTS ────────
function StatCard({ icon, label, value, subtle }: { icon: React.ReactNode; label: string; value: React.ReactNode; subtle?: string }) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(10,9,8,0.08)",
        borderRadius: 14,
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#6b6b6b", marginBottom: 10 }}>
        {icon}
        <span style={{ fontFamily: "'Geist Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div
        style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontWeight: 600,
          fontVariationSettings: '"opsz" 96',
          fontSize: "1.85rem",
          color: "#0a0908",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {subtle && (
        <div style={{ fontSize: "0.75rem", color: "#15803d", marginTop: 6 }}>{subtle}</div>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle, count }: { title: string; subtitle?: string; count?: number }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
      <div>
        <h2
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 600,
            fontVariationSettings: '"opsz" 144',
            fontSize: "1.5rem",
            letterSpacing: "-0.018em",
            margin: "0 0 4px",
            color: "#0a0908",
          }}
        >
          {title}
        </h2>
        {subtitle && <p style={{ fontSize: "0.88rem", color: "#6b6b6b", margin: 0 }}>{subtitle}</p>}
      </div>
      {count !== undefined && (
        <span
          style={{
            fontFamily: "'Geist Mono', monospace",
            fontSize: "0.72rem",
            letterSpacing: "0.1em",
            color: "#6b6b6b",
          }}
        >
          {count} {count === 1 ? "post" : "posts"}
        </span>
      )}
    </div>
  );
}

function MyPostCard({ post, highlighted, onReviewApplications }: { post: Post; highlighted: boolean; onReviewApplications: () => void }) {
  const isLive = post.status === "Live";
  const showIcon = shouldShowPoundIcon(post.salary);
  return (
    <div
      style={{
        background: "#fff",
        border: highlighted ? `2px solid ${REACTION_RED}` : "1px solid rgba(10,9,8,0.1)",
        borderRadius: 14,
        padding: "20px 22px",
        boxShadow: highlighted ? `0 0 0 4px rgba(185,28,28,0.12)` : "none",
        transition: "border 0.3s ease, box-shadow 0.3s ease",
        position: "relative",
      }}
    >
      {highlighted && (
        <div
          style={{
            position: "absolute",
            top: -10,
            left: 18,
            background: REACTION_RED,
            color: "#fff",
            fontSize: "0.68rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            padding: "4px 10px",
            borderRadius: 999,
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Sparkles size={11} strokeWidth={2.5} />
          Just posted
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: REACTION_RED,
                padding: "3px 8px",
                borderRadius: 999,
                background: "rgba(185,28,28,0.08)",
              }}
            >
              {post.type}
            </span>
            <span
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: "0.65rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: isLive ? "#15803d" : "#6b6b6b",
                padding: "3px 8px",
                borderRadius: 999,
                background: isLive ? "rgba(21,128,61,0.08)" : "rgba(107,107,107,0.08)",
                border: `1px solid ${isLive ? "rgba(21,128,61,0.25)" : "rgba(107,107,107,0.2)"}`,
              }}
            >
              {post.status}
            </span>
            {post.externallyManaged && (
              <span
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#0369a1",
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "rgba(3,105,161,0.08)",
                  border: "1px solid rgba(3,105,161,0.2)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <ExternalLink size={10} strokeWidth={2.5} />
                External portal
              </span>
            )}
          </div>
          <h3
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 600,
              fontVariationSettings: '"opsz" 96',
              fontSize: "1.2rem",
              letterSpacing: "-0.012em",
              margin: "0 0 6px",
              color: "#0a0908",
            }}
          >
            {post.title}
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: "0.84rem", color: "#6b6b6b" }}>
            {post.location && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <MapPin size={13} /> {post.location}
              </span>
            )}
            {post.duration && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Clock size={13} /> {post.duration}
              </span>
            )}
            {post.salary && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {showIcon && <PoundSterling size={13} />} {post.salary}
              </span>
            )}
            {post.deadline && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Calendar size={13} /> Apply by {formatDate(post.deadline)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 18, fontSize: "0.85rem", color: "#0a0908", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600 }}>{post.views ?? 0}</div>
            <div style={{ fontSize: "0.7rem", color: "#6b6b6b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Views</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.1rem", fontWeight: 600, color: post.applicants > 0 ? REACTION_RED : "#6b6b6b" }}>{post.applicants ?? 0}</div>
            <div style={{ fontSize: "0.7rem", color: "#6b6b6b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Applicants</div>
          </div>
        </div>
      </div>
      {post.description && (
        <p style={{ fontSize: "0.9rem", lineHeight: 1.55, color: "#3a342d", margin: "10px 0 0", paddingTop: 10, borderTop: "1px solid rgba(10,9,8,0.06)" }}>
          {post.description}
        </p>
      )}
      <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: "0.78rem", color: "#6b6b6b", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.04em" }}>
          {post.universities && <>Visible to: {post.universities.join(" · ")}</>}
        </div>
        {/* Action buttons - differ for externally-managed vs internal */}
        {post.externallyManaged ? (
          post.applicationLink && (
            <a
              href={post.applicationLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.85rem",
                color: "#0369a1",
                textDecoration: "none",
                fontWeight: 500,
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(3,105,161,0.06)",
                border: "1px solid rgba(3,105,161,0.18)",
              }}
            >
              <ExternalLink size={13} strokeWidth={2.5} />
              View on company portal
            </a>
          )
        ) : (
          post.applicants > 0 && (
            <button
              onClick={onReviewApplications}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: "0.85rem",
                color: REACTION_RED,
                background: "rgba(185,28,28,0.06)",
                border: "1px solid rgba(185,28,28,0.18)",
                padding: "6px 12px",
                borderRadius: 8,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <Users size={13} strokeWidth={2.5} />
              Review {post.applicants} application{post.applicants === 1 ? "" : "s"}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function OtherPostRow({ post }: { post: any }) {
  const showIcon = shouldShowPoundIcon(post.salary);
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(10,9,8,0.08)",
        borderRadius: 12,
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 280px", minWidth: 0 }}>
        <div style={{ fontSize: "0.78rem", color: REACTION_RED, fontFamily: "'Geist Mono', monospace", letterSpacing: "0.06em", marginBottom: 4 }}>
          {post.employer}
        </div>
        <div style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontVariationSettings: '"opsz" 96', fontSize: "1rem", color: "#0a0908", marginBottom: 4, letterSpacing: "-0.01em" }}>
          {post.title}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: "0.8rem", color: "#6b6b6b" }}>
          <span>{post.type}</span>
          <span>· {post.location}</span>
          <span>· {showIcon ? <PoundSterling size={11} style={{ display: "inline", verticalAlign: "middle" }} /> : null} {post.salary}</span>
          <span>· Apply by {formatDate(post.deadline)}</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.85rem", color: "#3a342d" }}>
        <Users size={14} />
        {post.applicants}
      </div>
    </div>
  );
}

// ──────── APPLICATIONS VIEW ────────
// Drill-in view for a specific post — shows all applicants with expandable cards.
function ApplicationsView({ post, employerName, onBack }: { post: Post; employerName: string; onBack: () => void }) {
  const applicants = post.applicantList ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#fbf7ed", fontFamily: "'Geist', system-ui, sans-serif" }}>
      <Header employerName={employerName} />

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 80px" }}>
        {/* Back link */}
        <button
          onClick={onBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: "0.88rem",
            color: "#6b6b6b",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "6px 0",
            marginBottom: 20,
          }}
        >
          <ChevronLeft size={16} />
          Back to dashboard
        </button>

        {/* Post summary */}
        <div
          style={{
            background: "#fff",
            border: "1px solid rgba(10,9,8,0.08)",
            borderRadius: 16,
            padding: "24px 28px",
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontFamily: "'Geist Mono', monospace",
              fontSize: "0.7rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: REACTION_RED,
              marginBottom: 8,
            }}
          >
            {post.type} · {post.status}
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontWeight: 600,
              fontVariationSettings: '"opsz" 144',
              fontStyle: "italic",
              fontSize: "1.8rem",
              letterSpacing: "-0.02em",
              margin: "0 0 8px",
              color: "#0a0908",
            }}
          >
            {post.title}
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: "0.85rem", color: "#6b6b6b" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Users size={13} />
              {applicants.length} application{applicants.length === 1 ? "" : "s"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Eye size={13} />
              {post.views} views
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Calendar size={13} />
              Apply by {formatDate(post.deadline)}
            </span>
          </div>
        </div>

        {/* Applicants list */}
        <SectionHeader
          title="Applications"
          subtitle="Click any applicant to expand their cover letter and CV"
          count={applicants.length}
        />

        {applicants.length === 0 ? (
          <div
            style={{
              background: "#fff",
              border: "1px solid rgba(10,9,8,0.08)",
              borderRadius: 14,
              padding: "48px 24px",
              textAlign: "center",
              color: "#6b6b6b",
            }}
          >
            <Users size={28} strokeWidth={1.5} style={{ marginBottom: 12, color: "#9ca3af" }} />
            <p style={{ margin: 0, fontSize: "0.95rem" }}>No applications yet.</p>
            <p style={{ margin: "8px 0 0", fontSize: "0.85rem", color: "#9ca3af" }}>
              Students applying through Reaction will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {applicants.map((a) => (
              <ApplicantCard key={a.id} applicant={a} />
            ))}
          </div>
        )}

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid rgba(10,9,8,0.06)", textAlign: "center" }}>
          <p style={{ fontSize: "0.78rem", color: "#9ca3af", margin: 0, letterSpacing: "0.04em" }}>
            Sample applicant data shown. All applications are illustrative.
          </p>
        </div>
      </main>
    </div>
  );
}

// ──────── APPLICANT CARD (expandable) ────────
function ApplicantCard({ applicant }: { applicant: Applicant }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(10,9,8,0.08)",
        borderRadius: 14,
        overflow: "hidden",
        transition: "border-color 0.15s ease",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          padding: "18px 22px",
          background: "transparent",
          border: "none",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: "1 1 auto", minWidth: 0 }}>
          {/* Avatar with initials */}
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "50%",
              background: `linear-gradient(135deg, ${REACTION_RED} 0%, ${REACTION_RED_DARK} 100%)`,
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 600,
              fontSize: "0.95rem",
              flexShrink: 0,
            }}
          >
            {getInitials(applicant.name)}
          </div>
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontWeight: 600,
                fontVariationSettings: '"opsz" 96',
                fontSize: "1.05rem",
                color: "#0a0908",
                letterSpacing: "-0.012em",
                marginBottom: 2,
              }}
            >
              {applicant.name}
            </div>
            <div style={{ fontSize: "0.82rem", color: "#6b6b6b" }}>
              {applicant.course} · {applicant.year}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#9ca3af", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.04em", marginTop: 2 }}>
              {applicant.university} · Applied {formatDate(applicant.appliedAt)}
            </div>
          </div>
        </div>
        <div style={{ color: "#6b6b6b", flexShrink: 0 }}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {expanded && (
        <div
          style={{
            padding: "0 22px 22px",
            borderTop: "1px solid rgba(10,9,8,0.06)",
            background: "rgba(251,247,237,0.4)",
          }}
        >
          {/* Contact info */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, padding: "16px 0", fontSize: "0.85rem", color: "#3a342d" }}>
            <a
              href={`mailto:${applicant.email}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                color: REACTION_RED,
                textDecoration: "none",
                fontFamily: "'Geist Mono', monospace",
                fontSize: "0.78rem",
                letterSpacing: "0.04em",
              }}
            >
              <Mail size={13} />
              {applicant.email}
            </a>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "#6b6b6b", fontFamily: "'Geist Mono', monospace", fontSize: "0.78rem", letterSpacing: "0.04em" }}>
              <GraduationCap size={13} />
              {applicant.university}
            </span>
          </div>

          {/* Cover letter */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6b6b6b",
                marginBottom: 8,
              }}
            >
              Cover letter
            </div>
            <p
              style={{
                fontSize: "0.92rem",
                lineHeight: 1.6,
                color: "#3a342d",
                margin: 0,
                background: "#fff",
                padding: "14px 16px",
                borderRadius: 10,
                border: "1px solid rgba(10,9,8,0.06)",
              }}
            >
              {applicant.coverLetter}
            </p>
          </div>

          {/* CV placeholder */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: "0.7rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6b6b6b",
                marginBottom: 8,
              }}
            >
              CV / résumé
            </div>
            <a
              href="#"
              onClick={(e) => e.preventDefault()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px dashed rgba(10,9,8,0.16)",
                background: "#fff",
                color: "#3a342d",
                textDecoration: "none",
                fontSize: "0.88rem",
              }}
            >
              <FileText size={14} />
              {applicant.name.replace(/\s/g, "_")}_CV.pdf
              <span style={{ color: "#9ca3af", fontFamily: "'Geist Mono', monospace", fontSize: "0.72rem", letterSpacing: "0.04em" }}>
                · sample
              </span>
            </a>
          </div>

          {/* Action buttons - kept simple per "no status workflow" decision */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 8 }}>
            <a
              href={`mailto:${applicant.email}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 999,
                background: REACTION_RED,
                color: "#fff",
                textDecoration: "none",
                fontSize: "0.85rem",
                fontWeight: 500,
              }}
            >
              <Mail size={13} strokeWidth={2.5} />
              Reply to applicant
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────── POST MODAL ────────
function PostModal({ onClose, onPost, employerName }: { onClose: () => void; onPost: (post: Partial<Post>) => void; employerName: string }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(POST_TYPES[0]);
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [duration, setDuration] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [universities, setUniversities] = useState<string[]>(["Plymouth"]);
  const [applicationLink, setApplicationLink] = useState("");
  const [externallyManaged, setExternallyManaged] = useState(false);

  const canSubmit =
    title.trim().length >= 3 &&
    location.trim() &&
    deadline &&
    // If externally managed, application link is required
    (!externallyManaged || applicationLink.trim().length > 0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onPost({
      title: title.trim(),
      type,
      location: location.trim(),
      salary: salary.trim() || "Competitive",
      duration: duration.trim() || undefined,
      deadline,
      description: description.trim() || `${type} opportunity at ${employerName}.`,
      requirements: requirements.trim() || undefined,
      universities,
      applicationLink: applicationLink.trim() || undefined,
      externallyManaged,
    });
  };

  const toggleUni = (uni: string) => {
    setUniversities((prev) => (prev.includes(uni) ? prev.filter((u) => u !== uni) : [...prev, uni]));
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        overflowY: "auto",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fbf7ed",
          borderRadius: 18,
          padding: 0,
          width: "100%",
          maxWidth: 640,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 30px 80px rgba(0,0,0,0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "28px 32px 22px",
            borderBottom: "1px solid rgba(10,9,8,0.08)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            position: "sticky",
            top: 0,
            background: "#fbf7ed",
            zIndex: 1,
          }}
        >
          <div>
            <div style={{ fontFamily: "'Geist Mono', monospace", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: REACTION_RED, marginBottom: 8 }}>
              New opportunity
            </div>
            <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontWeight: 600, fontVariationSettings: '"opsz" 144', fontStyle: "italic", fontSize: "1.7rem", letterSpacing: "-0.018em", margin: 0, color: "#0a0908" }}>
              Post a new opportunity
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#6b6b6b",
              padding: 6,
              borderRadius: 8,
            }}
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        <form onSubmit={submit} style={{ padding: "24px 32px 32px" }}>
          <Field label="Title" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Software Engineering Summer Internship"
              required
              style={inputStyle}
            />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Type">
              <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
                {POST_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </Field>
            <Field label="Application deadline" required>
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} required style={inputStyle} />
            </Field>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Location" required>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Plymouth · Hybrid"
                required
                style={inputStyle}
              />
            </Field>
            <Field label="Salary / pay">
              <input
                type="text"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="£12.50/hr or £26,000"
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Duration / hours">
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="12 weeks (Jun–Sep) · 12 hrs/week · 2-year scheme"
              style={inputStyle}
            />
          </Field>

          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What the role involves, what students will learn, what makes it interesting."
              style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
            />
          </Field>

          <Field label="Requirements">
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              rows={2}
              placeholder="e.g. Year 2+ Computer Science. No experience needed but enthusiasm essential."
              style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
            />
          </Field>

          {/* Application link section */}
          <div
            style={{
              padding: 14,
              borderRadius: 12,
              background: "rgba(3,105,161,0.04)",
              border: "1px solid rgba(3,105,161,0.14)",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
              <input
                type="checkbox"
                id="externallyManaged"
                checked={externallyManaged}
                onChange={(e) => setExternallyManaged(e.target.checked)}
                style={{ marginTop: 3, accentColor: "#0369a1" }}
              />
              <label htmlFor="externallyManaged" style={{ fontSize: "0.92rem", color: "#0a0908", fontWeight: 500, cursor: "pointer" }}>
                Manage applications externally
                <div style={{ fontSize: "0.82rem", color: "#6b6b6b", fontWeight: 400, marginTop: 2, lineHeight: 1.5 }}>
                  Tick if students should apply through your own careers portal. Otherwise, applications come through Reaction.
                </div>
              </label>
            </div>

            <Field
              label={externallyManaged ? "Application link" : "Application link (optional)"}
              required={externallyManaged}
            >
              <div style={{ position: "relative" }}>
                <LinkIcon
                  size={15}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#9ca3af",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="url"
                  value={applicationLink}
                  onChange={(e) => setApplicationLink(e.target.value)}
                  placeholder="https://yourcompany.com/careers/role-id"
                  style={{ ...inputStyle, paddingLeft: 38 }}
                  required={externallyManaged}
                />
              </div>
              <p style={{ fontSize: "0.78rem", color: "#6b6b6b", margin: "6px 0 0" }}>
                {externallyManaged
                  ? "Students will be sent here to apply."
                  : "If your role has a separate company application page, link it here. Optional."}
              </p>
            </Field>
          </div>

          <Field label="Visible to universities">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {UNIVERSITIES.map((u) => {
                const selected = universities.includes(u);
                return (
                  <button
                    key={u}
                    type="button"
                    onClick={() => toggleUni(u)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: 999,
                      border: selected ? `2px solid ${REACTION_RED}` : "1px solid rgba(10,9,8,0.18)",
                      background: selected ? `rgba(185,28,28,0.08)` : "#fff",
                      color: selected ? REACTION_RED : "#3a342d",
                      fontSize: "0.85rem",
                      fontWeight: 500,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.15s ease",
                    }}
                  >
                    {selected && <Check size={13} strokeWidth={2.5} />}
                    {u}
                  </button>
                );
              })}
            </div>
            <p style={{ fontSize: "0.78rem", color: "#6b6b6b", margin: "8px 0 0" }}>
              Students at the universities you select will see this post in their feed.
            </p>
          </Field>

          <div style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={!canSubmit}
              style={{
                flex: "1 1 auto",
                padding: "14px 22px",
                borderRadius: 999,
                background: canSubmit ? REACTION_RED : "rgba(185,28,28,0.4)",
                color: "#fff",
                border: "none",
                fontSize: "0.95rem",
                fontWeight: 600,
                cursor: canSubmit ? "pointer" : "not-allowed",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <Plus size={16} strokeWidth={2.5} />
              Post opportunity
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "14px 22px",
                borderRadius: 999,
                background: "transparent",
                color: "#3a342d",
                border: "1px solid rgba(10,9,8,0.18)",
                fontSize: "0.95rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          fontFamily: "'Geist Mono', monospace",
          fontSize: "0.7rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#6b6b6b",
          marginBottom: 6,
        }}
      >
        {label}
        {required && <span style={{ color: REACTION_RED, marginLeft: 4 }}>·</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: "1px solid rgba(10,9,8,0.16)",
  background: "#fff",
  fontFamily: "'Geist', sans-serif",
  fontSize: "0.95rem",
  color: "#0a0908",
  outline: "none",
  transition: "border-color 0.15s ease",
};

function formatDate(isoDate: string): string {
  if (!isoDate) return "";
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return isoDate;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");
}
