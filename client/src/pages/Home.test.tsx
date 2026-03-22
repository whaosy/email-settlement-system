import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Home from './Home';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => {
    const navigate = vi.fn();
    return ['/home', navigate];
  },
}));

// Mock useAuth hook
vi.mock('@/_core/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  }),
}));

describe('Home Component', () => {
  it('renders the home page with welcome card', () => {
    render(<Home />);
    
    const heading = screen.getByText(/批量邮件发送系统/i);
    expect(heading).toBeTruthy();
  });

  it('renders the enter email system button', () => {
    render(<Home />);
    
    const button = screen.getByText(/进入邮件发送系统/i);
    expect(button).toBeTruthy();
  });

  it('renders the start now button', () => {
    render(<Home />);
    
    const button = screen.getByText(/现在开始/i);
    expect(button).toBeTruthy();
  });

  it('renders feature cards', () => {
    render(<Home />);
    
    expect(screen.getByText(/批量发送/i)).toBeTruthy();
    expect(screen.getByText(/灵活配置/i)).toBeTruthy();
    expect(screen.getByText(/定时发送/i)).toBeTruthy();
    expect(screen.getByText(/实时监控/i)).toBeTruthy();
    expect(screen.getByText(/数据安全/i)).toBeTruthy();
    expect(screen.getByText(/历史记录/i)).toBeTruthy();
  });

  it('renders quick start section', () => {
    render(<Home />);
    
    expect(screen.getByText(/快速开始/i)).toBeTruthy();
    expect(screen.getByText(/上传Excel文件/i)).toBeTruthy();
    expect(screen.getByText(/配置邮件和SMTP/i)).toBeTruthy();
    expect(screen.getByText(/发送邮件/i)).toBeTruthy();
  });

  it('buttons are clickable', () => {
    const { getByText } = render(<Home />);
    
    const enterButton = getByText(/进入邮件发送系统/i);
    expect(enterButton).toBeTruthy();
    
    const startButton = getByText(/现在开始/i);
    expect(startButton).toBeTruthy();
  });
});
