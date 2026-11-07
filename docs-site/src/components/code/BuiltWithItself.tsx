import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {GitMerge} from 'lucide-react';
import styles from './BuiltWithItself.module.css';

/*
  "SpecWithCode is built with SpecWithCode", shared by /code and the home page.
  Numbers cover 9 October to 7 November 2026 and match the "Built with itself" section of the
  anton-abyzov/specwithcode README (PR #32): increments from .specweave/increments in the public
  planning repo, merged pull requests from the app's development repository, and thread-linked pull
  requests from the thread records on the maintainer's main Mac. The 418 is a floor: pull requests
  from the Linux worker's threads, deleted threads, release automation and work outside the app are
  not in it. Never claim every change was made in SpecWithCode.
  The screenshot is a crop of the 1144 handoff E2E capture (30-worker-thread-on-ministorm.png),
  with the sidebar (account and personal chats) cut away.
*/

export const SPECS_URL = 'https://github.com/anton-abyzov/specweave-umb/tree/main/.specweave/increments';

function stats(): {value: string; label: string}[] {
  return [
    {value: '302', label: translate({id: 'builtWithItself.stat.specs', message: 'SpecWithCode increments, each a spec.md with numbered acceptance criteria and a task ledger; 215 completed', description: 'Label under the number 302. Keep product names and spec.md in English'})},
    {value: '1,393', label: translate({id: 'builtWithItself.stat.prs', message: 'pull requests merged into the app, including 169 release PRs', description: 'Label under the number 1,393'})},
    {value: '418+', label: translate({id: 'builtWithItself.stat.threadLinked', message: 'of those linked in the app’s own records to 204 worker threads on the main Mac: 278 from Claude Code, 127 from Codex, 13 from GitHub Copilot', description: 'Label under the number 418+ (at least 418). Keep product names in English'})},
  ];
}

function merged(): {n: number; title: string; agent: string}[] {
  return [
    {n: 961, title: translate({id: 'builtWithItself.pr.961', message: 'Keep user goals open beyond completed source milestones', description: 'Title of a real merged pull request'}), agent: 'Codex'},
    {n: 954, title: translate({id: 'builtWithItself.pr.954', message: 'Skills in this session popover in the composer', description: 'Title of a real merged pull request'}), agent: 'Gemini CLI'},
    {n: 927, title: translate({id: 'builtWithItself.pr.927', message: 'Prefer Connect fleet routes and support unlimited account capacity', description: 'Title of a real merged pull request. "Connect" is a product name; keep it in English'}), agent: 'Codex'},
    {n: 880, title: translate({id: 'builtWithItself.pr.880', message: 'Point the thread machine chip at Hand off to', description: 'Title of a real merged pull request; "Hand off to" is a menu item name in the app'}), agent: 'Claude Code'},
    {n: 873, title: translate({id: 'builtWithItself.pr.873', message: 'Ask on return by default; idle compaction opt-in', description: 'Title of a real merged pull request'}), agent: 'Claude Code'},
    {n: 837, title: translate({id: 'builtWithItself.pr.837', message: 'PPTX artifacts open with a slide preview', description: 'Title of a real merged pull request'}), agent: 'Claude Code'},
  ];
}

const SHOT = '/img/studio/built-with-itself-ministorm-20261030.webp';

