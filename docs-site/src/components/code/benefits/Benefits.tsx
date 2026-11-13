import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Translate, {translate} from '@docusaurus/Translate';
import {ArrowRight, Bot, Gauge, LayoutGrid, MessagesSquare, Network, PenTool, Sparkles} from 'lucide-react';
import {Brand, Logo} from './parts';
import {Aide, Designs, Limits, Machines, OneWindow, ProjectThreads, Skills} from './visuals';
import styles from './Benefits.module.css';

/*
  What SpecWithCode gives you, below the /code hero: seven rows, each a claim the app keeps and a
  drawing of the surface that keeps it. Checked against the app source on 12 November 2026
  (1.0.264). Limits of each claim, so the copy stays inside them:
  - Changing agent in a thread carries a selection of the recent conversation, never all of it.
  - A project gives every thread its goal, instructions and memory index; a worker does not get the
    coordinator's whole conversation.
  - Percy runs on the person's own computer and sends mail only from a reply card they answered.
    Voice calls are desktop only. Percy, Google and Telegram are set up on the desktop.
  - Designs is the app's own canvas. Figma is a one-way import of variables from Figma desktop.
  - A usage limit changes provider on the same machine; it never moves a thread to another machine.
    Moving a project between machines starts a new provider session.
  - Version changes and installs on several machines run the vskill CLI. The app has no registry browser.
*/

type Row = {
  id: string;
  /** extra anchors other pages already link to */
  also?: string[];
  icon: typeof Bot;
  /** short name in the index of rows */
  nav: string;
  title: string;
  body: React.ReactNode;
  points: React.ReactNode[];
  fine?: React.ReactNode;
  link?: {to: string; label: string};
  visual: React.ReactNode;
};

