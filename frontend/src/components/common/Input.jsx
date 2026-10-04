export default function Input({ label, className = '', ...props }) {
  return (
    <label className="rk-field">
      {label ? <span>{label}</span> : null}
      <input className={`rk-input ${className}`.trim()} {...props} />
    </label>
  );
}
