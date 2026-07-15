import { useTranslation } from 'react-i18next'
import './Navbar.css'
import LanguageSwitcher from '../LanguageSwitcher/LanguageSwitcher'

type NavItem = 'home' | 'musicas' | 'playlists' | 'player' | 'backup'

type NavbarProps = {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
}

const Navbar = ({ activeItem, onNavigate }: NavbarProps) => {
  const { t } = useTranslation()
  const navItems: { id: NavItem; label: string }[] = [
    { id: 'home', label: t('nav.home') },
    { id: 'musicas', label: t('nav.musicas') },
    { id: 'playlists', label: t('nav.playlists') },
    { id: 'backup', label: t('nav.backup') },
  ]

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="topbar__title">MetronomeApp</div>
      </div>
      <nav className="topbar__nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`topbar__link ${activeItem === item.id ? 'topbar__link--active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <LanguageSwitcher />
    </header>
  )
}

export default Navbar
