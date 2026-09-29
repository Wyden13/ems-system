import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material';
import { AuthContext, type AuthState } from '../auth/context';
import AttendancePage from './AttendancePage';
import theme from '../theme';
it('opens attendance using raw clock state already cached by the dashboard', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const time = new Date().toISOString();
  client.setQueryData(['attendance', 'state'], { serverTime: time, employeeId: 1, active: null, todaySeconds: 0 });
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input);
    const body = path.includes('/people') ? [{ id: 1, name: 'Worker', employeeNumber: '000001', active: true, self: true }]
      : path.includes('/score') ? { status: 'UNAVAILABLE', expectedEvents: null, missedEvents: null, missPercentage: null, explanation: 'Scoring is deferred.' } : [];
    return new Response(JSON.stringify(body), { status: 200 });
  });
  const auth: AuthState = {
    account: { id: 'account', email: 'worker@example.test', role: 'EMPLOYEE', status: 'ACTIVE', createdAt: time, updatedAt: time, lastLoginAt: null },
    loading: false, error: null, signIn: vi.fn(), signOut: vi.fn(), reload: vi.fn(), restore: vi.fn(),
  };
  render(<ThemeProvider theme={theme}><AuthContext.Provider value={auth}><QueryClientProvider client={client}><AttendancePage /></QueryClientProvider></AuthContext.Provider></ThemeProvider>);
  expect(await screen.findByRole('heading', { name: 'Attendance' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Clock In' })).toBeEnabled();
  expect(screen.getByText(/Mountain Time/)).not.toHaveTextContent('Invalid');
});
