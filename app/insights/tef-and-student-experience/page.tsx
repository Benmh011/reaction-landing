import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

const PUBLISHED_AT = "2026-05-12";
const ARTICLE_URL = "https://reaction.org.uk/insights/tef-and-student-experience";

export const metadata: Metadata = {
  title: "TEF and student experience: what the metrics don't capture",
  description:
    "The Teaching Excellence Framework measures student experience through NSS, continuation, and Graduate Outcomes. The lived experience — belonging, peer connection, community — sits in the gaps. What that gap looks like, and what UK universities can do about it.",
  openGraph: {
    title: "TEF and student experience: what the metrics don't capture",
    description:
      "TEF measures student experience through NSS, continuation, and Graduate Outcomes. The lived experience sits in the gaps between those metrics. What that gap looks like, and what to do about it.",
    url: ARTICLE_URL,
    type: "article",
    publishedTime: PUBLISHED_AT,
    authors: ["Reaction"],
  },
  twitter: {
    card: "summary_large_image",
    title: "TEF and student experience: what the metrics don't capture",
    description:
      "TEF measures student experience through NSS, continuation, and Graduate Outcomes. The lived experience sits in the gaps.",
  },
  alternates: {
    canonical: ARTICLE_URL,
  },
};

// Article JSON-LD — surfaces this in Google as a long-form piece, not just a
// regular page. Crucial for rich-result eligibility on /insights URLs.
const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "TEF and student experience: what the metrics don't capture",
  description:
    "The Teaching Excellence Framework measures student experience through NSS, continuation, and Graduate Outcomes. The lived experience — belonging, peer connection, community — sits in the gaps between those metrics.",
  datePublished: PUBLISHED_AT,
  dateModified: PUBLISHED_AT,
  author: {
    "@type": "Organization",
    name: "Reaction",
    url: "https://reaction.org.uk",
  },
  publisher: {
    "@type": "Organization",
    name: "Reaction",
    url: "https://reaction.org.uk",
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": ARTICLE_URL,
  },
  about: [
    { "@type": "Thing", name: "Teaching Excellence Framework" },
    { "@type": "Thing", name: "Student experience" },
    { "@type": "Thing", name: "Higher education quality" },
  ],
};

// Shared inline link style — slate-blue underline, matches body prose
const linkStyle = {
  color: "var(--reaction)",
  textDecoration: "underline",
  textDecorationThickness: "1px",
  textUnderlineOffset: "3px",
} as const;

// Shared body paragraph style — generous line-height for long-form reading
const paragraphStyle = {
  fontSize: "1.075rem",
  lineHeight: 1.65,
  color: "var(--text)",
  margin: "0 0 22px",
  maxWidth: "64ch",
} as const;

// Section heading style — Newsreader italic, smaller than page title
const sectionHeadingStyle = {
  fontFamily: "'Newsreader', Georgia, serif",
  fontStyle: "italic",
  fontWeight: 600,
  fontVariationSettings: '"opsz" 96, "SOFT" 0, "WONK" 0',
  fontSize: "clamp(1.5rem, 3vw, 1.9rem)",
  lineHeight: 1.2,
  letterSpacing: "-0.02em",
  margin: "56px 0 24px",
  color: "var(--text)",
} as const;

