// Sole approved voice; cache reuse requires matching request and output receipts.
// XI_API_KEY is read from the environment and never printed.
import {runNarration} from '../../shared/narration.mjs';
try { await runNarration(); } catch (error) { console.error(error.message); process.exitCode = 2; }
