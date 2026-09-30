export function XProfileButton({ href, label, className = "" }: { href?: string; label: string; className?: string }) {
  if (!href) return null;
  return (
    <a className={`toolHeroXButton ${className}`.trim()} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
      <XMarkIcon />
    </a>
  );
}

export function XMarkIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.42 6.78 14.55 1h-1.22L8.88 6.02 5.32 1H1.22l5.38 7.6L1.22 15h1.22l4.7-5.3L10.88 15h4.1L9.42 6.78Zm-1.66 1.87-.54-.76L2.88 1.9h1.73l3.5 4.85.54.76 4.55 6.3h-1.73L7.76 8.65Z" />
    </svg>
  );
}
