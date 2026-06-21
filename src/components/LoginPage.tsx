import { useState } from 'react';
import type { UserRole } from '../types/auth';

interface Props {
  error: string;
  onLogin: (input: { email: string; password: string; role: UserRole }) => boolean;
}

export function LoginPage({ error, onLogin }: Props) {
  const [role, setRole] = useState<UserRole>('admin');
  const [email, setEmail] = useState('admin@loadercastle.in');
  const [password, setPassword] = useState('admin123');

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onLogin({ email, password, role });
  };

  const fillDemo = (nextRole: UserRole) => {
    setRole(nextRole);
    setEmail(nextRole === 'admin' ? 'admin@loadercastle.in' : 'cashier@loadercastle.in');
    setPassword(nextRole === 'admin' ? 'admin123' : 'user123');
  };

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="brand login-brand">
          <div className="brand-mark">LC</div>
          <div><strong>Loader Castle</strong><span>Restaurant POS</span></div>
        </div>
        <div className="login-copy">
          <h1>Sign in to your restaurant workspace</h1>
          <p>Admin users can manage branches, inventory, attendance, GST, reports, and settings. Counter users get a focused billing workspace for fast service.</p>
        </div>
        <div className="login-stats">
          <span><b>Offline</b> billing cache</span>
          <span><b>INR</b> GST checkout</span>
          <span><b>Role</b> access control</span>
        </div>
      </section>

      <section className="login-panel" aria-label="Login form">
        <form onSubmit={submit}>
          <div className="panel-heading">
            <div>
              <h2>Welcome back</h2>
              <p>Choose a role and sign in.</p>
            </div>
          </div>

          <div className="role-switch" role="tablist" aria-label="Login role">
            <button type="button" className={role === 'admin' ? 'selected' : ''} onClick={() => fillDemo('admin')}>Admin</button>
            <button type="button" className={role === 'user' ? 'selected' : ''} onClick={() => fillDemo('user')}>User</button>
          </div>

          <label>Email
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label>Password
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>

          {error && <div className="form-error">{error}</div>}

          <button className="button primary login-submit" type="submit">Sign in as {role === 'admin' ? 'Admin' : 'User'}</button>

          <p className="login-note">Demo credentials are prefilled. Connect Firebase Auth later using the existing Firebase-ready project structure.</p>
        </form>
      </section>
    </main>
  );
}
