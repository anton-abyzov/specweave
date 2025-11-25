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
    title: 'Greenfield SaaS & Web Apps',
    image: require('@site/static/img/hero/greenfield.jpg').default,
    description: (
      <>
        Start new projects with specs from day one. Full-stack apps, APIs, microservices —
        all with permanent documentation, automated testing (85%+ coverage), and
        living docs that never drift from code.
      </>
    ),
  },
  {
    title: 'Brownfield Modernization',
    image: require('@site/static/img/hero/brownfield.jpg').default,
    description: (
      <>
        Document existing code before modifying. Import from Notion, Confluence, GitHub Wiki.
        Create retroactive specs, ADRs, and architecture diagrams. Reduce onboarding
        from weeks to days.
      </>
    ),
  },
  {
    title: 'Regulated & Enterprise',
    image: require('@site/static/img/hero/compliance.jpg').default,
    description: (
      <>
        Healthcare (HIPAA), Finance (SOC 2, PCI-DSS), Government — compliance-ready
        with full audit trails. Every decision documented, every change traceable,
        every requirement linked to tests.
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
