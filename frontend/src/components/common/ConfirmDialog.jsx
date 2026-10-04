export default function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div className="rk-modal-backdrop" onClick={onCancel}>
      <div className="rk-modal" onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="rk-actions">
          <button type="button" className="rk-btn secondary" onClick={onCancel}>Cancel</button>
          <button type="button" className="rk-btn danger" onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
