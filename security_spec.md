# Security Specification: CONSTANTE / HÁBITO

## 1. Data Invariants
1. A user can only read, write, or delete documents inside their own user tree `/users/{userId}/...`.
2. Any document created or updated under `/users/{userId}/` must have `userId == request.auth.uid` and path `userId == request.auth.uid`.
3. Anonymous users cannot access other users' data.
4. Timestamps and schema properties must stay within defined length and type boundaries.
5. All root collections are denied by default (`match /{document=**} { allow read, write: if false; }`).

## 2. Dirty Dozen Payloads (Negative Tests)
1. Unauthenticated read to `/users/alice/habits/h1` -> DENIED.
2. Unauthenticated write to `/users/alice/logs/2026-10-07` -> DENIED.
3. User Bob writing to `/users/alice/habits/h1` with `userId: 'alice'` -> DENIED (auth.uid mismatch).
4. User Bob reading `/users/alice/entries/2026-10-07` -> DENIED.
5. User Bob attempting list queries across `/users/alice/habits` -> DENIED.
6. User Alice writing to `/users/alice/habits/h1` with `userId: 'bob'` -> DENIED.
7. User Alice writing a habit with string size > 2000 bytes -> DENIED (size limit).
8. User Alice writing to an unlisted collection `/secret_data/doc1` -> DENIED.
9. User Alice deleting Bob's log `/users/bob/logs/2026-10-07` -> DENIED.
10. Malformed ID injection `/users/alice/habits/../../../system` -> DENIED.
11. User Alice modifying immutable path where `userId` changes during update -> DENIED.
12. Attempt to bypass subcollection rule via collectionGroup query without matching owner -> DENIED.