function rows(): Row[] {
  return [
    {
      id: 'one-window', also: ['harnesses'], icon: LayoutGrid,
      nav: translate({id: 'code.b.nav.agents', message: 'Agents', description: 'Short name of a benefit row in the index of rows on the SpecWithCode page'}),
      title: translate({id: 'code.b.window.title', message: 'Stop switching tabs', description: 'Benefit row on the SpecWithCode page: heading about one window for every coding agent. Keep product names in English'}),
      body: <Translate id="code.b.window.body" description="Benefit row on the SpecWithCode page: text about one window for every coding agent. Keep product names in English">Claude Code, Codex, GitHub Copilot, Cursor, Gemini CLI and more run side by side, each on your own sign-in. Change the agent in the middle of a thread and it continues with the recent conversation.</Translate>,
      points: [
        <Translate id="code.b.window.point1" description="Benefit row on the SpecWithCode page: point. Keep product names in English">One model picker for every agent you signed in to</Translate>,
        <Translate id="code.b.window.point2" description="Benefit row on the SpecWithCode page: point. Keep product names in English">Each agent keeps its own tools, approvals and sign-in</Translate>,
      ],
      link: {to: '/docs/studio/harnesses/', label: translate({id: 'code.more.harnesses.link', message: 'Harnesses and models', description: 'Card link to the harnesses docs'})},
      visual: <OneWindow />,
    },
    {
      id: 'coordinator', icon: MessagesSquare,
      nav: translate({id: 'code.b.nav.projects', message: 'Projects', description: 'Short name of a benefit row in the index of rows on the SpecWithCode page'}),
      title: translate({id: 'code.b.threads.title', message: 'Threads that already know the project', description: 'Benefit row on the SpecWithCode page: heading about projects, the coordinator and threads. Keep product names in English'}),
      body: <Translate id="code.b.threads.body" description="Benefit row on the SpecWithCode page: text about projects, the coordinator and threads. Keep product names in English">A project keeps its goal, instructions and memory in one place. Give the coordinator a goal and it splits the work into threads that each start with that context. You paste nothing and open no extra chats to carry context.</Translate>,
      points: [
        <Translate id="code.b.threads.point1" description="Benefit row on the SpecWithCode page: point. Keep product names in English">Threads sort by what needs you, what is working and what is resolved</Translate>,
        <Translate id="code.b.threads.point2" description="Benefit row on the SpecWithCode page: point. Keep product names in English">Workers report to the coordinator, and you review the result</Translate>,
      ],
      link: {to: '/docs/overview/studio', label: translate({id: 'code.more.coordinator.link', message: 'How projects work', description: 'Card link to the projects docs'})},
      visual: <ProjectThreads />,
    },
    {
      id: 'aide', icon: Bot,
      nav: translate({id: 'code.b.nav.aide', message: 'Percy', description: 'Short name of a benefit row in the index of rows on the SpecWithCode page'}),
      title: translate({id: 'code.b.aide.title', message: 'A personal assistant in the same app', description: 'Benefit row on the SpecWithCode page: heading about Percy, the personal assistant. Keep product names in English'}),
      body: <Translate id="code.b.aide.body" description="Benefit row on the SpecWithCode page: text about Percy, the personal assistant. Keep product names in English">Percy briefs you each morning on the mail that needs a reply and on your day, with drafts ready. It sends only the replies you approve. Talk to it on the desktop, on your iPhone, or through your own Telegram bot.</Translate>,
      points: [
        <><span className={styles.brands}><Brand name="gmail" /><Brand name="calendar" /><Brand name="drive" /></span><Translate id="code.b.aide.point1" description="Benefit row on the SpecWithCode page: point; Gmail, Calendar and Drive logos sit before it. Keep product names in English">Reads the Gmail, Calendar and Drive accounts you allow</Translate></>,
        <Translate id="code.b.aide.point2" description="Benefit row on the SpecWithCode page: point. Keep product names in English">The phone app also follows your coding threads and lets you answer approvals</Translate>,
      ],
      fine: <Translate id="code.b.aide.fine" description="Benefit row on the SpecWithCode page: fine print under the Percy row. Keep product names in English">Percy runs on your computer, so it answers while that computer is awake.</Translate>,
      link: {to: '/docs/studio/projects', label: translate({id: 'code.b.aide.link', message: 'Personal projects', description: 'Link to the docs about personal projects'})},
      visual: <Aide />,
    },
    {
      id: 'designs', icon: PenTool,
      nav: translate({id: 'code.b.nav.designs', message: 'Designs', description: 'Short name of a benefit row in the index of rows on the SpecWithCode page'}),
      title: translate({id: 'code.b.designs.title', message: 'Designs live in the project', description: 'Benefit row on the SpecWithCode page: heading about the Designs tab. Keep product names in English'}),
      body: <Translate id="code.b.designs.body" description="Benefit row on the SpecWithCode page: text about the Designs tab; {path} is a folder path. Keep product names in English" values={{path: <code>.specweave/design/</code>}}>{'Every project has a Designs tab. You and your agents draw on the same canvas, and the files sit in the repository under {path}, so a design moves with the code it belongs to.'}</Translate>,
      points: [
        <Translate id="code.b.designs.point1" description="Benefit row on the SpecWithCode page: point. Keep product names in English">Agents create, edit and screenshot a design from a thread</Translate>,
        <Translate id="code.b.designs.point2" description="Benefit row on the SpecWithCode page: point. Keep product names in English">Start a design system from your code, a tokens file or variables imported from Figma desktop</Translate>,
      ],
      visual: <Designs />,
    },
    {
      id: 'machines', icon: Network,
      nav: translate({id: 'code.b.nav.machines', message: 'Machines', description: 'Short name of a benefit row in the index of rows on the SpecWithCode page'}),
      title: translate({id: 'code.b.machines.title', message: 'Every machine you own, on the same job', description: 'Benefit row on the SpecWithCode page: heading about running work on several machines. Keep product names in English'}),
      body: <Translate id="code.b.machines.body" description="Benefit row on the SpecWithCode page: text about running work on several machines. Keep product names in English">Add a spare laptop, a Windows PC or a Linux server. The coordinator places threads on them in the order you set, and each machine sets what other machines may run on it.</Translate>,
      points: [
        <Translate id="code.b.machines.point1" description="Benefit row on the SpecWithCode page: point; SpecWithCode Connect is a product name. Keep product names in English">Machines on one SpecWithCode Connect account join with one click</Translate>,
        <Translate id="code.b.machines.point2" description="Benefit row on the SpecWithCode page: point. Keep product names in English">A machine’s access setting caps every thread sent to it</Translate>,
        <Translate id="code.b.machines.point3" description="Benefit row on the SpecWithCode page: point. Keep product names in English">Hand a project to another machine with Git or a file copy</Translate>,
      ],
      link: {to: '/tutorials/add-a-machine/', label: translate({id: 'code.more.machines.link', message: 'Add a machine', description: 'Card link to the add-a-machine tutorial'})},
      visual: <Machines />,
    },
    {
      id: 'subscriptions', icon: Gauge,
      nav: translate({id: 'code.b.nav.limits', message: 'Limits', description: 'Short name of a benefit row in the index of rows on the SpecWithCode page'}),
      title: translate({id: 'code.subs.title', message: 'Paying $200 a month? Use all of it.', description: 'Heading of the paid plans section'}),
      body: <Translate id="code.b.limits.body" description="Benefit row on the SpecWithCode page: text about usage limits; 'Usage › Limits' is a menu path in the app, translate it as the app labels it. Keep product names in English">Usage › Limits shows every account, the machine it is signed in on and when it resets. When a provider runs out, the project switches to another one, offers the switch, or waits for the reset. You choose which.</Translate>,
      points: [
        <Translate id="code.b.limits.point1" description="Benefit row on the SpecWithCode page: point; 99% is the default, 50% to 100% the allowed range. Keep product names in English">Switches at 99% used by default. Set it from 50% to 100%.</Translate>,
        <span className={styles.plans}>
          <span><Logo name="claude" size={16} /><Translate id="code.subs.plans.claude" description="Paid plan names. Keep product names in English">Claude Max and Pro</Translate></span>
          <span><Logo name="openai" size={16} /><Translate id="code.subs.plans.chatgpt" description="Paid plan names. Keep product names in English">ChatGPT Pro and Plus</Translate></span>
        </span>,
      ],
      link: {to: '/docs/studio/memory-and-usage', label: translate({id: 'code.b.limits.link', message: 'Memory and usage', description: 'Link to the docs about usage limits'})},
      visual: <Limits />,
    },
    {
      id: 'skills', icon: Sparkles,
      nav: translate({id: 'code.b.nav.skills', message: 'Skills', description: 'Short name of a benefit row in the index of rows on the SpecWithCode page'}),
      title: translate({id: 'code.b.skills.heading', message: 'Skills, managed in one place', description: 'Benefit row on the SpecWithCode page: heading of the skills row. Keep product names in English'}),
      body: <Translate id="code.b.skills.body" description="Benefit row on the SpecWithCode page: text about skills; Settings › Skills is a menu path in the app. Keep product names in English">Skills change what an agent does with the same model, so you choose which ones each agent sees. Settings › Skills lists the skills every agent finds on a machine. Turn one off for a single agent, pin a version, or install it on several machines.</Translate>,
      points: [
        <Translate id="code.b.skills.point1" description="Benefit row on the SpecWithCode page: point; {link} links to the Verified Skill registry. Keep product names in English" values={{link: <a className="wv-link" href="https://verified-skill.com/skills">Verified Skill</a>}}>{'Write a skill in the app and publish it to {link} for review'}</Translate>,
        <Translate id="code.b.skills.point2" description="Benefit row on the SpecWithCode page: point; {link} links to the Skill Studio docs. Keep product names in English" values={{link: <Link className="wv-link" to="/docs/skills/skill-studio/">Skill Studio</Link>}}>{'Try a skill on your own task in {link} before you keep it'}</Translate>,
      ],
      fine: <Translate id="code.b.skills.fine" description="Benefit row on the SpecWithCode page: fine print under the skills row; vskill is a command-line tool and {command} is its install command. Keep product names in English" values={{command: <code>npm i -g vskill</code>}}>{'Pinning a version or installing on other machines runs the free vskill CLI: {command}'}</Translate>,
      visual: <Skills />,
    },
  ];
}

