import "./globals.css";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className='antialiased'
      >
        {children}
      </body>
    </html>
  );
}
