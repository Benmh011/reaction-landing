# Managing this site from Reaction's PMS — setup

Reaction's own PMS has a **Website** tab. Through it an administrator of the PMS can
change four things here without opening `/admin`: the demos on `/demo`, the demo requests,
the accounts that can sign in, and the list of addresses that have opted out of news and
offers. Articles are written in the PMS and published here, at `/articles` (see
[Articles](#articles) below).

The PMS never connects to this site's database. It asks this site, at addresses under
`/api/manage`, and this site does the work with its own code and its own rules.

## What was added

| File | Purpose |
|---|---|
| `lib/manage.ts` | the gate every managing address goes through, and the small things they share |
| `lib/manageDemos.ts` | reading and checking the demo catalogue |
| `app/api/manage/route.ts` | `GET` is the door open, and a count of what is behind it |
| `app/api/manage/demos/route.ts` | `GET` the demos, `POST` add one, `PATCH` edit one, show or hide it |
| `app/api/manage/demos/order/route.ts` | `POST` the order `/demo` shows them in |
| `app/api/manage/requests/route.ts` | `GET` the demo requests |
| `app/api/manage/requests/approve/route.ts` | `POST` approve: account, record, and the sign-in email |
| `app/api/manage/requests/reject/route.ts` | `POST` reject |
| `app/api/manage/users/route.ts` | `GET` the accounts, `POST` add one with a password, `PATCH` which demo an account sees, `DELETE` remove a client's account |
| `app/api/manage/optouts/route.ts` | `GET` who has opted out, `POST` record opt-outs taken in the PMS |
| `db/manage.sql` | only if the PMS says the opt-out list could not be read (see below) |
| `app/api/manage/articles/route.ts` | `GET` what is published, `POST` publish or publish again, `DELETE ?sourceId=` take one off |
| `app/api/manage/articles/images/route.ts` | `POST` keep a picture an article uses |
| `app/api/articles/image/route.ts` | a picture, to anybody, while a published article uses it |
| `app/articles/page.tsx` | `/articles`, the list |
| `app/articles/read/page.tsx` | one article; `/articles/<address>` is sent here by `next.config.js` |
| `components/ArticleBody.tsx` | an article's blocks drawn as the page |
| `lib/articleBlocks.ts` | what an article may hold, checked (the PMS has the same file) |
| `lib/articles.ts` | reading articles and pictures for the pages |
| `db/articles.sql` | the two tables articles need: run once (see below) |

Which demo, request or account a change is for is sent in the body (`id`), or as `?id=`
for a removal, never in the path: none of these folders has square brackets in its name.

For stage one nothing that was already here was changed. `/admin` works as before, and
either place can be used: both write to the same tables. Articles changed four files that
were here: `components/SiteNav.tsx` and `components/SiteFooter.tsx` (an Articles link,
only while something is published), `next.config.js` (the address rewrite) and
`app/api/manage/route.ts` (Articles among the parts it counts).

## The one setting

In the PMS, under Settings, Company, Website, an administrator presses **Make the managing
key**. It is shown once. Then:

1. In Vercel, open this project, then Settings, Environment Variables.
2. Add `MANAGE_KEY` with that key as its value.
3. Deploy again, so the site picks it up.

Until `MANAGE_KEY` is set, every address under `/api/manage` answers 404, as any unknown
page would.

`MANAGE_KEY` must not be the same value as `ANALYTICS_KEY`. The figures key can only read
totals; this one can change things. A site holding the same value for both refuses to be
managed and says why.

## What the key can and cannot do

It can: add, edit, show, hide and reorder demos; approve or reject a waiting request;
add a client account with a password, change which demo an account sees, and remove a
client account; read the opt-out list and add addresses to it.

It can also publish an article, publish it again with changes, and take it off, and keep
the pictures those articles use.

It cannot: delete a demo; remove an administrator or a pilot student; change anybody's
role or password; take an address off the opt-out list; read a password or its hash; or
reach anything else on the site. No sign-in opens these addresses, only the key.

Who pressed the button in the PMS is written beside each change (`reviewedBy` on a
request reads `PMS: <name>`) and to the log as an `[AUDIT]` line.

## Two things that differ from `/admin`, on purpose

- Approving a request from an address that is already an administrator here leaves that
  account an administrator. On `/admin` it would be turned into a client.
- Approving a second request from somebody who was already approved works. On `/admin`
  it fails, because a request can only link to an account no other request links to; here
  the second request is marked approved without the link.

## If the PMS says the opt-out list could not be read

That means the `EmailOptOut` table, or the `marketingOptOut` column on `User`, was never
made in this database. Open the Neon SQL editor and run the whole of `db/manage.sql`. It
is safe to run when everything is already there.

## A change of demo and when it shows

Which demo an account sees is read into the person's session when they sign in. Changing
it, here or in the PMS, shows for them the next time they sign in.

## Articles

An article is written in the PMS and kept there. Publishing sends this site a copy, which
it keeps in its own `Article` table and shows at `/articles/<address>`; the list is at
`/articles`. **Articles** appears in the menu and the footer only while at least one is
published. Taking an article off removes it here at once (its address is a 404); it stays
in the PMS as a draft.

**Run `db/articles.sql` once.** It makes the `Article` and `ArticleImage` tables. Open the
Neon SQL editor for this project's database, paste in the whole file and run it. It is
safe to run again. Until it is run, `/articles` says nothing is published and the PMS's
**Check the connection** says the file has not been run; nothing else on the site is
affected.

**What is kept.** An article's body is a list of blocks (a paragraph, a heading, a
subheading, a quote, a list, a rule, a picture), stored as JSON, never as HTML. Every
article is checked on the way in by `lib/articleBlocks.ts`, and the page is built from
the blocks by `components/ArticleBody.tsx`, so no markup anybody typed reaches a page.
Links may lead to `http`/`https` addresses, `mailto:` or a path on this site; a link to
another site opens in a new tab and is told nothing about where it came from. The site
counts the words and the reading time itself.

**Pictures** are kept in `ArticleImage` under the SHA-256 of their bytes, PNG, JPEG or
WebP only (read from the bytes, not from what they say they are), two megabytes at most.
`/api/articles/image?id=` serves one only while a published article uses it; a picture
nothing published uses answers 404. Pictures are kept when an article is taken off, so
publishing it again does not send them again.

**Addresses.** `/articles/<address>` is rewritten to `/articles/read?slug=<address>` in
`next.config.js`, so there is no folder with brackets in its name. The page names
`/articles/<address>` as its one true address. `read` is not allowed as an address. Two
articles cannot have the same address: the second is refused, in words, in the PMS.

Who pressed Publish is written beside the article (`publishedBy`, `PMS: <name>`) and to
the log as an `[AUDIT]` line. Who wrote it is not sent here.
