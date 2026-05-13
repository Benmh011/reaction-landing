import { useState } from "react";
import { User, Calendar, MapPin, Trophy, ChevronDown, ArrowLeft, BarChart3, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

const CREST_SRC = import.meta.env.BASE_URL + 'crest.png';

// ──── ACTIVITY CONFIG ────
const CATEGORIES = {
  'Sport': {
    activities: {
      'Basketball': { mode: 'team', defaultPerTeam: 5 },
      'Football':   { mode: 'team', defaultPerTeam: 5 },
      'Tennis':     { mode: '1v1' },
      'Volleyball': { mode: 'team', defaultPerTeam: 6 },
      'Rugby':      { mode: 'team', defaultPerTeam: 7 },
      'Badminton':  { mode: '1v1' },
      'Cricket':    { mode: 'team', defaultPerTeam: 11 },
    },
    color: 'blue',
    tagline: (a) => `Wanna play ${a}?`,
  },
  'Study': {
    activities: {
      'Group Revision':  { mode: 'group', defaultPerTeam: 6 },
      'Lab Partner':     { mode: '1v1' },
      'Lecture Buddy':   { mode: '1v1' },
      'Project Group':   { mode: 'group', defaultPerTeam: 4 },
      'Dissertation Help': { mode: 'group', defaultPerTeam: 3 },
      'Exam Prep':       { mode: 'group', defaultPerTeam: 5 },
      'Writing Café':    { mode: 'group', defaultPerTeam: 6 },
    },
    color: 'amber',
    tagline: (a) => `Looking for ${a}?`,
  },
  'Board Games': {
    activities: {
      'Chess':           { mode: '1v1' },
      'Monopoly':        { mode: 'group', defaultPerTeam: 4 },
      'Catan':           { mode: 'group', defaultPerTeam: 4 },
      'Risk':            { mode: 'group', defaultPerTeam: 5 },
      'Scrabble':        { mode: 'group', defaultPerTeam: 4 },
      'Poker':           { mode: 'group', defaultPerTeam: 6 },
      'Dungeons & Dragons': { mode: 'group', defaultPerTeam: 5 },
    },
    color: 'purple',
    tagline: (a) => `Wanna play ${a}?`,
  },
  'Opportunities': {
    activities: {
      'Part Time Vacancies':  { mode: 'group', defaultPerTeam: 10 },
      'Summer Internships':   { mode: 'group', defaultPerTeam: 10 },
      'Graduate Schemes':     { mode: 'group', defaultPerTeam: 10 },
    },
    color: 'emerald',
    tagline: (a) => `Interested in ${a}?`,
  },
  'Community': {
    activities: {
      'Volunteering':     { mode: 'group', defaultPerTeam: 15 },
      'Social Events':    { mode: 'group', defaultPerTeam: 20 },
      'Fundraising':      { mode: 'group', defaultPerTeam: 10 },
      'Campaigns':        { mode: 'group', defaultPerTeam: 15 },
    },
    color: 'rose',
    tagline: (a) => `Get involved in ${a}!`,
  },
};
const CATEGORY_NAMES = Object.keys(CATEGORIES);

// Landing page sections → which categories each section covers
const LANDING_SECTIONS = [
  { key: 'activities', label: 'Campus', categories: ['Sport', 'Study', 'Board Games'], description: 'Find people to play sport, study together, or join a board game — all on campus.', gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 100%)', accent: '#c5a13b' },
  { key: 'community', label: 'Community', categories: ['Community'], description: 'Volunteering, socials, fundraising, and campaigns — make a difference together.', gradient: 'linear-gradient(135deg, #881337 0%, #be123c 100%)', accent: '#fb7185' },
  { key: 'opportunities', label: 'Opportunities', categories: ['Opportunities'], description: 'Part-time jobs, summer internships, and graduate schemes — your next step starts here.', gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)', accent: '#34d399' },
];

// ──── UPSU SOCIETIES (real Plymouth societies) ────
const UPSU_SOCIETIES = [
  // ── SPORTS CLUBS (each tied to one sport) ──
  'Basketball Club',
  'Football Club',
  'Rugby Union Club',
  'Tennis Club',
  'Badminton Club',
  'Cricket Club',
  'Volleyball Club',
  // ── BOARD GAME / TABLETOP SOCIETIES ──
  'Chess Society',
  'Tabletop Gaming Society',
  'Poker Society',
  // ── ACADEMIC SOCIETIES ──
  'Architecture Society (PARCS)',
  'Biomedical Science Society',
  'Civil Engineering Society',
  'Computing Society',
  'Geography Society',
  'Law Society (UPLS)',
  'Marine Biology Society',
  'Nursing Society',
  'Psychology Society',
  'Robotics Society',
  // ── GENERAL INTEREST / CULTURAL / WELFARE ──
  'Drama Society',
  'Music Society',
  'Photography Society',
  'Christian Union (UPCU)',
  'Environmental Society',
  'Gaming Society',
  'Plymouth Night Patrol',
];

// ──── SOCIETY → ACTIVITIES MAP ────
// Each society maps to the specific activities they can legitimately post.
// Community activities (Volunteering, Fundraising, Social Events, Campaigns)
// are always allowed for ALL societies via the union below — no need to list.
// Study posts are NOT society-led — they come from individual students.
// Sport posts: only the sport-specific club can post that sport.
// Board Games: chess only for Chess Society; Tabletop covers the multi-player games.
const SOCIETY_ACTIVITIES = {
  // Sports clubs
  'Basketball Club':         ['Basketball'],
  'Football Club':           ['Football'],
  'Rugby Union Club':        ['Rugby'],
  'Tennis Club':             ['Tennis'],
  'Badminton Club':          ['Badminton'],
  'Cricket Club':            ['Cricket'],
  'Volleyball Club':         ['Volleyball'],
  // Board game societies
  'Chess Society':           ['Chess'],
  'Tabletop Gaming Society': ['Catan', 'Risk', 'Monopoly', 'Scrabble', 'Dungeons & Dragons'],
  'Poker Society':           ['Poker'],
  // Academic + general societies — Community only (handled below)
  'Architecture Society (PARCS)': [],
  'Biomedical Science Society':   [],
  'Civil Engineering Society':    [],
  'Computing Society':            [],
  'Geography Society':            [],
  'Law Society (UPLS)':           [],
  'Marine Biology Society':       [],
  'Nursing Society':              [],
  'Psychology Society':           [],
  'Robotics Society':             [],
  'Drama Society':                [],
  'Music Society':                [],
  'Photography Society':          [],
  'Christian Union (UPCU)':       [],
  'Environmental Society':        [],
  'Gaming Society':               [],
  'Plymouth Night Patrol':        [],
};

// Community activities are universal — any society can post them.
const COMMUNITY_ACTIVITIES = ['Volunteering', 'Social Events', 'Fundraising', 'Campaigns'];

// Helper: which activities a society can post in a given category
// - For Community → always all 4 community activities
// - For other categories → only their specific listed activities
// - Study category → always empty (students-only)
function activitiesForSocietyInCategory(society, category) {
  if (category === 'Study') return [];
  if (category === 'Community') return COMMUNITY_ACTIVITIES;
  const specific = SOCIETY_ACTIVITIES[society] || [];
  // Filter to only the activities that actually exist in this category
  const validInCat = Object.keys(CATEGORIES[category]?.activities || {});
  return specific.filter(a => validInCat.includes(a));
}

// Helper: which societies are eligible to post in a given category
// (i.e. they have at least one valid activity available)
function societiesForCategory(category) {
  if (category === 'Study') return [];
  if (category === 'Community') return UPSU_SOCIETIES; // any society can do community
  return UPSU_SOCIETIES.filter(s => activitiesForSocietyInCategory(s, category).length > 0);
}

// Helper: when a society is posting, build their full activity dropdown.
// Each native activity ALSO gets a 'Taster Session' variant which uses group
// mode regardless of the parent activity's mode. Display label: 'Tennis — Taster Session'
function activityOptionsForPoster(category, postedBy, society) {
  const allActivities = Object.keys(CATEGORIES[category]?.activities || {});
  if (postedBy !== 'Societies') return allActivities.map(a => ({ value: a, label: a, isTaster: false }));
  // Society poster — restrict to their activities + add taster variants
  const allowed = activitiesForSocietyInCategory(society, category);
  const out = [];
  for (const a of allowed) {
    out.push({ value: a, label: a, isTaster: false });
    // Taster sessions only make sense for Sport + Board Games — not Community
    if (category === 'Sport' || category === 'Board Games') {
      out.push({ value: `${a} (Taster Session)`, label: `${a} — Taster Session`, isTaster: true, parentActivity: a });
    }
  }
  return out;
}

const getCategoryColor = (cat) => {
  const c = CATEGORIES[cat]?.color || 'blue';
  return { bg: `bg-${c}-50`, text: `text-${c}-700`, border: `border-${c}-100` };
};
const getActivityConfig = (cat, activity) => {
  return CATEGORIES[cat]?.activities?.[activity] || { mode: 'group', defaultPerTeam: 4 };
};
const getTagline = (cat, activity) => {
  return CATEGORIES[cat]?.tagline?.(activity) || `Wanna do ${activity}?`;
};

// ──── ANALYTICS DATA (TEF / NSS / OfS B3 / Access & Participation) ────

// 1. PLATFORM ENGAGEMENT — feeds evidence for NSS "Student Voice" (Q22–Q25) and TEF Student Experience aspect
const MONTHLY_ENGAGEMENT = [
  { month: 'Sep', activeUsers: 142, sessions: 86, newConnections: 64 },
  { month: 'Oct', activeUsers: 218, sessions: 157, newConnections: 112 },
  { month: 'Nov', activeUsers: 287, sessions: 231, newConnections: 148 },
  { month: 'Dec', activeUsers: 194, sessions: 138, newConnections: 87 },
  { month: 'Jan', activeUsers: 312, sessions: 274, newConnections: 183 },
  { month: 'Feb', activeUsers: 298, sessions: 256, newConnections: 171 },
];

// 2. CATEGORY BREAKDOWN — evidence of breadth for TEF "Educational Gains" narrative
const CATEGORY_ENGAGEMENT = [
  { category: 'Sport', sessions: 487, participants: 312 },
  { category: 'Study', sessions: 356, participants: 248 },
  { category: 'Board Games', sessions: 299, participants: 201 },
];

// 3. INTERNATIONAL STUDENT ENGAGEMENT — Strategy 2030 internationalisation & OfS A&P Plan reporting
const PARTICIPATION_BY_ORIGIN = [
  { group: 'UK (Home)', users: 286, pctOfCohort: 68, pctOnApp: 63 },
  { group: 'China', users: 52, pctOfCohort: 10, pctOnApp: 12 },
  { group: 'India', users: 38, pctOfCohort: 7, pctOnApp: 8 },
  { group: 'Nigeria', users: 28, pctOfCohort: 5, pctOnApp: 6 },
  { group: 'EU', users: 24, pctOfCohort: 5, pctOnApp: 5 },
  { group: 'Other Intl.', users: 23, pctOfCohort: 5, pctOnApp: 6 },
];

// 4. SOCIAL ENGAGEMENT PATTERNS — behavioural data observable within Reaction only
//    "Active" = 1+ sessions in the past 14 days. "Declining" = previously active, now <1 session in 21+ days.
//    This is NOT a continuation measure — it is a proxy engagement signal that may supplement institutional data.
const ENGAGEMENT_TREND_DATA = [
  { month: 'Sep', active: 142, declining: 0 },
  { month: 'Oct', active: 204, declining: 14 },
  { month: 'Nov', active: 261, declining: 26 },
  { month: 'Dec', active: 172, declining: 22 },
  { month: 'Jan', active: 289, declining: 23 },
  { month: 'Feb', active: 278, declining: 20 },
];

// 5. SU SENSE OF BELONGING — NSS Optional Bank B2.1: "The SU had a positive impact on my sense of belonging"
//    Tracked via in-app survey using same Likert scale; self-reported, not an official NSS score
const BELONGING_TREND = [
  { month: 'Sep', appUsers: 3.2, nonUsers: 3.0 },
  { month: 'Oct', appUsers: 3.6, nonUsers: 3.0 },
  { month: 'Nov', appUsers: 3.9, nonUsers: 3.1 },
  { month: 'Dec', appUsers: 3.8, nonUsers: 3.0 },
  { month: 'Jan', appUsers: 4.1, nonUsers: 3.1 },
  { month: 'Feb', appUsers: 4.2, nonUsers: 3.1 },
];

// 6. CROSS-GROUP INTERACTION — evidence for OfS A&P Plan: students connecting across home/international cohorts
const CROSS_GROUP = [
  { month: 'Sep', sameGroup: 62, crossGroup: 24 },
  { month: 'Oct', sameGroup: 91, crossGroup: 66 },
  { month: 'Nov', sameGroup: 108, crossGroup: 123 },
  { month: 'Dec', sameGroup: 64, crossGroup: 74 },
  { month: 'Jan', sameGroup: 118, crossGroup: 156 },
  { month: 'Feb', sameGroup: 112, crossGroup: 144 },
];

// 7. YEAR GROUP & COMMUTER vs CAMPUS — OfS Access & Participation Plan metrics
const YEAR_GROUP_ENGAGEMENT = [
  { year: 'Year 1', users: 186, pctEngaged: 68, color: '#1e3a5f' },
  { year: 'Year 2', users: 124, pctEngaged: 51, color: '#2a5a8f' },
  { year: 'Year 3', users: 78, pctEngaged: 37, color: '#c5a13b' },
  { year: 'Postgrad', users: 63, pctEngaged: 42, color: '#6b4c8a' },
];

const COMMUTER_VS_CAMPUS = [
  { name: 'On-campus', value: 298, color: '#1e3a5f' },
  { name: 'Commuter', value: 153, color: '#c5a13b' },
];
const COMMUTER_DETAIL = {
  onCampus: { belonging: 4.3, avgSessions: 3.1, weeklyStreak: 6.2, topActivity: 'Sport' },
  commuter: { belonging: 3.6, avgSessions: 1.8, weeklyStreak: 3.1, topActivity: 'Study' },
};


// 8. COMMUNITY MONTHLY ENGAGEMENT — civic-engagement reporting + Strategy 2030
const COMMUNITY_MONTHLY = [
  { month: 'Sep', volunteers: 38, hours: 96, events: 6 },
  { month: 'Oct', volunteers: 64, hours: 184, events: 12 },
  { month: 'Nov', volunteers: 87, hours: 246, events: 16 },
  { month: 'Dec', volunteers: 52, hours: 142, events: 8 },
  { month: 'Jan', volunteers: 92, hours: 286, events: 14 },
  { month: 'Feb', volunteers: 98, hours: 312, events: 17 },
];

// 9. COMMUNITY ACTIVITY TYPE BREAKDOWN — matches Community activities in app
const COMMUNITY_ACTIVITY_BREAKDOWN = [
  { activity: 'Volunteering', sessions: 187, participants: 124 },
  { activity: 'Social Events', sessions: 94, participants: 218 },
  { activity: 'Fundraising', sessions: 56, participants: 89 },
  { activity: 'Campaigns', sessions: 42, participants: 67 },
];

// 10. CAUSE AREA DISTRIBUTION — UN Sustainable Development Goals alignment where applicable
const COMMUNITY_CAUSE_BREAKDOWN = [
  { cause: 'Mental Health', volunteers: 52, hours: 186, color: '#be123c' },
  { cause: 'Environment', volunteers: 48, hours: 152, color: '#059669' },
  { cause: 'Education & Youth', volunteers: 41, hours: 168, color: '#2563eb' },
  { cause: 'Homelessness', volunteers: 29, hours: 124, color: '#7c3aed' },
  { cause: 'Animal Welfare', volunteers: 24, hours: 76, color: '#f59e0b' },
  { cause: 'Older People', volunteers: 22, hours: 84, color: '#0891b2' },
  { cause: 'Refugees', volunteers: 18, hours: 68, color: '#9333ea' },
];

// 11. TOP PARTNER ORGANISATIONS — anchor case studies for civic-engagement reporting
const COMMUNITY_TOP_PARTNERS = [
  { name: 'Devonport Community Trust', sector: 'Sport for All',  volunteers: 28, hours: 124 },
  { name: "Plymouth Outreach Network",                sector: 'Homelessness',   volunteers: 22, hours:  96 },
  { name: 'Devon Nature Trust',        sector: 'Environment',    volunteers: 19, hours:  78 },
  { name: 'Tamar Energy Cooperative',     sector: 'Sustainability', volunteers: 16, hours:  64 },
  { name: 'Westcountry Care Network',                  sector: 'Mental Health',  volunteers: 15, hours:  62 },
  { name: 'Plymouth Elder Connect',               sector: 'Older People',   volunteers: 14, hours:  58 },
];

// 12. SOCIAL VALUE — using ONS estimate ~£17.50/hr for skilled volunteer time
//     (HM Treasury Green Book methodology; for full Social Cost-Benefit Analysis,
//      additional outcome data would be required.)
const COMMUNITY_SOCIAL_VALUE = {
  totalHours: 1266,
  hourlyValue: 17.50,
  totalValue: 22155,
  partnerOrgs: 24,
  activeStudents: 217,
};

// ──── OPPORTUNITIES ANALYTICS DATA ────
// (Graduate Outcomes Survey-aligned + TEF Student Outcomes aspect)

// 13. OPPS MONTHLY ENGAGEMENT
const OPPS_MONTHLY = [
  { month: 'Sep', activeUsers:  86, posts: 24, applications: 142 },
  { month: 'Oct', activeUsers: 142, posts: 38, applications: 286 },
  { month: 'Nov', activeUsers: 198, posts: 52, applications: 412 },
  { month: 'Dec', activeUsers: 124, posts: 28, applications: 198 },
  { month: 'Jan', activeUsers: 246, posts: 64, applications: 524 },
  { month: 'Feb', activeUsers: 268, posts: 71, applications: 558 },
];

// 14. APPLICATION FUNNEL — view → save → apply → interview → offer
const OPPS_FUNNEL = [
  { stage: 'Posts Viewed', count: 4280, color: '#1e3a5f' },
  { stage: 'Posts Saved',  count: 1248, color: '#a88830' },
  { stage: 'Applied',      count:  486, color: '#10b981' },
  { stage: 'Interviewed',  count:  142, color: '#34d399' },
  { stage: 'Offered',      count:   48, color: '#6ee7b7' },
];

// 15. POSTS BY TYPE — matches Opportunities activities in app
const OPPS_BY_TYPE = [
  { type: 'Part-Time Vacancies', posts: 64, applications: 312, color: '#1e3a5f' },
  { type: 'Summer Internships',  posts: 42, applications: 286, color: '#059669' },
  { type: 'Graduate Schemes',    posts: 28, applications: 198, color: '#10b981' },
];

// 16. SECTOR BREAKDOWN
const OPPS_BY_SECTOR = [
  { sector: 'Tech & Engineering',     posts: 28, applications: 218 },
  { sector: 'Finance & Consulting',   posts: 22, applications: 186 },
  { sector: 'Hospitality & Retail',   posts: 38, applications: 162 },
  { sector: 'Sciences & Healthcare',  posts: 18, applications: 124 },
  { sector: 'Creative & Media',       posts: 14, applications:  86 },
  { sector: 'Public Sector',          posts: 14, applications:  64 },
];

// 17. TOP EMPLOYERS — most active recruiters
const OPPS_TOP_EMPLOYERS = [
  { name: 'Sound Marine Research Institute',           sector: 'Climate Science', posts: 8, applications: 96 },
  { name: 'Westbridge Banking Group', sector: 'Finance',         posts: 5, applications: 84 },
  { name: 'Tamar Defence Engineering',           sector: 'Energy',          posts: 6, applications: 72 },
  { name: 'Saltash Innovation Centre',  sector: 'Sciences',        posts: 6, applications: 62 },
  { name: 'Plymouth City Council', sector: 'Public Sector',   posts: 7, applications: 48 },
  { name: 'Tamar Marine Yachts',         sector: 'Utilities',       posts: 4, applications: 38 },
];

// 18. OPPS ENGAGEMENT BY YEAR — careers-engagement curve
const OPPS_BY_YEAR = [
  { year: 'Year 1',    users:  38, topInterest: 'Part-Time',         color: '#1e3a5f' },
  { year: 'Year 2',    users:  86, topInterest: 'Summer Internships', color: '#059669' },
  { year: 'Year 3',    users: 124, topInterest: 'Graduate Schemes',  color: '#10b981' },
  { year: 'Postgrad',  users:  38, topInterest: 'Graduate Schemes',  color: '#34d399' },
];


// ──── ANALYTICS DASHBOARD ────
const INSIGHTS_CATEGORIES = {
  campus: {
    label: 'Campus',
    short: 'Sport · Study · Board Games',
    accent: '#c5a13b',
    accentLight: 'rgba(197,161,59,0.08)',
    gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 60%, #1e3a5f 100%)',
    contextLine: 'Academic Year 2025/26 · TEF Gold (2023–27) · NSS Positivity · A&P Plan',
    tabs: [
      { id: 'overview',      label: 'Overview' },
      { id: 'gains',         label: 'Educational Gains' },
      { id: 'belonging',     label: 'NSS & Belonging' },
      { id: 'participation', label: 'Access & Participation' },
      { id: 'retention',     label: 'Social Engagement' },
    ],
  },
  community: {
    label: 'Community',
    short: 'Volunteering · Socials · Fundraising · Campaigns',
    accent: '#fb7185',
    accentLight: 'rgba(251,113,133,0.08)',
    gradient: 'linear-gradient(135deg, #881337 0%, #be123c 60%, #881337 100%)',
    contextLine: 'Civic engagement · Strategy 2030 sustainability & civic targets · TEF Educational Gains',
    tabs: [
      { id: 'overview',     label: 'Overview' },
      { id: 'social-value', label: 'Social Value' },
      { id: 'causes',       label: 'Cause Areas' },
      { id: 'partners',     label: 'Partners' },
    ],
  },
  opportunities: {
    label: 'Opportunities',
    short: 'Part-Time · Internships · Grad Schemes',
    accent: '#34d399',
    accentLight: 'rgba(52,211,153,0.08)',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 60%, #064e3b 100%)',
    contextLine: 'Graduate Outcomes Survey · TEF Student Outcomes · Strategy 2030 employability',
    tabs: [
      { id: 'overview',  label: 'Overview' },
      { id: 'funnel',    label: 'Application Funnel' },
      { id: 'sectors',   label: 'Sectors & Types' },
      { id: 'employers', label: 'Employers' },
    ],
  },
};

const AnalyticsDashboard = ({ onBack, checkedIn = {}, reflections = {}, outcomes = {}, posts = [] }) => {
  // ── campus stats ──
  const totalUsers = 451;
  const totalSessions = MONTHLY_ENGAGEMENT.reduce((s, m) => s + m.sessions, 0);
  const avgBelonging = BELONGING_TREND[BELONGING_TREND.length - 1].appUsers;
  const crossGroupPct = Math.round((CROSS_GROUP.reduce((s,m) => s + m.crossGroup, 0) / (CROSS_GROUP.reduce((s,m) => s + m.crossGroup + m.sameGroup, 0))) * 100);
  const activePct = Math.round((ENGAGEMENT_TREND_DATA[ENGAGEMENT_TREND_DATA.length-1].active / (ENGAGEMENT_TREND_DATA[ENGAGEMENT_TREND_DATA.length-1].active + ENGAGEMENT_TREND_DATA[ENGAGEMENT_TREND_DATA.length-1].declining)) * 100);

  // ── CAPTURED OUTCOME STATS (TEF SO4–SO6 evidence) ──
  // Flatten captured reflections into a single list of records
  const reflectionRecords = Object.entries(reflections).flatMap(([postId, byUser]) =>
    Object.entries(byUser).map(([user, data]) => ({ postId: Number(postId), user, ...data }))
  );
  const outcomeRecords = Object.entries(outcomes).flatMap(([postId, byUser]) =>
    Object.entries(byUser).map(([user, data]) => ({ postId: Number(postId), user, ...data }))
  );
  const totalCheckIns = Object.values(checkedIn).reduce((sum, arr) => sum + arr.length, 0);
  const totalReflections = reflectionRecords.length;
  const avg = (nums) => nums.length ? (nums.reduce((a,b)=>a+b,0) / nums.length) : 0;
  const reflBelonging = avg(reflectionRecords.map(r => r.belonging || 0).filter(Boolean));
  const reflLearned   = avg(reflectionRecords.map(r => r.learned || 0).filter(Boolean));
  const reflConnection = avg(reflectionRecords.map(r => r.connection || 0).filter(Boolean));
  // SO4 articulation: % of reflections where the student typed something in "oneThing"
  const so4Articulation = totalReflections === 0 ? 0
    : Math.round((reflectionRecords.filter(r => (r.oneThing || '').trim().length > 0).length / totalReflections) * 100);
  // Outcome funnel from captured data
  const outcomeFunnel = {
    applied: outcomeRecords.length,
    interviewed: outcomeRecords.filter(r => ['interviewed','offered','accepted'].includes(r.status)).length,
    offered: outcomeRecords.filter(r => ['offered','accepted'].includes(r.status)).length,
    accepted: outcomeRecords.filter(r => r.status === 'accepted').length,
  };

  // ── community stats ──
  const communityActiveVolunteers = COMMUNITY_MONTHLY[COMMUNITY_MONTHLY.length-1].volunteers;
  const communityTotalHours = COMMUNITY_MONTHLY.reduce((s, m) => s + m.hours, 0);
  const communityEventCount = COMMUNITY_MONTHLY.reduce((s, m) => s + m.events, 0);

  // ── opportunities stats ──
  const oppsActiveUsers = OPPS_MONTHLY[OPPS_MONTHLY.length-1].activeUsers;
  const oppsTotalApps = OPPS_MONTHLY.reduce((s, m) => s + m.applications, 0);
  const oppsTotalPosts = OPPS_MONTHLY.reduce((s, m) => s + m.posts, 0);
  const oppsAppToInterviewPct = Math.round((OPPS_FUNNEL[3].count / OPPS_FUNNEL[2].count) * 100);
  const oppsInterviewToOfferPct = Math.round((OPPS_FUNNEL[4].count / OPPS_FUNNEL[3].count) * 100);
  const oppsViewToApplyPct = Math.round((OPPS_FUNNEL[2].count / OPPS_FUNNEL[0].count) * 100);

  const [activeCategory, setActiveCategory] = useState('campus');
  const [activeTab, setActiveTab] = useState('overview');
  const cat = INSIGHTS_CATEGORIES[activeCategory];

  const switchCategory = (id) => {
    setActiveCategory(id);
    setActiveTab(INSIGHTS_CATEGORIES[id].tabs[0].id);
  };

  const tagColor = (text) => ({ NSS:'#c5a13b', TEF:'#1e3a5f', 'A&P':'#6b4c8a', GOS:'#059669', CIVIC:'#be123c' }[text] || '#1e3a5f');

  const statCard = (label, value, sub, accent, tag) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 relative overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `3px solid ${tag ? tagColor(tag.text) : (accent || '#1e3a5f')}` }}>
      {tag && <div className="absolute top-0 right-0 px-2 py-0.5 text-xs font-bold rounded-bl-lg text-white" style={{ background: tagColor(tag.text) }}>{tag.text}</div>}
      <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: '#8a8a8a' }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color: '#1e3a5f' }}>{value}</div>
      <div className="text-xs text-gray-400 mt-1">{sub}</div>
    </div>
  );

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #f0f2f5 0%, #e8ecf1 50%, #f5f0e8 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-2 font-semibold mb-6 transition-colors text-sm" style={{ color: '#1e3a5f' }}><ArrowLeft className="w-4 h-4" /> Back to Board</button>

        {/* Dashboard header — gradient changes per category */}
        <div className="rounded-xl overflow-hidden mb-4" style={{ background: cat.gradient }}>
          <div className="p-5">
            <h1 className="text-xl font-bold text-white tracking-tight">University Insights Dashboard</h1>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{cat.contextLine}</p>
          </div>
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${cat.accent} 0%, white 50%, ${cat.accent} 100%)` }} />
        </div>

        {/* CATEGORY SELECTOR — three pill buttons */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {Object.entries(INSIGHTS_CATEGORIES).map(([id, c]) => {
            const isActive = activeCategory === id;
            return (
              <button key={id} onClick={() => switchCategory(id)} className="rounded-xl p-4 text-left transition-all" style={{ background: isActive ? c.gradient : 'white', border: isActive ? '1px solid transparent' : '1px solid rgba(0,0,0,0.06)', boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)', cursor: 'pointer' }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: isActive ? c.accent : '#9ca3af' }}>Insights</div>
                <div className="text-base font-bold" style={{ color: isActive ? 'white' : '#1e3a5f' }}>{c.label}</div>
                <div className="text-xs mt-1" style={{ color: isActive ? 'rgba(255,255,255,0.7)' : '#9ca3af' }}>{c.short}</div>
              </button>
            );
          })}
        </div>

        {/* Tabs — change based on active category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div style={{ display: 'flex', width: '100%' }}>
            {cat.tabs.map((t, i) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className="text-xs font-semibold py-3 transition-all" style={{ flex: 1, textAlign: 'center', color: activeTab === t.id ? '#1e3a5f' : '#9ca3af', borderBottom: activeTab === t.id ? `2px solid ${cat.accent}` : '2px solid transparent', borderRight: i < cat.tabs.length - 1 ? '1px solid rgba(30,58,95,0.06)' : 'none', background: activeTab === t.id ? cat.accentLight : 'transparent' }}>{t.label}</button>
            ))}
          </div>
        </div>

        {/* ════════════════════ CAMPUS — OVERVIEW ════════════════════ */}
        {activeCategory === 'campus' && activeTab === 'overview' && (<>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCard('Active Users', totalUsers, 'unique students engaged this year', null, {text:'NSS'})}
            {statCard('Total Sessions', totalSessions, 'peer activities attended', null, {text:'TEF'})}
            {statCard('Self-Reported Belonging', `${avgBelonging}/5`, 'in-app survey (Likert 1–5)', null, {text:'NSS'})}
            {statCard('Cross-Group', `${crossGroupPct}%`, 'interactions across student origins', null, {text:'A&P'})}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Monthly Engagement Growth</h2>
              <p className="text-xs text-gray-400 mb-4">Active users, sessions created, and new connections formed</p>
              <ResponsiveContainer width="100%" height={260}><AreaChart data={MONTHLY_ENGAGEMENT} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Area type="monotone" dataKey="activeUsers" name="Active Users" stroke="#1e3a5f" fill="#1e3a5f20" strokeWidth={2.5}/><Area type="monotone" dataKey="sessions" name="Sessions" stroke="#c5a13b" fill="#c5a13b20" strokeWidth={2.5}/><Area type="monotone" dataKey="newConnections" name="New Connections" stroke="#6b4c8a" fill="#6b4c8a20" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Engagement by Activity Category</h2>
              <p className="text-xs text-gray-400 mb-4">Sessions and unique participants across Sport, Study & Board Games</p>
              <ResponsiveContainer width="100%" height={260}><BarChart data={CATEGORY_ENGAGEMENT} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="category" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Bar dataKey="sessions" name="Sessions" fill="#1e3a5f" radius={[6,6,0,0]}/><Bar dataKey="participants" name="Participants" fill="#c5a13b" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
            </div>
          </div>
        </>)}

        {/* ════════════════════ CAMPUS — EDUCATIONAL GAINS (SO4–SO6) ════════════════════ */}
        {activeCategory === 'campus' && activeTab === 'gains' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(30,58,95,0.06)', border: '1px solid rgba(30,58,95,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>TEF Educational Gains Framework (SO4–SO6)</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>The TEF Student Outcomes aspect explicitly admits no national measure exists for educational gains, and that most providers do not have one. This panel surfaces evidence captured directly from students <strong>at the point of experience</strong>: attendance check-ins, post-event reflections (SO5 support, SO6 evaluation), and articulation of gains in students' own words (SO4). Captured live, not modelled or imputed.</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCard('Check-Ins Captured', totalCheckIns, 'students attended (vs. just RSVP\'d)', null, {text:'TEF'})}
            {statCard('Reflections Captured', totalReflections, 'post-event Likert + free-text', null, {text:'TEF'})}
            {statCard('SO4 Articulation', `${so4Articulation}%`, 'reflections naming a specific gain', null, {text:'TEF'})}
            {statCard('Avg. Peer Connection', reflConnection ? `${reflConnection.toFixed(1)}/5` : '—', 'self-reported (SO5 support)', null, {text:'TEF'})}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>SO6 — Evaluation: Self-Reported Gains</h2>
              <p className="text-xs text-gray-400 mb-4">Averaged Likert (1–5) across captured post-event reflections</p>
              <div className="space-y-4 mt-4">
                {[
                  { label: 'Sense of belonging', value: reflBelonging, color: '#1e3a5f', tag: 'SO6' },
                  { label: 'Something learned', value: reflLearned, color: '#c5a13b', tag: 'SO6' },
                  { label: 'Peer connection made', value: reflConnection, color: '#059669', tag: 'SO5' },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-gray-700">{r.label} <span className="text-xs font-semibold ml-1" style={{ color: r.color }}>({r.tag})</span></span>
                      <span className="text-sm font-bold" style={{ color: r.color }}>{r.value ? r.value.toFixed(1) : '—'}/5</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(r.value || 0) * 20}%`, background: r.color }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 italic">Captured immediately after each event; self-reported, not modelled. Supplementary evidence for TEF Student Outcomes submissions.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>SO4 — Articulation: In Students' Own Words</h2>
              <p className="text-xs text-gray-400 mb-4">A sample of free-text gains as students described them</p>
              <div className="space-y-3 mt-3">
                {reflectionRecords.filter(r => (r.oneThing || '').trim().length > 0).slice(0, 5).map((r, i) => {
                  const post = posts.find(p => p.id === r.postId);
                  return (
                    <div key={i} className="rounded-lg p-3" style={{ background: 'rgba(197,161,59,0.06)', borderLeft: '3px solid #c5a13b' }}>
                      <p className="text-sm" style={{ color: '#1e3a5f', fontStyle: 'italic' }}>"{r.oneThing}"</p>
                      <p className="text-xs mt-1.5 text-gray-500">{r.user} · {post ? `${post.activity}` : 'event'}</p>
                    </div>
                  );
                })}
                {reflectionRecords.filter(r => (r.oneThing || '').trim().length > 0).length === 0 && (
                  <p className="text-xs text-gray-300 italic">No free-text articulation captured yet — reflect on a past event to populate.</p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>SO5 — Support: Captured Outcomes on Opportunities</h2>
            <p className="text-xs text-gray-400 mb-4">Application outcomes captured directly from students, not modelled from a funnel</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Applied', value: outcomeFunnel.applied, color: '#1e3a5f' },
                { label: 'Interviewed', value: outcomeFunnel.interviewed, color: '#c5a13b' },
                { label: 'Offered', value: outcomeFunnel.offered, color: '#059669' },
                { label: 'Accepted', value: outcomeFunnel.accepted, color: '#10b981' },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(30,58,95,0.04)' }}>
                  <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs font-semibold mt-1" style={{ color: '#5a6a7a' }}>{s.label}</div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 italic">Outcomes are captured live as students update their application status; complements Graduate Outcomes Survey rather than substituting for it.</p>
          </div>
        </>)}

        {/* ════════════════════ CAMPUS — NSS & BELONGING ════════════════════ */}
        {activeCategory === 'campus' && activeTab === 'belonging' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(197,161,59,0.06)', border: '1px solid rgba(197,161,59,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>NSS Theme Relevance</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>This data maps to NSS themes: <strong>Student Voice</strong> (Q22–Q25) and optional bank <strong>B2.1</strong> ("The SU had a positive impact on my sense of belonging"). Self-reported belonging is captured via an in-app survey using the same Likert agree/disagree scale. This is <em>not</em> an official NSS positivity measure — it provides supplementary evidence for TEF Student Experience narrative submissions.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {statCard('Self-Reported Belonging', `${avgBelonging}/5`, 'Reaction users (in-app survey)', '#c5a13b', null)}
            {statCard('Control Group', '3.1/5', 'non-users comparison', '#9ca3af', null)}
            {statCard('Belonging Differential', '+1.1', 'app users score higher', '#c5a13b', null)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Self-Reported Belonging Trend</h2>
              <p className="text-xs text-gray-400 mb-4">In-app survey · Likert 1–5 agree/disagree · Mirrors NSS optional bank B2.1</p>
              <ResponsiveContainer width="100%" height={280}><AreaChart data={BELONGING_TREND} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:12}}/><YAxis domain={[2,5]} tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Area type="monotone" dataKey="appUsers" name="Reaction Users" stroke="#6b4c8a" fill="#6b4c8a20" strokeWidth={2.5}/><Area type="monotone" dataKey="nonUsers" name="Non-Users" stroke="#9ca3af" fill="#9ca3af20" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Cross-Group Interactions</h2>
              <p className="text-xs text-gray-400 mb-4">Students connecting outside their own cohort — home/international integration</p>
              <ResponsiveContainer width="100%" height={280}><BarChart data={CROSS_GROUP} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Bar dataKey="sameGroup" name="Same Group" fill="#9ca3af" radius={[4,4,0,0]}/><Bar dataKey="crossGroup" name="Cross-Group" fill="#2a5a8f" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
            </div>
          </div>
        </>)}

        {/* ════════════════════ CAMPUS — ACCESS & PARTICIPATION ════════════════════ */}
        {activeCategory === 'campus' && activeTab === 'participation' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(30,58,95,0.04)', border: '1px solid rgba(30,58,95,0.1)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Access, Participation & Internationalisation</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>Plymouth's Strategy 2030 targets 20% international students. OfS requires universities to monitor participation gaps across student groups. This data tracks <strong>international student engagement</strong> alongside year group and commuter metrics for A&P Plan and internationalisation reporting.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>International Student Engagement</h2>
              <p className="text-xs text-gray-400 mb-4">% of university cohort vs % engaging on Reaction — by student origin</p>
              <ResponsiveContainer width="100%" height={280}><BarChart data={PARTICIPATION_BY_ORIGIN} margin={{top:5,right:10,left:0,bottom:5}} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis type="number" tick={{fontSize:12}} unit="%"/><YAxis type="category" dataKey="group" tick={{fontSize:11}} width={80}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Bar dataKey="pctOfCohort" name="% of Cohort" fill="#9ca3af" radius={[0,4,4,0]}/><Bar dataKey="pctOnApp" name="% on Reaction" fill="#2a5a8f" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Year Group Engagement</h2>
              <p className="text-xs text-gray-400 mb-4">Engagement rate by year of study — identifies where support is most needed</p>
              <div className="space-y-4 mt-4">
                {YEAR_GROUP_ENGAGEMENT.map(y => (
                  <div key={y.year}>
                    <div className="flex justify-between mb-1"><span className="text-sm font-bold text-gray-700">{y.year}</span><span className="text-sm font-bold" style={{color:y.color}}>{y.pctEngaged}% engaged · {y.users} users</span></div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{width:`${y.pctEngaged}%`, background:y.color}}/></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Commuter vs On-Campus</h2>
              <p className="text-xs text-gray-400 mb-4">OfS A&P focus group — comparing engagement & belonging patterns</p>
              <div style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={COMMUTER_VS_CAMPUS} cx="50%" cy="50%" innerRadius={50} outerRadius={78} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                      {COMMUTER_VS_CAMPUS.map((e,i)=>(<Cell key={i} fill={e.color} stroke="white" strokeWidth={2}/>))}
                    </Pie>
                    <Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#1e3a5f', lineHeight: 1 }}>451</div>
                  <div style={{ fontSize: '9px', fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '2px' }}>Total Users</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '4px', marginBottom: '16px' }}>
                {COMMUTER_VS_CAMPUS.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: d.color }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#4a5568' }}>{d.name}</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: d.color }}>{d.value} ({Math.round(d.value/451*100)}%)</span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'Belonging Score', campus: COMMUTER_DETAIL.onCampus.belonging, commuter: COMMUTER_DETAIL.commuter.belonging, unit: '/5' },
                  { label: 'Avg Sessions/Wk', campus: COMMUTER_DETAIL.onCampus.avgSessions, commuter: COMMUTER_DETAIL.commuter.avgSessions, unit: '' },
                  { label: 'Avg Weekly Streak', campus: COMMUTER_DETAIL.onCampus.weeklyStreak, commuter: COMMUTER_DETAIL.commuter.weeklyStreak, unit: ' wks' },
                  { label: 'Top Activity', campus: COMMUTER_DETAIL.onCampus.topActivity, commuter: COMMUTER_DETAIL.commuter.topActivity, unit: '' },
                ].map((row,i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '8px 10px', borderRadius: '8px', background: i % 2 === 0 ? 'rgba(30,58,95,0.025)' : 'rgba(197,161,59,0.04)' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: '4px' }}>{row.label}</span>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: '#1e3a5f', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a5f' }}>{row.campus}{row.unit}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: '#c5a13b', flexShrink: 0, marginTop: '2px' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#c5a13b' }}>{row.commuter}{row.unit}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Key Insights for A&P Plan</h2>
              <p className="text-xs text-gray-400 mb-4">Evidence-based findings for OfS & internationalisation reporting</p>
              <div className="space-y-2 mt-2">
                {[
                  { text: 'International students engage at or above their cohort share across all origin groups — no negative participation gaps identified' },
                  { text: 'International students form 37% of all cross-group connections — evidence of social integration' },
                  { text: 'Study category sees highest cross-group mixing (48% of sessions include both home and international students)' },
                  { text: 'Year 3 engagement drops to 37% — potential intervention point across all student groups' },
                  { text: 'Commuter students are 34% of users but 41% of cohort — participation gap to address' },
                  { text: 'Peer study groups drive 72% of international student engagement — consider expanding multilingual support' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(30,58,95,0.03)', borderLeft: '3px solid #1e3a5f', color: '#4a5568' }}>
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>)}

        {/* ════════════════════ CAMPUS — SOCIAL ENGAGEMENT ════════════════════ */}
        {activeCategory === 'campus' && activeTab === 'retention' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(197,161,59,0.06)', border: '1px solid rgba(197,161,59,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Social Engagement Patterns</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>This tab tracks <strong>peer engagement behaviour observable within Reaction</strong> — session frequency, participation trends, and activity levels. This is <strong>not</strong> a continuation or outcomes measure. It provides a supplementary engagement signal that institutions may choose to cross-reference with VLE, attendance, and academic data for a fuller picture.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCard('Active Users', `${activePct}%`, 'with 1+ sessions in past 14 days', '#c5a13b', null)}
            {statCard('Declining', '20', 'previously active, now inactive 21+ days', '#f59e0b', null)}
            {statCard('Returned', '14', 'resumed after period of inactivity', '#2563eb', null)}
            {statCard('Avg Sessions', '2.5/wk', 'per active user', '#f59e0b', null)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Active vs Declining Engagement</h2>
              <p className="text-xs text-gray-400 mb-4">Students with declining social engagement on Reaction over time</p>
              <ResponsiveContainer width="100%" height={280}><AreaChart data={ENGAGEMENT_TREND_DATA} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Area type="monotone" dataKey="active" name="Active" stroke="#c5a13b" fill="#c5a13b20" strokeWidth={2.5}/><Area type="monotone" dataKey="declining" name="Declining" stroke="#9ca3af" fill="#9ca3af20" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Engagement Frequency Breakdown</h2>
              <p className="text-xs text-gray-400 mb-4">Distribution of users by weekly session frequency</p>
              <div className="space-y-4 mt-4">
                {[
                  { label: '3+ sessions/week', pct: 34, users: 101, color: '#1e3a5f' },
                  { label: '1–2 sessions/week', pct: 38, users: 113, color: '#2a5a8f' },
                  { label: '<1 session/week', pct: 21, users: 63, color: '#c5a13b' },
                  { label: 'Registered, inactive', pct: 7, users: 21, color: '#9ca3af' },
                ].map(r => (
                  <div key={r.label}>
                    <div className="flex justify-between mb-1"><span className="text-sm font-bold text-gray-700">{r.label}</span><span className="text-sm font-bold" style={{color:r.color}}>{r.pct}% · {r.users} users</span></div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{width:`${r.pct * 2.5}%`, background:r.color}}/></div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-4 italic">Frequency data is observable within Reaction only — declining app engagement does not necessarily indicate wider disengagement or continuation risk</p>
            </div>
          </div>
        </>)}

        {/* ════════════════════ COMMUNITY — OVERVIEW ════════════════════ */}
        {activeCategory === 'community' && activeTab === 'overview' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(190,18,60,0.06)', border: '1px solid rgba(190,18,60,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Community Engagement</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>Tracks volunteering, fundraising, social events and campaigns connecting students with charities, social enterprises and community partners across Devon. Aligned with Strategy 2030 civic-engagement targets and the TEF "Educational Gains" narrative on graduate civic outcomes.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCard('Active Volunteers', communityActiveVolunteers, 'students engaged this month', null, {text:'CIVIC'})}
            {statCard('Volunteer Hours', communityTotalHours.toLocaleString(), 'total contributed this year', null, {text:'CIVIC'})}
            {statCard('Community Events', communityEventCount, 'organised across categories', null, {text:'CIVIC'})}
            {statCard('Partner Orgs', COMMUNITY_SOCIAL_VALUE.partnerOrgs, 'active charities & community groups', null, {text:'CIVIC'})}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Monthly Volunteer Engagement</h2>
              <p className="text-xs text-gray-400 mb-4">Active volunteers, hours contributed, and events organised</p>
              <ResponsiveContainer width="100%" height={260}><AreaChart data={COMMUNITY_MONTHLY} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Area type="monotone" dataKey="volunteers" name="Volunteers" stroke="#be123c" fill="#be123c20" strokeWidth={2.5}/><Area type="monotone" dataKey="hours" name="Hours" stroke="#fb7185" fill="#fb718520" strokeWidth={2.5}/><Area type="monotone" dataKey="events" name="Events" stroke="#9333ea" fill="#9333ea20" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Activity Type Breakdown</h2>
              <p className="text-xs text-gray-400 mb-4">Sessions and participants across Volunteering, Socials, Fundraising & Campaigns</p>
              <ResponsiveContainer width="100%" height={260}><BarChart data={COMMUNITY_ACTIVITY_BREAKDOWN} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="activity" tick={{fontSize:11}}/><YAxis tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Bar dataKey="sessions" name="Sessions" fill="#be123c" radius={[6,6,0,0]}/><Bar dataKey="participants" name="Participants" fill="#fb7185" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
            </div>
          </div>
        </>)}

        {/* ════════════════════ COMMUNITY — SOCIAL VALUE ════════════════════ */}
        {activeCategory === 'community' && activeTab === 'social-value' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(190,18,60,0.06)', border: '1px solid rgba(190,18,60,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Estimated Social Value</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>Volunteer hours valued using ONS estimates (~£17.50/hour for skilled volunteer time). This is an indicative measure — real social value depends on cause, skill match, and outcome. Method aligns with HM Treasury Green Book guidance on volunteer time valuation.</p>
          </div>
          <div className="rounded-xl overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg, #881337 0%, #be123c 100%)' }}>
            <div className="p-6 text-white">
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: '#fb7185' }}>Total Social Value Generated</div>
              <div className="text-4xl font-bold tracking-tight">£{COMMUNITY_SOCIAL_VALUE.totalValue.toLocaleString()}</div>
              <div className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.7)' }}>From {COMMUNITY_SOCIAL_VALUE.totalHours.toLocaleString()} volunteer hours @ £{COMMUNITY_SOCIAL_VALUE.hourlyValue}/hour (ONS estimate, 2024)</div>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCard('Total Hours', COMMUNITY_SOCIAL_VALUE.totalHours.toLocaleString(), 'volunteer time contributed', '#be123c', null)}
            {statCard('Hourly Rate', `£${COMMUNITY_SOCIAL_VALUE.hourlyValue}`, 'ONS skilled volunteer time', '#be123c', null)}
            {statCard('Partner Orgs', COMMUNITY_SOCIAL_VALUE.partnerOrgs, 'charities & community groups', '#be123c', null)}
            {statCard('Per Active Student', `£${Math.round(COMMUNITY_SOCIAL_VALUE.totalValue / COMMUNITY_SOCIAL_VALUE.activeStudents).toLocaleString()}`, 'avg social value contributed', '#be123c', null)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Cumulative Volunteer Hours</h2>
              <p className="text-xs text-gray-400 mb-4">Total hours contributed by Reaction users, accumulated across the year</p>
              <ResponsiveContainer width="100%" height={280}><AreaChart data={COMMUNITY_MONTHLY.reduce((acc, m, i) => { const prev = i > 0 ? acc[i-1].cumulative : 0; acc.push({...m, cumulative: prev + m.hours}); return acc; }, [])} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Area type="monotone" dataKey="cumulative" name="Cumulative Hours" stroke="#be123c" fill="#be123c30" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Methodology</h2>
              <p className="text-xs text-gray-400 mb-4">How we estimate social value — for transparency in civic-engagement reporting</p>
              <div className="space-y-2 mt-2">
                {[
                  'Hours are self-reported by volunteers and confirmed by partner organisations on the platform',
                  'Hourly rate of £17.50 reflects the ONS estimate for skilled volunteer time (2024). Unskilled volunteering is often valued lower (~£11.50)',
                  'This is an indicative figure for civic-engagement reporting — actual social value varies by cause, outcomes, and beneficiary group',
                  'For HM Treasury Green Book full Social Cost-Benefit Analysis, additional outcome data would be needed (e.g. Wellbeing Valuation)',
                  'Figures should be cross-referenced with partner organisation reporting before external publication',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(190,18,60,0.04)', borderLeft: '3px solid #be123c', color: '#4a5568' }}>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>)}

        {/* ════════════════════ COMMUNITY — CAUSE AREAS ════════════════════ */}
        {activeCategory === 'community' && activeTab === 'causes' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(190,18,60,0.06)', border: '1px solid rgba(190,18,60,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Cause Area Distribution</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>How student volunteer time is distributed across cause areas. Useful for understanding which social issues are resonating with students and where opportunities exist to broaden engagement. Mapped to UN Sustainable Development Goal categories where applicable.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Volunteers by Cause</h2>
              <p className="text-xs text-gray-400 mb-4">Number of unique student volunteers per cause area</p>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={COMMUNITY_CAUSE_BREAKDOWN} cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={2} dataKey="volunteers" nameKey="cause" label={({cause, percent}) => `${cause.split(' ')[0]} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {COMMUNITY_CAUSE_BREAKDOWN.map((e,i) => <Cell key={i} fill={e.color} stroke="white" strokeWidth={2}/>)}
                  </Pie>
                  <Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Hours Contributed by Cause</h2>
              <p className="text-xs text-gray-400 mb-4">Total volunteer hours per cause area, sorted by impact</p>
              <div className="space-y-3 mt-4">
                {[...COMMUNITY_CAUSE_BREAKDOWN].sort((a,b) => b.hours - a.hours).map(c => {
                  const maxHours = Math.max(...COMMUNITY_CAUSE_BREAKDOWN.map(x => x.hours));
                  return (
                    <div key={c.cause}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-bold text-gray-700">{c.cause}</span>
                        <span className="text-sm font-bold" style={{color:c.color}}>{c.hours} hrs · {c.volunteers} vols</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{width:`${(c.hours/maxHours)*100}%`, background:c.color}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>)}

        {/* ════════════════════ COMMUNITY — PARTNERS ════════════════════ */}
        {activeCategory === 'community' && activeTab === 'partners' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(190,18,60,0.06)', border: '1px solid rgba(190,18,60,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Partner Organisations</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>Charities, social enterprises and community groups currently engaging with Reaction. Strong partner engagement is a key indicator of platform health and provides anchor case studies for civic-engagement reporting.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCard('Active Partners', COMMUNITY_SOCIAL_VALUE.partnerOrgs, 'partner orgs posting this term', '#be123c', null)}
            {statCard('Avg Response Time', '2.3 days', 'partner reply to enquiries', '#be123c', null)}
            {statCard('Repeat Posts', '74%', 'partners posting 2+ times', '#be123c', null)}
            {statCard('Sectors Covered', '12', 'distinct cause areas', '#be123c', null)}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Top Partner Organisations</h2>
            <p className="text-xs text-gray-400 mb-4">Most active partners by volunteer hours contributed this year</p>
            <div className="space-y-2">
              {COMMUNITY_TOP_PARTNERS.map((p, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: i % 2 === 0 ? 'rgba(190,18,60,0.03)' : 'transparent', borderLeft: '3px solid #be123c' }}>
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg, #881337 0%, #be123c 100%)' }}>{i+1}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800 truncate">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.sector}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold" style={{ color: '#be123c' }}>{p.hours} hrs</div>
                    <div className="text-xs text-gray-400">{p.volunteers} volunteers</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ════════════════════ OPPORTUNITIES — OVERVIEW ════════════════════ */}
        {activeCategory === 'opportunities' && activeTab === 'overview' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Opportunity & Career Engagement</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>Tracks engagement with employer-posted opportunities — part-time roles, summer internships and graduate schemes. Key supplementary evidence for the <strong>Graduate Outcomes Survey (GOS)</strong> and <strong>TEF Student Outcomes</strong> aspect (specifically progression to employment, further study, and "highly skilled employment" rates).</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCard('Active Users', oppsActiveUsers, 'students engaging this month', null, {text:'GOS'})}
            {statCard('Total Applications', oppsTotalApps.toLocaleString(), 'submitted via Reaction this year', null, {text:'GOS'})}
            {statCard('Posts This Year', oppsTotalPosts, 'opportunities listed by employers', null, {text:'TEF'})}
            {statCard('App → Interview', `${oppsAppToInterviewPct}%`, 'application-to-interview conversion', null, {text:'GOS'})}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Monthly Engagement</h2>
              <p className="text-xs text-gray-400 mb-4">Active users, employer posts, and applications submitted</p>
              <ResponsiveContainer width="100%" height={260}><AreaChart data={OPPS_MONTHLY} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="month" tick={{fontSize:12}}/><YAxis tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Area type="monotone" dataKey="activeUsers" name="Active Users" stroke="#1e3a5f" fill="#1e3a5f20" strokeWidth={2.5}/><Area type="monotone" dataKey="applications" name="Applications" stroke="#059669" fill="#05966920" strokeWidth={2.5}/><Area type="monotone" dataKey="posts" name="Posts" stroke="#34d399" fill="#34d39920" strokeWidth={2.5}/></AreaChart></ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Opportunity Types</h2>
              <p className="text-xs text-gray-400 mb-4">Posts and applications across part-time, internships, and graduate schemes</p>
              <ResponsiveContainer width="100%" height={260}><BarChart data={OPPS_BY_TYPE} margin={{top:5,right:10,left:-10,bottom:5}}><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis dataKey="type" tick={{fontSize:10}}/><YAxis tick={{fontSize:12}}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Bar dataKey="posts" name="Posts" fill="#1e3a5f" radius={[6,6,0,0]}/><Bar dataKey="applications" name="Applications" fill="#059669" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>
            </div>
          </div>
        </>)}

        {/* ════════════════════ OPPORTUNITIES — APPLICATION FUNNEL ════════════════════ */}
        {activeCategory === 'opportunities' && activeTab === 'funnel' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Application Funnel</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>Conversion through the application journey: <strong>view → save → apply → interview → offer</strong>. Drop-off rates between stages help identify where students need additional support, and how well employers are matched to student needs.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCard('View → Apply', `${oppsViewToApplyPct}%`, 'of viewers go on to apply', '#059669', null)}
            {statCard('App → Interview', `${oppsAppToInterviewPct}%`, 'of apps reach interview stage', '#059669', null)}
            {statCard('Interview → Offer', `${oppsInterviewToOfferPct}%`, 'of interviews result in offers', '#059669', null)}
            {statCard('Total Offers', OPPS_FUNNEL[4].count, 'tracked through Reaction', '#059669', null)}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
            <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Funnel Visualisation</h2>
            <p className="text-xs text-gray-400 mb-4">Flow of users through each stage — students may drop out at any point</p>
            <div className="space-y-3 mt-4">
              {OPPS_FUNNEL.map((stage, i) => {
                const max = OPPS_FUNNEL[0].count;
                const pct = (stage.count / max) * 100;
                const prev = i > 0 ? OPPS_FUNNEL[i-1].count : null;
                const dropoff = prev ? Math.round(((prev - stage.count) / prev) * 100) : null;
                return (
                  <div key={stage.stage}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-bold text-gray-700">{stage.stage}</span>
                      <span className="text-sm font-bold" style={{color:stage.color}}>{stage.count.toLocaleString()} {dropoff !== null && <span className="text-xs text-gray-400 ml-2">−{dropoff}% from prev</span>}</span>
                    </div>
                    <div className="h-5 bg-gray-100 rounded-md overflow-hidden">
                      <div className="h-full rounded-md transition-all flex items-center justify-end pr-2" style={{width:`${pct}%`, background:stage.color}}>
                        <span className="text-xs text-white font-bold" style={{textShadow:'0 1px 2px rgba(0,0,0,0.3)'}}>{Math.round(pct)}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Funnel Insights</h2>
            <p className="text-xs text-gray-400 mb-4">Patterns observed from current data</p>
            <div className="space-y-2 mt-2">
              {[
                'View-to-apply rate of 11% is healthy for a student-aimed platform — UK careers-platform benchmark is typically 6–8%',
                'App-to-interview conversion of 29% suggests strong post quality and good employer-student fit',
                'Interview-to-offer rate of 34% is in line with UK graduate-employment averages',
                'Highest drop-off (61%) is between save and apply — consider in-app prompts to encourage applications',
                'Student support intervention point: between viewed and applied — consider mock-CV review prompts and one-click application templates',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(5,150,105,0.04)', borderLeft: '3px solid #059669', color: '#4a5568' }}>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ════════════════════ OPPORTUNITIES — SECTORS & TYPES ════════════════════ */}
        {activeCategory === 'opportunities' && activeTab === 'sectors' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Sector & Type Distribution</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>Which sectors are recruiting most actively, and which opportunity types are most popular with students. Important for careers-team planning, employer outreach, and identifying gaps in the partner mix.</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Applications by Sector</h2>
              <p className="text-xs text-gray-400 mb-4">Where students are applying — total applications submitted per sector</p>
              <ResponsiveContainer width="100%" height={300}><BarChart data={OPPS_BY_SECTOR} margin={{top:5,right:10,left:0,bottom:5}} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/><XAxis type="number" tick={{fontSize:12}}/><YAxis type="category" dataKey="sector" tick={{fontSize:11}} width={130}/><Tooltip contentStyle={{borderRadius:8,border:'1px solid rgba(30,58,95,0.1)',boxShadow:'0 2px 12px rgba(0,0,0,.06)',fontSize:12}}/><Legend/><Bar dataKey="posts" name="Posts" fill="#9ca3af" radius={[0,4,4,0]}/><Bar dataKey="applications" name="Applications" fill="#059669" radius={[0,4,4,0]}/></BarChart></ResponsiveContainer>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Opportunity Types — Detailed View</h2>
              <p className="text-xs text-gray-400 mb-4">Breakdown by part-time, internships, and graduate schemes</p>
              <div className="space-y-3 mt-4">
                {OPPS_BY_TYPE.map(t => (
                  <div key={t.type} className="rounded-lg p-3" style={{ background: 'rgba(5,150,105,0.04)', border: '1px solid rgba(5,150,105,0.1)' }}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-sm font-bold" style={{ color: t.color }}>{t.type}</span>
                      <span className="text-xs text-gray-500">{Math.round(t.applications/t.posts)} apps/post avg</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Posts</div>
                        <div className="text-lg font-bold" style={{color:'#1e3a5f'}}>{t.posts}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">Applications</div>
                        <div className="text-lg font-bold" style={{color:t.color}}>{t.applications}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>)}

        {/* ════════════════════ OPPORTUNITIES — EMPLOYERS ════════════════════ */}
        {activeCategory === 'opportunities' && activeTab === 'employers' && (<>
          <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)' }}>
            <h3 className="font-bold text-sm mb-1" style={{ color: '#1e3a5f' }}>Employer & Year-Group Engagement</h3>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>Top recruiting employers and how engagement varies across student years. Year 1 students typically engage with part-time work; later years pivot toward internships and graduate schemes — visibility of this transition supports careers-service intervention timing.</p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {statCard('Active Employers', OPPS_TOP_EMPLOYERS.length + 14, 'recruiting on Reaction this term', '#059669', null)}
            {statCard('Avg Apps per Post', Math.round(oppsTotalApps/oppsTotalPosts), 'student applications per listing', '#059669', null)}
            {statCard('Repeat Employers', '68%', 'returning to post 2+ roles', '#059669', null)}
            {statCard('Local Employers', '52%', 'based in Devon/SW', '#059669', null)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Top Employers</h2>
              <p className="text-xs text-gray-400 mb-4">Most active recruiters by total applications received</p>
              <div className="space-y-2">
                {OPPS_TOP_EMPLOYERS.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: i % 2 === 0 ? 'rgba(5,150,105,0.03)' : 'transparent', borderLeft: '3px solid #059669' }}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' }}>{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-gray-800 truncate">{e.name}</div>
                      <div className="text-xs text-gray-500">{e.sector}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold" style={{ color: '#059669' }}>{e.applications}</div>
                      <div className="text-xs text-gray-400">{e.posts} posts</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <h2 className="text-sm font-bold mb-1" style={{color:"#1e3a5f"}}>Year-Group Engagement</h2>
              <p className="text-xs text-gray-400 mb-4">Active users by year, with the most-popular opportunity type</p>
              <div className="space-y-4 mt-4">
                {OPPS_BY_YEAR.map(y => {
                  const max = Math.max(...OPPS_BY_YEAR.map(x => x.users));
                  return (
                    <div key={y.year}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-bold text-gray-700">{y.year}</span>
                        <span className="text-sm font-bold" style={{color:y.color}}>{y.users} users · top: {y.topInterest}</span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{width:`${(y.users/max)*100}%`, background:y.color}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-500 italic">Year 3 engagement (124 users) is over 3× higher than Year 1 — the typical careers-engagement curve. Intervention opportunity: engage Year 2s earlier with internship readiness.</p>
              </div>
            </div>
          </div>
        </>)}

      </div>
    </div>
  );
};

// ──── SHARED COMPONENTS ────
const USER_PROFILES = {
  'Alex Johnson': { fullName:'Alexander James Johnson', course:'BSc Sport and Exercise Science', age:21, gamesPlayed:14, bgFrom:'#2563eb', bgTo:'#f59e0b', initials:'AJ' },
  'Sarah Martinez': { fullName:'Sarah Elena Martinez', course:'BSc Medical Sciences', age:20, gamesPlayed:8, bgFrom:'#ec4899', bgTo:'#8b5cf6', initials:'SM' },
  'Mike Chen': { fullName:'Michael Wei Chen', course:'BSc Computer Science', age:22, gamesPlayed:23, bgFrom:'#10b981', bgTo:'#0ea5e9', initials:'MC' },
  'Emily Davis': { fullName:'Emily Rose Davis', course:'MSc Sport and Health Sciences', age:23, gamesPlayed:11, bgFrom:'#f97316', bgTo:'#ef4444', initials:'ED' },
  'Jordan Lee': { fullName:'Jordan Kai Lee', course:'BSc Biosciences', age:19, gamesPlayed:6, bgFrom:'#6366f1', bgTo:'#06b6d4', initials:'JL' },
  'Tom Wilson': { fullName:'Thomas Wilson', course:'BSc Geography', age:21, gamesPlayed:9, bgFrom:'#0d9488', bgTo:'#a855f7', initials:'TW' },
  'Lisa Park': { fullName:'Lisa Park', course:'BA Business and Management', age:20, gamesPlayed:7, bgFrom:'#e11d48', bgTo:'#fb923c', initials:'LP' },
  'Ryan Cooper': { fullName:'Ryan Cooper', course:'BSc Biosciences', age:22, gamesPlayed:5, bgFrom:'#2563eb', bgTo:'#10b981', initials:'RC' },
  'Zara Khan': { fullName:'Zara Khan', course:'MSc Engineering', age:23, gamesPlayed:12, bgFrom:'#7c3aed', bgTo:'#f43f5e', initials:'ZK' },
};

const UserAvatar = ({ userName, size = 48, onClick }) => {
  const profile = USER_PROFILES[userName];
  const initials = profile ? profile.initials : userName.split(' ').map(n => n[0]).join('');
  const from = profile ? profile.bgFrom : '#2563eb';
  const to = profile ? profile.bgTo : '#f59e0b';
  const id = `grad-${userName.replace(/\s/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" onClick={onClick} className={`flex-shrink-0 rounded-full ${onClick ? 'cursor-pointer' : ''}`} style={{ minWidth: size, minHeight: size, display: 'block' }}>
      <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={from} /><stop offset="100%" stopColor={to} /></linearGradient></defs>
      <circle cx="24" cy="24" r="24" fill={`url(#${id})`} />
      <circle cx="24" cy="17" r="8" fill="rgba(255,255,255,0.25)" />
      <ellipse cx="24" cy="38" rx="13" ry="10" fill="rgba(255,255,255,0.2)" />
      <text x="24" y="26" textAnchor="middle" fill="white" fontSize="15" fontWeight="700" fontFamily="system-ui, sans-serif">{initials}</text>
    </svg>
  );
};

const ProfilePage = ({ userName, onBack, posts }) => {
  const profile = USER_PROFILES[userName] || { fullName: userName, course: 'Not specified', age: '—', gamesPlayed: 0 };
  const userPosts = posts.filter(p => p.user === userName);
  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #f0f2f5 0%, #e8ecf1 50%, #f5f0e8 100%)' }}><div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 font-semibold mb-6 transition-colors text-sm" style={{ color: '#1e3a5f' }}><ArrowLeft className="w-4 h-4" /> Back to Board</button>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"><div className="h-28" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 60%, #c5a13b 100%)' }} /><div className="px-8 pb-8">
        <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 -mt-16 relative z-10"><div className="rounded-full border-4 border-white shadow-lg overflow-hidden" style={{width:128,height:128}}><UserAvatar userName={userName} size={128}/></div><div className="text-center sm:text-left pb-2"><h1 className="text-3xl font-bold text-gray-900">{profile.fullName}</h1><p className="font-medium text-base mt-1" style={{ color: '#c5a13b' }}>University of Plymouth</p></div></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
          {[
            { label: 'Full Name', value: profile.fullName, accent: '#1e3a5f' },
            { label: 'Course', value: profile.course, accent: '#c5a13b' },
            { label: 'Age', value: profile.age, accent: '#1e3a5f' },
            { label: 'Sessions', value: profile.gamesPlayed, accent: '#c5a13b' },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-lg bg-white transition-all" style={{ borderLeft: `3px solid ${s.accent}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: s.accent, opacity: 0.65 }}>{s.label}</div>
              <div className="text-sm font-bold text-gray-800">{s.value}</div>
            </div>
          ))}
        </div>
        {userPosts.length > 0 && (<div className="mt-6"><h2 className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: '#1e3a5f' }}>Interests</h2><div className="flex flex-wrap gap-2">{[...new Set(userPosts.map(p => p.activity || p.sport))].map(interest=>(<div key={interest} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-white" style={{ borderLeft: '3px solid rgba(197,161,59,0.4)', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}><span className="text-sm font-semibold text-gray-800">{interest}</span></div>))}</div></div>)}
      </div></div>
    </div></div>
  );
};

// ──── MODALS ────
const inputCls = "w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:border-amber-500 focus:ring-1 focus:ring-amber-200 focus:outline-none transition-all bg-white text-sm";
const btnPrimary = "w-full mt-6 px-6 py-3 text-white rounded-lg font-semibold transition-all active:scale-[0.97] text-sm";

const LoginModal = ({ onClose, onLogin, onSwitchToRegister }) => {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const handleSubmit = () => { if (!email||!password){alert('Please fill in all fields!');return;} onLogin(email); };
  return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden"><div style={{ height: '4px', background: 'linear-gradient(90deg, #1e3a5f, #c5a13b)' }} /><div className="p-6">
    <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>Login</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button></div>
    <div className="space-y-4"><div><label className="block text-sm font-semibold text-gray-600 mb-1.5">University Email</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jamie@plymouth.ac.uk" className={inputCls}/></div><div><label className="block text-sm font-semibold text-gray-600 mb-1.5">Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" className={inputCls}/></div></div>
    <button onClick={handleSubmit} className={btnPrimary} style={{ background: '#1e3a5f', boxShadow: '0 2px 8px rgba(30,58,95,0.25)' }}>Login</button>
    <div className="mt-4 text-center"><p className="text-gray-500 text-sm">Don't have an account?{' '}<button onClick={onSwitchToRegister} className="font-semibold" style={{ color: '#c5a13b' }}>Register here</button></p></div>
  </div></div></div>);
};

const RegisterModal = ({ onClose, onRegister, onSwitchToLogin }) => {
  const [fn,setFn]=useState('');const [ln,setLn]=useState('');const [email,setEmail]=useState('');const [uni,setUni]=useState('');const [pw,setPw]=useState('');const [cpw,setCpw]=useState('');
  const handleSubmit = () => { if(!fn||!ln||!email||!uni||!pw||!cpw){alert('Please fill in all fields!');return;} if(pw!==cpw){alert('Passwords do not match!');return;} onRegister({firstName:fn,lastName:ln,email,university:uni,password:pw}); };
  return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-screen overflow-y-auto"><div style={{ height: '4px', background: 'linear-gradient(90deg, #1e3a5f, #c5a13b)' }} /><div className="p-6">
    <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>Create Account</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button></div>
    <div className="space-y-4"><div className="grid grid-cols-2 gap-3"><div><label className="block text-sm font-semibold text-gray-600 mb-1.5">First Name *</label><input type="text" value={fn} onChange={e=>setFn(e.target.value)} placeholder="Jamie" className={inputCls}/></div><div><label className="block text-sm font-semibold text-gray-600 mb-1.5">Last Name *</label><input type="text" value={ln} onChange={e=>setLn(e.target.value)} placeholder="Student" className={inputCls}/></div></div>
    <div><label className="block text-sm font-semibold text-gray-600 mb-1.5">University Email *</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="jamie@plymouth.ac.uk" className={inputCls}/></div>
    <div><label className="block text-sm font-semibold text-gray-600 mb-1.5">University *</label><input type="text" value={uni} onChange={e=>setUni(e.target.value)} placeholder="University of Plymouth" className={inputCls}/></div>
    <div><label className="block text-sm font-semibold text-gray-600 mb-1.5">Password *</label><input type="password" value={pw} onChange={e=>setPw(e.target.value)} placeholder="Create a password" className={inputCls}/></div>
    <div><label className="block text-sm font-semibold text-gray-600 mb-1.5">Confirm Password *</label><input type="password" value={cpw} onChange={e=>setCpw(e.target.value)} placeholder="Re-enter password" className={inputCls}/></div></div>
    <button onClick={handleSubmit} className={btnPrimary} style={{ background: '#1e3a5f', boxShadow: '0 2px 8px rgba(30,58,95,0.25)' }}>Create Account</button>
    <div className="mt-4 text-center"><p className="text-gray-500 text-sm">Already have an account?{' '}<button onClick={onSwitchToLogin} className="font-semibold" style={{ color: '#c5a13b' }}>Login here</button></p></div>
  </div></div></div>);
};

const CreatePostModal = ({ onClose, onCreate, allowedCategories, defaultCategory }) => {
  const visibleCategories = (allowedCategories && allowedCategories.length > 0) ? allowedCategories : CATEGORY_NAMES;
  const initialCategory = defaultCategory && visibleCategories.includes(defaultCategory) ? defaultCategory : visibleCategories[0];
  const initialActivity = Object.keys(CATEGORIES[initialCategory].activities)[0];
  const initialLocations = ({
    'Sport': 'SU Sports Hall',
    'Study': 'Charles Seale-Hayne Library',
    'Board Games': 'UPSU Building',
    'Opportunities': 'Roland Levinsky Building',
    'Community': 'UPSU Building',
  })[initialCategory] || 'SU Sports Hall';
  const [category, setCategory] = useState(initialCategory);
  const [activity, setActivity] = useState(initialActivity);
  const [location, setLocation] = useState(initialLocations);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [maxPeople, setMaxPeople] = useState(10);
  const [description, setDescription] = useState('');
  const [postedBy, setPostedBy] = useState('Student');
  const [society, setSociety] = useState(UPSU_SOCIETIES[0]);

  // Activity list adapts to who's posting and what category.
  // For societies, this restricts to their specific activities + adds Taster variants.
  const activityOptions = activityOptionsForPoster(category, postedBy, society);
  const activities = activityOptions.map(o => o.value);
  // Resolve activity config. Taster Sessions always behave as group mode regardless
  // of the underlying activity (a tennis taster might have 12 people, not 2).
  const tasterMatch = activityOptions.find(o => o.value === activity && o.isTaster);
  const cfg = tasterMatch
    ? { mode: 'group', defaultPerTeam: 6 }
    : getActivityConfig(category, activity);

  const locationsByCategory = {
    'Sport': ['SU Sports Hall','Nancy Astor Sports Centre','Brickfield Pitches','Mast House Courts','Plymouth Life Centre','Mast House Courts'],
    'Study': ['Charles Seale-Hayne Library','Babbage Building','Harrison Building','Peter Chalk Centre','Café on the Green','Davy Building'],
    'Board Games': ['UPSU Building','Davy Building','Peter Chalk Centre','Café on the Green','Ram Bar'],
    'Opportunities': ['Roland Levinsky Building','Careers Service','Marine Building','Babbage Building','Online'],
    'Community': ['UPSU Building','Roland Levinsky Building','Davy Building','The House','Online'],
  };
  const locations = locationsByCategory[category] || locationsByCategory['Sport'];

  const handleCategoryChange = (c) => {
    setCategory(c);
    const opts = activityOptionsForPoster(c, postedBy, society);
    const firstOpt = opts[0];
    const firstActValue = firstOpt ? firstOpt.value : Object.keys(CATEGORIES[c].activities)[0];
    setActivity(firstActValue);
    const isTaster = firstOpt && firstOpt.isTaster;
    const newCfg = isTaster ? { mode: 'group', defaultPerTeam: 6 } : getActivityConfig(c, firstActValue);
    setMaxPeople(newCfg.mode === '1v1' ? 2 : (newCfg.defaultPerTeam || 4) * 2);
    setLocation((locationsByCategory[c] || locationsByCategory['Sport'])[0]);
  };

  const handleActivityChange = (a) => {
    setActivity(a);
    const opt = activityOptions.find(o => o.value === a);
    const isTaster = opt && opt.isTaster;
    const newCfg = isTaster ? { mode: 'group', defaultPerTeam: 6 } : getActivityConfig(category, a);
    setMaxPeople(newCfg.mode === '1v1' ? 2 : (newCfg.defaultPerTeam || 4) * 2);
  };

  const handleSubmit = () => {
    if (!date || !time) { alert('Please select a date and time!'); return; }
    onCreate({ category, activity, location, date, time, mode: cfg.mode, maxPeople: cfg.mode === '1v1' ? 2 : maxPeople, description: description.trim(), postedBy, ...(postedBy === 'Societies' ? { society } : {}) });
  };

  const catColors = {
    'Sport':       { active: 'from-blue-500 to-indigo-500 shadow-blue-200', idle: 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' },
    'Study':       { active: 'from-amber-500 to-orange-500 shadow-amber-200', idle: 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100' },
    'Board Games': { active: 'from-purple-500 to-pink-500 shadow-purple-200', idle: 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100' },
    'Opportunities': { active: 'from-emerald-500 to-teal-500 shadow-emerald-200', idle: 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' },
    'Community': { active: 'from-rose-500 to-pink-500 shadow-rose-200', idle: 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100' },
  };

  return (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-screen overflow-y-auto"><div style={{ height: '4px', background: 'linear-gradient(90deg, #1e3a5f, #c5a13b)' }} /><div className="p-6">
    <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold" style={{ color: '#1e3a5f' }}>Create Post</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button></div>
    <div className="space-y-4">
      <div><label className="block text-sm font-semibold text-gray-700 mb-2">Category *</label>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${visibleCategories.length}, 1fr)` }}>{visibleCategories.map(c => {
          const isActive = category === c;
          return (
            <button
              key={c}
              onClick={() => handleCategoryChange(c)}
              className="py-2.5 px-3 rounded-lg text-sm font-medium transition-all"
              style={isActive
                ? { background: '#1e3a5f', color: '#ffffff', border: '1px solid #1e3a5f' }
                : { background: '#ffffff', color: '#475569', border: '1px solid #e2e8f0' }
              }
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = '#ffffff'; }}
            >
              {c}
            </button>
          );
        })}</div>
      </div>
      <div><label className="block text-sm font-semibold text-gray-600 mb-1.5">Posted As *</label>
        <div className="grid grid-cols-3 gap-2">{['Student','Societies','Staff'].map(g => (
          <button key={g} onClick={() => {
            setPostedBy(g);
            // Reset activity to first valid option for the new poster type
            const opts = activityOptionsForPoster(category, g, society);
            if (opts.length > 0) {
              setActivity(opts[0].value);
              const isTaster = opts[0].isTaster;
              const newCfg = isTaster ? { mode: 'group', defaultPerTeam: 6 } : getActivityConfig(category, opts[0].value);
              setMaxPeople(newCfg.mode === '1v1' ? 2 : (newCfg.defaultPerTeam || 4) * 2);
            }
          }} className={`py-2 rounded-lg font-semibold text-sm transition-all text-center ${postedBy === g ? 'text-white' : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'}`} style={postedBy === g ? { background: '#1e3a5f' } : {}}>
            {g}
          </button>
        ))}</div>
        {postedBy === 'Societies' && (() => {
          const eligibleSocieties = societiesForCategory(category);
          // Sport: no society can post — show explanation instead of empty dropdown
          if (eligibleSocieties.length === 0) {
            const reason = category === 'Study'
              ? "Study posts come from individual students — switch to 'Student' above to post here."
              : `No societies post in ${category} currently. Switch to 'Student' above, or pick a different category.`;
            return (
              <div className="mt-2 px-3 py-2 rounded-lg text-xs" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a' }}>
                {reason}
              </div>
            );
          }
          return (
            <div className="mt-2">
              <select value={eligibleSocieties.includes(society) ? society : eligibleSocieties[0]} onChange={e => {
                  const newSoc = e.target.value;
                  setSociety(newSoc);
                  // Reset activity to one this new society can post
                  const opts = activityOptionsForPoster(category, 'Societies', newSoc);
                  if (opts.length > 0 && !opts.some(o => o.value === activity)) {
                    setActivity(opts[0].value);
                    const isTaster = opts[0].isTaster;
                    const newCfg = isTaster ? { mode: 'group', defaultPerTeam: 6 } : getActivityConfig(category, opts[0].value);
                    setMaxPeople(newCfg.mode === '1v1' ? 2 : (newCfg.defaultPerTeam || 4) * 2);
                  }
                }} className={inputCls}>
                {eligibleSocieties.map(s => (<option key={s} value={s}>{s}</option>))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Only societies relevant to {category} are shown.</p>
            </div>
          );
        })()}
      </div>
      <div><label className="block text-sm font-semibold text-gray-700 mb-2">Activity *</label><select value={activity} onChange={e=>handleActivityChange(e.target.value)} className={inputCls}>{activities.map(a=>(<option key={a} value={a}>{a}</option>))}</select></div>
      <div className="flex items-center gap-3">
        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${cfg.mode === '1v1' ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
          {cfg.mode === '1v1' ? 'Pair' : 'Group'}
        </span>
        {cfg.mode !== '1v1' && (
          <div className="flex items-center gap-2 flex-1">
            <label className="text-sm font-semibold text-gray-600 whitespace-nowrap">Max people:</label>
            <input type="number" min={2} max={30} value={maxPeople} onChange={e=>setMaxPeople(Math.max(2,Math.min(30,parseInt(e.target.value)||2)))} className="w-20 px-3 py-1.5 border-2 border-gray-200 rounded-xl text-center font-bold focus:border-blue-500 focus:outline-none" />
          </div>
        )}
      </div>
      <div><label className="block text-sm font-semibold text-gray-600 mb-1.5">Location *</label><select value={location} onChange={e=>setLocation(e.target.value)} className={inputCls}>{locations.map(l=>(<option key={l} value={l}>{l}</option>))}</select></div>
      <div><label className="block text-sm font-semibold text-gray-600 mb-1.5">Date *</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className={inputCls}/></div>
      <div><label className="block text-sm font-semibold text-gray-600 mb-1.5">Time *</label><input type="time" value={time} onChange={e=>setTime(e.target.value)} className={inputCls}/></div>
      <div><label className="block text-sm font-semibold text-gray-600 mb-1.5">Description <span className="text-gray-400 font-normal">(optional)</span></label><textarea value={description} onChange={e=>setDescription(e.target.value.slice(0,150))} placeholder="E.g. Casual game, all skill levels welcome!" rows={2} className={inputCls + " resize-none"} /><div className="text-xs text-gray-400 mt-1 text-right">{description.length}/150</div></div>
    </div>
    <button onClick={handleSubmit} className={btnPrimary} style={{ background: '#c5a13b', boxShadow: '0 2px 8px rgba(197,161,59,0.25)' }}>Post to Reaction</button>
  </div></div></div>);
};

// ──── REFLECTION MODAL (post-event Likert + free text) ────
const ReflectionModal = ({ post, onSave, onClose }) => {
  const [belonging, setBelonging] = useState(0);
  const [learned, setLearned] = useState(0);
  const [connection, setConnection] = useState(0);
  const [oneThing, setOneThing] = useState('');
  const canSave = belonging > 0 && learned > 0 && connection > 0;

  const LikertRow = ({ label, value, setValue, sublabel }) => (
    <div>
      <div className="text-sm font-bold mb-1" style={{ color: '#1e3a5f' }}>{label}</div>
      {sublabel && <div className="text-xs text-gray-400 mb-2">{sublabel}</div>}
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            onClick={() => setValue(n)}
            className="flex-1 py-2 rounded-lg font-bold text-sm transition-all active:scale-[0.97]"
            style={{
              background: value === n ? '#1e3a5f' : 'rgba(30,58,95,0.06)',
              color: value === n ? 'white' : '#1e3a5f',
              border: value === n ? '1px solid #1e3a5f' : '1px solid rgba(30,58,95,0.12)',
            }}
          >{n}</button>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-gray-400">Strongly disagree</span>
        <span className="text-xs text-gray-400">Strongly agree</span>
      </div>
    </div>
  );

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className="p-5" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 100%)' }}>
          <div className="text-xs font-bold uppercase tracking-wider text-white opacity-70 mb-1">Quick reflection · 2 min</div>
          <h2 className="text-lg font-bold text-white">{post?.activity}</h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>{post?.location} · helps your university evidence educational gains</p>
        </div>
        <div className="p-5 space-y-5">
          <LikertRow label="I felt I belonged at this event" value={belonging} setValue={setBelonging} sublabel="NSS B2.1 framing" />
          <LikertRow label="I learned something I'll use again" value={learned} setValue={setLearned} sublabel="TEF SO6 — evaluation of gains" />
          <LikertRow label="I made or strengthened a peer connection" value={connection} setValue={setConnection} sublabel="TEF SO5 — peer support" />
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: '#1e3a5f' }}>One thing you'll take from this <span className="text-xs font-normal text-gray-400">(optional)</span></div>
            <div className="text-xs text-gray-400 mb-2">TEF SO4 — articulation of gains in your own words</div>
            <textarea
              value={oneThing}
              onChange={e => setOneThing(e.target.value)}
              placeholder="e.g. Met two course-mates I now revise with..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>
        <div className="p-5 pt-0 flex gap-2">
          <button onClick={onClose} className="py-2 px-4 rounded-lg font-semibold text-sm transition-all" style={{ background: 'rgba(30,58,95,0.06)', color: '#5a6a7a', border: '1px solid rgba(30,58,95,0.1)' }}>Skip</button>
          <button
            onClick={() => onSave({ belonging, learned, connection, oneThing })}
            disabled={!canSave}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all active:scale-[0.97] text-white"
            style={{
              background: canSave ? '#1e3a5f' : '#d1d5db',
              boxShadow: canSave ? '0 2px 8px rgba(30,58,95,0.25)' : 'none',
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >Save reflection</button>
        </div>
      </div>
    </div>
  );
};

// ──── OUTCOME MODAL (captured application outcomes on Opportunities) ────
const OutcomeModal = ({ post, onSave, onClose }) => {
  const [status, setStatus] = useState('');
  const [oneThing, setOneThing] = useState('');
  const canSave = status !== '';

  const options = [
    { id: 'no-response', label: 'No response yet',        color: '#9ca3af' },
    { id: 'rejected',    label: 'Not successful',          color: '#9ca3af' },
    { id: 'interviewed', label: 'Got an interview',        color: '#c5a13b' },
    { id: 'offered',     label: 'Offered the role',        color: '#059669' },
    { id: 'accepted',    label: 'Accepted the offer',      color: '#10b981' },
  ];

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-2xl max-w-md w-full overflow-hidden" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className="p-5" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' }}>
          <div className="text-xs font-bold uppercase tracking-wider text-white opacity-70 mb-1">Update outcome · 30 sec</div>
          <h2 className="text-lg font-bold text-white">{post?.activity}</h2>
          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>{post?.listingDetails?.employer || 'Opportunity'} · helps your university evidence student outcomes</p>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <div className="text-sm font-bold mb-2" style={{ color: '#1e3a5f' }}>What happened with your application?</div>
            <div className="space-y-2">
              {options.map(o => (
                <button
                  key={o.id}
                  onClick={() => setStatus(o.id)}
                  className="w-full py-2.5 px-3 rounded-lg font-semibold text-sm transition-all text-left flex items-center gap-2"
                  style={{
                    background: status === o.id ? o.color : 'white',
                    color: status === o.id ? 'white' : '#1e3a5f',
                    border: status === o.id ? `1px solid ${o.color}` : '1px solid rgba(30,58,95,0.12)',
                  }}
                >
                  <span className="w-4 h-4 rounded-full border-2 flex items-center justify-center" style={{ borderColor: status === o.id ? 'white' : o.color }}>
                    {status === o.id && <span className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-sm font-bold mb-1" style={{ color: '#1e3a5f' }}>Anything you'd add? <span className="text-xs font-normal text-gray-400">(optional)</span></div>
            <textarea
              value={oneThing}
              onChange={e => setOneThing(e.target.value)}
              placeholder="e.g. Got through to second round — first interview ever..."
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>
        <div className="p-5 pt-0 flex gap-2">
          <button onClick={onClose} className="py-2 px-4 rounded-lg font-semibold text-sm transition-all" style={{ background: 'rgba(30,58,95,0.06)', color: '#5a6a7a', border: '1px solid rgba(30,58,95,0.1)' }}>Cancel</button>
          <button
            onClick={() => onSave({ status, oneThing })}
            disabled={!canSave}
            className="flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all active:scale-[0.97] text-white"
            style={{
              background: canSave ? '#059669' : '#d1d5db',
              boxShadow: canSave ? '0 2px 8px rgba(5,150,105,0.25)' : 'none',
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >Save outcome</button>
        </div>
      </div>
    </div>
  );
};

// ──── ATTENDANCE LOG COMPONENT ────
const AttendanceLog = ({
  post, attendees, currentUser, onJoin, onLeave, onViewProfile, onApply,
  isPast = false,
  userCheckedIn = false, userReflected = false, userHasOutcome = false,
  onCheckIn, onReflect, onOutcome,
  capturedOutcomeStatus = null,
}) => {
  const isOpportunity = post.category === 'Opportunities';
  const maxPlayers = post.mode === '1v1' ? 2 : (post.maxPeople || post.perTeam * 2);
  const hasJoined = attendees.includes(currentUser);
  const isFull = attendees.length >= maxPlayers;

  // ── OPPORTUNITY POST ──
  if (isOpportunity) {
    return (
      <div className="pt-3 border-t border-gray-50">
        {currentUser && !hasJoined && (
          <button onClick={() => onApply && onApply(post)} className="w-full py-2 text-white rounded-lg font-semibold text-xs transition-all active:scale-[0.97]" style={{ background: '#059669' }}>
            Apply
          </button>
        )}
        {hasJoined && !isPast && (
          <div style={{ display: 'flex', gap: '6px' }}>
            <div className="py-2 rounded-lg font-semibold text-xs text-center flex items-center justify-center gap-1.5 text-white" style={{ background: '#059669', flex: 1 }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              Applied
            </div>
            <button
              onClick={() => onLeave(post.id)}
              className="py-2 px-3 rounded-lg font-semibold text-xs transition-all active:scale-[0.97]"
              style={{ background: 'rgba(30,58,95,0.06)', color: '#9ca3af', border: '1px solid rgba(30,58,95,0.08)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,50,50,0.08)'; e.currentTarget.style.color = '#b43232'; e.currentTarget.style.borderColor = 'rgba(180,50,50,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,58,95,0.06)'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'rgba(30,58,95,0.08)'; }}
            >Withdraw</button>
          </div>
        )}
        {hasJoined && isPast && !userHasOutcome && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="py-2 rounded-lg font-semibold text-xs text-center flex items-center justify-center gap-1.5 text-white" style={{ background: '#059669' }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
              Applied
            </div>
            <button
              onClick={() => onOutcome && onOutcome(post.id)}
              className="w-full py-2 rounded-lg font-semibold text-xs transition-all active:scale-[0.97]"
              style={{ background: 'rgba(197,161,59,0.12)', color: '#9a7d2e', border: '1px solid rgba(197,161,59,0.3)' }}
            >Update outcome →</button>
            <p className="text-xs italic text-gray-400 text-center">Helps the university track student outcomes</p>
          </div>
        )}
        {hasJoined && isPast && userHasOutcome && (
          <div className="py-2 rounded-lg font-semibold text-xs text-center text-white" style={{ background: '#1e3a5f' }}>
            ✓ Outcome recorded · <span style={{ opacity: 0.85, textTransform: 'capitalize' }}>{capturedOutcomeStatus || 'logged'}</span>
          </div>
        )}
      </div>
    );
  }

  // ── NON-OPPORTUNITY POST (Sport, Study, Board Games, Community) ──
  return (
    <div className="pt-3 border-t border-gray-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Confirmed</span>
        <span className="text-xs font-semibold" style={{ color: '#1e3a5f' }}>{attendees.length} / {maxPlayers}</span>
      </div>
      {attendees.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {attendees.map(name => (
            <div key={name} onClick={() => onViewProfile && onViewProfile(name)} className="flex items-center gap-1.5 rounded-md px-2.5 py-1 transition-all cursor-pointer" style={{ background: 'rgba(30,58,95,0.04)', borderBottom: '2px solid rgba(197,161,59,0.3)' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,58,95,0.08)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,58,95,0.04)'; }}>
              <UserAvatar userName={name} size={18} />
              <span className="text-xs font-medium text-gray-600">{name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-300 italic mb-3">No one has confirmed yet — be the first!</p>
      )}
      {/* FUTURE EVENT — original RSVP behaviour */}
      {!isPast && currentUser && !hasJoined && !isFull && (
        <button onClick={() => onJoin(post.id)} className="w-full py-2 text-white rounded-lg font-semibold text-xs transition-all active:scale-[0.97]" style={{ background: '#1e3a5f' }}>
          I'll Join
        </button>
      )}
      {!isPast && currentUser && !hasJoined && isFull && (
        <div className="w-full py-2 bg-gray-50 text-gray-400 rounded-lg font-semibold text-xs text-center">Full</div>
      )}
      {!isPast && hasJoined && (
        <div style={{ display: 'flex', gap: '6px' }}>
          <div className="py-2 rounded-lg font-semibold text-xs text-center flex items-center justify-center gap-1.5 text-white" style={{ background: '#2d7a4f', flex: 1 }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            You're In
          </div>
          <button
            onClick={() => onLeave(post.id)}
            className="py-2 px-3 rounded-lg font-semibold text-xs transition-all active:scale-[0.97]"
            style={{ background: 'rgba(30,58,95,0.06)', color: '#9ca3af', border: '1px solid rgba(30,58,95,0.08)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(180,50,50,0.08)'; e.currentTarget.style.color = '#b43232'; e.currentTarget.style.borderColor = 'rgba(180,50,50,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,58,95,0.06)'; e.currentTarget.style.color = '#9ca3af'; e.currentTarget.style.borderColor = 'rgba(30,58,95,0.08)'; }}
          >Cancel</button>
        </div>
      )}
      {/* PAST EVENT — check-in / reflect / done states */}
      {isPast && hasJoined && !userCheckedIn && (
        <button onClick={() => onCheckIn && onCheckIn(post.id)} className="w-full py-2 rounded-lg font-semibold text-xs transition-all active:scale-[0.97] text-white" style={{ background: '#c5a13b', boxShadow: '0 2px 6px rgba(197,161,59,0.25)' }}>
          Check in — were you there?
        </button>
      )}
      {isPast && hasJoined && userCheckedIn && !userReflected && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div className="py-2 rounded-lg font-semibold text-xs text-center flex items-center justify-center gap-1.5 text-white" style={{ background: '#2d7a4f' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
            Checked in
          </div>
          <button onClick={() => onReflect && onReflect(post.id)} className="w-full py-2 rounded-lg font-semibold text-xs transition-all active:scale-[0.97]" style={{ background: 'rgba(30,58,95,0.06)', color: '#1e3a5f', border: '1px solid rgba(30,58,95,0.15)' }}>
            Reflect (2 min) →
          </button>
        </div>
      )}
      {isPast && hasJoined && userReflected && (
        <div className="py-2 rounded-lg font-semibold text-xs text-center text-white" style={{ background: '#1e3a5f' }}>
          ✓ Reflection saved
        </div>
      )}
      {isPast && !hasJoined && (
        <div className="w-full py-2 bg-gray-50 text-gray-400 rounded-lg font-semibold text-xs text-center italic">Event has passed</div>
      )}
    </div>
  );
};

// ──── MAIN APP ────
const BulletinBoardApp = () => {
  const [page, setPage] = useState('home');
  const [activeLandingSection, setActiveLandingSection] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [viewingProfile, setViewingProfile] = useState(null);
  const [viewingListing, setViewingListing] = useState(null);
  const [applyingTo, setApplyingTo] = useState(null);
  const [applications, setApplications] = useState({});
  const [openFilter, setOpenFilter] = useState(null);

  // Attendance state: { [postId]: [name, name, ...] }
  const [attendance, setAttendance] = useState({
    1: ['Alex Johnson', 'Tom Wilson', 'Lisa Park', 'Ryan Cooper'],
    2: ['Sarah Martinez'],
    3: ['Mike Chen', 'Jordan Lee', 'Zara Khan'],
    4: ['Emily Davis', 'Sarah Martinez', 'Lisa Park'],
    5: ['Jordan Lee', 'Ryan Cooper'],
    6: ['Tom Wilson'],
    7: ['Zara Khan', 'Alex Johnson', 'Tom Wilson', 'Emily Davis', 'Lisa Park'],
    8: ['Ryan Cooper', 'Lisa Park', 'Mike Chen', 'Alex Johnson', 'Tom Wilson', 'Sarah Martinez'],
    9: ['Sarah Martinez', 'Tom Wilson'],
    10: ['Emily Davis', 'Jordan Lee', 'Mike Chen'],
    11: ['Zara Khan', 'Alex Johnson'],
    12: ['Lisa Park', 'Ryan Cooper', 'Tom Wilson', 'Zara Khan'],
    13: ['Mike Chen', 'Emily Davis', 'Sarah Martinez', 'Jordan Lee', 'Alex Johnson'],
    14: ['Tom Wilson', 'Lisa Park'],
    15: ['Jordan Lee', 'Zara Khan', 'Ryan Cooper'],
    16: ['Alex Johnson', 'Mike Chen', 'Emily Davis', 'Tom Wilson'],
    17: ['Sarah Martinez', 'Lisa Park', 'Zara Khan', 'Ryan Cooper'],
    18: ['Emily Davis'],
    19: ['Tom Wilson', 'Alex Johnson', 'Jordan Lee', 'Mike Chen', 'Lisa Park'],
    20: ['Zara Khan', 'Sarah Martinez', 'Ryan Cooper', 'Emily Davis'],
  });

  // ──── OUTCOME CAPTURE STATE (TEF SO4–SO6 educational gains evidence) ────
  // Demo "today" — drives which events are treated as past and so eligible for check-in / reflect
  const TODAY = '2026-02-12';

  // checkedIn: students who actually attended (distinct from RSVP'd via `attendance`)
  // Shape: { [postId]: ['Alex Johnson', ...] }
  const [checkedIn, setCheckedIn] = useState({
    1: ['Alex Johnson', 'Tom Wilson', 'Lisa Park'],          // Basketball — 3 of 4 RSVPs actually came
    2: ['Sarah Martinez'],                                    // Tennis — solo, attended
    3: ['Mike Chen', 'Jordan Lee'],                           // Football — 2 of 3 attended
    5: ['James Holloway', 'Ryan Cooper'],                     // Rugby Union taster
    7: ['Zara Khan', 'Alex Johnson', 'Lisa Park'],            // Badminton — 3 of 5
    10: ['Mike Chen', 'Emily Davis', 'Jordan Lee'],           // Group Revision — 3 of 3
    11: ['Zara Khan', 'Alex Johnson'],                        // Exam Prep
    19: ['Tom Wilson', 'Jordan Lee', 'Mike Chen', 'Lisa Park'], // Catan
    20: ['Zara Khan', 'Sarah Martinez', 'Ryan Cooper'],       // Chess
    30: ['Zara Khan'],                                        // Student Ambassador (opportunity)
  });

  // reflections: post-event Likert + one-thing-learned captured from students
  // Shape: { [postId]: { [userName]: { belonging:1-5, learned:1-5, connection:1-5, oneThing:string, timestamp } } }
  const [reflections, setReflections] = useState({
    1: {
      'Alex Johnson': { belonging: 5, learned: 3, connection: 5, oneThing: 'Met two people on my course I had never spoken to before — we now revise together.', timestamp: '2026-02-07T17:30:00Z' },
      'Tom Wilson': { belonging: 4, learned: 3, connection: 4, oneThing: 'Confidence to keep showing up even when I am the worst player in the room.', timestamp: '2026-02-07T17:35:00Z' },
      'Lisa Park': { belonging: 5, learned: 4, connection: 5, oneThing: 'Realised the SU sports hall is open to non-club members on Fridays.', timestamp: '2026-02-07T18:00:00Z' },
    },
    2: {
      'Sarah Martinez': { belonging: 4, learned: 4, connection: 3, oneThing: 'Found a rally partner of similar level — first time in two years.', timestamp: '2026-02-08T16:00:00Z' },
    },
    5: {
      'James Holloway': { belonging: 5, learned: 5, connection: 5, oneThing: 'Joined the rugby club. I had been on the fence since September.', timestamp: '2026-02-11T18:30:00Z' },
      'Ryan Cooper': { belonging: 4, learned: 4, connection: 5, oneThing: 'Got introduced to two final-year students who offered to mentor me.', timestamp: '2026-02-11T18:45:00Z' },
    },
    7: {
      'Zara Khan': { belonging: 4, learned: 3, connection: 4, oneThing: '', timestamp: '2026-02-09T11:30:00Z' }, // empty oneThing — counted in reflections but not articulation
      'Alex Johnson': { belonging: 5, learned: 4, connection: 5, oneThing: 'A simple drill I can practise on my own between sessions.', timestamp: '2026-02-09T11:35:00Z' },
      'Lisa Park': { belonging: 4, learned: 3, connection: 4, oneThing: 'That intramural is more welcoming than I thought.', timestamp: '2026-02-09T11:40:00Z' },
    },
    10: {
      'Mike Chen': { belonging: 4, learned: 5, connection: 4, oneThing: 'Worked through module 4 — the bit I had been stuck on for a week.', timestamp: '2026-02-07T19:00:00Z' },
      'Emily Davis': { belonging: 4, learned: 5, connection: 4, oneThing: 'Two people willing to share notes for the modules I missed.', timestamp: '2026-02-07T19:10:00Z' },
      'Jordan Lee': { belonging: 5, learned: 5, connection: 5, oneThing: 'A study group I would not have found otherwise.', timestamp: '2026-02-07T19:15:00Z' },
    },
    11: {
      'Zara Khan': { belonging: 4, learned: 5, connection: 3, oneThing: 'Three past paper questions I now actually understand.', timestamp: '2026-02-08T20:00:00Z' },
      'Alex Johnson': { belonging: 4, learned: 4, connection: 4, oneThing: 'A clearer plan for the week before the exam.', timestamp: '2026-02-08T20:05:00Z' },
    },
    19: {
      'Tom Wilson': { belonging: 5, learned: 3, connection: 5, oneThing: 'Made friends with people outside my course for the first time.', timestamp: '2026-02-09T18:00:00Z' },
      'Jordan Lee': { belonging: 4, learned: 2, connection: 4, oneThing: '', timestamp: '2026-02-09T18:00:00Z' },
      'Mike Chen': { belonging: 5, learned: 3, connection: 4, oneThing: 'A regular weekly thing to look forward to.', timestamp: '2026-02-09T18:00:00Z' },
    },
    20: {
      'Zara Khan': { belonging: 4, learned: 4, connection: 4, oneThing: 'Joined the chess club. Going back next week.', timestamp: '2026-02-10T13:30:00Z' },
      'Sarah Martinez': { belonging: 3, learned: 4, connection: 4, oneThing: '', timestamp: '2026-02-10T13:35:00Z' },
    },
  });

  // outcomes: captured application outcomes on Opportunities posts
  // Shape: { [postId]: { [userName]: { status:'no-response'|'rejected'|'interviewed'|'offered'|'accepted', oneThing:string, timestamp } } }
  const [outcomes, setOutcomes] = useState({
    30: {
      'Zara Khan': { status: 'interviewed', oneThing: 'Got through to second round — first interview ever.', timestamp: '2026-02-09T14:00:00Z' },
    },
  });

  // Modal controllers
  const [reflectingOn, setReflectingOn] = useState(null);     // postId | null
  const [outcomeOn, setOutcomeOn] = useState(null);           // postId | null

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPostedBy, setSelectedPostedBy] = useState('all');
  const [selectedSociety, setSelectedSociety] = useState('all');
  const [selectedActivity, setSelectedActivity] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [selectedDate, setSelectedDate] = useState('all');
  const [selectedCause, setSelectedCause] = useState('all');
  const [selectedSector, setSelectedSector] = useState('all');
  const [selectedActivityType, setSelectedActivityType] = useState('all');
  const [showCategoryStats, setShowCategoryStats] = useState(false);

  const [posts, setPosts] = useState([
    // ── SPORT (mix of student-led casual + sports club-led + Taster Sessions) ──
    { id:1,  user:'Alex Johnson',    category:'Sport', activity:'Basketball',  location:'SU Sports Hall',          date:'2026-02-07', time:'15:00', mode:'team', maxPeople:10, description:'Friendly 5v5, all levels welcome. Bibs provided!', postedBy:'Student' },
    { id:2,  user:'Sarah Martinez',  category:'Sport', activity:'Tennis',      location:'Mast House Courts',       date:'2026-02-08', time:'14:00', mode:'1v1',  maxPeople:2,  description:'Looking for a rally partner — intermediate level.', postedBy:'Student' },
    { id:3,  user:'Zara Khan',       category:'Sport', activity:'Football',    location:'Brickfield Pitches',      date:'2026-02-09', time:'14:00', mode:'team', maxPeople:10, description:'5-a-side kickabout on the outdoor pitch. Bring water!', postedBy:'Staff' },
    { id:4,  user:'Ryan Cooper',     category:'Sport', activity:'Volleyball',  location:'Nancy Astor Sports Centre',date:'2026-02-14', time:'11:00', mode:'team', maxPeople:12, description:'Beach rules on the indoor court. Staff vs students!', postedBy:'Staff' },
    { id:5,  user:'James Holloway',  category:'Sport', activity:'Rugby',       location:'Brickfield Pitches',      date:'2026-02-11', time:'16:00', mode:'team', maxPeople:14, description:'Touch rugby training session — all positions welcome.', postedBy:'Societies', society:'Rugby Union Club' },
    { id:6,  user:'Aaron Webb',      category:'Sport', activity:'Cricket',     location:'Plymouth Life Centre',     date:'2026-02-16', time:'13:00', mode:'team', maxPeople:22, description:'Indoor nets practice ahead of BUCS fixture. Whites optional.', postedBy:'Societies', society:'Cricket Club' },
    { id:7,  user:'Sarah Martinez',  category:'Sport', activity:'Badminton',   location:'SU Sports Hall',          date:'2026-02-09', time:'10:00', mode:'1v1',  maxPeople:2,  description:'Morning singles — just need a partner at a similar level.', postedBy:'Student' },
    { id:8,  user:'Olivia Reed',     category:'Sport', activity:'Football',    location:'Brickfield Pitches',      date:'2026-02-13', time:'17:00', mode:'team', maxPeople:10, description:'Women\'s 5-a-side training session. New members welcome.', postedBy:'Societies', society:'Football Club' },
    { id:9,  user:'Mike Chen',       category:'Sport', activity:'Basketball',  location:'Nancy Astor Sports Centre',date:'2026-02-15', time:'12:00', mode:'team', maxPeople:10, description:'Staff lunchtime hoops — open to postgrads too.', postedBy:'Staff' },
    { id:45, user:'Tennis Club Committee', category:'Sport', activity:'Tennis (Taster Session)', location:'Mast House Courts', date:'2026-02-14', time:'13:00', mode:'group', maxPeople:12, description:'Free taster session — racquets provided. Bring trainers. New members especially welcome!', postedBy:'Societies', society:'Tennis Club' },
    { id:46, user:'Basketball Club Captain', category:'Sport', activity:'Basketball (Taster Session)', location:'SU Sports Hall', date:'2026-02-15', time:'14:00', mode:'group', maxPeople:16, description:'Open court taster. All abilities — drills, skills, scrimmage. No commitment to join.', postedBy:'Societies', society:'Basketball Club' },
    { id:47, user:'Volleyball Captain', category:'Sport', activity:'Volleyball (Taster Session)', location:'Nancy Astor Sports Centre', date:'2026-02-16', time:'15:00', mode:'group', maxPeople:14, description:'Beach + indoor rules taught. Trainers required. Pizza after for those who stay.', postedBy:'Societies', society:'Volleyball Club' },

    // ── STUDY (6 activities × mixed postedBy) ──
    { id:10, user:'Mike Chen',       category:'Study', activity:'Group Revision',   location:'Charles Seale-Hayne Library', date:'2026-02-07', time:'17:00', mode:'group', maxPeople:6,  description:'Covering modules 3–5 for the Thursday exam. Bring notes!', postedBy:'Student' },
    { id:11, user:'Jordan Lee',      category:'Study', activity:'Exam Prep',        location:'Babbage Building',            date:'2026-02-08', time:'18:00', mode:'group', maxPeople:5,  description:'Past paper practice session for BIO201.', postedBy:'Student' },
    { id:12, user:'Lisa Park',       category:'Study', activity:'Lab Partner',      location:'Harrison Building',               date:'2026-02-17', time:'09:00', mode:'1v1',   maxPeople:2,  description:'Need a lab partner for CHEM220 practicals this week.', postedBy:'Student' },
    { id:13, user:'Mike Chen',       category:'Study', activity:'Project Group',    location:'Harrison Building',               date:'2026-02-18', time:'14:00', mode:'group', maxPeople:4,  description:'Final year project sprint — UX research group forming.', postedBy:'Student' },
    { id:14, user:'Jordan Lee',      category:'Study', activity:'Lecture Buddy',    location:'Café on the Green',              date:'2026-02-19', time:'11:00', mode:'1v1',   maxPeople:2,  description:'Anyone else doing PSY310? Could use a note-sharing buddy.', postedBy:'Student' },
    { id:15, user:'Zara Khan',       category:'Study', activity:'Dissertation Help',location:'Charles Seale-Hayne Library', date:'2026-02-20', time:'15:00', mode:'group', maxPeople:3,  description:'Peer feedback on chapter drafts. Bring a printed copy!', postedBy:'Staff' },
    { id:16, user:'Tom Wilson',      category:'Study', activity:'Group Revision',   location:'Davy Building',    date:'2026-02-13', time:'10:00', mode:'group', maxPeople:8,  description:'Open revision drop-in for ARCH modules. All years welcome.', postedBy:'Societies', society:'Architecture Society (PARCS)' },
    { id:17, user:'Emily Davis',     category:'Study', activity:'Exam Prep',        location:'Peter Chalk Centre',            date:'2026-02-13', time:'09:00', mode:'group', maxPeople:6,  description:'Mock viva practice for MSc students. Staff-led session.', postedBy:'Staff' },
    { id:18, user:'Alex Johnson',    category:'Study', activity:'Project Group',    location:'Babbage Building',            date:'2026-02-14', time:'11:00', mode:'group', maxPeople:5,  description:'Computing Society hackathon prep — need backend devs.', postedBy:'Societies', society:'Computing Society' },
    { id:29, user:'Lisa Park',       category:'Study', activity:'Writing Café',     location:'Café on the Green',              date:'2026-02-22', time:'10:00', mode:'group', maxPeople:8,  description:'Quiet co-working session for essays and dissertations. Bring your laptop!', postedBy:'Societies', society:'Psychology Society' },

    // ── BOARD GAMES (mix of student + society-led, with Taster Sessions) ──
    { id:19, user:'Emily Davis',     category:'Board Games', activity:'Catan',              location:'UPSU Building',   date:'2026-02-09', time:'16:00', mode:'group', maxPeople:4,  description:'Settlers + Seafarers expansion. Beginners very welcome.', postedBy:'Societies', society:'Tabletop Gaming Society' },
    { id:20, user:'Daniel Park',     category:'Board Games', activity:'Chess',              location:'Café on the Green', date:'2026-02-10', time:'12:00', mode:'1v1', maxPeople:2,  description:'Lunchtime chess at the café. ELO welcome, beginners more welcome.', postedBy:'Societies', society:'Chess Society' },
    { id:21, user:'Aisha Banda',     category:'Board Games', activity:'Monopoly',           location:'UPSU Building',   date:'2026-02-15', time:'19:00', mode:'group', maxPeople:4,  description:'Classic Monopoly night. Snacks provided. House rules vetoed.', postedBy:'Student' },
    { id:22, user:'Lisa Park',       category:'Board Games', activity:'Risk',               location:'UPSU Building',   date:'2026-02-17', time:'17:00', mode:'group', maxPeople:5,  description:'World domination session. Expect it to last 3+ hours.', postedBy:'Societies', society:'Tabletop Gaming Society' },
    { id:23, user:'Marcus Etemadi',  category:'Board Games', activity:'Scrabble',           location:'Café on the Green', date:'2026-02-19', time:'14:00', mode:'group', maxPeople:4,  description:'Casual Scrabble — official word list, friendly stakes.', postedBy:'Student' },
    { id:24, user:'Hana Nakamura',   category:'Board Games', activity:'Poker',              location:'Ram Bar',          date:'2026-02-21', time:'20:00', mode:'group', maxPeople:6,  description:'No-limit hold em — chips, not cash. Bring your poker face.', postedBy:'Societies', society:'Poker Society' },
    { id:25, user:'Emily Davis',     category:'Board Games', activity:'Dungeons & Dragons', location:'Peter Chalk Centre', date:'2026-02-13', time:'18:00', mode:'group', maxPeople:5,  description:'New campaign starting! DM has a one-shot for newcomers.', postedBy:'Societies', society:'Tabletop Gaming Society' },
    { id:48, user:'Chess Society Captain', category:'Board Games', activity:'Chess (Taster Session)', location:'UPSU Building', date:'2026-02-15', time:'13:00', mode:'group', maxPeople:10, description:'Free open-board session. Learn the basics or play casual matches. Boards provided.', postedBy:'Societies', society:'Chess Society' },
    { id:49, user:'Tabletop Society President', category:'Board Games', activity:'Catan (Taster Session)', location:'UPSU Building', date:'2026-02-17', time:'18:00', mode:'group', maxPeople:8, description:'Multiple boards running — try Catan for the first time, or join a longer game.', postedBy:'Societies', society:'Tabletop Gaming Society' },

    // ── OPPORTUNITIES (with listing details for dedicated pages) ──
    { id:30, user:'Zara Khan',       category:'Opportunities', activity:'Part Time Vacancies',  location:'Careers Service',         date:'2026-02-07', time:'09:00', mode:'group', maxPeople:20, description:'Student Ambassador roles now open — flexible hours, great for your CV!', postedBy:'Staff', sector:'University', activityType:'Customer-Facing',
      listingDetails: { employer: 'University of Plymouth', hours: '6–12 hrs/week', pay: '£12.00/hr', duration: 'Ongoing (term-time)', deadline: '2026-02-28', requirements: 'Current UoE student, confident communicator, enthusiastic about the university.', responsibilities: 'Leading campus tours for prospective students and families, representing the university at open days and offer-holder events, sharing your student experience authentically.', howToApply: 'Submit your CV and a short cover letter via the Careers Service portal.' }},
    { id:31, user:'Emily Davis',     category:'Opportunities', activity:'Part Time Vacancies',  location:'Roland Levinsky Building',               date:'2026-02-15', time:'10:00', mode:'group', maxPeople:15, description:'Library assistant positions available. 10–15 hrs/week during term.', postedBy:'Staff', sector:'University', activityType:'Admin & Operations',
      listingDetails: { employer: 'University of Plymouth Library Services', hours: '10–15 hrs/week', pay: '£11.44/hr', duration: 'Term-time only', deadline: '2026-02-20', requirements: 'Attention to detail, ability to work independently, familiarity with library systems is a plus.', responsibilities: 'Shelving and organising materials, assisting students with enquiries, processing inter-library loans, and maintaining study spaces.', howToApply: 'Apply online via the university jobs portal. Reference: LIB-2026-PT.' }},
    { id:32, user:'Mike Chen',       category:'Opportunities', activity:'Summer Internships',   location:'Marine Building',   date:'2026-02-14', time:'14:00', mode:'group', maxPeople:30, description:'Tech internships fair — local startups and national firms. Bring your CV!', postedBy:'Staff', sector:'Tech & Engineering', activityType:'Careers Fair',
      listingDetails: { employer: 'Various (Careers Fair)', hours: 'Full-time (summer)', pay: 'Varies by employer', duration: '8–12 weeks', deadline: '2026-02-08 (event date)', requirements: 'Open to all year groups. Bring printed CVs and be ready to network.', responsibilities: 'Attend employer stands, participate in speed networking sessions, submit applications on the day or shortly after.', howToApply: 'Register attendance via the Careers Service events page. No pre-application needed.' }},
    { id:33, user:'Alex Johnson',    category:'Opportunities', activity:'Summer Internships',   location:'Online',              date:'2026-02-20', time:'11:00', mode:'group', maxPeople:50, description:'Deadline reminder: Civil Service Summer Diversity Internship closes Feb 14.', postedBy:'Societies', society:'Law Society (UPLS)', sector:'Public Sector', activityType:'Diversity Scheme',
      listingDetails: { employer: 'HM Civil Service', hours: 'Full-time (summer)', pay: '£22,000 pro rata', duration: '9 weeks (July–September)', deadline: '2026-02-14', requirements: 'Must be from an underrepresented background in the Civil Service. Open to penultimate-year undergraduates.', responsibilities: 'Working within a government department on a live policy or operational project, mentoring, and structured development programme.', howToApply: 'Apply via the Civil Service Jobs portal. You will need to complete online tests and a written application.' }},
    { id:34, user:'Tom Wilson',      category:'Opportunities', activity:'Graduate Schemes',     location:'Babbage Building',     date:'2026-02-18', time:'13:00', mode:'group', maxPeople:25, description:'Employer panel: Deloitte, Teach First & NHS Graduate Management. Q&A after.', postedBy:'Staff', sector:'Consulting', activityType:'Employer Panel',
      listingDetails: { employer: 'Deloitte, Teach First, NHS', hours: 'Full-time', pay: '£25,000–£33,000 starting', duration: '2–3 year programmes', deadline: 'Various (rolling)', requirements: 'Finalists or recent graduates. 2:1 or above typically required (varies by scheme).', responsibilities: 'Rotational placements, structured training, professional qualifications, and mentoring across different business areas or schools/trusts.', howToApply: 'Attend the panel to hear from current trainees, then apply direct via each employer\'s graduate portal.' }},
    { id:35, user:'Jordan Lee',      category:'Opportunities', activity:'Graduate Schemes',     location:'Careers Service',         date:'2026-02-12', time:'15:00', mode:'group', maxPeople:20, description:'1-to-1 CV and application review drop-in. No booking needed.', postedBy:'Staff', sector:'University', activityType:'Application Support',
      listingDetails: { employer: 'University of Plymouth Careers Service', hours: 'Drop-in (30 min slots)', pay: 'Free service', duration: 'One-off session', deadline: 'No deadline — drop in', requirements: 'Bring a draft CV or application you are working on. Open to all students and recent graduates.', responsibilities: 'A careers adviser will review your CV, cover letter, or application form and provide tailored feedback to strengthen it.', howToApply: 'Just turn up at the Careers Service during drop-in hours. First come, first served.' }},
    { id:38, user:'Ryan Cooper',     category:'Opportunities', activity:'Part Time Vacancies',  location:'Online',              date:'2026-02-14', time:'09:00', mode:'group', maxPeople:10, description:'Paid research assistant needed for Psychology dept study. 8 hrs/week.', postedBy:'Staff', sector:'Research', activityType:'Research Role',
      listingDetails: { employer: 'Department of Psychology, University of Plymouth', hours: '8 hrs/week', pay: '£12.50/hr', duration: '6 weeks (March–April)', deadline: '2026-02-21', requirements: 'Psychology or related degree student (Year 2+). Experience with Qualtrics or SPSS preferred but not essential.', responsibilities: 'Recruiting participants, administering questionnaires, entering and cleaning data, and supporting the lead researcher with literature searches.', howToApply: 'Email r.cooper@plymouth.ac.uk with your CV and a brief expression of interest.' }},

    // ── COMMUNITY (4 activity types × mixed postedBy) ──
    { id:36, user:'Sarah Martinez',  category:'Community', activity:'Volunteering',     location:'Roland Levinsky Building',               date:'2026-02-09', time:'10:00', mode:'group', maxPeople:30, description:'Beach clean volunteering trip to Wembury — transport provided!', postedBy:'Societies', society:'Environmental Society', cause:'Environment', activityType:'Outdoor Conservation' },
    { id:37, user:'Lisa Park',       category:'Community', activity:'Volunteering',     location:'UPSU Building',    date:'2026-02-13', time:'16:00', mode:'group', maxPeople:15, description:'Code Club mentor training — help local schoolchildren learn to code.', postedBy:'Societies', society:'Computing Society', cause:'Education & Youth', activityType:'Tutoring & Mentoring' },
    { id:39, user:'Emily Davis',     category:'Community', activity:'Social Events',    location:'Davy Building',           date:'2026-02-08', time:'19:00', mode:'group', maxPeople:40, description:'International food night — bring a dish from home! Sign up sheet at the Guild.', postedBy:'Societies', society:'Geography Society', cause:'Cultural & Inclusion', activityType:'Cultural Nights' },
    { id:40, user:'Alex Johnson',    category:'Community', activity:'Social Events',    location:'The House',          date:'2026-02-14', time:'20:00', mode:'group', maxPeople:50, description:'Valentine\'s quiz night — teams of 4-6, prizes for winners!', postedBy:'Staff', cause:'Social & Wellbeing', activityType:'Quiz & Games' },
    { id:41, user:'Zara Khan',       category:'Community', activity:'Fundraising',      location:'Roland Levinsky Building',               date:'2026-02-10', time:'11:00', mode:'group', maxPeople:20, description:'RAG week bake sale — all donations go to Devon Air Ambulance.', postedBy:'Societies', society:'Biomedical Science Society', cause:'Health', activityType:'Bake Sales' },
    { id:42, user:'Tom Wilson',      category:'Community', activity:'Campaigns',        location:'UPSU Building',    date:'2026-02-11', time:'14:00', mode:'group', maxPeople:25, description:'Sustainability swap shop — bring old clothes, take something new to you!', postedBy:'Societies', society:'Environmental Society', cause:'Environment', activityType:'Sustainability' },
    { id:43, user:'Jordan Lee',      category:'Community', activity:'Campaigns',        location:'Online',              date:'2026-02-12', time:'18:00', mode:'group', maxPeople:30, description:'Mental health awareness week planning meeting. All welcome to contribute ideas.', postedBy:'Staff', cause:'Mental Health', activityType:'Awareness Campaign' },
  ]);

  const currentUser = userProfile ? `${userProfile.firstName} ${userProfile.lastName}`.trim() : null;

  // ──── BOOTSTRAP: add a signed-in user to a couple of seeded past events
  // so they immediately have something to check-in/reflect on without RSVP'ing first.
  // Used by handleLogin and handleRegister. Idempotent — won't double-add.
  const PAST_BOOTSTRAP_POSTS = [1, 11]; // Basketball (Feb 7) + Exam Prep (Feb 8)
  const bootstrapPastAttendance = (userName) => {
    if (!userName) return;
    setAttendance(prev => {
      const next = { ...prev };
      PAST_BOOTSTRAP_POSTS.forEach(pid => {
        const list = next[pid] || [];
        if (!list.includes(userName)) next[pid] = [...list, userName];
      });
      return next;
    });
  };

  const handleLogin = (email) => {
    // Read firstName from URL hash if present (passed by /portal page on Reaction site).
    // Falls back to 'there' if the demo is opened directly without going through portal.
    let firstName = 'there';
    try {
      const hash = (typeof window !== 'undefined') ? window.location.hash.slice(1) : '';
      const params = new URLSearchParams(hash);
      const fn = params.get('firstName');
      if (fn) firstName = decodeURIComponent(fn);
    } catch (e) { /* ignore — fallback to 'there' */ }
    setUserProfile({firstName, lastName:'', email, university:'University of Plymouth'});
    setIsLoggedIn(true);
    setShowLoginModal(false);
    bootstrapPastAttendance(firstName.trim());
  };
  const handleRegister = (d) => {
    setUserProfile(d);
    setIsLoggedIn(true);
    setShowRegisterModal(false);
    bootstrapPastAttendance(`${d.firstName || ''} ${d.lastName || ''}`.trim());
  };
  const handleLogout = () => { setIsLoggedIn(false); setUserProfile(null); };
  const handleCreatePost = (d) => {
    const newId = posts.length + 1;
    setPosts([{ id:newId, user:currentUser, ...d }, ...posts]);
    setAttendance(prev => ({ ...prev, [newId]: [currentUser] }));
    setShowCreateModal(false);
  };

  const handleJoin = (postId) => {
    if (!currentUser) return;
    setAttendance(prev => {
      const list = prev[postId] || [];
      if (list.includes(currentUser)) return prev;
      return { ...prev, [postId]: [...list, currentUser] };
    });
  };

  const handleLeave = (postId) => {
    if (!currentUser) return;
    setAttendance(prev => {
      const list = prev[postId] || [];
      return { ...prev, [postId]: list.filter(n => n !== currentUser) };
    });
  };

  // ──── OUTCOME CAPTURE HELPERS ────
  const isPastEvent = (post) => {
    if (!post?.date) return false;
    return post.date <= TODAY;
  };
  const userHasCheckedIn = (postId) => currentUser && (checkedIn[postId] || []).includes(currentUser);
  const userHasReflected = (postId) => currentUser && !!(reflections[postId]?.[currentUser]);
  const userHasOutcome   = (postId) => currentUser && !!(outcomes[postId]?.[currentUser]);

  const handleCheckIn = (postId) => {
    if (!currentUser) return;
    setCheckedIn(prev => {
      const list = prev[postId] || [];
      if (list.includes(currentUser)) return prev;
      return { ...prev, [postId]: [...list, currentUser] };
    });
    // Open reflection prompt immediately after check-in
    setReflectingOn(postId);
  };

  const handleSaveReflection = (postId, data) => {
    if (!currentUser) return;
    setReflections(prev => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || {}),
        [currentUser]: { ...data, timestamp: new Date().toISOString() },
      },
    }));
    setReflectingOn(null);
  };

  const handleSaveOutcome = (postId, data) => {
    if (!currentUser) return;
    setOutcomes(prev => ({
      ...prev,
      [postId]: {
        ...(prev[postId] || {}),
        [currentUser]: { ...data, timestamp: new Date().toISOString() },
      },
    }));
    setOutcomeOn(null);
  };

  const handlePostedByFilter = (v) => {
    setSelectedPostedBy(v);
    if (v !== 'Societies') setSelectedSociety('all');
  };

  const sectionCategories = activeLandingSection
    ? LANDING_SECTIONS.find(s => s.key === activeLandingSection)?.categories || CATEGORY_NAMES
    : CATEGORY_NAMES;
  const allCategories = ['all', ...sectionCategories];

  // Posts that fall within the current landing section — drives all section-scoped filter options
  const sectionPosts = activeLandingSection
    ? posts.filter(p => sectionCategories.includes(p.category))
    : posts;

  // Posted By options — different cohorts post in different sections
  const postedByOpts = activeLandingSection === 'community'
    ? ['all', 'Societies', 'Staff', 'Student']
    : activeLandingSection === 'opportunities'
      ? ['all', 'Staff', 'Societies']
      : ['all', 'Student', 'Societies', 'Staff'];

  // Activity options depend on selected category (or section if no specific category chosen)
  const allActivities = selectedCategory === 'all'
    ? ['all', ...new Set(sectionPosts.map(p => p.activity))]
    : ['all', ...Object.keys(CATEGORIES[selectedCategory]?.activities || {})];
  const allLocations = ['all', ...new Set(sectionPosts.map(p => p.location))];
  const allDates = ['all', ...new Set(sectionPosts.map(p => p.date))];

  // Cause filter options (community only) — derived from posts so options always reflect what's actually live
  const allCauses = ['all', ...new Set(sectionPosts.filter(p => p.cause).map(p => p.cause))];
  // Sector filter options (opportunities only)
  const allSectors = ['all', ...new Set(sectionPosts.filter(p => p.sector).map(p => p.sector))];

  // Activity-subtype options (community/opportunities). Cascade: if an activity is selected, narrow subtypes to that activity only.
  const allActivityTypes = selectedActivity === 'all'
    ? ['all', ...new Set(sectionPosts.filter(p => p.activityType).map(p => p.activityType))]
    : ['all', ...new Set(sectionPosts.filter(p => p.activityType && p.activity === selectedActivity).map(p => p.activityType))];

  // When activity changes, reset activityType if it's no longer in the narrowed list
  const handleActivityFilter = (act) => {
    setSelectedActivity(act);
    if (act !== 'all' && selectedActivityType !== 'all') {
      const validTypes = sectionPosts
        .filter(p => p.activityType && p.activity === act)
        .map(p => p.activityType);
      if (!validTypes.includes(selectedActivityType)) setSelectedActivityType('all');
    }
  };

  // Reset activity when category changes and current activity isn't in new list
  const handleCategoryFilter = (cat) => {
    setSelectedCategory(cat);
    if (cat !== 'all' && selectedActivity !== 'all') {
      const acts = Object.keys(CATEGORIES[cat]?.activities || {});
      if (!acts.includes(selectedActivity)) setSelectedActivity('all');
    }
  };

  const filteredPosts = posts.filter(p => {
    const inSection = activeLandingSection ? sectionCategories.includes(p.category) : true;
    // Hide past events from the board unless the current user is in the attendees list.
    // This keeps the board feeling live; past events only surface when the user has a check-in or reflection to file.
    const past = isPastEvent(p);
    const joined = currentUser && (attendance[p.id] || []).includes(currentUser);
    if (past && !joined) return false;
    return inSection
      && (selectedCategory==='all'||p.category===selectedCategory)
      && (selectedPostedBy==='all'||p.postedBy===selectedPostedBy)
      && (selectedSociety==='all'||p.society===selectedSociety)
      && (selectedActivity==='all'||p.activity===selectedActivity)
      && (selectedLocation==='all'||p.location===selectedLocation)
      && (selectedDate==='all'||p.date===selectedDate)
      && (selectedCause==='all'||p.cause===selectedCause)
      && (selectedSector==='all'||p.sector===selectedSector)
      && (selectedActivityType==='all'||p.activityType===selectedActivityType);
  });

  const formatDate = (ds) => new Date(ds+'T00:00:00').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const formatTime = (ts) => { const [h,m]=ts.split(':'); const hr=parseInt(h); return `${hr%12||12}:${m} ${hr>=12?'PM':'AM'}`; };

  if (page === 'analytics') return <AnalyticsDashboard
    onBack={() => setPage('home')}
    checkedIn={checkedIn}
    reflections={reflections}
    outcomes={outcomes}
    posts={posts}
  />;
  if (viewingProfile) return <ProfilePage userName={viewingProfile} onBack={() => setViewingProfile(null)} posts={posts} />;

  // ── LISTING DETAIL PAGE (Opportunities) ──
  // ── APPLICATION FORM PAGE ──
  if (applyingTo) {
    const appPost = applyingTo;
    const ld = appPost.listingDetails || {};
    return (
      <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #f0f2f5 0%, #e8ecf1 50%, #f5f0e8 100%)' }}>
        <div className="max-w-2xl mx-auto">
          <button onClick={() => setApplyingTo(null)} className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-all hover:opacity-70" style={{ color: '#1e3a5f' }}>
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Role summary */}
          <div className="rounded-xl overflow-hidden shadow-sm mb-6" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' }}>
            <div className="p-5">
              <div className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{appPost.activity}</div>
              <h1 className="text-lg font-bold text-white mb-1">{appPost.description}</h1>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {ld.employer && <span>{ld.employer}</span>}
                {ld.pay && <span>{ld.pay}</span>}
              </div>
            </div>
          </div>

          {/* Application form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold mb-1" style={{ color: '#1e3a5f' }}>Submit your application</h2>
            <p className="text-xs text-gray-400 mb-6">Upload your CV and cover letter to apply for this role.</p>

            <div className="space-y-5">
              {/* CV upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">CV *</label>
                <label className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-emerald-400 hover:bg-emerald-50" style={{ borderColor: applications[appPost.id]?.cv ? '#059669' : '#d1d5db' }} id={`cv-drop-${appPost.id}`}>
                  {applications[appPost.id]?.cv ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="#059669" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      <span className="text-sm font-semibold" style={{ color: '#059669' }}>{applications[appPost.id].cv}</span>
                      <button onClick={(e) => { e.preventDefault(); setApplications(prev => ({ ...prev, [appPost.id]: { ...prev[appPost.id], cv: null }})); }} className="text-xs text-gray-400 hover:text-red-500 ml-2">Remove</button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                      <span className="text-sm font-medium text-gray-500">Click to upload CV</span>
                      <span className="block text-xs text-gray-400 mt-1">PDF, DOC, or DOCX (max 5MB)</span>
                    </div>
                  )}
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setApplications(prev => ({ ...prev, [appPost.id]: { ...prev[appPost.id], cv: file.name }}));
                  }} />
                </label>
              </div>

              {/* Cover letter upload */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Cover Letter</label>
                <label className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-all hover:border-emerald-400 hover:bg-emerald-50" style={{ borderColor: applications[appPost.id]?.cover ? '#059669' : '#d1d5db' }}>
                  {applications[appPost.id]?.cover ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="#059669" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      <span className="text-sm font-semibold" style={{ color: '#059669' }}>{applications[appPost.id].cover}</span>
                      <button onClick={(e) => { e.preventDefault(); setApplications(prev => ({ ...prev, [appPost.id]: { ...prev[appPost.id], cover: null }})); }} className="text-xs text-gray-400 hover:text-red-500 ml-2">Remove</button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <svg className="w-8 h-8 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/></svg>
                      <span className="text-sm font-medium text-gray-500">Click to upload Cover Letter</span>
                      <span className="block text-xs text-gray-400 mt-1">PDF, DOC, or DOCX (max 5MB)</span>
                    </div>
                  )}
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setApplications(prev => ({ ...prev, [appPost.id]: { ...prev[appPost.id], cover: file.name }}));
                  }} />
                </label>
              </div>

              {/* Optional message */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Message <span className="text-gray-400 font-normal">(optional)</span></label>
                <textarea
                  rows={3}
                  placeholder="Anything else you'd like the employer to know..."
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 transition-all resize-none"
                  value={applications[appPost.id]?.message || ''}
                  onChange={(e) => setApplications(prev => ({ ...prev, [appPost.id]: { ...prev[appPost.id], message: e.target.value }}))}
                />
              </div>

              {/* Submit */}
              <button
                onClick={() => {
                  if (!applications[appPost.id]?.cv) return;
                  handleJoin(appPost.id);
                  setApplications(prev => ({ ...prev, [appPost.id]: { ...prev[appPost.id], submitted: true }}));
                  setApplyingTo(null);
                  if (viewingListing?.id === appPost.id) {
                    // Stay on listing page, it will now show Applied
                  }
                }}
                disabled={!applications[appPost.id]?.cv}
                className="w-full py-3 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.97]"
                style={{
                  background: applications[appPost.id]?.cv ? '#059669' : '#d1d5db',
                  boxShadow: applications[appPost.id]?.cv ? '0 2px 8px rgba(5,150,105,0.3)' : 'none',
                  cursor: applications[appPost.id]?.cv ? 'pointer' : 'not-allowed',
                }}
              >
                {applications[appPost.id]?.cv ? 'Submit Application' : 'Upload CV to continue'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (viewingListing) {
    const listing = viewingListing;
    const ld = listing.listingDetails || {};
    const attendees = attendance[listing.id] || [];
    const hasApplied = attendees.includes(currentUser);
    return (
      <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #f0f2f5 0%, #e8ecf1 50%, #f5f0e8 100%)' }}>
        <div className="max-w-3xl mx-auto">
          <button onClick={() => setViewingListing(null)} className="flex items-center gap-1.5 text-sm font-semibold mb-6 transition-all hover:opacity-70" style={{ color: '#1e3a5f' }}>
            <ArrowLeft className="w-4 h-4" /> Back to listings
          </button>

          {/* Header card */}
          <div className="rounded-2xl overflow-hidden shadow-lg mb-6" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)' }}>
            <div className="p-8">
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>{listing.activity}</div>
              <h1 className="text-2xl font-bold text-white mb-3">{listing.description}</h1>
              <div className="flex items-center gap-4 flex-wrap text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {ld.employer && <span>{ld.employer}</span>}
                {ld.pay && <span style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: '6px', fontWeight: 600 }}>{ld.pay}</span>}
                {ld.hours && <span>{ld.hours}</span>}
              </div>
            </div>
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #34d399 0%, #6ee7b7 50%, #34d399 100%)' }} />
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="md:col-span-2 space-y-5">
              {ld.responsibilities && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#1e3a5f' }}>What you will do</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{ld.responsibilities}</p>
                </div>
              )}
              {ld.requirements && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#1e3a5f' }}>Requirements</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{ld.requirements}</p>
                </div>
              )}
              {ld.howToApply && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: '#1e3a5f' }}>How to apply</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{ld.howToApply}</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider mb-4" style={{ color: '#c5a13b' }}>Details</h3>
                <div className="space-y-3 text-sm">
                  {ld.employer && <div><div className="text-xs text-gray-400 font-semibold mb-0.5">Employer</div><div className="text-gray-700 font-medium">{ld.employer}</div></div>}
                  {ld.pay && <div><div className="text-xs text-gray-400 font-semibold mb-0.5">Pay</div><div className="text-gray-700 font-medium">{ld.pay}</div></div>}
                  {ld.hours && <div><div className="text-xs text-gray-400 font-semibold mb-0.5">Hours</div><div className="text-gray-700 font-medium">{ld.hours}</div></div>}
                  {ld.duration && <div><div className="text-xs text-gray-400 font-semibold mb-0.5">Duration</div><div className="text-gray-700 font-medium">{ld.duration}</div></div>}
                  {ld.deadline && <div><div className="text-xs text-gray-400 font-semibold mb-0.5">Deadline</div><div className="text-gray-700 font-medium">{ld.deadline}</div></div>}
                  <div><div className="text-xs text-gray-400 font-semibold mb-0.5">Location</div><div className="text-gray-700 font-medium">{listing.location}</div></div>
                  <div><div className="text-xs text-gray-400 font-semibold mb-0.5">Posted by</div>
                    <div className="flex items-center gap-1.5 mt-1 cursor-pointer hover:opacity-70" onClick={() => { setViewingListing(null); setViewingProfile(listing.user); }}>
                      <UserAvatar userName={listing.user} size={20} />
                      <span className="text-gray-700 font-medium text-xs">{listing.user}</span>
                    </div>
                  </div>
                </div>
              </div>

              {isLoggedIn && (
                <div>
                  {!hasApplied ? (
                    <button onClick={() => setApplyingTo(listing)} className="w-full py-3 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.97]" style={{ background: '#059669', boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
                      Apply
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-full py-3 rounded-xl font-semibold text-sm text-center text-white flex items-center justify-center gap-1.5" style={{ background: '#059669' }}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                        Applied
                      </div>
                      <button onClick={() => handleLeave(listing.id)} className="w-full py-2 rounded-lg font-semibold text-xs transition-all text-gray-400 hover:text-red-500" style={{ background: 'rgba(30,58,95,0.04)' }}>
                        Withdraw application
                      </button>
                    </div>
                  )}
                </div>
              )}
              {!isLoggedIn && (
                <button onClick={() => setShowLoginModal(true)} className="w-full py-3 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.97]" style={{ background: '#059669' }}>
                  Login to apply
                </button>
              )}
            </div>
          </div>
        </div>
        {/* Demo data disclaimer - all listings and organisations shown are illustrative */}
      <div style={{ padding: '16px 20px 24px', textAlign: 'center', fontSize: '11px', color: '#9ca3af', letterSpacing: '0.04em', fontFamily: 'system-ui, sans-serif' }}>
        Sample data shown. Listings and partner organisations are illustrative.
      </div>

      {showLoginModal && <LoginModal onClose={()=>setShowLoginModal(false)} onLogin={handleLogin} onSwitchToRegister={()=>{setShowLoginModal(false);setShowRegisterModal(true);}}/>}
        {showRegisterModal && <RegisterModal onClose={()=>setShowRegisterModal(false)} onRegister={handleRegister} onSwitchToLogin={()=>{setShowRegisterModal(false);setShowLoginModal(true);}}/>}
      </div>
    );
  }

  // ── LANDING PAGE ──
  if (page === 'home') return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #f0f2f5 0%, #e8ecf1 50%, #f5f0e8 100%)' }}>
      <div className="max-w-5xl mx-auto p-4">
        {/* Header */}
        <div className="rounded-2xl shadow-lg mb-8 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 60%, #1e3a5f 100%)' }}>
          <div className="p-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <a href={import.meta.env.BASE_URL} className="w-14 h-14 flex-shrink-0 block" aria-label="Back to home">
                  <img src={CREST_SRC} alt="University crest" className="w-14 h-14 object-contain rounded-lg" />
                </a>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>Reaction</h1>
                  <p className="text-xs font-medium" style={{ color: '#c5a13b' }}>University of Plymouth Connect</p>
                </div>
              </div>
              <div className="flex gap-2.5 flex-wrap items-center">
                <button onClick={() => setPage('analytics')} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }} onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.18)'} onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.1)'}><BarChart3 className="w-4 h-4"/> Insights</button>
                {isLoggedIn ? (<>
                  <span className="px-3.5 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(197,161,59,0.15)', color: '#c5a13b', border: '1px solid rgba(197,161,59,0.25)' }}>Welcome, {userProfile.firstName}</span>
                  <button onClick={handleLogout} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>Logout</button>
                </>) : (<>
                  <button onClick={() => setShowLoginModal(true)} className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.97]" style={{ background: '#c5a13b', boxShadow: '0 2px 8px rgba(197,161,59,0.3)' }} onMouseEnter={e => e.target.style.background='#009068'} onMouseLeave={e => e.target.style.background='#c5a13b'}>Login</button>
                  <button onClick={() => setShowRegisterModal(true)} className="px-5 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.2)'} onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.12)'}>Register</button>
                </>)}
              </div>
            </div>
          </div>
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #c5a13b 0%, #00C896 50%, #c5a13b 100%)' }} />
        </div>

        {/* Hero tagline */}
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#1e3a5f', letterSpacing: '-0.03em' }}>What do you wanna do?</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">Find people, join in, and make the most of your time at Plymouth.</p>
        </div>

        {/* Landing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {LANDING_SECTIONS.map(section => {
            const postCount = posts.filter(p => section.categories.includes(p.category)).length;
            return (
              <button
                key={section.key}
                onClick={() => { setActiveLandingSection(section.key); setSelectedCategory('all'); setSelectedActivity('all'); setSelectedLocation('all'); setSelectedDate('all'); setSelectedPostedBy('all'); setSelectedSociety('all'); setSelectedCause('all'); setSelectedSector('all'); setSelectedActivityType('all'); setPage('board'); }}
                className="group text-left rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 active:scale-[0.98] transform hover:-translate-y-1"
                style={{ background: section.gradient }}
              >
                <div className="p-8">
                  <h3 className="text-2xl font-bold text-white mb-2">{section.label}</h3>
                  <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.75)' }}>{section.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.9)' }}>{postCount} active post{postCount !== 1 ? 's' : ''}</span>
                    <span className="text-sm font-semibold text-white opacity-60 group-hover:opacity-100 transition-opacity flex items-center gap-1">Browse <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
          {/* Headline: across all categories */}
          <div className="grid grid-cols-3 gap-3 sm:gap-6 text-center">
            <div>
              <div className="text-xl sm:text-2xl font-bold" style={{ color: '#1e3a5f' }}>{posts.length}</div>
              <div className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Total Posts</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold" style={{ color: '#c5a13b' }}>{new Set(posts.map(p => p.user)).size}</div>
              <div className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Active Users</div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold" style={{ color: '#059669' }}>{Object.values(attendance).reduce((a, b) => a + b.length, 0)}</div>
              <div className="text-[10px] sm:text-xs text-gray-400 font-medium mt-1">Sign-ups</div>
            </div>
          </div>
          {/* Toggle: collapsible per-category breakdown */}
          <button
            onClick={() => setShowCategoryStats(s => !s)}
            className="w-full flex items-center justify-center gap-2 mt-4 sm:mt-5 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              color: showCategoryStats ? '#1e3a5f' : '#6b7280',
              background: showCategoryStats ? 'rgba(197,161,59,0.06)' : 'rgba(30,58,95,0.025)',
              border: showCategoryStats ? '1px solid rgba(197,161,59,0.2)' : '1px solid rgba(30,58,95,0.08)',
            }}
          >
            <span>{showCategoryStats ? 'Hide breakdown' : 'Show breakdown by category'}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: showCategoryStats ? 'rotate(180deg)' : 'rotate(0deg)' }}><path d="M6 9l6 6 6-6"/></svg>
          </button>
          {/* Per-category breakdowns (collapsible) */}
          {showCategoryStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
              {/* Campus */}
              <div className="rounded-lg p-3" style={{ background: 'rgba(197,161,59,0.05)', borderLeft: '3px solid #c5a13b' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#1e3a5f' }}>Campus</span>
                  <span className="text-[10px] font-semibold" style={{ color: '#c5a13b' }}>{posts.filter(p => ['Sport','Study','Board Games'].includes(p.category)).length} posts</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <div className="text-base font-bold" style={{ color: '#1e3a5f' }}>{posts.filter(p => p.category === 'Sport').length}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Sport</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: '#1e3a5f' }}>{posts.filter(p => p.category === 'Study').length}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Study</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: '#1e3a5f' }}>{posts.filter(p => p.category === 'Board Games').length}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Games</div>
                  </div>
                </div>
              </div>
              {/* Community */}
              <div className="rounded-lg p-3" style={{ background: 'rgba(251,113,133,0.06)', borderLeft: '3px solid #fb7185' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#881337' }}>Community</span>
                  <span className="text-[10px] font-semibold" style={{ color: '#be123c' }}>{posts.filter(p => p.category === 'Community').length} posts</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <div className="text-base font-bold" style={{ color: '#881337' }}>{COMMUNITY_SOCIAL_VALUE.totalHours.toLocaleString()}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Vol Hrs</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: '#881337' }}>{COMMUNITY_SOCIAL_VALUE.partnerOrgs}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Partners</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: '#881337' }}>{new Set(posts.filter(p => p.cause).map(p => p.cause)).size}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Causes</div>
                  </div>
                </div>
              </div>
              {/* Opportunities */}
              <div className="rounded-lg p-3" style={{ background: 'rgba(52,211,153,0.07)', borderLeft: '3px solid #059669' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#064e3b' }}>Opportunities</span>
                  <span className="text-[10px] font-semibold" style={{ color: '#059669' }}>{posts.filter(p => p.category === 'Opportunities').length} posts</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div>
                    <div className="text-base font-bold" style={{ color: '#064e3b' }}>{OPPS_MONTHLY.reduce((s, m) => s + m.applications, 0).toLocaleString()}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Apps</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: '#064e3b' }}>{OPPS_TOP_EMPLOYERS.length + 14}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Employers</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: '#064e3b' }}>{new Set(posts.filter(p => p.sector).map(p => p.sector)).size}</div>
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">Sectors</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showLoginModal && <LoginModal onClose={()=>setShowLoginModal(false)} onLogin={handleLogin} onSwitchToRegister={()=>{setShowLoginModal(false);setShowRegisterModal(true);}}/>}
      {showRegisterModal && <RegisterModal onClose={()=>setShowRegisterModal(false)} onRegister={handleRegister} onSwitchToLogin={()=>{setShowRegisterModal(false);setShowLoginModal(true);}}/>}
    </div>
  );

  return (
    <div className="min-h-screen p-4" style={{ background: 'linear-gradient(135deg, #f0f2f5 0%, #e8ecf1 50%, #f5f0e8 100%)' }}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="rounded-2xl shadow-lg mb-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2a4a6f 60%, #1e3a5f 100%)' }}>
          <div className="p-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <a href={import.meta.env.BASE_URL} className="w-14 h-14 flex-shrink-0 block" aria-label="Back to home">
                  <img src={CREST_SRC} alt="University crest" className="w-14 h-14 object-contain rounded-lg" />
                </a>
                <div>
                  <h1 className="text-2xl font-bold text-white tracking-tight cursor-pointer hover:opacity-80 transition-opacity" style={{ letterSpacing: '-0.02em' }} onClick={() => { setPage('home'); setActiveLandingSection(null); setSelectedCategory('all'); setSelectedCause('all'); setSelectedSector('all'); setSelectedPostedBy('all'); setSelectedSociety('all'); setSelectedActivity('all'); setSelectedLocation('all'); setSelectedDate('all'); setSelectedActivityType('all'); }}>Reaction</h1>
                  <p className="text-xs font-medium" style={{ color: '#c5a13b' }}>University of Plymouth Connect</p>
                </div>
              </div>
              <div className="flex gap-2.5 flex-wrap items-center">
                <button onClick={() => setPage('analytics')} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97] flex items-center gap-2" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.15)' }} onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.18)'} onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.1)'}><BarChart3 className="w-4 h-4"/> Insights</button>
                {isLoggedIn ? (<>
                  <span className="px-3.5 py-2 rounded-lg text-sm font-semibold" style={{ background: 'rgba(197,161,59,0.15)', color: '#c5a13b', border: '1px solid rgba(197,161,59,0.25)' }}>Welcome, {userProfile.firstName}</span>
                  <button onClick={() => setShowCreateModal(true)} className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.97]" style={{ background: '#c5a13b', boxShadow: '0 2px 8px rgba(197,161,59,0.3)' }} onMouseEnter={e => e.target.style.background='#009068'} onMouseLeave={e => e.target.style.background='#c5a13b'}>+ New Post</button>
                  <button onClick={handleLogout} className="px-4 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}>Logout</button>
                </>) : (<>
                  <button onClick={() => setShowLoginModal(true)} className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-[0.97]" style={{ background: '#c5a13b', boxShadow: '0 2px 8px rgba(197,161,59,0.3)' }} onMouseEnter={e => e.target.style.background='#009068'} onMouseLeave={e => e.target.style.background='#c5a13b'}>Login</button>
                  <button onClick={() => setShowRegisterModal(true)} className="px-5 py-2 rounded-lg text-sm font-semibold transition-all active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.12)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }} onMouseEnter={e => e.target.style.background='rgba(255,255,255,0.2)'} onMouseLeave={e => e.target.style.background='rgba(255,255,255,0.12)'}>Register</button>
                </>)}
              </div>
            </div>
          </div>
          <div style={{ height: '3px', background: 'linear-gradient(90deg, #c5a13b 0%, #00C896 50%, #c5a13b 100%)' }} />
        </div>

        {/* Section title bar */}
        {activeLandingSection && (() => {
          const sec = LANDING_SECTIONS.find(s => s.key === activeLandingSection);
          return (
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => { setPage('home'); setActiveLandingSection(null); setSelectedCategory('all'); setSelectedCause('all'); setSelectedSector('all'); setSelectedPostedBy('all'); setSelectedSociety('all'); setSelectedActivity('all'); setSelectedLocation('all'); setSelectedDate('all'); setSelectedActivityType('all'); }} className="flex items-center gap-1.5 text-sm font-semibold transition-all hover:opacity-70" style={{ color: '#1e3a5f' }}>
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <div style={{ width: '1px', height: '20px', background: 'rgba(0,60,60,0.15)' }} />
              <h2 className="text-lg font-bold" style={{ color: '#1e3a5f' }}>{sec?.label}</h2>
            </div>
          );
        })()}

        {/* Filters */}
        {openFilter !== null && <div style={{ position: 'fixed', inset: 0, zIndex: 35 }} onClick={() => setOpenFilter(null)} />}
        <div style={{ position: 'relative', zIndex: 40, marginBottom: '24px' }}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-wrap md:flex-nowrap items-stretch md:items-center w-full">
            {(() => {
              const isCommunity = activeLandingSection === 'community';
              const isOpportunities = activeLandingSection === 'opportunities';
              const isSubsection = isCommunity || isOpportunities;
              return [
                // CATEGORY — only shown when not in a single-category section (where it would have just one option)
                ...(!isSubsection
                  ? [{ id: 0, label: 'Category', value: selectedCategory, set: handleCategoryFilter, opts: allCategories, fmt: v => v === 'all' ? 'All Categories' : v }]
                  : []),
                // POSTED BY
                { id: 1, label: 'Posted By', value: selectedPostedBy, set: handlePostedByFilter, opts: postedByOpts, fmt: v => v === 'all' ? 'All Groups' : v },
                ...(selectedPostedBy === 'Societies' ? [{ id: 5, label: 'Society', value: selectedSociety, set: setSelectedSociety, opts: ['all', ...new Set(sectionPosts.filter(p => p.society).map(p => p.society))], fmt: v => v === 'all' ? 'All Societies' : v }] : []),
                // ACTIVITY — relabelled to "Category" in Community/Opportunities since it's now the top-level taxonomy in that section
                { id: 2, label: isSubsection ? 'Category' : 'Activity', value: selectedActivity, set: handleActivityFilter, opts: allActivities, fmt: v => v === 'all' ? (isSubsection ? 'All Categories' : 'All Activities') : v },
                // ACTIVITY (drill-down) — only in Community/Opportunities, only when subtypes exist
                ...(isSubsection && allActivityTypes.length > 1 ? [{ id: 8, label: 'Activity', value: selectedActivityType, set: setSelectedActivityType, opts: allActivityTypes, fmt: v => v === 'all' ? 'All Activities' : v }] : []),
                // CAUSE / SECTOR
                ...(isCommunity && allCauses.length > 1 ? [{ id: 6, label: 'Cause', value: selectedCause, set: setSelectedCause, opts: allCauses, fmt: v => v === 'all' ? 'All Causes' : v }] : []),
                ...(isOpportunities && allSectors.length > 1 ? [{ id: 7, label: 'Sector', value: selectedSector, set: setSelectedSector, opts: allSectors, fmt: v => v === 'all' ? 'All Sectors' : v }] : []),
                // LOCATION / DATE
                { id: 3, label: 'Location', value: selectedLocation, set: setSelectedLocation, opts: allLocations, fmt: v => v === 'all' ? 'All Locations' : v },
                { id: 4, label: 'Date', value: selectedDate, set: setSelectedDate, opts: allDates, fmt: v => v === 'all' ? 'All Dates' : formatDate(v) },
              ];
            })().map((f, idx, arr) => {
              const isActive = f.value !== 'all';
              const isOpen = openFilter === f.id;
              const isLast = idx === arr.length - 1;
              return (
                <div
                  key={f.id}
                  className="basis-1/2 md:basis-0 md:flex-1"
                  style={{ minWidth: 0, position: 'relative', borderRight: !isLast ? '1px solid rgba(30,58,95,0.08)' : 'none' }}
                >
                  <div
                    onClick={() => setOpenFilter(isOpen ? null : f.id)}
                    style={{
                      padding: '11px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                      flexWrap: 'wrap', cursor: 'pointer', userSelect: 'none', minWidth: 0,
                      borderBottom: isActive ? '2px solid #c5a13b' : isOpen ? '2px solid rgba(30,58,95,0.15)' : '2px solid transparent',
                      background: isOpen ? 'rgba(30,58,95,0.02)' : isActive ? 'rgba(30,58,95,0.015)' : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: isActive ? '#1e3a5f' : '#aab0b8', whiteSpace: 'nowrap' }}>{f.label}</span>
                    {isActive && (
                      <span
                        style={{
                          fontSize: '9px', fontWeight: 700, color: '#1e3a5f',
                          background: 'rgba(197,161,59,0.12)', padding: '2px 6px', borderRadius: '4px', lineHeight: 1.2,
                          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={f.fmt(f.value)}
                      >{f.fmt(f.value)}</span>
                    )}
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={isActive ? '#c5a13b' : '#aab0b8'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>
                  </div>
                  {isOpen && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 4px)', left: '50%', transform: 'translateX(-50%)',
                      width: 'max-content', minWidth: '160px', maxWidth: 'calc(100vw - 24px)', maxHeight: '260px', overflowY: 'auto',
                      background: 'white', borderRadius: '10px',
                      border: '1px solid rgba(30,58,95,0.1)',
                      boxShadow: '0 10px 40px rgba(30,58,95,0.14), 0 2px 8px rgba(0,0,0,0.04)',
                      padding: '5px', zIndex: 50,
                    }}>
                      <div style={{ padding: '6px 10px 4px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#c5a13b' }}>{f.label}</span>
                      </div>
                      {f.opts.map(o => {
                        const sel = f.value === o;
                        return (
                          <div
                            key={o}
                            onClick={(e) => { e.stopPropagation(); f.set(o); setOpenFilter(null); }}
                            style={{
                              padding: '7px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                              borderRadius: '6px', cursor: 'pointer',
                              fontSize: '12px', fontWeight: sel ? 700 : 500,
                              color: sel ? '#1e3a5f' : '#6b7280',
                              background: sel ? 'rgba(30,58,95,0.05)' : 'transparent',
                              borderLeft: sel ? '2px solid #c5a13b' : '2px solid transparent',
                            }}
                            onMouseEnter={(e) => { if (!sel) e.currentTarget.style.background = 'rgba(197,161,59,0.05)'; }}
                            onMouseLeave={(e) => { if (!sel) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.fmt(o)}</span>
                            {sel && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#c5a13b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d="M5 13l4 4L19 7"/></svg>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            {(selectedCategory!=='all'||selectedPostedBy!=='all'||selectedSociety!=='all'||selectedActivity!=='all'||selectedLocation!=='all'||selectedDate!=='all'||selectedCause!=='all'||selectedSector!=='all'||selectedActivityType!=='all') && (
              <div className="basis-full md:basis-auto md:flex-shrink-0" style={{ padding: '8px 10px', borderTop: '1px solid rgba(30,58,95,0.08)', display: 'flex', justifyContent: 'center' }}>
                <div onClick={()=>{setSelectedCategory('all');setSelectedPostedBy('all');setSelectedSociety('all');setSelectedActivity('all');setSelectedLocation('all');setSelectedDate('all');setSelectedCause('all');setSelectedSector('all');setSelectedActivityType('all');setOpenFilter(null);}} style={{ padding: '5px 10px', fontSize: '11px', fontWeight: 600, borderRadius: '6px', cursor: 'pointer', color: '#c5a13b', background: 'rgba(197,161,59,0.08)', whiteSpace: 'nowrap' }}>✕ Clear filters</div>
              </div>
            )}
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-3">
          {filteredPosts.length === 0 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-100"><p className="text-gray-400 text-sm">No posts match your filters.</p></div>
          ) : filteredPosts.map(post => {
            const attendees = attendance[post.id] || [];
            const maxPlayers = post.mode === '1v1' ? 2 : (post.maxPeople || 10);
            const catColors = {
              'Sport':       { accent: '#1e3a5f', light: 'rgba(30,58,95,0.06)', text: '#1e3a5f' },
              'Study':       { accent: '#c5a13b', light: 'rgba(197,161,59,0.08)', text: '#007D69' },
              'Board Games': { accent: '#6b4c8a', light: 'rgba(107,76,138,0.06)', text: '#6b4c8a' },
              'Opportunities': { accent: '#059669', light: 'rgba(5,150,105,0.06)', text: '#047857' },
              'Community': { accent: '#be123c', light: 'rgba(190,18,60,0.06)', text: '#9f1239' },
            };
            const cc = catColors[post.category] || catColors['Sport'];
            return (
            <div key={post.id} className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-all overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div className="flex">
                {/* Left accent strip */}
                <div className="w-1 flex-shrink-0" style={{ background: cc.accent }} />
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', flex: 1 }}>
                  {/* Left: main content */}
                  <div style={{ flex: 1, padding: '16px', minWidth: 0 }}>
                    {/* Row 1: Category tag + Activity title + tagline */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: cc.text }}>{post.category}</span>
                      <span className="text-gray-200">·</span>
                      <h3 className="text-sm font-bold text-gray-900">{post.activity}</h3>
                      <span className="text-xs text-gray-400 hidden sm:inline">— {getTagline(post.category, post.activity)}</span>
                    </div>

                    {/* Row 2: Clean info line */}
                    <div className="flex items-center gap-0 text-xs text-gray-500 mb-3 flex-wrap">
                      {post.category === 'Opportunities' && post.listingDetails?.employer ? (
                        <div className="flex items-center gap-1.5 pr-3.5">
                          <div className="w-5.5 h-5.5 rounded-md flex items-center justify-center text-white font-bold" style={{ width: '22px', height: '22px', background: '#059669', fontSize: '10px' }}>{post.listingDetails.employer.charAt(0)}</div>
                          <span className="font-semibold text-gray-700">{post.listingDetails.employer}</span>
                        </div>
                      ) : (
                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-gray-800 transition-colors pr-3.5" onClick={() => setViewingProfile(post.user)}>
                        <UserAvatar userName={post.user} size={22} onClick={() => setViewingProfile(post.user)} />
                        <span className="font-semibold">{post.user}</span>
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold" style={{ background: post.postedBy === 'Staff' ? 'rgba(30,58,95,0.08)' : post.postedBy === 'Societies' ? 'rgba(107,76,138,0.08)' : 'rgba(197,161,59,0.1)', color: post.postedBy === 'Staff' ? '#1e3a5f' : post.postedBy === 'Societies' ? '#6b4c8a' : '#007D69', fontSize: '10px' }}>{post.postedBy === 'Societies' && post.society ? post.society : (post.postedBy || 'Student')}</span>
                      </div>
                      )}
                      {post.category !== 'Opportunities' && (
                      <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-md transition-colors" style={{ borderLeft: '1px solid #e5e7eb' }}>
                        <Users className="w-3 h-3" style={{ color: cc.accent }} />
                        <span className="font-semibold" style={{ color: cc.text }}>{post.mode === '1v1' ? 'Pair' : `${maxPlayers} max`}</span>
                      </div>
                      )}
                      <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-md transition-colors" style={{ borderLeft: '1px solid #e5e7eb' }}>
                        <MapPin className="w-3 h-3" style={{ color: '#c5a13b' }} />
                        <span>{post.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-md transition-colors" style={{ borderLeft: '1px solid #e5e7eb' }}>
                        <Calendar className="w-3 h-3" style={{ color: '#c5a13b' }} />
                        <span>{formatDate(post.date)} · {formatTime(post.time)}</span>
                      </div>
                    </div>

                    {isLoggedIn ? (
                      <AttendanceLog
                        post={post}
                        attendees={attendees}
                        currentUser={currentUser}
                        onJoin={handleJoin}
                        onLeave={handleLeave}
                        onViewProfile={setViewingProfile}
                        onApply={(p) => setApplyingTo(p)}
                        isPast={isPastEvent(post)}
                        userCheckedIn={userHasCheckedIn(post.id)}
                        userReflected={userHasReflected(post.id)}
                        userHasOutcome={userHasOutcome(post.id)}
                        onCheckIn={handleCheckIn}
                        onReflect={(pid) => setReflectingOn(pid)}
                        onOutcome={(pid) => setOutcomeOn(pid)}
                        capturedOutcomeStatus={outcomes[post.id]?.[currentUser]?.status}
                      />
                    ) : (
                      <div className="pt-3 border-t border-gray-50 text-center">
                        <span className="text-xs text-gray-400">{post.category === 'Opportunities' ? 'Login to apply' : `${attendees.length}/${maxPlayers} confirmed — login to join`}</span>
                      </div>
                    )}
                  </div>

                  {/* Right: description panel — stretches to full card height */}
                  <div style={{ width: '30%', minWidth: '120px', maxWidth: '220px', background: 'rgba(30,58,95,0.015)', borderLeft: '1px solid rgba(0,0,0,0.04)', padding: '14px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                    <div className={`text-xs font-semibold uppercase tracking-wider mb-1.5 ${post.category === 'Opportunities' && post.listingDetails ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`} style={{ color: '#c5a13b', opacity: 0.7 }} onClick={() => { if (post.category === 'Opportunities' && post.listingDetails) setViewingListing(post); }}>{post.category === 'Opportunities' && post.listingDetails ? 'About \u203A' : 'About'}</div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <p className="leading-relaxed" style={{ fontSize: '11px', color: '#6b7280' }}>{post.description || <span className="italic" style={{ color: '#c8c8c8' }}>No description added.</span>}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );})}
        </div>

        {!isLoggedIn && filteredPosts.length > 0 && (
          <div className="mt-6 rounded-xl p-6 text-center" style={{ background: 'linear-gradient(135deg, #1e3a5f, #2a4a6f)', border: '1px solid rgba(197,161,59,0.2)' }}>
            <p className="text-white font-semibold text-base mb-3" style={{ opacity: 0.95 }}>Want to join? Login or register with your Plymouth email to get started.</p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button onClick={() => setShowLoginModal(true)} className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all active:scale-[0.97]" style={{ background: '#c5a13b', boxShadow: '0 2px 8px rgba(197,161,59,0.3)' }}>Login</button>
              <button onClick={() => setShowRegisterModal(true)} className="px-6 py-2.5 rounded-lg font-semibold text-sm text-white transition-all active:scale-[0.97]" style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)' }}>Register</button>
            </div>
          </div>
        )}
      </div>

      {showLoginModal && <LoginModal onClose={()=>setShowLoginModal(false)} onLogin={handleLogin} onSwitchToRegister={()=>{setShowLoginModal(false);setShowRegisterModal(true);}}/>}
      {showRegisterModal && <RegisterModal onClose={()=>setShowRegisterModal(false)} onRegister={handleRegister} onSwitchToLogin={()=>{setShowRegisterModal(false);setShowLoginModal(true);}}/>}
      {showCreateModal && (() => {
        // Derive which categories are available based on the user's current board.
        // 'Sport', 'Study', 'Board Games' for Campus
        // 'Community' for Community
        // 'Opportunities' for Opportunities (admin-only in real app, but allowed here for demo)
        const section = LANDING_SECTIONS.find(s => s.key === activeLandingSection);
        const allowedCategories = section ? section.categories : ['Sport', 'Study', 'Board Games'];
        return <CreatePostModal onClose={()=>setShowCreateModal(false)} onCreate={handleCreatePost} allowedCategories={allowedCategories} defaultCategory={allowedCategories[0]} />;
      })()}
      {reflectingOn && (() => {
        const post = posts.find(p => p.id === reflectingOn);
        if (!post) return null;
        return <ReflectionModal post={post} onSave={(data) => handleSaveReflection(reflectingOn, data)} onClose={() => setReflectingOn(null)} />;
      })()}
      {outcomeOn && (() => {
        const post = posts.find(p => p.id === outcomeOn);
        if (!post) return null;
        return <OutcomeModal post={post} onSave={(data) => handleSaveOutcome(outcomeOn, data)} onClose={() => setOutcomeOn(null)} />;
      })()}
    </div>
  );
};

export default BulletinBoardApp;
