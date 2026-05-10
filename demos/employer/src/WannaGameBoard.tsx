// Employer Dashboard Demo
// Purpose-built employer-facing view of Reaction. Shows what posting opportunities
// looks like from an employer's perspective — distinct from the student-facing app.
//
// This is a sales demo, not a real product. Posts created via the modal are stored
// in React state only and disappear on refresh. Real implementation is Part B.

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
} from "lucide-react";

// ──────── BRAND CONSTANTS ────────
const REACTION_RED = "#b91c1c";
const REACTION_RED_DARK = "#991b1b";
const CREST_SRC = import.meta.env.BASE_URL + "crest.png";

// Read employer name from URL hash (e.g. #name=Tamar Defence%20International).
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

// ──────── MOCK DATA ────────
// "My posts" — pretending the demo employer has already posted these.
// Mix of types showcases the system supports varied opportunities.
const MY_POSTS_SEED = [
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
  },
];

// "Marketplace" — what other employers have posted, shown for context so the
// demo feels alive (not just one company shouting into the void).
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
    salary: "£27,000",
    deadline: "2026-04-22",
    applicants: 8,
  },
];

const POST_TYPES = ["Summer Internship", "Placement Year", "Graduate Scheme", "Part-time", "Volunteering"];
const UNIVERSITIES = ["Plymouth", "Exeter", "Bath", "Bristol", "Cardiff"];

// ──────── ROOT COMPONENT ────────
export default function EmployerDashboard() {
  const employerName = useMemo(() => getEmployerName(), []);
  // Posts I've posted — starts with seed, grows as user "creates" new ones in this session
  const [myPosts, setMyPosts] = useState(MY_POSTS_SEED);
  const [showPostModal, setShowPostModal] = useState(false);
  const [recentlyPostedId, setRecentlyPostedId] = useState<string | null>(null);

  const handlePost = (post: any) => {
    const newPost = {
      ...post,
      id: `mine-${Date.now()}`,
      posted: new Date().toISOString().slice(0, 10),
      views: 0,
      applicants: 0,
      status: "Live",
    };
    setMyPosts([newPost, ...myPosts]);
    setShowPostModal(false);
    setRecentlyPostedId(newPost.id);
    // Auto-clear the highlight after a few seconds so subsequent posts feel right
    setTimeout(() => setRecentlyPostedId(null), 4500);
  };

  const livePosts = myPosts.filter((p) => p.status === "Live");
  const totalViews = myPosts.reduce((s, p) => s + (p.views ?? 0), 0);
  const totalApplicants = myPosts.reduce((s, p) => s + (p.applicants ?? 0), 0);

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
              <MyPostCard key={post.id} post={post} highlighted={post.id === recentlyPostedId} />
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

function MyPostCard({ post, highlighted }: { post: any; highlighted: boolean }) {
  const isLive = post.status === "Live";
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
                <PoundSterling size={13} /> {post.salary}
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
      {post.universities && (
        <div style={{ marginTop: 12, fontSize: "0.78rem", color: "#6b6b6b", fontFamily: "'Geist Mono', monospace", letterSpacing: "0.04em" }}>
          Visible to: {post.universities.join(" · ")}
        </div>
      )}
    </div>
  );
}

function OtherPostRow({ post }: { post: any }) {
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
          <span>· {post.salary}</span>
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

// ──────── POST MODAL ────────
function PostModal({ onClose, onPost, employerName }: { onClose: () => void; onPost: (post: any) => void; employerName: string }) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState(POST_TYPES[0]);
  const [location, setLocation] = useState("");
  const [salary, setSalary] = useState("");
  const [duration, setDuration] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [universities, setUniversities] = useState<string[]>(["Plymouth"]);

  const canSubmit = title.trim().length >= 3 && location.trim() && deadline;

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
