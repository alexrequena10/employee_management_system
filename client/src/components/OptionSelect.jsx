export default function OptionSelect({ id, options, placeholder, value, onChange, required }) {
  const choices = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      <option value="">{placeholder}</option>
      {choices.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