export default function Benefits() {
  const ROWS = rows();
  return <section className={styles.benefits} aria-labelledby="benefits-title">
    <div className={styles.head}>
      <h2 id="benefits-title"><Translate id="code.b.title" description="Heading of the benefits section on the SpecWithCode page">One app, not a zoo of them</Translate></h2>
      <p><Translate id="code.b.intro" description="Intro of the benefits section on the SpecWithCode page">Your coding agents, a personal assistant, designs, skills and all your machines share one window and one phone app.</Translate></p>
      <ul className={styles.index} aria-label={translate({id: 'code.b.index.label', message: 'What is in the app', description: 'Accessible label of the list of links to the benefit rows'})}>
        {ROWS.map(({id, icon: Icon, nav}) => <li key={id}><a href={`#${id}`}><Icon size={16} strokeWidth={1.75} aria-hidden="true" />{nav}</a></li>)}
      </ul>
    </div>
    {ROWS.map(({id, also, title, body, points, fine, link, visual}, i) => <article key={id} id={id} className={clsx(styles.row, i % 2 === 1 && styles.rowFlip)}>
      {also?.map(a => <span key={a} id={a} className={styles.anchor} />)}
      <div className={styles.copy}>
        <h3>{title}</h3>
        <p className={styles.body}>{body}</p>
        <ul className={styles.points}>{points.map((p, n) => <li key={n}>{p}</li>)}</ul>
        {fine && <p className={styles.fine}>{fine}</p>}
        {link && <Link className={clsx('wv-link', styles.more)} to={link.to}>{link.label}<ArrowRight size={14} strokeWidth={1.75} aria-hidden="true" /></Link>}
      </div>
      <div className={styles.visual}>{visual}</div>
    </article>)}
  </section>;
}
