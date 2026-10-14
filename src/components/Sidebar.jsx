import { useState } from 'react';
import { Link } from '../router.jsx';
import { SECTIONS, sectionOf } from '../routes.js';

const KEY = 'hsk4_sidebar_collapsed';
const load = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const save = (v) => { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* storage unavailable */ } };

// Left navigation between the app's sections. `page` is route.page.
// Collapsible on desktop: collapsed shows only each section's icon.
export default function Sidebar({ page }) {
  const current = sectionOf(page);
  const [collapsed, setCollapsed] = useState(load);
  const toggle = () => setCollapsed((c) => { save(!c); return !c; });
  return (
    <nav className={'sidebar' + (collapsed ? ' collapsed' : '')} aria-label="Chuyên mục">
      <button type="button" className="side-toggle" onClick={toggle} aria-expanded={!collapsed} title={collapsed ? 'Mở rộng' : 'Thu gọn'}>
        {collapsed ? '»' : '« Thu gọn'}
      </button>
      {SECTIONS.map((s) => {
        const [icon, ...rest] = s.label.split(' ');
        return (
          <Link key={s.id} to={s.path} className={'side-link' + (s.id === current ? ' active' : '')} aria-current={s.id === current ? 'page' : undefined} title={rest.join(' ')}>
            <span className="side-icon">{icon}</span>
            <span className="side-text"> {rest.join(' ')}</span>
          </Link>
        );
      })}
    </nav>
  );
}
