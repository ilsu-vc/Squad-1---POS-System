import type { Metadata } from 'next';
import '../App.css';

export const metadata: Metadata = {
    title: 'PharmaCare Drugstore POS',
    description: 'Point of Sale System for PharmaCare Drugstore',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    );
}
