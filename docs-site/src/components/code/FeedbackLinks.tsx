import React from 'react';
import clsx from 'clsx';
import Translate from '@docusaurus/Translate';
import styles from './FeedbackLinks.module.css';

const REPO = 'https://github.com/anton-abyzov/specwithcode';

/** The same issue forms the app's Send feedback menu opens. */
export const FEEDBACK_URL = `${REPO}/issues/new/choose`;

const FORMS = [
  {key: 'bug', href: `${REPO}/issues/new?template=bug_report.yml`, label: <Translate id="code.feedback.bug" description="Link to the bug report form">Report a bug</Translate>},
  {key: 'idea', href: `${REPO}/issues/new?template=feature_request.yml`, label: <Translate id="code.feedback.idea" description="Link to the feature request form">Suggest an idea</Translate>},
  {key: 'question', href: `${REPO}/issues/new?template=question.yml`, label: <Translate id="code.feedback.question" description="Link to the question form">Ask a question</Translate>},
  {key: 'discussions', href: `${REPO}/discussions`, label: <Translate id="code.feedback.discussions" description="Link to GitHub Discussions. Keep product names in English">GitHub Discussions</Translate>},
];

const SOCIAL = [
  {key: 'x', href: 'https://x.com/aabyzov', label: 'X'},
  {key: 'youtube', href: 'https://www.youtube.com/@antonabyzov', label: 'YouTube'},
  {key: 'discord', href: 'https://discord.gg/UYg4BGJ65V', label: 'Discord'},
];

export default function FeedbackLinks({className}: {className?: string}) {
  return <section className={clsx(styles.feedback, className)} aria-labelledby="feedback-title" id="feedback">
    <h2 id="feedback-title"><Translate id="code.feedback.title" description="Feedback section heading">Send feedback</Translate></h2>
    <p><Translate id="code.feedback.body" description="Feedback section text. Keep product names in English">Bugs, ideas and questions go to the public GitHub repository, where every report gets read. The app has the same forms under Help and Settings, with the version filled in.</Translate></p>
    <ul className={styles.links}>
      {FORMS.map(link => <li key={link.key}><a className="wv-link" href={link.href} data-track="feedback_click" data-kind={link.key}>{link.label}</a></li>)}
    </ul>
    <p className={styles.social}>
      <Translate id="code.feedback.social" description="Lead-in before links to the author's social accounts">Or reach Anton on</Translate>{' '}
      {SOCIAL.map((link, index) => <React.Fragment key={link.key}>
        {index > 0 && ' · '}
        <a className="wv-link" href={link.href} rel="noopener noreferrer">{link.label}</a>
      </React.Fragment>)}
    </p>
  </section>;
}
