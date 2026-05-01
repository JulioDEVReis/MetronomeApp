import './Navbar.css'

type NavItem = 'home' | 'musicas' | 'playlists' | 'player' | 'backup'

type NavbarProps = {
  activeItem: NavItem
  onNavigate: (item: NavItem) => void
}

const Navbar = ({ activeItem, onNavigate }: NavbarProps) => {
  const navItems: { id: NavItem; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'musicas', label: 'Músicas' },
    { id: 'playlists', label: 'Playlists' },
    { id: 'backup', label: 'Backup' },
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
    </header>
  )
}

export default Navbar