export default function BuiltWithItself({id = 'built-with-itself', more = true}: {id?: string; more?: boolean}) {
  const titleId = `${id}-title`;
  const STATS = stats();
  const MERGED = merged();
  return <section className={styles.band} id={id} aria-labelledby={titleId}>
    <div className={styles.top}>
      <div className={styles.copy}>
        <p className={styles.kicker}><Translate id="builtWithItself.kicker" description="Small label above the heading. Keep product names in English">SpecWithCode · free, early access</Translate></p>
        <h2 id={titleId}><Translate id="builtWithItself.title" description="Section heading. Keep product names in English">SpecWithCode is built with SpecWithCode</Translate></h2>
        <p className={styles.lead}><Translate id="builtWithItself.lead" description="Section lead paragraph. Keep product names in English">We build the app in the app. A coordinator keeps each project’s brief, worker threads on Claude Code, Codex and other agents write the changes and open the pull requests, and the work runs across a Mac and a Linux worker joined over SpecWithCode Connect.</Translate></p>
        <dl className={styles.stats}>
          {STATS.map(s => <div key={s.value}><dt>{s.value}</dt><dd>{s.label}</dd></div>)}
        </dl>
        <p className={styles.source}><Translate id="builtWithItself.statsSource" description="Source note under the numbers">From 9 October to 7 November 2026. The 418 is a floor: pull requests from the Linux worker’s threads, deleted threads and release automation are not counted, and some work happened outside the app.</Translate>{' '}<a className={clsx('wv-link', styles.link)} href={SPECS_URL}><Translate id="builtWithItself.specsLink" description="Link to the public folder of SpecWeave increments (specs) on GitHub">See the specs</Translate></a></p>
      </div>
      <figure className={clsx('wv-window', styles.shot)}>
        <div className="wv-window__bar"><span>SpecWithCode</span><span><Translate id="builtWithItself.window.title" description="Window title bar label of the screenshot">Mac coordinator, Linux worker</Translate></span></div>
        <a href={SHOT} aria-label={translate({id: 'builtWithItself.shot.ariaLabel', message: 'Open the full-size screenshot of a worker thread on ministorm', description: 'Accessible label of the screenshot link; "ministorm" is a machine name, keep it'})}>
          <img src={SHOT} width={1238} height={760} loading="lazy" decoding="async" alt={translate({id: 'builtWithItself.shot.alt', message: 'Actual SpecWithCode project: the coordinator on the m4 Mac starts the Ministorm e2e proof thread on ministorm, a Linux machine; the worker replies with uname output Linux ministorm 7.0.0-38-generic x86_64 and Hello, ministorm, and saves e2e-proof.txt', description: 'Alt text of the screenshot. Keep product names, machine names, command output and file names in English'})} />
        </a>
        <figcaption><Translate id="builtWithItself.shot.caption" description="Caption of the screenshot. Keep product names and the machine name ministorm in English">Real capture, 30 October 2026, from our end-to-end test. The coordinator on the Mac starts a worker on ministorm, a Linux machine, and the worker reports from there. When Claude Code reached its limit, the coordinator carried on with Grok.</Translate></figcaption>
      </figure>
    </div>
    <div className={styles.merged}>
      <h3><GitMerge size={18} strokeWidth={1.5} aria-hidden="true" /><Translate id="builtWithItself.merged.title" description="Heading of the list of merged pull requests">Recently merged from threads</Translate></h3>
      <ol aria-label={translate({id: 'builtWithItself.merged.ariaLabel', message: 'Pull requests merged from worker threads', description: 'Accessible label of the list of merged pull requests'})}>
        {MERGED.map(m => <li key={m.n}>
          <span className={styles.prNo}>#{m.n}</span>
          <span className={styles.prTitle}>{m.title}</span>
          <span className={styles.agent}>{translate({id: 'builtWithItself.merged.agentThread', message: '{agent} thread', description: 'Which agent thread opened the pull request; {agent} is a product name such as Codex or Claude Code'}, {agent: m.agent})}</span>
          <span className={styles.state}><Translate id="builtWithItself.merged.state" description="State chip of a merged pull request">Merged</Translate></span>
        </li>)}
      </ol>
      <p className={styles.source}><Translate
        id="builtWithItself.merged.source"
        description="Source note under the merged pull requests; {link} is a link labelled 'source repository'"
        values={{link: <a className={clsx('wv-link', styles.link)} href="https://github.com/anton-abyzov/specwithcode"><Translate id="builtWithItself.merged.source.link" description="Link text to the public GitHub source repository">source repository</Translate></a>}}>
        {'From the thread records: each pull request was opened and linked by the worker thread named beside it. They land in our development repository; the public {link} gets regular snapshots.'}
      </Translate></p>
    </div>
    {more && <p className={styles.more}><Link className={clsx('wv-link', styles.link)} to="/code/#built-with-itself"><Translate id="builtWithItself.more" description="Link to the SpecWithCode page section. Keep product names in English">See how SpecWithCode builds itself</Translate></Link></p>}
  </section>;
}
