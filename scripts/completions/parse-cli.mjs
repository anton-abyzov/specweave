/**
 * Static parser for the commander registrations in bin/specweave.js.
 *
 * Shell completions are generated from this (scripts/completions/generate.mjs)
 * and a unit test re-generates + compares, so the completion word list can
 * never drift away from the commands the CLI actually registers.
 */

const COMMAND_RE = /^\s*\.command\('([^']+)'(.*)$/;
const INLINE_COMMAND_RE = /^\s*(?:(?:const|let|var)\s+\w+\s*=\s*)?(\w+)\.command\('([^']+)'(.*)$/;
const DESCRIPTION_RE = /^\s*\.description\('((?:[^'\\]|\\.)*)'/;
const OPTION_RE = /^\s*\.option\('((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'/;

function unescape(value) {
  return value.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

/** `'push [increment-id]'` -> `push` */
function commandWord(signature) {
  return signature.split(/\s+/)[0];
}

/**
 * Parse the CLI source into a command tree.
 * @param {string} source contents of bin/specweave.js
 * @returns {{name:string,description:string,hidden:boolean,options:{flags:string,description:string}[],subcommands:any[]}[]}
 */
export function parseCliCommands(source) {
  const lines = source.split('\n');
  /** @type {Map<string, any>} receiver variable -> command node */
  const byReceiver = new Map();
  const roots = [];

  for (let i = 0; i < lines.length; i++) {
    const match = COMMAND_RE.exec(lines[i]);
    let receiverVar = null;
    let signature = null;
    let tail = '';

    if (match) {
      // Chained form: the receiver is the previous non-empty line.
      let j = i - 1;
      while (j >= 0 && lines[j].trim() === '') j--;
      const prev = j >= 0 ? lines[j].trim() : '';
      const recv = /(?:^|=\s*)([A-Za-z_$][\w$]*)$/.exec(prev);
      if (!recv) continue;
      receiverVar = recv[1];
      signature = match[1];
      tail = match[2];
    } else {
      const inline = INLINE_COMMAND_RE.exec(lines[i]);
      if (!inline) continue;
      receiverVar = inline[1];
      signature = inline[2];
      tail = inline[3];
    }

    const parent = receiverVar === 'program' ? null : byReceiver.get(receiverVar);
    if (receiverVar !== 'program' && !parent) continue;

    const node = {
      name: commandWord(signature),
      description: '',
      hidden: /hidden:\s*true/.test(tail),
      options: [],
      subcommands: [],
    };

    // The variable this chain is assigned to (if any) can host subcommands.
    const assignLine = match
      ? (() => {
          let j = i - 1;
          while (j >= 0 && lines[j].trim() === '') j--;
          return j >= 0 ? lines[j] : '';
        })()
      : lines[i];
    const assigned = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(assignLine);
    if (assigned) byReceiver.set(assigned[1], node);

    // Walk the rest of the chain for .description()/.option().
    for (let k = i + 1; k < lines.length; k++) {
      const line = lines[k];
      const desc = DESCRIPTION_RE.exec(line);
      if (desc) {
        node.description = unescape(desc[1]);
        continue;
      }
      const opt = OPTION_RE.exec(line);
      if (opt) {
        node.options.push({ flags: unescape(opt[1]), description: unescape(opt[2]) });
        continue;
      }
      if (/^\s*\./.test(line)) continue; // .action(, .argument(, .alias( ...
      if (line.trim() === '') continue;
      break;
    }

    if (parent) parent.subcommands.push(node);
    else roots.push(node);
  }

  return roots;
}

/** Visible top-level command words, in registration order. */
export function visibleCommandNames(commands) {
  return commands.filter((c) => !c.hidden).map((c) => c.name);
}
