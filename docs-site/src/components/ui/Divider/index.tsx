import React from 'react';
import styles from './Divider.module.css';

interface DividerProps {
  variant?: 'subtle' | 'strong';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export default function Divider({
  variant = 'subtle',
  orientation = 'horizontal',
  className,
}: DividerProps) {
  const classes = [styles.divider, styles[variant], styles[orientation], className]
    .filter(Boolean)
    .join(' ');

  return <hr className={classes} />;
}
