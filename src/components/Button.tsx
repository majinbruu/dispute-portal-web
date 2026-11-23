import type { ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'ghost';

interface StyleProps {
  variant?: Variant;
  /** `small` is for an action inside a list row. */
  size?: 'medium' | 'small';
  /** Stretch to the full width of the container (useful on mobile). */
  block?: boolean;
}

function classNames(
  { variant = 'primary', size = 'medium', block = false }: StyleProps,
  extra?: string,
): string {
  return [
    styles.button,
    styles[variant],
    size === 'small' ? styles.small : undefined,
    block ? styles.block : undefined,
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

type ButtonProps = StyleProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({ variant, size, block, className, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={classNames({ variant, size, block }, className)} {...rest} />
  );
}

type ButtonLinkProps = StyleProps & LinkProps;

/** A router link styled as a button, for navigation that should look like a call to action. */
export function ButtonLink({ variant, size, block, className, ...rest }: ButtonLinkProps) {
  return <Link className={classNames({ variant, size, block }, className)} {...rest} />;
}
