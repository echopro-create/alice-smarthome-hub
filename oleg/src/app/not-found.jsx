import Link from 'next/link';

export const metadata = {
  title: 'Page Not Found',
};

export default function NotFound() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      textAlign: 'center',
      padding: '40px 24px',
    }}>
      <p style={{
        fontFamily: 'var(--font-serif), ui-serif, Georgia, serif',
        fontSize: 'clamp(80px, 12vw, 140px)',
        fontWeight: 700,
        color: 'var(--primary)',
        lineHeight: 1,
        marginBottom: 8,
        opacity: 0.6,
      }}>
        404
      </p>
      <h1 style={{
        fontFamily: 'var(--font-serif), ui-serif, Georgia, serif',
        fontSize: 'clamp(24px, 4vw, 32px)',
        fontWeight: 600,
        marginBottom: 12,
        color: 'var(--foreground)',
      }}>
        Page Not Found
      </h1>
      <p style={{
        fontSize: 16,
        color: 'var(--foreground-muted)',
        maxWidth: 420,
        marginBottom: 32,
        lineHeight: 1.6,
      }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link
        href="/sv"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 48,
          padding: '0 28px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--primary)',
          color: 'var(--background)',
          fontWeight: 600,
          fontSize: 15,
          letterSpacing: '0.03em',
          textDecoration: 'none',
        }}
      >
        Back to Home
      </Link>
    </div>
  );
}
