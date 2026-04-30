import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PINLoginForm from '../src/components/PINLoginForm';
import { supabase } from '../src/supabaseClient';

// Mock Supabase
jest.mock('../src/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
      getSession: jest.fn(),
    },
  },
}));

// Mock reportingApi
jest.mock('../src/services/reportingApi', () => ({
  reportingApi: {
    logActivity: jest.fn(),
  },
}));

describe('PINLoginForm', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('SCRUM-385: PIN Input and Display', () => {
    it('should render the PIN login form with keypad', () => {
      render(<PINLoginForm />);
      
      expect(screen.getByText('PharmaCare POS')).toBeInTheDocument();
      expect(screen.getByText('Enter your PIN to continue')).toBeInTheDocument();
      
      // Check all number buttons are present
      for (let i = 0; i <= 9; i++) {
        expect(screen.getByText(i.toString())).toBeInTheDocument();
      }
      
      // Check action buttons
      expect(screen.getByText('Clear')).toBeInTheDocument();
      expect(screen.getByText('Sign In')).toBeInTheDocument();
    });

    it('should display PIN dots as user enters digits', () => {
      render(<PINLoginForm />);
      
      const button1 = screen.getByText('1');
      const button2 = screen.getByText('2');
      
      fireEvent.click(button1);
      fireEvent.click(button2);
      
      // Check that 2 dots are filled
      const filledDots = document.querySelectorAll('.pin-dot.filled');
      expect(filledDots).toHaveLength(2);
    });

    it('should limit PIN to 6 digits', () => {
      render(<PINLoginForm />);
      
      // Try to enter 7 digits
      for (let i = 0; i < 7; i++) {
        fireEvent.click(screen.getByText('1'));
      }
      
      // Should only have 6 filled dots
      const filledDots = document.querySelectorAll('.pin-dot.filled');
      expect(filledDots).toHaveLength(6);
    });

    it('should clear PIN when Clear button is clicked', () => {
      render(<PINLoginForm />);
      
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      
      expect(document.querySelectorAll('.pin-dot.filled')).toHaveLength(3);
      
      fireEvent.click(screen.getByText('Clear'));
      
      expect(document.querySelectorAll('.pin-dot.filled')).toHaveLength(0);
    });

    it('should remove last digit when backspace is clicked', () => {
      render(<PINLoginForm />);
      
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      
      expect(document.querySelectorAll('.pin-dot.filled')).toHaveLength(3);
      
      const backspaceButton = screen.getByRole('button', { name: '' }); // Delete icon button
      fireEvent.click(backspaceButton);
      
      expect(document.querySelectorAll('.pin-dot.filled')).toHaveLength(2);
    });
  });

  describe('SCRUM-386: Authentication', () => {
    it('should call Supabase auth with PIN on login', async () => {
      const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
      mockSignIn.mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null,
      });

      render(<PINLoginForm />);
      
      // Enter PIN
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('4'));
      
      // Click Sign In
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith({
          email: 'cashier1234@pos.local',
          password: '1234',
        });
      });
    });

    it('should show error for PIN less than 4 digits', () => {
      render(<PINLoginForm />);
      
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      
      fireEvent.click(screen.getByText('Sign In'));
      
      expect(screen.getByText('PIN must be at least 4 digits')).toBeInTheDocument();
    });
  });

  describe('SCRUM-387: Failed Attempts and Lockout', () => {
    it('should track failed login attempts', async () => {
      const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      render(<PINLoginForm />);
      
      // First failed attempt
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('4'));
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByText(/2 attempts remaining/i)).toBeInTheDocument();
      });
      
      // Second failed attempt
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('4'));
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(screen.getByText(/1 attempt remaining/i)).toBeInTheDocument();
      });
    });

    it('should lock account after 3 failed attempts', async () => {
      const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
      mockSignIn.mockResolvedValue({
        data: null,
        error: { message: 'Invalid credentials' },
      });

      render(<PINLoginForm />);
      
      // Three failed attempts
      for (let i = 0; i < 3; i++) {
        fireEvent.click(screen.getByText('1'));
        fireEvent.click(screen.getByText('2'));
        fireEvent.click(screen.getByText('3'));
        fireEvent.click(screen.getByText('4'));
        fireEvent.click(screen.getByText('Sign In'));
        
        await waitFor(() => {
          expect(mockSignIn).toHaveBeenCalled();
        });
      }
      
      await waitFor(() => {
        expect(screen.getByText(/Account locked for 15 minutes/i)).toBeInTheDocument();
      });
      
      // Verify lockout is stored in localStorage
      expect(localStorage.getItem('pin_lockout_end')).toBeTruthy();
      expect(localStorage.getItem('pin_failed_attempts')).toBe('3');
    });

    it('should persist lockout state across page refresh', () => {
      // Set lockout in localStorage
      const lockoutEnd = Date.now() + 15 * 60 * 1000;
      localStorage.setItem('pin_lockout_end', lockoutEnd.toString());
      localStorage.setItem('pin_failed_attempts', '3');
      
      render(<PINLoginForm />);
      
      expect(screen.getByText(/Account Locked/i)).toBeInTheDocument();
      expect(screen.getByText(/Time remaining:/i)).toBeInTheDocument();
    });

    it('should disable keypad when account is locked', () => {
      // Set lockout in localStorage
      const lockoutEnd = Date.now() + 15 * 60 * 1000;
      localStorage.setItem('pin_lockout_end', lockoutEnd.toString());
      
      render(<PINLoginForm />);
      
      const button1 = screen.getByText('1');
      expect(button1).toBeDisabled();
    });

    it('should reset failed attempts on successful login', async () => {
      // Set some failed attempts
      localStorage.setItem('pin_failed_attempts', '2');
      
      const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
      mockSignIn.mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null,
      });

      render(<PINLoginForm />);
      
      fireEvent.click(screen.getByText('1'));
      fireEvent.click(screen.getByText('2'));
      fireEvent.click(screen.getByText('3'));
      fireEvent.click(screen.getByText('4'));
      fireEvent.click(screen.getByText('Sign In'));
      
      await waitFor(() => {
        expect(localStorage.getItem('pin_failed_attempts')).toBeNull();
        expect(localStorage.getItem('pin_lockout_end')).toBeNull();
      });
    });
  });

  describe('Keyboard Support', () => {
    it('should accept numeric keyboard input', () => {
      render(<PINLoginForm />);
      
      const container = screen.getByText('PharmaCare POS').closest('.pin-login-container');
      
      fireEvent.keyDown(container!, { key: '1' });
      fireEvent.keyDown(container!, { key: '2' });
      fireEvent.keyDown(container!, { key: '3' });
      
      expect(document.querySelectorAll('.pin-dot.filled')).toHaveLength(3);
    });

    it('should handle Enter key to submit', async () => {
      const mockSignIn = supabase.auth.signInWithPassword as jest.Mock;
      mockSignIn.mockResolvedValue({
        data: { session: { user: { id: '123' } } },
        error: null,
      });

      render(<PINLoginForm />);
      
      const container = screen.getByText('PharmaCare POS').closest('.pin-login-container');
      
      fireEvent.keyDown(container!, { key: '1' });
      fireEvent.keyDown(container!, { key: '2' });
      fireEvent.keyDown(container!, { key: '3' });
      fireEvent.keyDown(container!, { key: '4' });
      fireEvent.keyDown(container!, { key: 'Enter' });
      
      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalled();
      });
    });

    it('should handle Backspace key', () => {
      render(<PINLoginForm />);
      
      const container = screen.getByText('PharmaCare POS').closest('.pin-login-container');
      
      fireEvent.keyDown(container!, { key: '1' });
      fireEvent.keyDown(container!, { key: '2' });
      fireEvent.keyDown(container!, { key: '3' });
      
      expect(document.querySelectorAll('.pin-dot.filled')).toHaveLength(3);
      
      fireEvent.keyDown(container!, { key: 'Backspace' });
      
      expect(document.querySelectorAll('.pin-dot.filled')).toHaveLength(2);
    });

    it('should handle Escape key to clear', () => {
      render(<PINLoginForm />);
      
      const container = screen.getByText('PharmaCare POS').closest('.pin-login-container');
      
      fireEvent.keyDown(container!, { key: '1' });
      fireEvent.keyDown(container!, { key: '2' });
      fireEvent.keyDown(container!, { key: '3' });
      
      expect(document.querySelectorAll('.pin-dot.filled')).toHaveLength(3);
      
      fireEvent.keyDown(container!, { key: 'Escape' });
      
      expect(document.querySelectorAll('.pin-dot.filled')).toHaveLength(0);
    });
  });
});
