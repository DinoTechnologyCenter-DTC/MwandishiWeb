import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logoUrl from '../assets/images/logo-icon.svg';

function Brand() {
  return (
    <Link to="/" className="mb-4 d-inline-block text-decoration-none">
      <img src={logoUrl} alt="" width="36" />
      <span className="ms-2 fw-bold fs-4 text-primary">Mwandishi</span>
    </Link>
  );
}

export function Signin() {
  const navigate = useNavigate();
  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="card-body p-5">
          <div className="text-center mb-3">
            <Brand />
            <h1 className="card-title mb-5 h5">Sign in to your account</h1>
          </div>
          <form className="mt-3" onSubmit={(e) => { e.preventDefault(); navigate('/'); }}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input id="email" type="email" className="form-control" placeholder="name@example.com" required autoFocus />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label d-flex justify-content-between">
                <span>Password</span>
                <a href="#" onClick={(e) => e.preventDefault()} className="small link-primary">Forgot Password?</a>
              </label>
              <input id="password" type="password" className="form-control" placeholder="Password" required minLength="6" />
            </div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="form-check">
                <input id="remember" className="form-check-input" type="checkbox" />
                <label className="form-check-label small" htmlFor="remember">Remember me</label>
              </div>
            </div>
            <button className="btn btn-primary w-100" type="submit">Sign in</button>
          </form>
          <div className="text-center mt-3 small text-muted">
            Don&apos;t have an account? <Link to="/signup" className="link-primary">Sign up</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Signup() {
  const navigate = useNavigate();
  const [pw, setPw] = React.useState('');
  const [pw2, setPw2] = React.useState('');
  const mismatch = pw2.length > 0 && pw !== pw2;
  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div className="card" style={{ maxWidth: '420px', width: '100%' }}>
        <div className="card-body p-5">
          <div className="text-center mb-3">
            <Brand />
            <h1 className="card-title mb-5 h5">Create your account</h1>
          </div>
          <form className="mt-3" onSubmit={(e) => { e.preventDefault(); if (!mismatch) navigate('/'); }}>
            <div className="mb-3">
              <label htmlFor="fullName" className="form-label">Full name</label>
              <input id="fullName" type="text" className="form-control" placeholder="Jane Doe" required />
            </div>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email address</label>
              <input id="email" type="email" className="form-control" placeholder="name@example.com" required />
            </div>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <input id="password" type="password" className="form-control" placeholder="Create a password" required minLength="6" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="mb-3">
              <label htmlFor="confirmPassword" className="form-label">Confirm password</label>
              <input id="confirmPassword" type="password" className={`form-control${mismatch ? ' is-invalid' : ''}`} placeholder="Repeat password" required value={pw2} onChange={(e) => setPw2(e.target.value)} />
              {mismatch ? <div className="invalid-feedback" style={{ display: 'block' }}>Passwords must match.</div> : null}
            </div>
            <button className="btn btn-primary w-100" type="submit" disabled={mismatch}>Sign up</button>
          </form>
          <div className="text-center mt-3 small text-muted">
            Already have an account? <Link to="/signin" className="link-primary">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotFound() {
  return (
    <div className="container d-flex align-items-center justify-content-center min-vh-100">
      <div style={{ maxWidth: '500px', width: '100%' }}>
        <div className="text-center">
          <div className="mb-4"><Brand /></div>
          <h1 className="display-1 fw-bold text-primary mb-2">404</h1>
          <h2 className="card-title h4 mb-3">Page Not Found</h2>
          <p className="text-muted mb-4">Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
          <Link to="/dashboard" className="btn btn-primary">Go to My CVs</Link>
        </div>
      </div>
    </div>
  );
}
