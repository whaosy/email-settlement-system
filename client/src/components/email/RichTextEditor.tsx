'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link,
  Image,
  Heading2,
  Code,
  Redo,
  Undo,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Type,
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  height?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = '输入邮件内容...',
  height = 'h-64',
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (editorRef.current && !isEditing) {
      editorRef.current.innerHTML = value;
    }
  }, [value, isEditing]);

  // Save selection range when editor is blurred
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const editor = editorRef.current;
      if (editor && editor.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  }, []);

  // Restore selection range
  const restoreSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && savedRangeRef.current) {
      try {
        selection.removeAllRanges();
        selection.addRange(savedRangeRef.current);
      } catch (e) {
        console.error('Failed to restore selection:', e);
      }
    }
  }, []);

  const executeCommand = (command: string, value?: string) => {
    // Ensure editor has focus before executing command
    const editor = editorRef.current;
    if (!editor) return;
    
    // Restore saved selection
    restoreSelection();
    
    // Execute command
    try {
      document.execCommand(command, false, value);
    } catch (e) {
      console.error(`Failed to execute command: ${command}`, e);
    }
    
    // Update value
    onChange(editor.innerHTML);
    
    // Keep focus on editor
    editor.focus();
    saveSelection();
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    saveSelection();
  };

  const handleMouseUp = () => {
    saveSelection();
  };

  const handleKeyUp = () => {
    saveSelection();
  };

  const insertPlaceholder = (placeholder: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    // Focus editor first to ensure it has focus
    editor.focus();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      // If no selection, append to end
      const span = document.createElement('span');
      span.className = 'placeholder-tag';
      span.style.backgroundColor = '#E0E7FF';
      span.style.color = '#4F46E5';
      span.style.padding = '2px 6px';
      span.style.borderRadius = '4px';
      span.style.margin = '0 2px';
      span.textContent = placeholder;
      editor.appendChild(span);
    } else {
      const range = selection.getRangeAt(0);
      // Check if selection is within the editor
      if (!editor.contains(range.commonAncestorContainer)) {
        // If not, append to end
        const span = document.createElement('span');
        span.className = 'placeholder-tag';
        span.style.backgroundColor = '#E0E7FF';
        span.style.color = '#4F46E5';
        span.style.padding = '2px 6px';
        span.style.borderRadius = '4px';
        span.style.margin = '0 2px';
        span.textContent = placeholder;
        editor.appendChild(span);
      } else {
        const span = document.createElement('span');
        span.className = 'placeholder-tag';
        span.style.backgroundColor = '#E0E7FF';
        span.style.color = '#4F46E5';
        span.style.padding = '2px 6px';
        span.style.borderRadius = '4px';
        span.style.margin = '0 2px';
        span.textContent = placeholder;
        range.insertNode(span);
        range.setStartAfter(span);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    onChange(editor.innerHTML);
  };

  const handleInsertLink = () => {
    restoreSelection();
    const url = prompt('请输入链接地址:');
    if (url) {
      executeCommand('createLink', url);
    }
  };

  const handleInsertImage = () => {
    restoreSelection();
    const url = prompt('请输入图片地址:');
    if (url) {
      executeCommand('insertImage', url);
    }
  };

  return (
    <div className="border border-slate-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="bg-slate-50 border-b border-slate-300 p-2 flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex gap-1 border-r border-slate-300 pr-1">
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('bold');
            }}
            title="粗体 (Ctrl+B)"
            className="h-8 w-8 p-0"
          >
            <Bold className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('italic');
            }}
            title="斜体 (Ctrl+I)"
            className="h-8 w-8 p-0"
          >
            <Italic className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('underline');
            }}
            title="下划线 (Ctrl+U)"
            className="h-8 w-8 p-0"
          >
            <Underline className="h-4 w-4" />
          </Button>
        </div>

        {/* Headings */}
        <div className="flex gap-1 border-r border-slate-300 pr-1">
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('formatBlock', '<h2>');
            }}
            title="标题"
            className="h-8 w-8 p-0"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 border-r border-slate-300 pr-1">
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('insertUnorderedList');
            }}
            title="项目列表"
            className="h-8 w-8 p-0"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('insertOrderedList');
            }}
            title="有序列表"
            className="h-8 w-8 p-0"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>
        </div>

        {/* Alignment */}
        <div className="flex gap-1 border-r border-slate-300 pr-1">
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('justifyLeft');
            }}
            title="左对齐"
            className="h-8 w-8 p-0"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('justifyCenter');
            }}
            title="居中"
            className="h-8 w-8 p-0"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('justifyRight');
            }}
            title="右对齐"
            className="h-8 w-8 p-0"
          >
            <AlignRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Links & Media */}
        <div className="flex gap-1 border-r border-slate-300 pr-1">
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertLink();
            }}
            title="插入链接"
            className="h-8 w-8 p-0"
          >
            <Link className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              handleInsertImage();
            }}
            title="插入图片"
            className="h-8 w-8 p-0"
          >
            <Image className="h-4 w-4" />
          </Button>
        </div>

        {/* Code */}
        <div className="flex gap-1 border-r border-slate-300 pr-1">
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('formatBlock', '<pre>');
            }}
            title="代码块"
            className="h-8 w-8 p-0"
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1 border-r border-slate-300 pr-1">
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('undo');
            }}
            title="撤销"
            className="h-8 w-8 p-0"
          >
            <Undo className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onMouseDown={(e) => {
              e.preventDefault();
              executeCommand('redo');
            }}
            title="重做"
            className="h-8 w-8 p-0"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>

        {/* Placeholders */}
        <div className="flex gap-1 ml-auto border-l border-slate-300 pl-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => insertPlaceholder('{merchantName}')}
            title="商户名称"
            className="h-8 px-2 text-xs"
          >
            商户名
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => insertPlaceholder('{settlementAmount}')}
            title="结算金额"
            className="h-8 px-2 text-xs"
          >
            金额
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => insertPlaceholder('{dataDetail}')}
            title="数据表格"
            className="h-8 px-2 text-xs"
          >
            表格
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => insertPlaceholder('{currentDate}')}
            title="当前日期"
            className="h-8 px-2 text-xs"
          >
            日期
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onFocus={() => setIsEditing(true)}
        onBlur={() => {
          setIsEditing(false);
          saveSelection();
        }}
        onInput={handleInput}
        onMouseUp={handleMouseUp}
        onKeyUp={handleKeyUp}
        className={`${height} w-full p-4 outline-none overflow-auto text-sm text-slate-900 bg-white rich-text-editor-content`}
        style={{
          minHeight: '200px',
          wordWrap: 'break-word',
        }}
        data-placeholder={placeholder}
      />

      {/* Info */}
      <div className="bg-blue-50 border-t border-slate-300 px-4 py-2 text-xs text-blue-800">
        <p>💡 提示：使用上方按钮插入占位符，这些占位符会在发送时自动替换为实际数据</p>
      </div>
    </div>
  );
}
