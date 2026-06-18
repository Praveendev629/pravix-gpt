import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'Pravix GPT — Advanced AI Platform',
  description: 'Chat, generate images, write code, and build faster with Pravix GPT — powered by Groq.',
  icons: { icon: '/logo.jpg' },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1a1025',
                color: '#fff',
                border: '1px solid rgba(124,58,237,0.25)',
                borderRadius: '12px',
                fontSize: '13px',
                backdropFilter: 'blur(12px)',
              },
              success: { iconTheme: { primary: '#22c55e', secondary: '#000' } },
              error:   { iconTheme: { primary: '#EF4444', secondary: '#000' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
