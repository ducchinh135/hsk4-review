import SrsPanel from '../components/SrsPanel.jsx';
import SrsSummary from '../components/SrsSummary.jsx';
import { useApp } from '../context/AppContext.jsx';

// Daily spaced-repetition review across all lessons: no lesson tabs or filter here.
export default function DailyPage() {
  const { srs, speech, srsCounts } = useApp();
  return (
    <>
      <SrsSummary counts={srsCounts} />
      <SrsPanel srs={srs} counts={srsCounts} speech={speech} />
    </>
  );
}
