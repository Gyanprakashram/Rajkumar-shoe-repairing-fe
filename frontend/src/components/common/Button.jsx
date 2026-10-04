export default function Button({ children, type = 'button', className = '', ...props }) {
  return (
    <button type={type} className={`rk-btn ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}
