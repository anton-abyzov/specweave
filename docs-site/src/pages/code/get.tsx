import React, {useEffect, useState} from 'react';
import clsx from 'clsx';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import Head from '@docusaurus/Head';
import Translate, {translate} from '@docusaurus/Translate';
import MobileStores from '../../components/code/MobileStores';
import {SPECWITHCODE_MOBILE, openPhoneStore, phoneStoreFor, type MobileStoreKey} from '../../data/specwithcodeMobile';
import styles from '../code.module.css';

/*
  specwithcode.com/get: the one address the desktop app prints as a code for "get the app".
  A phone that opens it goes straight to its own store; any other browser sees both store cards.
*/

const SITE = 'https://spec-weave.com';
const OG_IMAGE = `${SITE}/img/studio/og-specwithcode.jpg?v=all-platforms-20261027`;

function pageTitle(): string {
  return translate({id: 'code.get.meta.title', message: 'Get SpecWithCode for iPhone and Android', description: 'Title of the page that sends a phone to its app store. Keep product names in English'});
}

function pageDescription(): string {
  return translate({id: 'code.get.meta.description', message: 'Get the SpecWithCode app for your iPhone or Android phone. Open this page on the phone and it takes you to the App Store or Google Play.', description: 'Meta description of the page that sends a phone to its app store. Keep product and store names in English'});
}

export default function CodeGet() {
  const TITLE = pageTitle();
  const [opening, setOpening] = useState<MobileStoreKey | null>(null);
  // Decided in the browser: the page is built once for every visitor.
  useEffect(() => {
    const store = phoneStoreFor(navigator.userAgent, navigator.maxTouchPoints);
    const url = store ? SPECWITHCODE_MOBILE[store].url : null;
    if (!store || !url) return;
    setOpening(store);
    openPhoneStore(url);
  }, []);
  return <Layout title={TITLE} description={pageDescription()}>
    <Head>
      <title>{TITLE}</title>
      <meta property="og:title" content={TITLE} />
      <meta name="twitter:title" content={TITLE} />
      <meta property="og:site_name" content="SpecWithCode" />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:image" content={OG_IMAGE} />
      {/* A way to a store, not a page to find: a crawler with a phone's user agent would follow it there. */}
      <meta name="robots" content="noindex, follow" />
    </Head>
    <main className={clsx('wv-root', styles.page)}>
      <header className={clsx(styles.shell, styles.hero)}>
        <div className={styles.heroCopy}>
          <p className={styles.product}>
            <img src="/img/studio/specwithcode-icon.png" alt="" width="28" height="28" />
            <span className={styles.productName}><Link to="/code/">SpecWithCode</Link></span>
          </p>
          <h1><Translate id="code.get.title" description="Headline of the page that sends a phone to its app store. Keep product names in English">Get SpecWithCode on your phone</Translate></h1>
          {/* Only the short "Opening" line is announced; the lead is read as ordinary text. */}
          {opening === null
            ? <p className={styles.lead}><Translate id="code.get.lead" description="Lead of the page that sends a phone to its app store">Open this page on your iPhone or Android phone and it takes you to the right store. Then sign in with the same account as on your computer, and your computer shows up by itself.</Translate></p>
            : <p className={styles.lead} role="status">
              {opening === 'ios'
                ? <Translate id="code.get.opening.ios" description="Shown on an iPhone while the App Store opens. Keep the store name in English">Opening the App Store…</Translate>
                : <Translate id="code.get.opening.android" description="Shown on an Android phone while Google Play opens. Keep the store name in English">Opening Google Play…</Translate>}
            </p>}
          <MobileStores placement="get-page" align="center" kicker={false} />
          <p style={{marginTop: 'var(--wv-space-6)'}}>
            <Translate
              id="code.get.desktop"
              description="Line under the store cards for someone on a computer; {link} is a link to the desktop download page"
              values={{link: <Link to="/code/download/"><Translate id="code.get.desktop.link" description="Link text to the desktop download page. Keep product names in English">Download SpecWithCode for Mac, Windows and Linux</Translate></Link>}}>
              {'On a computer? {link}.'}
            </Translate>
          </p>
        </div>
      </header>
    </main>
  </Layout>;
}
