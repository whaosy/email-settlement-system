'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Mail, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    merchantName?: string;
  }>;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function EmailPreviewDialog({
  open,
  onOpenChange,
  emails,
  onConfirm,
  isLoading = false,
}: EmailPreviewDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 验证邮件数据
  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return null;
  }

  // 确保索引在有效范围内
  const safeIndex = Math.min(Math.max(0, currentIndex), emails.length - 1);
  const currentEmail = emails[safeIndex];

  // 检查当前邮件数据完整性
  if (!currentEmail || !currentEmail.to || !currentEmail.subject) {
    return null;
  }

  const hasNext = safeIndex < emails.length - 1;
  const hasPrev = safeIndex > 0;

  // 使用 useMemo 缓存 HTML 内容，避免重复计算和渲染
  const sanitizedHtml = useMemo(() => {
    if (!currentEmail.html || typeof currentEmail.html !== 'string') {
      return '';
    }

    try {
      const temp = document.createElement('div');
      temp.innerHTML = currentEmail.html;

      // 移除危险元素
      const dangerousElements = temp.querySelectorAll('script, style, iframe, object, embed');
      dangerousElements.forEach(el => el.remove());

      return temp.innerHTML;
    } catch (error) {
      console.error('Failed to sanitize HTML:', error);
      return currentEmail.html || '';
    }
  }, [currentEmail.html]);

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(safeIndex + 1);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setCurrentIndex(safeIndex - 1);
    }
  };

  const handleCopyEmail = () => {
    if (currentEmail?.to) {
      navigator.clipboard.writeText(currentEmail.to);
      toast.success('邮箱地址已复制');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            邮件预览
          </DialogTitle>
          <DialogDescription>
            共 {emails.length} 封邮件，当前预览第 {safeIndex + 1} 封
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Email Navigation */}
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-50 rounded-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-slate-700">
                {currentEmail.merchantName || '商户'} - {currentEmail.to}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {safeIndex + 1} / {emails.length}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={!hasNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-hidden flex flex-col gap-2">
            {/* Subject */}
            <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-600 mb-1">邮件主题</p>
              <p className="text-sm font-medium text-slate-900 break-words">
                {currentEmail.subject}
              </p>
            </div>

            {/* Recipients */}
            <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-600 mb-2">收件人</p>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-mono">
                  {currentEmail.to}
                </Badge>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCopyEmail}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Email Body */}
            <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 rounded-lg bg-white">
              <p className="text-xs font-medium text-slate-600 px-4 py-2 border-b border-slate-200">
                邮件内容预览
              </p>
              <ScrollArea className="flex-1">
                <div className="p-4 min-h-full">
                  {/* Render HTML content safely */}
                  <div
                    className="prose prose-sm max-w-none text-slate-900 break-words rich-text-editor-content"
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {sanitizedHtml && sanitizedHtml.trim() ? (
                      <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
                    ) : (
                      <p className="text-slate-500">邮件内容为空</p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            取消
          </Button>
          <Button onClick={onConfirm} disabled={isLoading}>
            {isLoading ? '发送中...' : '确认发送'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
