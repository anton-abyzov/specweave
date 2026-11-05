import React from 'react';
import clsx from 'clsx';
import Translate, {translate} from '@docusaurus/Translate';
import {ArrowUpRight} from 'lucide-react';
import {SPECWITHCODE_MOBILE, type MobileStoreKey} from '../../data/specwithcodeMobile';
import styles from './MobileStores.module.css';

/*
  The phone apps, as two store cards beside the desktop downloads. Each card is a link once its
  store URL is set in data/specwithcodeMobile.ts, and a quiet "coming soon" card until then, so
  the site never carries a dead store link.
*/

const APPLE = <svg viewBox="0 0 814 1000" aria-hidden="true"><path fill="currentColor" d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" /></svg>;
/* The Google Play triangle in its four colours. */
const PLAY = <svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M3.6 2.3 13.2 12l-9.6 9.7a1.6 1.6 0 0 1-.4-1.1V3.4c0-.4.1-.8.4-1.1Z" fill="#2196F3" />
  <path d="M16.4 8.8 13.2 12 3.6 2.3c.4-.3 1-.4 1.6 0l11.2 6.5Z" fill="#4CAF50" />
  <path d="M16.4 15.2 5.2 21.7c-.6.3-1.2.3-1.6 0l9.6-9.7 3.2 3.2Z" fill="#F44336" />
  <path d="M20.3 10.9c1 .6 1 1.6 0 2.2l-3.9 2.1-3.2-3.2 3.2-3.2 3.9 2.1Z" fill="#FFC107" />
</svg>;

export default function MobileStores({placement, align = 'start', kicker = true}: {placement: string; align?: 'start' | 'center'; kicker?: boolean}) {
  const stores: {key: MobileStoreKey; mark: React.ReactNode; name: string; url: string | null}[] = [
    {key: 'ios', mark: APPLE, name: 'App Store', url: SPECWITHCODE_MOBILE.ios.url},
    {key: 'android', mark: PLAY, name: 'Google Play', url: SPECWITHCODE_MOBILE.android.url},
  ];
  const soon = translate({id: 'code.mobile.soon', message: 'Coming soon', description: 'Tag on a phone app store card whose listing is not live yet'});
  return <div className={clsx(styles.mobile, align === 'center' && styles.center)}>
    {kicker && <p className={styles.kicker}><Translate id="code.mobile.title" description="Heading of the phone apps row under the desktop downloads. Keep product names in English">SpecWithCode for iPhone and Android</Translate></p>}
    <ul className={styles.stores} aria-label={translate({id: 'code.mobile.ariaLabel', message: 'Phone apps', description: 'Accessible label of the list of phone app store cards'})}>
      {stores.map(s => {
        const inner = <>
          <span className={clsx(styles.mark, styles[s.key])} aria-hidden="true">{s.mark}</span>
          <span className={styles.text}>
            <small>{s.url ? <Translate id="code.mobile.getOn" description="Small line above the store name on a live store card">Get it on the</Translate> : soon}</small>
            <strong>{s.name}</strong>
          </span>
          {s.url && <ArrowUpRight className={styles.arrow} size={16} strokeWidth={2.25} aria-hidden="true" />}
        </>;
        return <li key={s.key}>
          {s.url
            ? <a className={styles.store} href={s.url} target="_blank" rel="noopener" data-track="mobile_store_click" data-placement={placement} data-store={s.key}>{inner}</a>
            : <span className={clsx(styles.store, styles.soon)} aria-disabled="true">{inner}</span>}
        </li>;
      })}
    </ul>
  </div>;
}
