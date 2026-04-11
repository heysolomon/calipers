export function Footer() {
  return (
    <footer
      className="border-t py-10 px-6"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: '#4A9EFF', boxShadow: '0 0 6px rgba(74,158,255,0.5)' }}
          />
          <span className="font-medium text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Calipers
          </span>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
            MIT License
          </span>
        </div>

        <nav className="flex items-center gap-6 flex-wrap justify-center">
          {[
            { label: 'Docs', href: '/docs' },
            { label: 'Changelog', href: '/changelog' },
            { label: 'GitHub', href: 'https://github.com/calipers/calipers' },
            { label: 'Issues', href: 'https://github.com/calipers/calipers/issues' },
            { label: 'Code of Conduct', href: 'https://github.com/calipers/calipers/blob/main/CODE_OF_CONDUCT.md' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-sm transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
