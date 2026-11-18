# CampusSpend Firestore Security Specification

## 1. Data Invariants
1. **Strict Owner Isolation**: Every document in `/users/{userId}` and its subcollections (`expenses`, `categoryBudgets`, `friends`, `splits`) can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Master Gate Integrity**: Subcollection creates and updates verify the parent `/users/{userId}` document exists via `exists()`.
3. **Identity Integrity**: Every user document's `uid` and every subcollection document's `ownerId` must strictly equal `request.auth.uid` on create and remain immutable on update.
4. **Temporal Integrity**: `createdAt` must equal `request.time` on create and remain immutable on update; `updatedAt` must equal `request.time` on create and update.
5. **Bounded Payload & Type Safety**: All strings have explicit `.size()` bounds, numeric amounts are bounded (`> 0` or `>= 0` and `<= 10000000`), enums are strictly allowlisted, and arrays (`shares`) are bounded (`size() >= 1 && size() <= 30`).
6. **Zero Shadow Fields**: Every collection enforces `keys().hasAll(...)` and `keys().hasOnly(...)` in its validator plus `affectedKeys().hasOnly(...)` on every update action.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated read/write** to `/users/{uid}/expenses/{id}`.
2. **Cross-user read/list** of `/users/{otherUid}/expenses` by signed-in user.
3. **Unverified email** (`email_verified: false`) writing to `/users/{uid}`.
4. **UID Spoofing** on create: `uid: "other_user"` in `/users/{uid}`.
5. **OwnerId Spoofing** on expense create: `ownerId: "other_user"` in `/users/{uid}/expenses/{id}`.
6. **Shadow / Ghost Field Injection**: adding `isAdmin: true` or `role: "admin"` on `/users/{uid}` create or update.
7. **ID Poisoning**: creating `/users/{uid}/expenses/bad..id$123` or 200-char ID.
8. **Client-Forged Timestamp**: creating an expense with `createdAt: Timestamp(2020-01-01)` instead of `request.time`.
9. **Immutable Field Mutation**: updating `createdAt` or `ownerId` on an existing expense.
10. **Negative / Excessive Amount**: creating an expense with `amountInr: -500` or `amountInr: 999999999`.
11. **Invalid Enum Value**: creating an expense with `paymentMethod: "CRYPTO"` or `category: "Gambling"`.
12. **Unbounded Array / Payload Exhaustion**: creating a split with `shares: []` or > 30 shares, or a 10KB title string.
