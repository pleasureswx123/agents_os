import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const apiBase = import.meta.env.VITE_API_BASE_URL ?? '';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [message, setMessage] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const response = await fetch(`${apiBase}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) {
      setMessage('Login failed.');
      return;
    }
    const body = await response.json();
    localStorage.setItem('agents_os_access_token', body.data.accessToken);
    localStorage.setItem('agents_os_refresh_token', body.data.refreshToken);
    navigate('/projects');
  }

  return (
    <main className="public-app">
      <section className="public-panel">
        <header>
          <h1>Agents OS</h1>
          <p>Sign in to the agent factory workspace.</p>
        </header>
        <form className="panel-stack" onSubmit={submit}>
          <label>
            Email
            <input aria-label="Email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            Password
            <input aria-label="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button type="submit">Log in</button>
        </form>
        {message ? <p className="message">{message}</p> : null}
      </section>
    </main>
  );
}
