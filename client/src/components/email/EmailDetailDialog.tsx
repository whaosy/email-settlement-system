'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, X } from 'lucide-react';
import { toast } from 'sonner';

interface EmailDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: {
    id?: number;
    to: string;
    subject: string;
    html: string;
    status?: 'success' | 'failed' | 'pending' | 'sending' | 'sent';
    sentTime?: Date | string | null;
    from?: string;
    senderEmail?: string;
    merchantName?: string;
    errorMessage?: string | null;
    retryCount?: number | null;
    recipientName?: string;
  } | null;
}

export default function EmailDetailDialog({
  open,
  onOpenChange,
  email,
}: EmailDetailDialogProps) {
  if (!email) {
    return null;
  }

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(email.to);
    toast.success('邮箱地址已复制');
  };

  const handleCopySubject = () => {
    navigator.clipboard.writeText(email.subject);
    toast.success('主题已复制');
  };

  const handleDownloadHtml = () => {
    const element = document.createElement('a');
    const file = new Blob([email.html], { type: 'text/html;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `${email.subject || 'email'}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
      case 'sent':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'sending':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'success':
      case 'sent':
        return '已发送';
      case 'failed':
        return '发送失败';
      case 'pending':
        return '待发送';
      case 'sending':
        return '发送中';
      default:
        return '未知';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] flex flex-col">
        <DialogHeader>
          <DialogTitle>邮件详情</DialogTitle>
          <DialogDescription>查看完整的邮件内容和发送状态</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Email Metadata */}
          <div className="grid grid-cols-2 gap-4 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            {/* Status */}
            {email.status && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">发送状态</p>
                <Badge className={getStatusColor(email.status)}>
                  {getStatusLabel(email.status)}
                </Badge>
              </div>
            )}

            {/* Sent Time */}
            {email.sentTime && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">发送时间</p>
                <p className="text-sm text-slate-900">
                  {new Date(email.sentTime).toLocaleString()}
                </p>
              </div>
            )}

            {/* From */}
            {(email.from || email.senderEmail) && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">发件人</p>
                <p className="text-sm text-slate-900 break-all">{email.from || email.senderEmail}</p>
              </div>
            )}

            {/* Merchant Name */}
            {email.merchantName && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">商户名称</p>
                <p className="text-sm text-slate-900">{email.merchantName}</p>
              </div>
            )}

            {/* Retry Count */}
            {email.retryCount !== undefined && email.retryCount !== null && (
              <div>
                <p className="text-xs font-medium text-slate-600 mb-1">重试次数</p>
                <p className="text-sm text-slate-900">{email.retryCount}</p>
              </div>
            )}

            {/* Error Message */}
            {email.errorMessage && (
              <div className="col-span-2">
                <p className="text-xs font-medium text-red-600 mb-1">错误信息</p>
                <p className="text-sm text-red-700 bg-red-50 p-2 rounded break-all">
                  {email.errorMessage}
                </p>
              </div>
            )}
          </div>

          {/* To Address */}
          <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">收件人</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm bg-white p-2 rounded border border-slate-200 break-all">
                {email.to}
              </code>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopyEmail}
                className="h-8 w-8 p-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Subject */}
          <div className="px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs font-medium text-slate-600 mb-2">邮件主题</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm bg-white p-2 rounded border border-slate-200 break-words">
                {email.subject}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCopySubject}
                className="h-8 w-8 p-0 flex-shrink-0"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Email Body */}
          <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 rounded-lg bg-white">
            <div className="px-4 py-2 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <p className="text-xs font-medium text-slate-600">邮件内容</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownloadHtml}
                className="h-8 px-2"
              >
                <Download className="h-4 w-4 mr-1" />
                下载
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-4">
                <div
                  className="prose prose-sm max-w-none text-slate-900 break-words"
                  style={{
                    wordBreak: 'break-word',
                    overflowWrap: 'break-word',
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: email.html }} />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            关闭
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
