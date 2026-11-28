# Managing this site from Reaction's PMS — setup

Reaction's own PMS has a **Website** tab. Through it an administrator of the PMS can
change four things here without opening `/admin`: the demos on `/demo`, the demo requests,
the accounts that can sign in, and the list of addresses that have opted out of news and
offers.

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

Which demo, request or account a change is for is sent in the body (`id`), or as `?id=`
for a removal, never in the path: none of these folders has square brackets in its name.

Nothing that was already here was changed. `/admin` works as before, and either place can
be used: both write to the same tables.

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
