'use client';

import { useState, useEffect } from 'react';
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
  const [sanitizedHtml, setSanitizedHtml] = useState('');

  if (emails.length === 0) {
    return null;
  }

  const currentEmail = emails[currentIndex];
  const hasNext = currentIndex < emails.length - 1;
  const hasPrev = currentIndex > 0;

  // Sanitize HTML to prevent DOM errors
  useEffect(() => {
    if (!currentEmail.html) {
      setSanitizedHtml('');
      return;
    }
    
    // Create a temporary container to parse HTML
    const temp = document.createElement('div');
    temp.innerHTML = currentEmail.html;
    
    // Remove potentially problematic elements
    const scripts = temp.querySelectorAll('script, style, iframe');
    scripts.forEach(el => el.remove());
    
    setSanitizedHtml(temp.innerHTML);
  }, [currentEmail.html]);

  const handleNext = () => {
    if (hasNext) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(currentEmail.to);
    toast.success('邮箱地址已复制');
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
            共 {emails.length} 封邮件，当前预览第 {currentIndex + 1} 封
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
                {currentIndex + 1} / {emails.length}
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

            {/* Email Body - Use iframe to prevent DOM issues */}
            <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 rounded-lg bg-white">
              <p className="text-xs font-medium text-slate-600 px-4 py-2 border-b border-slate-200">
                邮件内容预览
              </p>
              <ScrollArea className="flex-1">
                <div className="p-4 min-h-full">
                  {/* Render HTML content safely */}
                  <div
                    className="prose prose-sm max-w-none text-slate-900 break-words"
                    style={{
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {sanitizedHtml ? (
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
