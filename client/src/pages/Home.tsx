import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Settings, BarChart3, Clock, Shield, Zap, LogIn } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const { user, isAuthenticated, refresh } = useAuth();
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const localLoginMutation = trpc.auth.localLogin.useMutation({
    onSuccess: async () => {
      toast.success("登录成功！");
      await refresh();
    },
    onError: (err) => {
      toast.error("登录失败：" + err.message);
      setIsLoggingIn(false);
    },
  });

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error("请输入用户名");
      return;
    }
    setIsLoggingIn(true);
    localLoginMutation.mutate({ username: username.trim(), password });
  };

  const displayUser = user || { name: "用户", email: "" };

  const handleNavigateToEmail = () => {
    navigate("/email");
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-6 py-6">
            <h1 className="text-3xl font-bold text-slate-900">批量邮件发送系统</h1>
            <p className="text-slate-600 mt-2">高效管理和发送结算数据核对邮件</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Welcome Card */}
          <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <CardTitle>欢迎，{displayUser?.name || "用户"}！</CardTitle>
              <CardDescription>开始使用邮件发送系统</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                size="lg"
                className="w-full sm:w-auto"
                onClick={handleNavigateToEmail}
              >
                <Mail className="h-5 w-5 mr-2" />
                进入邮件发送系统
              </Button>
            </CardContent>
          </Card>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Mail className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle>批量发送</CardTitle>
                <CardDescription>支持一次性发送数百封邮件</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  上传Excel文件，系统自动解析数据并批量发送邮件，支持自动重试机制。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Settings className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle>灵活配置</CardTitle>
                <CardDescription>自定义邮件模板和SMTP设置</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  创建多个邮件模板，支持变量占位符动态替换，配置多个SMTP账户。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Clock className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle>定时发送</CardTitle>
                <CardDescription>设置具体时间自动发送</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  选择发送时间，系统在指定时刻自动执行任务，无需手动操作。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-8 w-8 text-orange-600 mb-2" />
                <CardTitle>实时监控</CardTitle>
                <CardDescription>查看发送进度和状态</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  实时显示每封邮件的发送状态，失败邮件显示错误原因，支持重新发送。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-red-600 mb-2" />
                <CardTitle>数据安全</CardTitle>
                <CardDescription>密码加密存储，保护隐私</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  SMTP密码加密存储，不明文显示，所有操作都有完整日志记录。
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Zap className="h-8 w-8 text-yellow-600 mb-2" />
                <CardTitle>历史记录</CardTitle>
                <CardDescription>查询和导出发送历史</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  保存所有发送任务的历史记录，支持查看详情、导出日志、统计分析。
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Start */}
          <Card className="mt-8 bg-slate-50">
            <CardHeader>
              <CardTitle>快速开始</CardTitle>
              <CardDescription>3个步骤开始发送邮件</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="space-y-4">
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    1
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">上传Excel文件</p>
                    <p className="text-sm text-slate-600">
                      准备包含收件人信息的Excel文件（支持.xlsx和.xls格式）
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    2
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">配置邮件和SMTP</p>
                    <p className="text-sm text-slate-600">
                      创建邮件模板、配置SMTP发件人信息并测试连接
                    </p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                    3
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">发送邮件</p>
                    <p className="text-sm text-slate-600">
                      选择立即发送或设置定时发送，系统自动处理邮件发送
                    </p>
                  </div>
                </li>
              </ol>
              <Button
                className="w-full mt-6"
                size="lg"
                onClick={handleNavigateToEmail}
              >
                <Mail className="h-5 w-5 mr-2" />
                现在开始
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Not authenticated - show local login form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <Mail className="h-16 w-16 text-white mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">邮件发送系统</h1>
          <p className="text-blue-100">高效管理和发送批量邮件</p>
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle>登录系统</CardTitle>
            <CardDescription>输入用户名和密码登录（首次使用将自动创建账户）</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLocalLogin} className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="username">用户名</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="请输入用户名"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="password">密码</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="请输入密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLoggingIn || localLoginMutation.isPending}
              >
                <LogIn className="h-5 w-5 mr-2" />
                {localLoginMutation.isPending ? "登录中..." : "登录"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-white text-sm mt-6">
          © 2026 批量邮件发送系统。保护您的数据安全。
        </p>
      </div>
    </div>
  );
}
