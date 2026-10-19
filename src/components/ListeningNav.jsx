import { Link } from '../router.jsx';
import { PARTS, PART_TABS } from '../listening.js';

// Tabs inside the listening section, one per part of the exam. A part without content yet is dimmed.
// Tips, practice and review runs count as their part.
export default function ListeningNav({ part }) {
  return (
    <nav className="nav-tabs" aria-label="Nghe hiểu">
      {PART_TABS.map((t) =>
        PARTS.some((p) => p.id === t.id) ? (
          <Link key={t.id} to={'/listening/' + t.id} className={'nav-tab' + (t.id === part ? ' active' : '')} aria-current={t.id === part ? 'page' : undefined}>
            {t.label}
          </Link>
        ) : (
          <span key={t.id} className="nav-tab off" title="Sắp có" aria-disabled="true">
            {t.label}
          </span>
        )
      )}
    </nav>
  );
}
