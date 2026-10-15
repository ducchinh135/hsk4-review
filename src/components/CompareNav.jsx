import { Link } from '../router.jsx';
import { COMPARE_PAGES } from '../routes.js';

// Tabs inside the confusable-words section. The review run counts as Practice.
export default function CompareNav({ page }) {
  const current = page === 'compare-review' ? 'compare-practice' : page;
  return (
    <nav className="nav-tabs" aria-label="Từ dễ nhầm">
      {COMPARE_PAGES.map((p) => (
        <Link key={p.page} to={p.path} className={'nav-tab' + (p.page === current ? ' active' : '')} aria-current={p.page === current ? 'page' : undefined}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
