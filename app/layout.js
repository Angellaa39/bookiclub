import './globals.css'

export const metadata = {
  title: 'Booki Club',
  description: 'Gérez votre club de lecture',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
