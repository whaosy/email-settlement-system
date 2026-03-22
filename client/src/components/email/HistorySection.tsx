'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, RotateCcw, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import EmailDetailDialog from './EmailDetailDialog';

interface TaskLog {
  id: number;
  recipientEmail: string;
  recipientName: string | null;
  subject: string | null;
  status: 'success' | 'sending' | 'failed' | 'pending' | null;
  errorMessage: string | null;
  sentAt: Date | null;
  retryCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export default function HistorySection() {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any | null>(null);
  const [showEmailDetail, setShowEmailDetail] = useState(false);

  const taskListQuery = trpc.emailHistory.getTaskList.useQuery({ page: 1, pageSize: 20 });
  const taskDetailsQuery = trpc.emailHistory.getTaskDetails.useQuery(
    { taskId: selectedTaskId || 0 },
    { enabled: !!selectedTaskId }
  );
  const exportMutation = trpc.emailHistory.exportTaskLogs.useMutation();
  const retryMutation = trpc.emailHistory.retryFailedEmails.useMutation();

  const handleExport = async (taskId: number) => {
    setIsExporting(true);
    try {
      const result = await exportMutation.mutateAsync({ taskId });
      if (result.success && result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
        toast.success('日志导出成功');
      }
    } catch (error: any) {
      toast.error(error.message || '导出失败');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRetryFailed = async (taskId: number) => {
    setIsRetrying(true);
    try {
      const result = await retryMutation.mutateAsync({ taskId });
      if (result.success) {
        toast.success(result.message);
        await taskDetailsQuery.refetch();
        await taskListQuery.refetch();
      }
    } catch (error: any) {
      toast.error(error.message || '重试失败');
    } finally {
      setIsRetrying(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">成功</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">失败</Badge>;
      case 'sending':
        return <Badge className="bg-blue-100 text-blue-800">发送中</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">待发送</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">未知</Badge>;
    }
  };

  if (taskListQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>第五步：历史记录</CardTitle>
          <CardDescription>查看所有邮件发送任务的历史记录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const tasks = taskListQuery.data?.tasks || [];

  if (!selectedTaskId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>第五步：历史记录</CardTitle>
          <CardDescription>查看所有邮件发送任务的历史记录</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {tasks.length === 0 ? (
            <div className="border rounded-lg p-8 text-center bg-slate-50">
              <p className="text-slate-600 mb-4">还没有发送任何邮件</p>
              <p className="text-sm text-slate-500">
                请返回前面的步骤完成邮件配置和发送
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition"
                  onClick={() => setSelectedTaskId(task.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{task.taskName}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        创建时间: {new Date(task.createdAt).toLocaleString('zh-CN')}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{task.status}</Badge>
                        {task.successCount !== undefined && (
                          <span className="text-sm text-slate-600">
                            成功: {task.successCount}, 失败: {task.failureCount || 0}
                          </span>
                        )}
                      </div>
                    </div>
                    <Eye className="h-5 w-5 text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (taskDetailsQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>任务详情</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTaskId(null)}
            className="absolute right-4 top-4"
          >
            返回列表
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const taskDetails = taskDetailsQuery.data;
  const logs = taskDetails?.logs || [];
  const stats = taskDetails?.statistics;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>任务详情</CardTitle>
            <CardDescription>查看发送详情和日志</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedTaskId(null)}
          >
            返回列表
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="border rounded-lg p-4 bg-blue-50">
              <p className="text-sm text-slate-600">总计</p>
              <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
            </div>
            <div className="border rounded-lg p-4 bg-green-50">
              <p className="text-sm text-slate-600">成功</p>
              <p className="text-2xl font-bold text-green-900">{stats.success}</p>
            </div>
            <div className="border rounded-lg p-4 bg-red-50">
              <p className="text-sm text-slate-600">失败</p>
              <p className="text-2xl font-bold text-red-900">{stats.failure}</p>
            </div>
            <div className="border rounded-lg p-4 bg-yellow-50">
              <p className="text-sm text-slate-600">成功率</p>
              <p className="text-2xl font-bold text-yellow-900">
                {stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(2) : '0.00'}%
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {stats && stats.failure > 0 && (
            <Button
              onClick={() => handleRetryFailed(selectedTaskId!)}
              disabled={isRetrying}
              className="flex items-center gap-2"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  重试中...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4" />
                  重试失败邮件
                </>
              )}
            </Button>
          )}
          <Button
            onClick={() => handleExport(selectedTaskId!)}
            disabled={isExporting}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                导出中...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                导出日志
              </>
            )}
          </Button>
        </div>

        {/* Email Logs Table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-900">收件人</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-900">状态</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-900">发送时间</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-900">错误信息</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-900">操作</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-600">
                      暂无日志数据
                    </td>
                  </tr>
                ) : (
                  logs.map((log: TaskLog) => (
                    <tr key={log.id} className="border-b hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-900">{log.recipientEmail}</td>
                      <td className="px-4 py-3">{getStatusBadge(log.status)}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {log.sentAt ? new Date(log.sentAt).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="px-4 py-3 text-red-600 text-xs max-w-xs truncate" title={log.errorMessage || ''}>
                        {log.errorMessage || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const emailDetailHtml = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
                              <div style="background-color: white; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
                                <p style="margin: 0 0 10px 0;"><strong>邮件详细信息</strong></p>
                                <table style="width: 100%; font-size: 14px;">
                                  <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px 0; font-weight: bold; color: #555; width: 100px;">收件人:</td>
                                    <td style="padding: 8px 0;">${log.recipientEmail}</td>
                                  </tr>
                                  <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">主题:</td>
                                    <td style="padding: 8px 0;">${log.subject || '未知'}</td>
                                  </tr>
                                  <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">状态:</td>
                                    <td style="padding: 8px 0;"><span style="display: inline-block; padding: 4px 8px; border-radius: 4px; ${log.status === 'success' ? 'background-color: #d4edda; color: #155724;' : log.status === 'failed' ? 'background-color: #f8d7da; color: #721c24;' : 'background-color: #fff3cd; color: #856404;'}">${log.status || '未知'}</span></td>
                                  </tr>
                                  <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">发送时间:</td>
                                    <td style="padding: 8px 0;">${log.sentAt ? new Date(log.sentAt).toLocaleString('zh-CN') : '未发送'}</td>
                                  </tr>
                                  <tr style="border-bottom: 1px solid #eee;">
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">重试次数:</td>
                                    <td style="padding: 8px 0;">${log.retryCount || 0}</td>
                                  </tr>
                                  ${log.errorMessage ? `<tr><td style="padding: 8px 0; font-weight: bold; color: #d32f2f;">错误信息:</td><td style="padding: 8px 0; color: #d32f2f;">${log.errorMessage}</td></tr>` : ''}
                                </table>
                              </div>
                              <div style="background-color: #fff3cd; padding: 12px; border-radius: 6px; border-left: 4px solid #ffc107; color: #856404;">
                                <p style="margin: 0; font-size: 13px;"><strong>注:</strong> 邮件正文内容在发送时不会保存到数据库中。如需查看原始邮件内容，请查看邮件模板配置。</p>
                              </div>
                            </div>`;
                            setSelectedEmail({
                              to: log.recipientEmail,
                              recipientName: log.recipientName || '未知',
                              subject: log.subject || '未知',
                              html: emailDetailHtml,
                              status: log.status,
                              sentTime: log.sentAt,
                              errorMessage: log.errorMessage,
                              retryCount: log.retryCount,
                            });
                            setShowEmailDetail(true);
                          }}
                          className="h-8 px-2"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Email Detail Dialog */}
        <EmailDetailDialog
          open={showEmailDetail}
          onOpenChange={setShowEmailDetail}
          email={selectedEmail}
        />
      </CardContent>
    </Card>
  );
}
