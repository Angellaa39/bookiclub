import './globals.css'

export const metadata = {
  title: 'Booki Club',
  description: 'Gérez votre club de lecture',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
