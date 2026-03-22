'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Edit2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useEmailSettlement } from '@/contexts/EmailSettlementContext';
import RichTextEditor from './RichTextEditor';

interface TemplateConfigSectionProps {
  onTemplateSelect: (template: any) => void;
}

export default function TemplateConfigSection({ onTemplateSelect }: TemplateConfigSectionProps) {
  const [templateName, setTemplateName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { state, setSelectedTemplate: setContextTemplate } = useEmailSettlement();

  const templatesQuery = trpc.email.getTemplates.useQuery();
  const createMutation = trpc.email.createTemplate.useMutation();
  const deleteMutation = trpc.email.deleteTemplate.useMutation({
    onSuccess: () => {
      toast.success('模板已删除');
      templatesQuery.refetch();
      if (selectedTemplate?.id === editingId) {
        setSelectedTemplate(null);
        setContextTemplate(null);
        onTemplateSelect(null);
      }
    },
    onError: () => {
      toast.error('删除模板失败');
    },
  });

  // 从Context恢复已选择的模板
  useEffect(() => {
    if (state.selectedTemplate) {
      setSelectedTemplate(state.selectedTemplate);
    }
  }, [state.selectedTemplate]);

  const handleCreateTemplate = () => {
    if (!templateName || !subject || !body) {
      toast.error('请填写所有必填字段');
      return;
    }

    createMutation.mutate(
      { templateName, subject, body },
      {
        onSuccess: () => {
          toast.success(editingId ? '模板更新成功' : '模板创建成功');
          setTemplateName('');
          setSubject('');
          setBody('');
          setEditingId(null);
          templatesQuery.refetch();
        },
        onError: (error: any) => {
          toast.error(error.message || '操作失败');
        },
      }
    );
  };

  const handleSelectTemplate = (template: any) => {
    setSelectedTemplate(template);
    setContextTemplate(template);
    onTemplateSelect(template);
    toast.success('模板已选择');
  };

  const handleEditTemplate = (template: any) => {
    setEditingId(template.id);
    setTemplateName(template.templateName);
    setSubject(template.subject);
    setBody(template.body);
  };

  const handleDeleteTemplate = (id: number) => {
    if (confirm('确认删除此模板吗？')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>第二步：配置邮件模板</CardTitle>
        <CardDescription>
          创建或选择邮件模板，支持变量占位符如 {'{{'} dataDetail {'}}'}、{'{{'} settlementAmount {'}}'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 已选择的模板显示 */}
        {selectedTemplate && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">已选择模板</span>
            </div>
            <p className="text-sm text-green-800">
              <span className="font-medium">名称：</span>{selectedTemplate.templateName}
            </p>
            <p className="text-sm text-green-800">
              <span className="font-medium">主题：</span>{selectedTemplate.subject}
            </p>
            <p className="text-sm text-green-800 line-clamp-2">
              <span className="font-medium">预览：</span>{selectedTemplate.body}
            </p>
          </div>
        )}

        {/* 创建/编辑模板表单 */}
        <div className="border border-slate-200 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-slate-900">
            {editingId ? '编辑模板' : '创建新模板'}
          </h3>

          <div className="space-y-2">
            <Label htmlFor="template-name">模板名称</Label>
            <Input
              id="template-name"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="例如：月度结算模板"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-subject">邮件主题</Label>
            <div className="flex gap-2 mb-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSubject(subject + '{merchantName}')}
                className="text-xs"
              >
                商户名
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSubject(subject + '{settlementAmount}')}
                className="text-xs"
              >
                金额
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSubject(subject + '{currentDate}')}
                className="text-xs"
              >
                日期
              </Button>
            </div>
            <Input
              id="template-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="例如：{settlementAmount} 月度结算通知"
            />
          </div>

          <div className="space-y-2">
            <Label>邮件正文</Label>
            <p className="text-xs text-slate-500 mb-2">
              支持占位符：{'{merchantName}'} (商户名)、{'{settlementAmount}'} (结算金额)、{'{dataDetail}'} (结算明细表格)、{'{currentDate}'} (当前日期)
            </p>
            <RichTextEditor
              value={body}
              onChange={setBody}
              placeholder="输入邮件内容，使用工具栏插入占位符..."
              height="h-80"
            />
          </div>

          <Button
            onClick={handleCreateTemplate}
            disabled={createMutation.isPending}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {editingId ? '更新模板' : '创建模板'}
          </Button>

          {editingId && (
            <Button
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setTemplateName('');
                setSubject('');
                setBody('');
              }}
              className="w-full"
            >
              取消编辑
            </Button>
          )}
        </div>

        {/* 模板列表 */}
        <div className="space-y-3">
          <h3 className="font-medium text-slate-900">可用模板</h3>
          {templatesQuery.isLoading ? (
            <p className="text-sm text-slate-500">加载中...</p>
          ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
            <div className="space-y-2">
              {templatesQuery.data.map((template: any) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-3 space-y-2 transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{template.templateName}</p>
                      <p className="text-sm text-slate-600">{template.subject}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 mt-1">{template.body}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSelectTemplate(template)}
                        className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                      >
                        选择
                      </button>
                      <button
                        onClick={() => handleEditTemplate(template)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="px-2 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">暂无模板，请创建一个</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