export default function TefStudentExperienceArticle() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <SiteNav />

      <article style={{ padding: "60px 0 80px" }}>
        <div className="container-narrow">
          {/* Article header */}
          <header style={{ marginBottom: 48 }}>
            <div
              className="mono"
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 24,
                display: "flex",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/insights"
                style={{ color: "var(--text-muted)", textDecoration: "none" }}
              >
                ← Insights
              </Link>
              <span style={{ color: "var(--reaction)" }}>·</span>
              <span>12 May 2026</span>
              <span style={{ color: "var(--reaction)" }}>·</span>
              <span>11 min read</span>
            </div>
            <h1
              style={{
                fontFamily: "'Newsreader', Georgia, serif",
                fontStyle: "italic",
                fontWeight: 600,
                fontVariationSettings: '"opsz" 144, "SOFT" 0, "WONK" 0',
                fontSize: "clamp(2rem, 5vw, 3.4rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.025em",
                margin: "0 0 28px",
                color: "var(--text)",
                maxWidth: "20ch",
              }}
            >
              TEF and student experience: what the metrics don&apos;t capture
            </h1>
            <p
              style={{
                fontFamily: "'Newsreader', Georgia, serif",
                fontWeight: 400,
                fontVariationSettings: '"opsz" 48, "SOFT" 0, "WONK" 0',
                fontSize: "clamp(1.2rem, 2.2vw, 1.45rem)",
                lineHeight: 1.4,
                letterSpacing: "-0.01em",
                color: "var(--text-soft)",
                margin: 0,
                maxWidth: "44ch",
              }}
            >
              The Teaching Excellence Framework rates UK universities on student experience. The
              metrics it uses measure outcomes, not experience. What sits in the gap, and what to
              do about it.
            </p>
          </header>

          {/* Opening */}
          <p style={paragraphStyle}>
            UK higher education&apos;s most consequential external assessment — the Teaching
            Excellence Framework — claims to measure something called the &quot;student
            experience.&quot; The metrics it uses to do that are the National Student Survey,
            continuation rates, completion rates, and Graduate Outcomes survey responses fifteen
            months after a student leaves university.
          </p>

          <p style={paragraphStyle}>This is a strange definition of student experience.</p>

          <p style={paragraphStyle}>
            It&apos;s not that the metrics are wrong. They measure real things, well. But they
            measure outcomes, not the experience itself. NSS asks final-year students to score
            satisfaction across five themes. Continuation rates record who stayed and who left.
            Graduate Outcomes records salaries and employment status after the dust settles. The
            thing that produces those numbers — the actual texture of three years lived inside a
            university — sits in the gaps between them.
          </p>

          <p style={paragraphStyle}>
            This article is about that gap. What TEF measures, where the measures fall short, and
            what universities can do about the rapidly closing window before the next round of
            assessments begins.
          </p>

          {/* Section 1 */}
          <h2 style={sectionHeadingStyle}>What TEF actually measures</h2>

          <p style={paragraphStyle}>
            The Teaching Excellence Framework is run by the{" "}
            <a
              href="https://www.officeforstudents.org.uk/for-providers/quality-and-standards/about-the-tef/"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              Office for Students
            </a>
            , the independent regulator for higher education in England. Its most recent
            assessment, TEF 2023, covered 228 universities, colleges, and alternative providers.
            Of those, 46 received Gold ratings, 100 Silver, and 29 Bronze; a further 53 were
            pending at the time of initial publication. The ratings sit on top of a regulatory
            baseline that all OfS-registered providers must meet regardless of TEF outcome.
          </p>

          <p style={paragraphStyle}>
            For the first time in 2023, providers received not one rating but two: one for{" "}
            <em>student experience</em> and one for <em>student outcomes</em>, combined into an
            overall award. The Office for Students described this two-aspect structure as
            providing{" "}
            <a
              href="https://www.officeforstudents.org.uk/news-blog-and-events/blog/the-results-of-tef-2023-recognising-excellence-in-all-parts-of-the-sector/"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              &quot;richer information than looking at the overall ratings alone.&quot;
            </a>
          </p>

          <p style={paragraphStyle}>
            What feeds those two ratings is a familiar set of indicators. The student experience
            aspect uses five NSS themes: teaching on courses, assessment and feedback, academic
            support, learning resources, and student voice. The student outcomes aspect uses
            continuation rates (did students make it past year one?), completion rates (did they
            finish?), and progression — measured by the{" "}
            <a
              href="https://www.hesa.ac.uk/innovation/outcomes/about/principles"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              HESA Graduate Outcomes survey
            </a>
            , which contacts every UK graduate roughly fifteen months after they complete their
            course.
          </p>

          <p style={paragraphStyle}>
            Alongside these indicators, providers submit a fifteen-page narrative document.
            Students submit a separate document independently. The TEF panel — drawn from academic
            staff and student representatives — weighs the indicators against the submissions and
            assigns the rating. Indicators contribute no more than half the evidence of
            excellence; the rest is the narrative.
          </p>

          <p style={paragraphStyle}>
            That last sentence matters more than it sounds. In a Gold/Silver/Bronze system where
            many institutions cluster close together on the numerical indicators, the narrative is
            the difference. Two universities with materially identical NSS and continuation scores
            can land in different bands depending on how well they evidence what&apos;s behind the
            numbers. The question, then, is what counts as good evidence.
          </p>

          {/* Section 2 */}
          <h2 style={sectionHeadingStyle}>The metrics&apos; blind spots</h2>

          <p style={paragraphStyle}>
            Four observations about the TEF indicators are uncontroversial in the sector and worth
            stating plainly.
          </p>

          <p style={paragraphStyle}>
            First, <strong>NSS is retrospective</strong>. It asks final-year undergraduates to
            score their experience in the months before they leave. By the time the data is
            collected, the student has finished. Whatever it captures about the experience is
            filtered through end-of-degree perspective: relief, exhaustion, nostalgia, future
            anxiety. It is also annual, so any institutional change introduced midway through a
            cohort&apos;s degree shows up in the data — if at all — years later.
          </p>

          <p style={paragraphStyle}>
            Second, <strong>continuation and completion are outcomes, not explanations</strong>.
            Knowing that 91% of a cohort continued to year two tells you nothing about why 9%
            didn&apos;t. The students who left took the reasons with them. The students who stayed
            may have stayed for reasons that have nothing to do with anything the institution did
            or didn&apos;t do.
          </p>

          <p style={paragraphStyle}>
            Third, <strong>Graduate Outcomes runs fifteen months after the student leaves</strong>.
            HESA&apos;s annual survey contacts{" "}
            <a
              href="https://en.wikipedia.org/wiki/Graduate_Outcomes"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              approximately 700,000 graduates each year
            </a>
            ; the most recent published data had a 44% response rate. The fifteen-month gap is, the
            agency explains, intended to give graduates &quot;a meaningful opportunity to progress
            in their post-graduation activities.&quot; This is a reasonable trade-off for the
            metric it produces. But it produces a graduate metric, not a student-experience metric.
            By the time it&apos;s measured, the student isn&apos;t a student.
          </p>

          <p style={paragraphStyle}>
            Fourth — and this is the one that most directly motivates what follows —{" "}
            <strong>none of these capture belonging</strong>. Belonging is the term sector research
            has converged on for the lived sense of being part of a community, fitting in, having
            peers, knowing how to ask for help. There is now a substantial body of evidence linking
            belonging to all of the outcomes TEF actually measures.{" "}
            <a
              href="https://www.advance-he.ac.uk/news-and-views/fostering-belonging-higher-education-implications-student-retention-and-wellbeing"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              AdvanceHE&apos;s analysis
            </a>{" "}
            frames it as &quot;a crucial element for academic success, student retention, and
            overall wellbeing.&quot; The 2022{" "}
            <a
              href="https://www.hepi.ac.uk/wp-content/uploads/2022/11/Student-belonging-and-the-wider-context.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              HEPI / Advance HE Student Academic Experience Survey
            </a>{" "}
            found just 45% of students felt they belonged at their institution.
          </p>

          <p style={paragraphStyle}>
            The connection runs from belonging to retention to continuation rates to TEF ratings.
            But it runs in that direction. The metric at the end of the chain — continuation — can
            tell you the chain broke somewhere. It cannot tell you where.
          </p>

          {/* Section 3 */}
          <h2 style={sectionHeadingStyle}>What the gap looks like in practice</h2>

          <p style={paragraphStyle}>Consider two cohorts at two universities.</p>

          <p style={paragraphStyle}>
            Cohort A has good attendance, decent assessment marks, and a strong continuation rate.
            The cohort&apos;s NSS scores come in above benchmark. On the metrics that TEF
            measures, the institution looks healthy. But inside the cohort, there are students who
            have made no friends, who haven&apos;t been to a society event, who eat alone, and who
            plan to commute home every weekend until graduation. They will probably finish. They
            will probably even score the institution positively on the NSS. But the experience
            they had is not the experience the institution is trying to deliver, and the metrics
            will not flag it.
          </p>

          <p style={paragraphStyle}>
            Cohort B looks identical on every TEF indicator. But its students are embedded — in
            societies, in sports clubs, in study groups, in the local community. The continuation
            rate is the same. The NSS scores are the same. The eventual Graduate Outcomes results
            will probably be similar. From outside, the two cohorts are indistinguishable.
          </p>

          <p style={paragraphStyle}>
            This is the kind of distinction the TEF narrative submission is supposed to capture.
            In practice, most universities struggle to evidence it beyond survey extracts and
            anecdotes. The OfS itself acknowledged after TEF 2023 that the{" "}
            <a
              href="https://www.officeforstudents.org.uk/news-blog-and-events/blog/that-s-a-wrap-tef-2023-final-results-published/"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              provider submissions
            </a>{" "}
            varied widely in the depth of evidence offered for student experience claims. The
            panel&apos;s summary statements, published alongside ratings, give a window into how
            submissions were weighed.
          </p>

          <p style={paragraphStyle}>
            The pattern is consistent: where two institutions are otherwise comparable on the
            indicators, the one with concrete, segmented, longitudinal evidence of <em>how</em>{" "}
            it delivers the student experience outperforms the one relying on satisfaction quotes.
            The gap between Silver and Gold often lives precisely in that evidence layer.
          </p>

          <p style={paragraphStyle}>
            This matters more under the next TEF than it did under TEF 2023. From the proposed{" "}
            <a
              href="https://www.officeforstudents.org.uk/reforms-to-quality-regulation/consultation-on-the-future-approach-to-quality-regulation/section-2-the-future-tef/"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              integrated quality system
            </a>{" "}
            onwards, a Bronze rating will explicitly mean only that a provider meets the minimum
            quality baseline — not that it demonstrates excellence. Under proposals out for
            consultation in late 2025, Bronze-rated providers may also face restrictions on student
            number growth. The cost of weak narrative evidence rises accordingly.
          </p>

          {/* Section 4 */}
          <h2 style={sectionHeadingStyle}>What good narrative evidence looks like</h2>

          <p style={paragraphStyle}>
            The TEF 2023 panel&apos;s published statements reveal what panel members rewarded.
            Three patterns recur.
          </p>

          <p style={paragraphStyle}>
            <strong>Evidence is segmented by student characteristics.</strong> A claim that
            &quot;students benefit from a strong sense of community&quot; is weak. The same claim
            broken down by Access &amp; Participation Plan target groups — commuter students,
            mature students, BAME students, students with disabilities, students from
            low-participation neighbourhoods — is much stronger. The panel cannot easily compare
            benchmark satisfaction scores across these groups (NSS data is benchmarked at the
            provider level), so segmented evidence about <em>experience</em> is genuinely additive.
          </p>

          <p style={paragraphStyle}>
            <strong>Evidence is longitudinal.</strong> A single-year snapshot is easy to dismiss as
            an outlier. Three years of trend data on the same metric — engagement with society
            events broken down by year of study, or year-on-year change in proportion of
            first-years reporting close peer connections — speaks to whether institutional
            interventions are working. The TEF four-year cycle (and, under proposals, the new
            three-to-five-year rolling cycle) rewards institutions that have been collecting data
            continuously, not those that started collecting in the year before submission.
          </p>

          <p style={paragraphStyle}>
            <strong>Evidence connects intervention to outcome.</strong> Panels respond to causal
            chains, not correlations. An institution that can show &quot;we introduced peer
            mentoring in commuter cohorts in 2022, peer-mentoring participation rose to 62% of
            eligible students, continuation in that group rose 4 percentage points relative to the
            comparison group&quot; has done the work. An institution that can show only the
            continuation improvement has not.
          </p>

          <p style={paragraphStyle}>
            What none of this requires is a new metric. It requires the data the institution
            already generates — society memberships, event attendance, peer-connection
            participation, internal pulse-survey responses — to be captured systematically,
            demographically segmented, and linked back to formal student-record data. Most
            universities have most of this data. Few have it in a form that can survive a TEF
            panel&apos;s scrutiny.
          </p>

          <p style={paragraphStyle}>
            This is the infrastructure gap that platforms like{" "}
            <Link href="/" style={linkStyle}>
              Reaction
            </Link>{" "}
            are starting to fill: capturing peer-connection and engagement data continuously,
            broken down by APP demographic categories, and exportable into the formats panels
            actually read. The broader point is that the gap can be filled by systematic data
            capture in whatever form an institution chooses — but it needs to be filled before
            it&apos;s needed, not after.
          </p>

          {/* Section 5 */}
          <h2 style={sectionHeadingStyle}>Where this goes next</h2>

          <p style={paragraphStyle}>
            In June 2025, the Office for Students{" "}
            <a
              href="https://www.officeforstudents.org.uk/news-blog-and-events/blog/developing-our-future-approach-to-quality-assessment/"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              confirmed publicly
            </a>{" "}
            that the TEF will not run as a one-off exercise in 2027. The new approach — currently
            out for sector consultation — proposes a{" "}
            <a
              href="https://www.timeshighereducation.com/news/no-rerun-teaching-excellence-framework-2027-ofs-indicates"
              target="_blank"
              rel="noopener noreferrer"
              style={linkStyle}
            >
              rolling assessment cycle
            </a>{" "}
            where every registered provider is assessed every three to five years depending on its
            current rating. Gold-rated providers cycle every five years; Silver every four; Bronze
            every three. All providers will participate, including the smaller colleges that
            previously opted out.
          </p>

          <p style={paragraphStyle}>Three things follow for institutions thinking about evidence.</p>

          <p style={paragraphStyle}>
            First, the calendar advantage of preparing close to a submission deadline disappears.
            Under a rolling system, the next submission could be a year away or five years away
            depending on the current rating. The institutions that win are those that have been
            collecting the right evidence continuously.
          </p>

          <p style={paragraphStyle}>
            Second, the proposals suggest a greater weight on direct student input — not just the
            student submission, but evidence of how students contribute to and benefit from the
            experience. Belonging, peer connection, and engagement-based evidence become more
            central, not less.
          </p>

          <p style={paragraphStyle}>
            Third, the Bronze rating is being explicitly redefined as &quot;meets the minimum
            quality requirements,&quot; with potential consequences for student recruitment caps.
            The distance between Bronze and Silver — historically a difficult call for panels
            assessing similar-looking institutions — becomes a high-stakes distance.
          </p>

          <p style={paragraphStyle}>
            For Pro-VCs, Directors of Student Experience, and the teams that prepare TEF narrative
            submissions, the implication is clear. The infrastructure for evidencing student
            experience needs to exist before it&apos;s needed.
          </p>

          {/* Conclusion */}
          <h2 style={sectionHeadingStyle}>Closing</h2>

          <p style={paragraphStyle}>
            TEF&apos;s metrics are not going away. They were designed to be the comparable,
            benchmarkable, regulatory backbone of UK higher education quality assessment, and they
            will continue in that role through whatever the integrated system becomes.
          </p>

          <p style={paragraphStyle}>
            The gap between what they measure and what students actually live will also continue.
          </p>

          <p style={paragraphStyle}>
            Institutions that build the evidence layer above the metrics — peer connection data,
            belonging signals, segmented engagement records — will own the narrative space where
            TEF panels make the close calls. The ones that don&apos;t will keep submitting strong
            NSS scores and hoping the panel reads between the lines.
          </p>

          <p style={paragraphStyle}>
            Pro-VCs we&apos;re speaking to are already thinking past TEF 2023 to whatever the
            integrated system becomes. The institutions that come out well will be the ones that
            started measuring what mattered before being told to.
          </p>

          {/* Soft CTA */}
          <div
            style={{
              marginTop: 56,
              padding: "32px 0 0",
              borderTop: "1px solid var(--rule)",
            }}
          >
            <p
              className="mono"
              style={{
                fontSize: "0.72rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                marginBottom: 14,
              }}
            >
              About Reaction
            </p>
            <p
              style={{
                fontSize: "1rem",
                lineHeight: 1.6,
                color: "var(--text-soft)",
                margin: "0 0 24px",
                maxWidth: "60ch",
              }}
            >
              Reaction is a platform that connects students on and off campus — capturing
              peer-connection and engagement data continuously, demographically segmented, and
              built for the evidence work this article describes. If you&apos;d like to see how it
              works in practice, get in touch.
            </p>
            <Link href="/demo" className="btn btn-primary">
              Book a demo
              <span className="arrow" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </article>

      <SiteFooter />
    </>
  );
}
