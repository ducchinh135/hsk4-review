import { Link } from '../router.jsx';
import { SECTIONS, sectionOf } from '../routes.js';

// Left navigation between the app's sections. `page` is route.page.
export default function Sidebar({ page }) {
  const current = sectionOf(page);
  return (
    <nav className="sidebar" aria-label="Chuyên mục">
      {SECTIONS.map((s) => (
        <Link key={s.id} to={s.path} className={'side-link' + (s.id === current ? ' active' : '')} aria-current={s.id === current ? 'page' : undefined}>
          {s.label}
        </Link>
      ))}
    </nav>
  );
}
