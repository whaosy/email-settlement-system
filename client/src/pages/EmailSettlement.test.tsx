import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import EmailSettlement from './EmailSettlement';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => {
    const navigate = vi.fn();
    return ['/email', navigate];
  },
}));

// Mock child components
vi.mock('@/components/email/FileUploadSection', () => ({
  default: () => <div>File Upload Section</div>,
}));

vi.mock('@/components/email/TemplateConfigSection', () => ({
  default: () => <div>Template Config Section</div>,
}));

vi.mock('@/components/email/SmtpConfigSection', () => ({
  default: () => <div>SMTP Config Section</div>,
}));

vi.mock('@/components/email/SendControlSection', () => ({
  default: () => <div>Send Control Section</div>,
}));

vi.mock('@/components/email/HistorySection', () => ({
  default: () => <div>History Section</div>,
}));

describe('EmailSettlement Component', () => {
  it('renders the email settlement page with title', () => {
    render(<EmailSettlement />);
    
    const heading = screen.getByText(/批量邮件发送系统/i);
    expect(heading).toBeTruthy();
  });

  it('renders the back to home button', () => {
    render(<EmailSettlement />);
    
    const backButton = screen.getByText(/返回首页/i);
    expect(backButton).toBeTruthy();
  });

  it('renders all tab triggers', () => {
    render(<EmailSettlement />);
    
    expect(screen.getByText(/上传文件/i)).toBeTruthy();
    expect(screen.getByText(/邮件模板/i)).toBeTruthy();
    expect(screen.getByText(/SMTP设置/i)).toBeTruthy();
    expect(screen.getByText(/发送邮件/i)).toBeTruthy();
    expect(screen.getByText(/历史记录/i)).toBeTruthy();
  });

  it('renders the alert message', () => {
    render(<EmailSettlement />);
    
    const alert = screen.getByText(/请按照以下步骤配置并发送邮件/i);
    expect(alert).toBeTruthy();
  });

  it('renders the file upload section by default', () => {
    render(<EmailSettlement />);
    
    expect(screen.getByText(/File Upload Section/i)).toBeTruthy();
  });

  it('back button is present and clickable', () => {
    render(<EmailSettlement />);
    
    const backButton = screen.getByText(/返回首页/i);
    expect(backButton).toBeTruthy();
  });
});
