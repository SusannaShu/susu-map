import './BottomNav.css';

export type TabId = 'map' | 'posts' | 'messages' | 'profile';

interface BottomNavProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onPostClick: () => void;
}

/** Inline SVG icons to replace emojis */
function MapIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  );
}

function PostsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function MessagesIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ProfileIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? 'var(--color-primary)' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

const iconMap = {
  map: MapIcon,
  posts: PostsIcon,
  messages: MessagesIcon,
  profile: ProfileIcon,
};

const tabs: { id: TabId; label: string }[] = [
  { id: 'map', label: 'Live Map' },
  { id: 'posts', label: 'My Events' },
  // FAB goes in between
  { id: 'messages', label: 'Messages' },
  { id: 'profile', label: 'Profile' },
];

export function BottomNav({ activeTab, onTabChange, onPostClick }: BottomNavProps) {
  return (
    <nav className="bottomNav" id="bottom-nav">
      {tabs.slice(0, 2).map((tab) => {
        const Icon = iconMap[tab.id];
        return (
          <button
            key={tab.id}
            className={`navItem ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            id={`nav-${tab.id}`}
          >
            <span className="navIcon"><Icon active={activeTab === tab.id} /></span>
            <span className="navLabel">{tab.label}</span>
          </button>
        );
      })}

      {/* Center FAB */}
      <div className="fabContainer">
        <button className="fab" onClick={onPostClick} id="fab-post">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {tabs.slice(2).map((tab) => {
        const Icon = iconMap[tab.id];
        return (
          <button
            key={tab.id}
            className={`navItem ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            id={`nav-${tab.id}`}
          >
            <span className="navIcon"><Icon active={activeTab === tab.id} /></span>
            <span className="navLabel">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
