'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Plus, Trash2, Edit2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import { useEmailSettlement } from '@/contexts/EmailSettlementContext';

interface SmtpConfigSectionProps {
  onConfigSelect: (config: any) => void;
}

export default function SmtpConfigSection({ onConfigSelect }: SmtpConfigSectionProps) {
  const [configName, setConfigName] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');
  const [encryptionType, setEncryptionType] = useState('tls');
  const [senderEmail, setSenderEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const { state, setSelectedSmtpConfig: setContextSmtpConfig } = useEmailSettlement();

  const configsQuery = trpc.email.getSmtpConfigs.useQuery();
  const createMutation = trpc.email.createSmtpConfig.useMutation();
  const testMutation = trpc.email.testSmtpConnection.useMutation();
  const deleteMutation = trpc.email.deleteSmtpConfig.useMutation({
    onSuccess: () => {
      toast.success('配置已删除');
      configsQuery.refetch();
      if (selectedConfig?.id === editingId) {
        setSelectedConfig(null);
        setContextSmtpConfig(null);
        onConfigSelect(null);
      }
    },
    onError: () => {
      toast.error('删除配置失败');
    },
  });

  // 从Context恢复已选择的SMTP配置
  useEffect(() => {
    if (state.selectedSmtpConfig) {
      setSelectedConfig(state.selectedSmtpConfig);
    }
  }, [state.selectedSmtpConfig]);

  const handleCreateConfig = () => {
    if (!configName || !smtpHost || !senderEmail || !authCode) {
      toast.error('请填写所有必填字段');
      return;
    }

    createMutation.mutate(
      {
        configName,
        smtpHost,
        smtpPort: parseInt(smtpPort),
        encryptionType: encryptionType as 'none' | 'ssl' | 'tls',
        senderEmail,
        senderName,
        authCode,
      },
      {
        onSuccess: () => {
          toast.success('SMTP配置创建成功');
          setConfigName('');
          setSmtpHost('');
          setSmtpPort('587');
          setEncryptionType('tls');
          setSenderEmail('');
          setSenderName('');
          setAuthCode('');
          setEditingId(null);
          configsQuery.refetch();
        },
        onError: (error: any) => {
          toast.error(error.message || 'SMTP配置创建失败');
        },
      }
    );
  };

  const handleSelectConfig = (config: any) => {
    setSelectedConfig(config);
    setContextSmtpConfig(config);
    onConfigSelect(config);
    toast.success('SMTP配置已选择');
  };

  const handleTestConnection = () => {
    if (!smtpHost || !senderEmail || !authCode) {
      toast.error('请填写必要信息进行测试');
      return;
    }

    testMutation.mutate(
      {
        smtpHost,
        smtpPort: parseInt(smtpPort),
        encryptionType: encryptionType as 'none' | 'ssl' | 'tls',
        senderEmail,
        authCode,
      },
      {
        onSuccess: (result: any) => {
          setTestResult(result);
          if (result.success) {
            toast.success('连接测试成功');
          } else {
            toast.error(result.message || '连接测试失败');
          }
        },
        onError: (error: any) => {
          toast.error(error.message || '连接测试失败');
        },
      }
    );
  };

  const handleEditConfig = (config: any) => {
    setEditingId(config.id);
    setConfigName(config.configName);
    setSmtpHost(config.smtpHost);
    setSmtpPort(config.smtpPort.toString());
    setEncryptionType(config.encryptionType);
    setSenderEmail(config.senderEmail);
    setSenderName(config.senderName || '');
    setAuthCode(config.authCode);
  };

  const handleDeleteConfig = (id: number) => {
    if (confirm('确认删除此SMTP配置吗？')) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>第三步：配置SMTP</CardTitle>
        <CardDescription>配置邮件发送服务器信息</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 已选择的SMTP配置显示 */}
        {selectedConfig && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900">已选择SMTP配置</span>
            </div>
            <p className="text-sm text-green-800">
              <span className="font-medium">配置名称：</span>{selectedConfig.configName}
            </p>
            <p className="text-sm text-green-800">
              <span className="font-medium">服务器：</span>{selectedConfig.smtpHost}:{selectedConfig.smtpPort}
            </p>
            <p className="text-sm text-green-800">
              <span className="font-medium">发件人：</span>{selectedConfig.senderEmail}
            </p>
          </div>
        )}

        {/* 创建/编辑SMTP配置表单 */}
        <div className="border border-slate-200 rounded-lg p-4 space-y-4">
          <h3 className="font-medium text-slate-900">
            {editingId ? '编辑SMTP配置' : '创建新SMTP配置'}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="config-name">配置名称</Label>
              <Input
                id="config-name"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="例如：公司邮箱"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-host">SMTP服务器地址</Label>
              <Input
                id="smtp-host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="例如：smtp.gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="smtp-port">SMTP端口</Label>
              <Input
                id="smtp-port"
                type="number"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                placeholder="587"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="encryption-type">加密方式</Label>
              <select
                id="encryption-type"
                value={encryptionType}
                onChange={(e) => setEncryptionType(e.target.value)}
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
              >
                <option value="none">无</option>
                <option value="ssl">SSL</option>
                <option value="tls">TLS</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender-email">发件人邮箱</Label>
              <Input
                id="sender-email"
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="example@gmail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender-name">发件人名称</Label>
              <Input
                id="sender-name"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="例如：财务部"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-code">授权码/密码</Label>
            <Input
              id="auth-code"
              type="password"
              value={authCode}
              onChange={(e) => setAuthCode(e.target.value)}
              placeholder="输入SMTP授权码或密码"
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleTestConnection}
              variant="outline"
              disabled={testMutation.isPending}
            >
              测试连接
            </Button>
            <Button
              onClick={handleCreateConfig}
              disabled={createMutation.isPending}
              className="flex-1"
            >
              <Plus className="h-4 w-4 mr-2" />
              {editingId ? '更新配置' : '创建配置'}
            </Button>
          </div>

          {editingId && (
            <Button
              variant="outline"
              onClick={() => {
                setEditingId(null);
                setConfigName('');
                setSmtpHost('');
                setSmtpPort('587');
                setEncryptionType('tls');
                setSenderEmail('');
                setSenderName('');
                setAuthCode('');
              }}
              className="w-full"
            >
              取消编辑
            </Button>
          )}

          {testResult && (
            <div
              className={`border rounded-lg p-3 flex gap-2 ${
                testResult.success
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <p
                  className={`font-medium ${
                    testResult.success ? 'text-green-900' : 'text-red-900'
                  }`}
                >
                  {testResult.success ? '连接成功' : '连接失败'}
                </p>
                <p
                  className={`text-sm ${
                    testResult.success ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* SMTP配置列表 */}
        <div className="space-y-3">
          <h3 className="font-medium text-slate-900">可用配置</h3>
          {configsQuery.isLoading ? (
            <p className="text-sm text-slate-500">加载中...</p>
          ) : configsQuery.data && configsQuery.data.length > 0 ? (
            <div className="space-y-2">
              {configsQuery.data.map((config: any) => (
                <div
                  key={config.id}
                  className={`border rounded-lg p-3 space-y-2 transition-colors ${
                    selectedConfig?.id === config.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900">{config.configName}</p>
                      <p className="text-sm text-slate-600">
                        {config.smtpHost}:{config.smtpPort}
                      </p>
                      <p className="text-xs text-slate-500">{config.senderEmail}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleSelectConfig(config)}
                        className="px-2 py-1 text-xs border border-blue-300 text-blue-600 rounded hover:bg-blue-50"
                      >
                        选择
                      </button>
                      <button
                        onClick={() => handleEditConfig(config)}
                        className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-100"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleDeleteConfig(config.id)}
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
            <p className="text-sm text-slate-500">暂无配置，请创建一个</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
