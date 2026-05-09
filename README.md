# Delete user feature

Adds the ability to permanently delete users from the admin panel.

## What's in this bundle

```
app/api/admin/users/[id]/route.ts    ← UPDATED (adds DELETE handler)
app/admin/users/UserRow.tsx           ← UPDATED (adds Danger Zone)
app/admin/users/page.tsx              ← UPDATED (passes isSelf flag)
```

## Safety rails (built in)

- Cannot delete yourself (returns 400, prevents lockout)
- Cannot delete the last admin (counts ADMIN role, refuses if 1)
- Unlinks DemoRequest.approvedUserId before deletion (preserves audit trail)
- Cascade deletes Account + Session via existing schema relations
- Two-line confirm dialog showing user email + irreversibility warning
- Server-side validation runs even if client-side is bypassed

## Audit logging

Each deletion writes a structured line to Vercel runtime logs:

```
[AUDIT] user_deleted id=cuid123 email=jane@example.com role=CLIENT 
        deletedBy=info@reaction.org.uk at=2026-05-09T19:15:00Z
```

Searchable in the Vercel dashboard for ~30 days. No new database table.

## Deploy

```
xcopy /E /Y "%USERPROFILE%\Downloads\delete-feature\*" "C:\Users\Rhys\Reaction\"
cd C:\Users\Rhys\Reaction
git add -A
git commit -m "Add user delete with safety rails"
git push
```

Vercel auto-deploys ~90 sec.

## Test sequence

1. /admin/users → find a non-admin test user (or create one via fake demo
   request → approve)
2. Click Edit on their row
3. Scroll to "Danger zone" at the bottom of the edit panel
4. Click "Delete user"
5. Confirm the dialog
6. Row vanishes from the list

Edge cases to verify:
- Find your own admin row → Edit → no Danger zone shown (isSelf prevents it)
- Try the API directly: DELETE /api/admin/users/<your-own-id> while signed in →
  400 error "You can't delete your own admin account"
- If you only have one admin, attempting to delete it via the API should also
  return 400

## Roll back if needed

If anything goes wrong, the previous deployment in Vercel can be promoted to
production. The DELETE endpoint can also be temporarily disabled by removing
the export from the route file.
