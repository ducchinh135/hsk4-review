import { Link } from '../router.jsx';
import { GRAMMAR_PAGES } from '../routes.js';

// Tabs inside the grammar section. The review run counts as Practice.
export default function GrammarNav({ page }) {
  const current = page === 'grammar-review' ? 'grammar-practice' : page;
  return (
    <nav className="nav-tabs" aria-label="Ngữ pháp">
      {GRAMMAR_PAGES.map((p) => (
        <Link key={p.page} to={p.path} className={'nav-tab' + (p.page === current ? ' active' : '')} aria-current={p.page === current ? 'page' : undefined}>
          {p.label}
        </Link>
      ))}
    </nav>
  );
}
