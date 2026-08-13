import type { Metadata } from 'next';
import './globals.css';
import { DynamicThemeProvider } from '@/components/customization/DynamicThemeProvider';

export const metadata: Metadata = {
  title: 'GYM SaaS — Sistema Multi-Tenant para Gimnasios',
  description: 'Plataforma profesional para administración de gimnasios, rutinas con IA, cupos y portal del alumno.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#0B0B0E] text-white antialiased">
        <DynamicThemeProvider>{children}</DynamicThemeProvider>
      </body>
    </html>
  );
}
