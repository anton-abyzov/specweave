import React from 'react';
import { Check } from 'lucide-react';
import styles from './PricingCard.module.css';

interface PricingCardProps {
  plan: string;
  price: string;
  period?: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  className?: string;
}

export default function PricingCard({
  plan,
  price,
  period,
  features,
  cta,
  href,
  highlighted = false,
  className,
}: PricingCardProps) {
  const classes = [styles.card, highlighted ? styles.highlighted : '', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <div className={styles.header}>
        <h3 className={styles.plan}>{plan}</h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>{price}</span>
          {period && <span className={styles.period}>/{period}</span>}
        </div>
      </div>
      <ul className={styles.features}>
        {features.map((feature) => (
          <li key={feature} className={styles.feature}>
            <Check size={16} className={styles.checkIcon} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <a href={href} className={styles.cta}>
        {cta}
      </a>
    </div>
  );
}
