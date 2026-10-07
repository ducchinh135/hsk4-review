// One line under the header: what today's review still holds.
export default function SrsSummary({ counts, active, onStart }) {
  const reviews = counts.due + counts.learning;
  if (reviews + counts.fresh === 0) return <div className="srs-summary">Hôm nay đã ôn xong 🎉</div>;
  return (
    <div className="srs-summary">
      <span>
        Hôm nay: <b>{reviews}</b> thẻ ôn · <b>{counts.fresh}</b> thẻ mới
      </span>
      {!active && (
        <button className="acc-btn primary" onClick={onStart}>
          Ôn ngay
        </button>
      )}
    </div>
  );
}
