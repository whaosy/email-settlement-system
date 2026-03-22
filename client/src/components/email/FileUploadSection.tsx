'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, AlertCircle, CheckCircle2, File, Trash2, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';
import DataPreviewDialog from './DataPreviewDialog';

interface FileUploadSectionProps {
  onFileUpload: (file: any) => void;
}

interface UploadedFileData {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  sheets: Record<string, any[]>;
  sheetNames: string[];
  type: 'data' | 'mapping';
  merchantCount?: number;
}

export default function FileUploadSection({ onFileUpload }: FileUploadSectionProps) {
  const [isDragging, setIsDragging] = useState<'data' | 'mapping' | null>(null);
  const [dataFile, setDataFile] = useState<UploadedFileData | null>(null);
  const [mappingFile, setMappingFile] = useState<UploadedFileData | null>(null);
  const [mappingConfig, setMappingConfig] = useState<{ merchantColumn: string; emailColumn: string }>({
    merchantColumn: '商户名称',
    emailColumn: '收件人邮箱',
  });
  const [showMappingPreview, setShowMappingPreview] = useState(false);
  const [showDataPreview, setShowDataPreview] = useState(false);
  const [expandedDataPreview, setExpandedDataPreview] = useState(false);
  const uploadMutation = trpc.email.uploadExcelFile.useMutation();

  const handleFileSelect = (file: File, fileType: 'data' | 'mapping') => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('请上传 .xlsx 或 .xls 格式的文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('文件大小不能超过 10MB');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          if (!arrayBuffer) {
            toast.error('文件读取失败');
            return;
          }

          const uint8Array = new Uint8Array(arrayBuffer);
          uploadMutation.mutate(
            {
              fileName: file.name,
              fileBuffer: uint8Array,
            },
            {
              onSuccess: (result: any) => {
                const merchantCount = result.sheetNames?.length || 0;
                
                const uploadedData: UploadedFileData = {
                  fileName: result.fileName || file.name,
                  fileKey: result.fileKey,
                  fileUrl: result.fileUrl,
                  sheets: result.sheets || {},
                  sheetNames: result.sheetNames || [],
                  type: fileType,
                  merchantCount,
                };

                if (fileType === 'data') {
                  setDataFile(uploadedData);
                  onFileUpload({
                    dataFile: uploadedData,
                    mappingFile: mappingFile,
                  });
                } else {
                  setMappingFile(uploadedData);
                  onFileUpload({
                    dataFile,
                    mappingFile: uploadedData,
                  });
                }

                toast.success(`${fileType === 'data' ? '数据文件' : '映射文件'}上传成功`);
              },
              onError: (error: any) => {
                console.error('Upload error:', error);
                const errorMsg = error?.message || '文件上传失败';
                toast.error(errorMsg);
              },
            }
          );
        } catch (error) {
          console.error('File processing error:', error);
          toast.error('文件处理失败');
        }
      };
      reader.onerror = () => {
        console.error('FileReader error');
        toast.error('文件读取失败');
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error:', error);
      toast.error('文件选择失败');
    }
  };

  const handleDragOver = (e: React.DragEvent, fileType: 'data' | 'mapping') => {
    e.preventDefault();
    setIsDragging(fileType);
  };

  const handleDragLeave = () => {
    setIsDragging(null);
  };

  const handleDrop = (e: React.DragEvent, fileType: 'data' | 'mapping') => {
    e.preventDefault();
    setIsDragging(null);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0], fileType);
    }
  };

  const handleDeleteFile = (fileType: 'data' | 'mapping') => {
    if (fileType === 'data') {
      setDataFile(null);
    } else {
      setMappingFile(null);
      setShowMappingPreview(false);
    }
    onFileUpload({
      dataFile: fileType === 'data' ? null : dataFile,
      mappingFile: fileType === 'mapping' ? null : mappingFile,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>第一步：上传文件</CardTitle>
        <CardDescription>上传结算数据和商户邮箱映射文件</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data File Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            1. 结算数据文件 <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500">
            Excel文件，每个sheet为一个商户，sheet名称为商户名称
          </p>
          <div
            onDragOver={(e) => handleDragOver(e, 'data')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'data')}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging === 'data'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            {dataFile ? (
              <div className="space-y-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                <div>
                  <p className="font-medium text-slate-900">{dataFile.fileName}</p>
                  <p className="text-sm text-slate-600">
                    {dataFile.sheetNames?.length || 0} 个商户
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setExpandedDataPreview(!expandedDataPreview)}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-100 flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    {expandedDataPreview ? '隐藏' : '查看'}
                  </button>
                  <button
                    onClick={() => handleDeleteFile('data')}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-red-50 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                <div>
                  <p className="font-medium text-slate-900">拖拽文件到此或点击选择</p>
                  <p className="text-sm text-slate-500">支持 .xlsx 和 .xls 格式</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.xlsx,.xls';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file, 'data');
                    };
                    input.click();
                  }}
                >
                  选择文件
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mapping File Upload */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">
            2. 商户邮箱映射文件 <span className="text-slate-400">(可选)</span>
          </label>
          <p className="text-xs text-slate-500">
            Excel文件，包含商户名称和收件人邮箱列
          </p>
          <div
            onDragOver={(e) => handleDragOver(e, 'mapping')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, 'mapping')}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging === 'mapping'
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-300 hover:border-slate-400'
            }`}
          >
            {mappingFile ? (
              <div className="space-y-3">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto" />
                <div>
                  <p className="font-medium text-slate-900">{mappingFile.fileName}</p>
                  <p className="text-sm text-slate-600">
                    已配置: {mappingConfig.merchantColumn} / {mappingConfig.emailColumn}
                  </p>
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setShowMappingPreview(!showMappingPreview)}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-slate-100 flex items-center gap-1"
                  >
                    <Eye className="h-4 w-4" />
                    {showMappingPreview ? '隐藏' : '查看'}
                  </button>
                  <button
                    onClick={() => handleDeleteFile('mapping')}
                    className="px-3 py-1 text-sm border border-slate-300 rounded-md hover:bg-red-50 hover:text-red-600 flex items-center gap-1"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="h-8 w-8 text-slate-400 mx-auto" />
                <div>
                  <p className="font-medium text-slate-900">拖拽文件到此或点击选择</p>
                  <p className="text-sm text-slate-500">支持 .xlsx 和 .xls 格式</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.xlsx,.xls';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file, 'mapping');
                    };
                    input.click();
                  }}
                >
                  选择文件
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mapping Configuration and Preview */}
        {mappingFile && (
          <div className="border border-slate-200 rounded-lg p-4 space-y-4">
            <p className="font-medium text-slate-900">映射配置</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-600">商户名称列</label>
                <input
                  type="text"
                  value={mappingConfig.merchantColumn}
                  onChange={(e) =>
                    setMappingConfig({
                      ...mappingConfig,
                      merchantColumn: e.target.value,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-slate-600">邮箱列</label>
                <input
                  type="text"
                  value={mappingConfig.emailColumn}
                  onChange={(e) =>
                    setMappingConfig({
                      ...mappingConfig,
                      emailColumn: e.target.value,
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md text-sm"
                />
              </div>
            </div>

            {/* Mapping Preview */}
            {showMappingPreview && mappingFile.sheets && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="font-medium text-slate-900 mb-3">商户-邮箱映射预览</p>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-md">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-slate-700 border-b border-slate-200">商户名称</th>
                        <th className="px-4 py-2 text-left font-medium text-slate-700 border-b border-slate-200">收件人邮箱</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(mappingFile.sheets).map(([sheetName, rows]: [string, any]) => {
                        if (!Array.isArray(rows) || rows.length === 0) return null;
                        return rows.map((row: any, idx: number) => {
                          const merchantName = row[mappingConfig.merchantColumn] || sheetName;
                          const emails = row[mappingConfig.emailColumn] || '';
                          return (
                            <tr key={`${sheetName}-${idx}`} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-900">{merchantName}</td>
                              <td className="px-4 py-2 text-slate-600 text-xs break-all">{emails}</td>
                            </tr>
                          );
                        });
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Status */}
        {dataFile && (
          <div className="border border-green-200 bg-green-50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-green-900">文件上传成功</p>
                <p className="text-sm text-green-800 mt-1">
                  已识别 {dataFile.sheetNames?.length || 0} 个商户，可继续配置邮件模板
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Preview Dialog */}
        {dataFile && (
          <DataPreviewDialog
            open={showDataPreview}
            onOpenChange={setShowDataPreview}
            sheetNames={dataFile.sheetNames || []}
            sheetData={dataFile.sheets || {}}
          />
        )}

        {/* Expanded Data Preview */}
        {expandedDataPreview && dataFile && (
          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-900">完整数据预览</h3>
                <p className="text-sm text-slate-600 mt-1">{dataFile.sheetNames?.length || 0} 个商户，共 {dataFile.sheetNames?.reduce((sum, name) => sum + (dataFile.sheets[name]?.length || 0), 0)} 条记录</p>
              </div>
              <div className="overflow-x-auto">
                {dataFile.sheetNames?.map((sheetName, sheetIdx) => {
                  const sheetData = dataFile.sheets[sheetName] || [];
                  if (sheetData.length === 0) return null;
                  const columns = sheetData.length > 0 ? Object.keys(sheetData[0]) : [];
                  return (
                    <div key={sheetIdx} className="border-b border-slate-200 last:border-b-0">
                      <div className="bg-blue-50 px-6 py-3 border-b border-slate-200 sticky top-0">
                        <h4 className="font-medium text-slate-900">{sheetName}</h4>
                        <p className="text-xs text-slate-600 mt-1">{sheetData.length} 条记录</p>
                      </div>
                      <table className="w-full text-sm">
                        <thead className="bg-slate-100 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-slate-900 border-r border-slate-200 bg-slate-100 w-12">#</th>
                            {columns.map((col) => (
                              <th key={col} className="px-4 py-2 text-left font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap">{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {sheetData.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-slate-200 hover:bg-slate-50">
                              <td className="px-4 py-2 text-slate-600 font-medium border-r border-slate-200 bg-slate-50 w-12">{rowIdx + 1}</td>
                              {columns.map((col) => (
                                <td key={`${rowIdx}-${col}`} className="px-4 py-2 text-slate-900 border-r border-slate-200">
                                  {row[col] !== null && row[col] !== undefined ? String(row[col]) : '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
