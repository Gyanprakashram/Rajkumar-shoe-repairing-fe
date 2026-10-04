export default function Modal({ open = false, title, children, onClose }) {
  if (!open) return null;

  return (
    <div className="rk-modal-backdrop" onClick={onClose}>
      <div className="rk-modal" onClick={(event) => event.stopPropagation()}>
        {title ? <h3>{title}</h3> : null}
        {children}
      </div>
    </div>
  );
}
