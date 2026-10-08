// One line under the header: what today's review still holds.
export default function SrsSummary({ counts }) {
  const reviews = counts.due + counts.learning;
  if (!counts.enrolled) return <div className="srs-summary">Chưa có từ nào trong lịch ôn hằng ngày</div>;
  if (!reviews) return <div className="srs-summary">Hôm nay đã ôn xong 🎉</div>;
  return (
    <div className="srs-summary">
      <span>
        Hôm nay: <b>{reviews}</b> thẻ cần ôn
      </span>
    </div>
  );
}
