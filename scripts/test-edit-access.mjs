import assert from "node:assert/strict";
import { identityFromFragment, profileFromFragment } from "../lib/edit-access.ts";

const identity = { id: "a1b2c3d4-1234-4567-89ab-123456789abc", token: "ab".repeat(32) };
const legacyFragment = `#edit=${identity.id}.${identity.token}`;
assert.deepEqual(identityFromFragment(legacyFragment), identity);
assert.equal(profileFromFragment(legacyFragment), identity.id, "Old private links must still open the existing profile");
assert.equal(profileFromFragment(`#profile=${identity.id}`), identity.id, "The old Site must forward remembered profiles");
assert.equal(profileFromFragment("#profile=invalid"), null);
for (const fragment of ["", "#edit=bad", `#edit=${identity.id}.short`, `#edit=${identity.id}.${identity.token}.extra`, `#edit=../.${identity.token}`]) {
  assert.equal(identityFromFragment(fragment), null, "Malformed edit links must be rejected");
}
console.log("PASS: profile restoration, legacy-link compatibility, invalid-link rejection.");
