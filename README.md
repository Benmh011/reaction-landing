# Employer Demo v2

Three changes:

## 1. Smart salary icon
The £ icon next to salaries is now context-aware:
- "£26,000" → no icon (already has £)
- "Competitive" → no icon (no number)  
- "26,000 pro-rata" → icon shown (helps clarify currency)

No more double-£ or weird icon next to text-only values.

## 2. Application link field
New section in the post modal:
- Optional URL field for an external application link
- "Manage applications externally" checkbox makes it required
- When ticked: post displays "External portal" badge and "View on company portal" button
- When unticked: applications come through Reaction (Review applications button)

## 3. Review applications view
Click "Review N applications" on any internal post → drill into a new screen:
- Post summary at top
- List of applicants as expandable cards
- Click any applicant → expands to show:
  - Full contact email (mailto link)
  - University + course details
  - Cover letter (formatted nicely)
  - CV placeholder ("name_CV.pdf — sample")
  - "Reply to applicant" button (mailto)
- Back to dashboard link at top

Applicant data is fictional — 15 plausible applicants distributed across the 
3 seeded posts. The pre-seeded "Graduate Engineering Scheme" is marked
externally managed (links to example.com/careers/graduate-scheme) to demo that flow.

## Deploy

```
xcopy /E /Y "%USERPROFILE%\Downloads\employer-v2-bundle\*" "C:\Users\Rhys\Reaction\"
cd C:\Users\Rhys\Reaction\demos\employer
npm run build
cd C:\Users\Rhys\Reaction
git add -A
git commit -m "Employer demo v2: salary icon fix, app links, review applications"
git push
```

## Test sequence

1. Sign in as employer user
2. Check the "Your opportunities" section:
   - Software Engineering Internship: shows "Review 6 applications" button
   - Marketing Assistant: shows "Review 4 applications" button
   - Graduate Scheme: shows "External portal" badge + "View on company portal" link
3. Click "Review 6 applications" on the first post
4. New screen loads with 6 applicants
5. Click any applicant — card expands to show cover letter + CV placeholder
6. Click "Back to dashboard"
7. Click "Post a new opportunity"
8. In modal, scroll to the blue "Manage applications externally" section
9. Try unticked: just fill in optional link field
10. Try ticked: link becomes required
11. Submit — new post appears at top with the right flow
