'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Send, Clock, AlertCircle, CheckCircle2, Loader2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import EmailPreviewDialog from './EmailPreviewDialog';

interface SendControlSectionProps {
  uploadedFile: any;
  selectedTemplate: any;
  selectedSmtpConfig: any;
  mappingFile?: any;
}

interface SendResult {
  success: boolean;
  taskId?: number;
  message: string;
  sentCount?: number;
  failedCount?: number;
}

export default function SendControlSection({
  uploadedFile,
  selectedTemplate,
  selectedSmtpConfig,
  mappingFile,
}: SendControlSectionProps) {
  const [sendType, setSendType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledTime, setScheduledTime] = useState('');
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewEmails, setPreviewEmails] = useState<any[]>([]);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const sendMutation = trpc.email.sendEmails.useMutation();
  const scheduleMutation = trpc.email.scheduleEmails.useMutation();
  const previewMutation = trpc.emailPreview.generatePreviews.useMutation();

  // uploadedFile is now the dataFile object with { fileKey, sheetNames, mappingData }
  const canSend = uploadedFile && uploadedFile.fileKey && uploadedFile.fileKey.length > 0 && selectedTemplate?.id && selectedSmtpConfig?.id;

  // Calculate email count from uploaded file
  const emailCount = uploadedFile?.sheetNames?.length || 0;

  const handleGeneratePreview = async () => {
    if (!canSend) {
      toast.error('请完成所有配置步骤');
      return;
    }

    if (!uploadedFile?.fileKey) {
      toast.error('数据文件未正常上传');
      return;
    }

    if (!selectedTemplate?.id) {
      toast.error('邮件模板未选择');
      return;
    }

    setIsLoadingPreview(true);
    try {
      console.log('正在生成邮件预覧:', {
        templateId: selectedTemplate?.id,
        dataFileKey: uploadedFile?.fileKey,
        mappingFileKey: mappingFile?.fileKey,
      });

      const result = await previewMutation.mutateAsync({
        templateId: selectedTemplate?.id,
        dataFileKey: uploadedFile?.fileKey,
        mappingFileKey: mappingFile?.fileKey,
        merchantColumn: '商户名称',
        emailColumn: '收件人邮箱',
      });
      console.log('预覧结果:', result);

      if (result?.previews && result.previews.length > 0) {
        const completeEmails = result.previews.map((email: any) => ({
          ...email,
          html: email.html || '<p>邮件内容为空</p>',
        }));
        setPreviewEmails(completeEmails);
        setShowPreviewDialog(true);
        toast.success(`已生成 ${result.previews.length} 封邮件预覧，请确认无误后发送`);
      } else {
        console.error('未生成任何预覧:', result);
        toast.error('未生成任何邮件预覧，请检查数据文件和模板配置');
      }
    } catch (error: any) {
      console.error('预覧错误:', error);
      toast.error(error.message || '生成预覧失败，请检查配置');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleSendImmediately = async () => {
    if (!canSend) {
      toast.error('请完成所有配置步骤');
      return;
    }

    if (!uploadedFile.fileKey) {
      toast.error('文件上传不完整，请重新上传');
      return;
    }

    setIsSending(true);
    try {
      const result = await new Promise<SendResult>((resolve, reject) => {
        sendMutation.mutate(
          {
            templateId: selectedTemplate.id,
            smtpConfigId: selectedSmtpConfig.id,
            dataFileKey: uploadedFile.fileKey,
            mappingFileKey: mappingFile?.fileKey,
          },
          {
            onSuccess: (data: any) => {
              resolve({
                success: true,
                taskId: data.taskId,
                message: `邮件发送成功，共发送 ${data.sentCount || 0} 封邮件`,
                sentCount: data.sentCount,
                failedCount: data.failedCount,
              });
            },
            onError: (error: any) => {
              console.error('Send error:', error);
              reject({
                success: false,
                message: error.message || '邮件发送失败',
              });
            },
          }
        );
      });

      setSendResult(result);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.message || '邮件发送失败',
      });
      toast.error(error.message || '邮件发送失败');
    } finally {
      setIsSending(false);
    }
  };

  const handleScheduleSend = async () => {
    if (!canSend) {
      toast.error('请完成所有配置步骤');
      return;
    }
    if (!scheduledTime) {
      toast.error('请选择发送时间');
      return;
    }

    if (!uploadedFile.fileKey) {
      toast.error('文件上传不完整，请重新上传');
      return;
    }

    setIsSending(true);
    try {
      const result = await new Promise<SendResult>((resolve, reject) => {
        scheduleMutation.mutate(
          {
            templateId: selectedTemplate.id,
            smtpConfigId: selectedSmtpConfig.id,
            dataFileKey: uploadedFile.fileKey,
            mappingFileKey: mappingFile?.fileKey,
            scheduledTime: scheduledTime,
          },
          {
            onSuccess: (data: any) => {
              resolve({
                success: true,
                taskId: data.taskId,
                message: `定时任务已创建，将在 ${scheduledTime} 发送`,
              });
            },
            onError: (error: any) => {
              console.error('Schedule error:', error);
              reject({
                success: false,
                message: error.message || '创建定时任务失败',
              });
            },
          }
        );
      });

      setSendResult(result);
      if (result.success) {
        toast.success(result.message);
        setScheduledTime('');
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      setSendResult({
        success: false,
        message: error.message || '创建定时任务失败',
      });
      toast.error(error.message || '创建定时任务失败');
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmSend = async () => {
    await handleSendImmediately();
    setShowPreviewDialog(false);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>第四步：发送邮件</CardTitle>
          <CardDescription>选择发送方式并开始发送</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Check */}
          {!canSend && (
            <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-900 mb-2">配置未完成</p>
                  <ul className="text-sm text-yellow-800 space-y-1 ml-4 list-disc">
                    {!uploadedFile?.fileKey && <li>请上传Excel文件</li>}
                    {!selectedTemplate && <li>请选择或创建邮件模板</li>}
                    {!selectedSmtpConfig && <li>请配置SMTP发件人</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Send Result */}
          {sendResult && (
            <div
              className={`border rounded-lg p-4 ${
                sendResult.success
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              <div className="flex items-start gap-3">
                {sendResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-semibold mb-1 ${
                      sendResult.success ? 'text-green-900' : 'text-red-900'
                    }`}
                  >
                    {sendResult.success ? '发送成功' : '发送失败'}
                  </p>
                  <p
                    className={`text-sm ${
                      sendResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {sendResult.message}
                  </p>
                  {sendResult.sentCount !== undefined && (
                    <p className={`text-sm mt-1 ${
                      sendResult.success ? 'text-green-800' : 'text-red-800'
                    }`}>
                      成功: {sendResult.sentCount} 封, 失败: {sendResult.failedCount || 0} 封
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Send Options */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => setSendType('immediate')}
                variant={sendType === 'immediate' ? 'default' : 'outline'}
                className="h-24 flex flex-col items-center justify-center"
                disabled={isSending}
              >
                <Send className="h-6 w-6 mb-2" />
                <span>立即发送</span>
              </Button>
              <Button
                onClick={() => setSendType('scheduled')}
                variant={sendType === 'scheduled' ? 'default' : 'outline'}
                className="h-24 flex flex-col items-center justify-center"
                disabled={isSending}
              >
                <Clock className="h-6 w-6 mb-2" />
                <span>定时发送</span>
              </Button>
            </div>

            {sendType === 'immediate' && (
              <div className="space-y-3">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={!canSend || isSending || isLoadingPreview}
                  variant="outline"
                  className="w-full h-12 text-lg"
                >
                  {isLoadingPreview ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      生成预览中...
                    </>
                  ) : (
                    <>
                      <Eye className="h-5 w-5 mr-2" />
                      生成邮件预览
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleSendImmediately}
                  disabled={!canSend || isSending}
                  className="w-full h-12 text-lg"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      发送中...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 mr-2" />
                      立即发送邮件
                    </>
                  )}
                </Button>
              </div>
            )}

            {sendType === 'scheduled' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">选择发送时间</label>
                  <input
                    type="datetime-local"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    disabled={isSending}
                    className="w-full mt-2 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
                  />
                </div>
                <Button
                  onClick={handleScheduleSend}
                  disabled={!canSend || isSending}
                  className="w-full h-12 text-lg"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Clock className="h-5 w-5 mr-2" />
                      设置定时发送
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Summary */}
          {canSend && (
            <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <p className="font-semibold text-blue-900">发送摘要</p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  {showPreview ? '隐藏' : '预览'}
                </Button>
              </div>
              <div className="text-sm text-blue-800 space-y-2">
                <p>
                  <span className="font-medium">模板:</span> {selectedTemplate?.templateName}
                </p>
                <p>
                  <span className="font-medium">发件人:</span> {selectedSmtpConfig?.senderEmail}
                </p>
                <p>
                  <span className="font-medium">待发送邮件数:</span> <span className="font-bold text-lg text-blue-900">{emailCount}</span>
                </p>
                {mappingFile && (
                  <p>
                    <span className="font-medium">邮箱映射:</span> 已配置
                  </p>
                )}
              </div>

              {showPreview && emailCount > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <p className="font-medium text-blue-900 mb-2">待发送商户列表:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {uploadedFile?.sheetNames?.map((sheet: string, idx: number) => (
                      <div key={idx} className="text-sm text-blue-800 ml-2">
                        • {sheet}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        emails={previewEmails}
        onConfirm={handleConfirmSend}
        isLoading={isSending}
      />
    </>
  );
}
