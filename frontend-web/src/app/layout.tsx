import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Pravix GPT',
  description: 'Advanced AI Assistant Platform',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1a1a2e', color: '#fff', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '12px' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#000' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#000' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
