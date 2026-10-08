import { useEffect, useState } from 'react';
import AccountBar from './components/AccountBar.jsx';
import AuthModal from './components/AuthModal.jsx';
import NavBar from './components/NavBar.jsx';
import { AppProvider, useApp } from './context/AppContext.jsx';
import DailyPage from './pages/DailyPage.jsx';
import PracticeHub from './components/PracticeHub.jsx';
import ExercisePage from './pages/ExercisePage.jsx';
import ReviewPage from './pages/ReviewPage.jsx';
import WordsPage from './pages/WordsPage.jsx';
import { useRoute } from './router.jsx';
import { PAGE_TITLES } from './routes.js';

function Page({ route }) {
  if (route.page === 'words') return <WordsPage />;
  if (route.page === 'review') return <ReviewPage />;
  if (route.page === 'practice') return <PracticeHub />;
  if (route.page === 'exercise') return <ExercisePage key={route.params.type} type={route.params.type} />;
  return <DailyPage />;
}

function Shell() {
  const { account, speech, srsCounts, viewVersion } = useApp();
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
      <NavBar page={route.page} dueCount={srsCounts.due + srsCounts.learning} />

      {/* viewVersion remounts the page when the lesson, filter or account data changes */}
      <main key={viewVersion}>
        <Page route={route} />
      </main>

      {authMode && <AuthModal initialMode={authMode} onClose={() => setAuthMode(null)} authenticate={account.authenticate} />}

      <footer>Được biên soạn từ nội dung HSK Standard Course 4 — Bài 1, 2, 3, 4, 5, 6, 7, 8, 9, 10</footer>
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
