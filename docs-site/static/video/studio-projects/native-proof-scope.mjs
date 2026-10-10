import assert from 'node:assert/strict';

export const NATIVE_PROOF_CAPTION = 'Verified here: native project coordination. Device deployment is checked separately.';
export const NATIVE_PROOF_NOTE = 'This walkthrough verifies native project coordination with Claude and Codex, including thread reuse, project memory and usage. It does not establish byte-for-byte preservation of global account metadata. Device deployment is checked separately.';

export function nativeProofScope(value) {
  const expected = {proofScope:'functional-project-coordination', wholeProfileBytePreservation:'not-established', fleetDeploymentVerified:false};
  for (const [key, exact] of Object.entries(expected)) assert.equal(value[key], exact, `Native proof scope must retain ${key}`);
  return expected;
}
