import './Navbar.css'

type NavItem = 'home' | 'musicas' | 'playlists' | 'player' | 'backup' | 'conta'

type NavbarProps = {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
  isPro: boolean
}

const Navbar = ({ activeItem, onNavigate, isPro }: NavbarProps) => {
  const navItems: { id: NavItem; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'musicas', label: 'Músicas' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'backup', label: 'Backup' },
    { id: 'conta', label: 'Conta' },
  ]

  return (
    <header className="topbar">
      <div className="topbar__left">
        <div className="topbar__title">MetronomeApp</div>
        <span className={`planPill ${isPro ? 'planPill--pro' : 'planPill--free'}`}>
          {isPro ? 'PRO' : 'Grátis'}
        </span>
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
    </header>
  )
}

export default Navbar
