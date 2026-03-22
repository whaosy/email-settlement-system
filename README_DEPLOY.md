# 批量邮件发送系统 - 永久部署指南

该项目已经过优化，支持在 **Vercel** 或 **Netlify** 上进行一键部署。

## 1. 数据库准备 (重要)
由于 Vercel 是 Serverless 环境，无法运行本地数据库。您需要一个远程数据库：
- **推荐方案**：使用 [TiDB Cloud](https://tidbcloud.com/) 或 [Supabase](https://supabase.com/) 创建一个免费的 MySQL/PostgreSQL 数据库。
- **配置**：获取数据库连接字符串（如 `mysql://user:pass@host:port/db`）。

## 2. 部署步骤 (Vercel)
1. 在 [Vercel](https://vercel.com/) 中点击 **Add New Project**。
2. 导入您的 GitHub 仓库 `email-settlementV3`。
3. 在 **Environment Variables** 中添加以下变量：
   - `DATABASE_URL`: 您的远程数据库连接字符串。
   - `JWT_SECRET`: 随机字符串（如 `your-secret-key-123`）。
   - `VITE_APP_TITLE`: 网站标题。
   - `PORT`: 3000

## 3. 功能说明
- **本地登录**：项目已适配本地登录，无需配置 OAuth 即可直接使用。
- **本地存储**：在 Vercel 环境下，文件上传将尝试使用本地缓存。建议长期使用时对接 S3 或其他对象存储。

## 4. 常见问题
- 如果部署失败，请检查 `pnpm-lock.yaml` 是否已上传。
- 确保数据库防火墙允许 Vercel 的 IP 访问（或设置为 `0.0.0.0/0`）。
