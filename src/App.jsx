import { useEffect, useState } from 'react';
import AccountBar from './components/AccountBar.jsx';
import AuthModal from './components/AuthModal.jsx';
import GrammarNav from './components/GrammarNav.jsx';
import NavBar from './components/NavBar.jsx';
import Sidebar from './components/Sidebar.jsx';
import { AppProvider, useApp } from './context/AppContext.jsx';
import PracticeHub from './components/PracticeHub.jsx';
import GrammarPage from './pages/GrammarPage.jsx';
import GrammarPracticePage from './pages/GrammarPracticePage.jsx';
import ExercisePage from './pages/ExercisePage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import WordsPage from './pages/WordsPage.jsx';
import { useRoute } from './router.jsx';
import { PAGE_TITLES, sectionOf } from './routes.js';

// The study pages are remounted (via `key`) when the lesson, filter or account data changes, so
// their lists and positions are rebuilt.
function Page({ route, viewVersion }) {
  if (route.page === 'grammar') return <GrammarPage />;
  if (route.page === 'grammar-practice') return <GrammarPracticePage key={'lesson:' + viewVersion} scope="lesson" />;
  if (route.page === 'grammar-review') return <GrammarPracticePage key={'review:' + viewVersion} scope="review" />;
  if (route.page === 'words') return <WordsPage key={viewVersion} />;
  if (route.page === 'practice') return <PracticeHub key={viewVersion} />;
  if (route.page === 'exercise') return <ExercisePage key={route.params.type + ':' + viewVersion} type={route.params.type} />;
  return <ReviewPage key={viewVersion} />;
}

function Shell() {
  const { account, speech, viewVersion } = useApp();
  const route = useRoute();
  const [authMode, setAuthMode] = useState(null); // null = modal closed

  useEffect(() => {
    speech.cancel();
    document.title = `${PAGE_TITLES[route.page]} · HSK4`;
    // only when the page changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.path]);

  return (
    <>
      <AccountBar account={account} onLogin={() => setAuthMode('login')} />

      <header>
        <h1>📇 Thẻ Từ Vựng HSK4</h1>
      </header>
      <div className="layout">
        <Sidebar page={route.page} />
        <div className="content">
          {sectionOf(route.page) === 'grammar' ? <GrammarNav page={route.page} /> : <NavBar page={route.page} />}
          <main>
            <Page route={route} viewVersion={viewVersion} />
          </main>
        </div>
      </div>

      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} authenticate={account.authenticate} />}

      <footer>Được biên soạn từ nội dung HSK Standard Course 4 — Bài 1–20</footer>
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  );
}
