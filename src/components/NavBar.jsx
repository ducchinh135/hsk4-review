import { Link } from '../router.jsx';
import { PAGES } from '../routes.js';

// Main navigation. `page` is route.page; an exercise run still counts as the Practice section.
export default function NavBar({ page, dueCount }) {
  const current = page === 'exercise' ? 'practice' : page;
  return (
    <nav className="nav-tabs" aria-label="Điều hướng chính">
      {PAGES.map((p) => (
        <Link key={p.page} to={p.path} className={'nav-tab' + (p.page === current ? ' active' : '')} aria-current={p.page === current ? 'page' : undefined}>
          {p.label}
          {p.page === 'daily' && dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
        </Link>
      ))}
    </nav>
  );
}
