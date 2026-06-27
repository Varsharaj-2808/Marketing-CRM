import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import RegisterPage from './RegisterPage';

function renderRegisterPage() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  afterEach(cleanup);
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('renders registration form with all fields and submit button', () => {
    renderRegisterPage();
    expect(screen.getByRole('heading', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    expect(screen.getByText(/already have an account/i)).toBeInTheDocument();
  });

  it('shows field errors on empty submit', async () => {
    renderRegisterPage();
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeInTheDocument();
      expect(screen.getByText('Email is required')).toBeInTheDocument();
      expect(screen.getByText('Password is required')).toBeInTheDocument();
      expect(screen.getByText('Please confirm your password')).toBeInTheDocument();
    });
  });

  it('shows error for invalid email format', async () => {
    renderRegisterPage();
    const emailInput = screen.getByLabelText(/email/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Invalid Email format')).toBeInTheDocument();
    });
  });

  it('shows error for short password', async () => {
    renderRegisterPage();
    const passwordInput = screen.getByLabelText(/^password/i);
    fireEvent.change(passwordInput, { target: { value: '123' } });
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    renderRegisterPage();
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmInput, { target: { value: 'DifferentPass456!' } });
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
  });

  it('shows loading state on submit with valid data', async () => {
    renderRegisterPage();
    const nameInput = screen.getByLabelText(/full name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/^password/i);
    const confirmInput = screen.getByLabelText(/confirm password/i);
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@company.com' } });
    fireEvent.change(passwordInput, { target: { value: 'Password123!' } });
    fireEvent.change(confirmInput, { target: { value: 'Password123!' } });
    const submitBtn = screen.getByRole('button', { name: /create account/i });
    fireEvent.click(submitBtn);
    expect(screen.getByText('Authenticating...')).toBeInTheDocument();
  });

  it('has link to sign in page', () => {
    renderRegisterPage();
    const link = screen.getByText(/sign in/i);
    expect(link.closest('a')).toHaveAttribute('href', '/login');
  });
});
