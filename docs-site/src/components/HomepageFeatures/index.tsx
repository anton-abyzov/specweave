import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  image: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Real Estate Operations',
    image: require('@site/static/img/hero/real-estate.png').default,
    description: (
      <>
        Manage property listings, client contracts, and documentation with
        spec-driven workflows. From property details to closing documents,
        keep everything organized and traceable.
      </>
    ),
  },
  {
    title: 'Software Engineering',
    image: require('@site/static/img/hero/software-engineering.png').default,
    description: (
      <>
        Build production software with specifications as the source of truth.
        Define WHAT and WHY before HOW. 70% token reduction, automated testing,
        and living documentation for any tech stack.
      </>
    ),
  },
  {
    title: 'Trading & Finance',
    image: require('@site/static/img/hero/trading.png').default,
    description: (
      <>
        Document trading strategies, market analysis, and financial models with
        precision. Track decisions, maintain compliance documentation, and ensure
        audit-ready traceability.
      </>
    ),
  },
];

function Feature({title, image, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <img src={image} className={styles.featureSvg} role="img" alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
