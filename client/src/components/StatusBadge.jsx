export default function StatusBadge({ paid, label }) {
  const text = label || (paid ? 'Paid' : 'Unpaid');
  return (
    <span className={`status status-${paid ? 'paid' : 'unpaid'}`}>{text}</span>
  );
}
