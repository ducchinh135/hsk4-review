export default function AccountBar({ account, onLogin }) {
  const { available, user, statusText, statusWarn, logout } = account;
  return (
    <div className="account-bar" hidden={!available}>
      <span className={'sync-status' + (statusWarn ? ' warn' : '')} role="status" aria-live="polite">
        {statusText}
      </span>
      <span>
        {user ? (
          <>
            <span>👤 {user.username} </span>
            <button className="acc-btn" type="button" onClick={logout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <button className="acc-btn primary" type="button" onClick={onLogin}>
            👤 Đăng nhập để đồng bộ
          </button>
        )}
      </span>
    </div>
  );
}
