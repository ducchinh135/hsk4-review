import { useEffect, useState } from 'react';

export default function AuthModal({ initialMode, onClose, authenticate }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const register = mode === 'register';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const switchMode = (m) => {
    setMode(m);
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const body = { username: username.trim(), password };
    if (register) body.invite = invite.trim();
    const err = await authenticate(mode, body);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="authTitle" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-tabs">
          <button type="button" className={register ? '' : 'active'} id="authTitle" onClick={() => switchMode('login')}>
            Đăng nhập
          </button>
          <button type="button" className={register ? 'active' : ''} onClick={() => switchMode('register')}>
            Đăng ký
          </button>
        </div>
        <form onSubmit={submit} autoComplete="on">
          <label htmlFor="authUser">Tên đăng nhập</label>
          <input
            id="authUser"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            required
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          {register && <div className="hint-small">3–20 ký tự: chữ không dấu, số hoặc dấu gạch dưới.</div>}
          <label htmlFor="authPass">Mật khẩu</label>
          <input
            id="authPass"
            name="password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {register && <div className="hint-small">Ít nhất 8 ký tự.</div>}
          {register && (
            <div>
              <label htmlFor="authInvite">Mã mời</label>
              <input
                id="authInvite"
                name="invite"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck="false"
                value={invite}
                onChange={(e) => setInvite(e.target.value)}
              />
              <div className="hint-small">Hỏi người chia sẻ trang này để lấy mã.</div>
            </div>
          )}
          {error && (
            <div className="modal-error" role="alert">
              {error}
            </div>
          )}
          <div className="modal-actions">
            <button className="btn secondary" type="button" onClick={onClose}>
              Hủy
            </button>
            <button className="btn" type="submit" disabled={busy}>
              {register ? 'Tạo tài khoản' : 'Đăng nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
