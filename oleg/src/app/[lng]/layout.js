import { getDictionary } from '@/dictionaries';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import '../globals.css';

export async function generateStaticParams() {
  return [{ lng: 'sv' }, { lng: 'en' }, { lng: 'no' }, { lng: 'ru' }];
}

export default async function RootLayout({ children, params }) {
  const { lng } = await params;
  const dict = await getDictionary(lng);

  return (
    <html lang={lng} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme');
                  var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  var activeTheme = savedTheme || systemTheme;
                  document.documentElement.setAttribute('data-theme', activeTheme);
                } catch (e) {}
              })()
            `,
          }}
        />
      </head>
      <body>
        <Header lng={lng} dict={dict} />
        <main style={{ paddingTop: '80px', flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
        <Footer lng={lng} dict={dict} />
      </body>
    </html>
  );
}
