import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileUp, Settings, Send, History, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import FileUploadSection from '@/components/email/FileUploadSection';
import TemplateConfigSection from '@/components/email/TemplateConfigSection';
import SmtpConfigSection from '@/components/email/SmtpConfigSection';
import SendControlSection from '@/components/email/SendControlSection';
import HistorySection from '@/components/email/HistorySection';
import { EmailSettlementProvider, useEmailSettlement } from '@/contexts/EmailSettlementContext';

type TabType = 'upload' | 'template' | 'smtp' | 'send' | 'history';

interface TabItem {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  component: React.ReactNode;
}

function EmailSettlementContent() {
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const { state, setUploadedFile, setSelectedTemplate, setSelectedSmtpConfig } = useEmailSettlement();

  const handleBackToHome = () => {
    navigate('/');
  };

  // Define tabs with their components
  const tabs: TabItem[] = [
    {
      id: 'upload',
      label: '上传文件',
      icon: <FileUp className="h-4 w-4" />,
      component: (
        <FileUploadSection
          onFileUpload={(fileData) => {
            // fileData is { dataFile, mappingFile }
            setUploadedFile(fileData);
          }}
        />
      ),
    },
    {
      id: 'template',
      label: '邮件模板',
      icon: <Settings className="h-4 w-4" />,
      component: <TemplateConfigSection onTemplateSelect={setSelectedTemplate} />,
    },
    {
      id: 'smtp',
      label: 'SMTP设置',
      icon: <Settings className="h-4 w-4" />,
      component: <SmtpConfigSection onConfigSelect={setSelectedSmtpConfig} />,
    },
    {
      id: 'send',
      label: '发送邮件',
      icon: <Send className="h-4 w-4" />,
      component: (
        <SendControlSection
          uploadedFile={state.uploadedFile?.dataFile}
          mappingFile={state.uploadedFile?.mappingFile}
          selectedTemplate={state.selectedTemplate}
          selectedSmtpConfig={state.selectedSmtpConfig}
        />
      ),
    },
    {
      id: 'history',
      label: '历史记录',
      icon: <History className="h-4 w-4" />,
      component: <HistorySection />,
    },
  ];

  const currentTabComponent = tabs.find((tab) => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">批量邮件发送系统</h1>
            <p className="text-slate-600">高效管理和发送结算数据核对邮件</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBackToHome}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Button>
        </div>

        {/* Alert */}
        <div className="mb-6 border border-blue-200 bg-blue-50 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-blue-800">
            请按照以下步骤配置并发送邮件：上传文件 → 配置模板 → 设置SMTP → 发送邮件
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              variant={activeTab === tab.id ? 'default' : 'outline'}
              className="flex items-center gap-2 whitespace-nowrap"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </Button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="w-full">{currentTabComponent}</div>
      </div>
    </div>
  );
}

export default function EmailSettlement() {
  return (
    <EmailSettlementProvider>
      <EmailSettlementContent />
    </EmailSettlementProvider>
  );
}
