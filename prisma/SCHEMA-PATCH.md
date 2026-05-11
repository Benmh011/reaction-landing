// prisma/SCHEMA-PATCH.md
//
// TWO CHANGES needed to prisma/schema.prisma before deploying.
//
// I don't have your full schema file in context so I'm providing a patch
// document. Apply both changes manually, then run `npx prisma db push`.

// ──── CHANGE 1: Add `marketingOptOut` to the User model ────
//
// Find the User model. Add this line (anywhere — order doesn't matter, but
// keep it near other Boolean fields for readability):

//   marketingOptOut Boolean @default(false)

// Full example showing where it goes:

// model User {
//   id              String         @id @default(cuid())
//   email           String         @unique
//   name            String?
//   organisation    String?
//   role            Role           @default(CLIENT)
//   demoVersion     String?
//   requestType     RequestType    @default(UNIVERSITY)
//   emailVerified   DateTime?
//   passwordHash    String?
//   createdAt       DateTime       @default(now())
//   updatedAt       DateTime       @updatedAt
//   marketingOptOut Boolean        @default(false)   // ← ADD THIS LINE
//
//   // ...existing relations
// }

// ──── CHANGE 2: Add a new EmailOptOut model ────
//
// This is a tombstone table — captures unsubscribes from prospects who never
// registered an account. Add this anywhere at the file's top level:

// model EmailOptOut {
//   email     String   @id
//   optedOutAt DateTime @default(now())
// }

// ──── AFTER making both changes, push the schema: ────
//
//   cd ~/Reaction
//   npx prisma db push
//   npx prisma generate
//
// Verify success — no errors. Then proceed with the rest of the deploy.
