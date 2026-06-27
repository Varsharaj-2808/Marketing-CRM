import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ForgotPasswordPage from './ForgotPasswordPage';

function renderForgotPassword() {
  return render(
    <MemoryRouter>
      <ForgotPasswordPage />
    </MemoryRouter>
  );
}

describe('ForgotPasswordPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders forgot password form with email input and submit button', () => {
    renderForgotPassword();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    expect(screen.getByText('Forgot Password')).toBeInTheDocument();
    expect(screen.getByText(/back to sign in/i)).toBeInTheDocument();
  });

  it('shows validation error for empty email', async () => {
    renderForgotPassword();
    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Email is required')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email format', async () => {
    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Invalid Email format')).toBeInTheDocument();
    });
  });

  it('shows success message after submitting valid email', async () => {
    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'admin@company.com' } });
    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText(/password reset link has been sent/i)).toBeInTheDocument();
    });
  });

  it('shows loading state on submit', async () => {
    renderForgotPassword();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'admin@company.com' } });
    const submitBtn = screen.getByRole('button', { name: /send reset link/i });
    fireEvent.click(submitBtn);
    expect(screen.getByText('Authenticating...')).toBeInTheDocument();
  });

  it('has back to sign in link', () => {
    renderForgotPassword();
    expect(screen.getByText('Back to Sign In')).toBeInTheDocument();
    expect(screen.getByText('Back to Sign In').closest('a')).toHaveAttribute('href', '/login');
  });
});
