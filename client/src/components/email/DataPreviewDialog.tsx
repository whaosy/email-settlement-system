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
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface DataPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetNames: string[];
  sheetData: Record<string, any[]>;
}

export default function DataPreviewDialog({
  open,
  onOpenChange,
  sheetNames,
  sheetData,
}: DataPreviewDialogProps) {
  const [currentSheetIndex, setCurrentSheetIndex] = useState(0);

  if (sheetNames.length === 0) {
    return null;
  }

  const currentSheetName = sheetNames[currentSheetIndex];
  const currentData = sheetData[currentSheetName] || [];
  const hasNext = currentSheetIndex < sheetNames.length - 1;
  const hasPrev = currentSheetIndex > 0;

  const handleNext = () => {
    if (hasNext) {
      setCurrentSheetIndex(currentSheetIndex + 1);
    }
  };

  const handlePrev = () => {
    if (hasPrev) {
      setCurrentSheetIndex(currentSheetIndex - 1);
    }
  };

  // Get column headers from first row
  const columns = currentData.length > 0 ? Object.keys(currentData[0]) : [];

  // Format cell value for display
  const formatCellValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Export current sheet as CSV
  const handleExportSheet = () => {
    if (currentData.length === 0) return;

    const headers = columns.join(',');
    const rows = currentData.map((row) =>
      columns
        .map((col) => {
          const value = formatCellValue(row[col]);
          // Escape quotes and wrap in quotes if contains comma or quote
          const escaped = value.replace(/"/g, '""');
          return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentSheetName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] w-[95vw] flex flex-col">
        <DialogHeader>
          <DialogTitle>数据预览</DialogTitle>
          <DialogDescription>
            查看上传文件中各商户的完整数据
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Sheet Navigation */}
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-slate-50 rounded-lg border border-slate-200">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 text-center">
              <p className="text-sm font-medium text-slate-900">{currentSheetName}</p>
              <p className="text-xs text-slate-500 mt-1">
                {currentSheetIndex + 1} / {sheetNames.length} 个商户
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline">{currentData.length} 条记录</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportSheet}
                title="导出当前商户数据为CSV"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNext}
                disabled={!hasNext}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <div className="flex-1 overflow-hidden flex flex-col border border-slate-200 rounded-lg bg-white">
            {currentData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-slate-500">该商户暂无数据</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="inline-block min-w-full">
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-slate-100 border-b border-slate-300">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold text-slate-900 border-r border-slate-200">
                          #
                        </th>
                        {columns.map((col) => (
                          <th
                            key={col}
                            className="px-4 py-2 text-left font-semibold text-slate-900 border-r border-slate-200 whitespace-nowrap"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.map((row, rowIndex) => (
                        <tr
                          key={rowIndex}
                          className="border-b border-slate-200 hover:bg-slate-50"
                        >
                          <td className="px-4 py-2 text-slate-600 font-medium border-r border-slate-200 bg-slate-50">
                            {rowIndex + 1}
                          </td>
                          {columns.map((col) => (
                            <td
                              key={`${rowIndex}-${col}`}
                              className="px-4 py-2 text-slate-900 border-r border-slate-200 max-w-xs overflow-hidden text-ellipsis"
                              title={formatCellValue(row[col])}
                            >
                              {formatCellValue(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Summary */}
          <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-900">
              <span className="font-medium">总计：</span>
              {sheetNames.length} 个商户，
              {sheetNames.reduce((sum, name) => sum + (sheetData[name]?.length || 0), 0)} 条记录
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
