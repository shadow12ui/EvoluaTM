import type {Metadata} from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  title: 'EvoluaTM — Hub de Evolução no Tênis de Mesa',
  description: 'Seu guia interativo completo para sair do básico e dominar as técnicas, postura, efeitos e treinos do tênis de mesa.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased text-slate-800 bg-[#FAFBF9]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
