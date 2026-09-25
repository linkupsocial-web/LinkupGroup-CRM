'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { uploadImage } from '@/lib/adminApi';
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  Link2,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Code,
  Minus,
  ImagePlus,
  Maximize2,
  Minimize2,
  Loader2,
  X,
  UploadCloud,
  Check
} from 'lucide-react';

interface RichTextEditorProps {
  value: string | string[];
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  label = 'Content',
  placeholder = 'Start writing your amazing blog post...',
  rows = 10
}: RichTextEditorProps) {
  // Normalize string/array content
  const getNormalizedContent = (val: string | string[]) => {
    if (Array.isArray(val)) {
      return val.join('\n\n');
    }
    return val || '';
  };

  const initialContent = getNormalizedContent(value);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [showLinkModal, setShowLinkModal] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [linkUrl, setLinkUrl] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'editor-image rounded-xl max-w-full my-4 border border-slate-200 shadow-xs'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Placeholder.configure({
        placeholder: placeholder
      })
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html === '<p></p>' ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none p-4 min-h-[220px] text-slate-800 text-sm sm:text-base leading-relaxed'
      }
    }
  });

  // Sync external value changes (e.g. form edit reset or initial load)
  useEffect(() => {
    if (!editor) return;
    const currentNormalized = getNormalizedContent(value);
    const editorContent = editor.getHTML();

    if (currentNormalized !== editorContent && (currentNormalized !== '' || editorContent !== '<p></p>')) {
      if (currentNormalized !== editorContent) {
        editor.commands.setContent(currentNormalized || '');
      }
    }
  }, [value, editor]);

  // Handle ESC key for fullscreen mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  if (!editor) {
    return (
      <div className="w-full space-y-1.5">
        <label className="block text-base font-bold text-slate-900">{label}</label>
        <div className="w-full h-48 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading editor...
        </div>
      </div>
    );
  }

  // Formatting actions
  const toggleLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    setLinkUrl(previousUrl);
    setShowLinkModal(true);
  };

  const handleSetLink = () => {
    if (linkUrl.trim() === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      let formattedUrl = linkUrl.trim();
      if (!/^https?:\/\//i.test(formattedUrl) && !formattedUrl.startsWith('mailto:') && !formattedUrl.startsWith('#')) {
        formattedUrl = `https://${formattedUrl}`;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: formattedUrl }).run();
    }
    setShowLinkModal(false);
    setLinkUrl('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const res = await uploadImage(file, 'linkup_blogs');
      if (res && res.url) {
        editor.chain().focus().setImage({ src: res.url, alt: file.name.split('.')[0] || 'Image' }).run();
        setShowImageModal(false);
        setImageUrl('');
      }
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleInsertImageUrl = () => {
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim(), alt: 'Image' }).run();
      setImageUrl('');
      setShowImageModal(false);
    }
  };

  // Word count & Character count calculation
  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className={`space-y-2 w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-6' : ''}`}>
      <div className={`flex flex-col w-full bg-white rounded-xl border border-slate-200 shadow-2xs transition-all ${isFullscreen ? 'h-full max-h-[92vh] max-w-5xl overflow-hidden' : ''}`}>
        
        {/* Header Label when not fullscreen */}
        {!isFullscreen && label && (
          <div className="px-1 pt-1 pb-0.5">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900">{label}</h3>
          </div>
        )}

        {/* Toolbar Header */}
        <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between gap-1 sm:gap-2 flex-wrap rounded-t-xl select-none">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            
            {/* Undo & Redo */}
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="Undo"
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="Redo"
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Bold, Italic, Strikethrough, Underline */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBold().run()}
              title="Bold"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive('bold') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleItalic().run()}
              title="Italic"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive('italic') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleStrike().run()}
              title="Strikethrough"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive('strike') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              title="Underline"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive('underline') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <UnderlineIcon className="w-4 h-4" />
            </button>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Link */}
            <button
              type="button"
              onClick={toggleLink}
              title="Insert or edit Link"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive('link') ? 'bg-cyan-100 text-cyan-800 font-bold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Link2 className="w-4 h-4" />
            </button>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Headings: H1, H2, H3 */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              title="Heading 1"
              className={`px-1.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              H1
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              title="Heading 2"
              className={`px-1.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              H2
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              title="Heading 3"
              className={`px-1.5 py-1 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                editor.isActive('heading', { level: 3 }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              H3
            </button>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Lists: Bullet & Ordered */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              title="Bullet List"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive('bulletList') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              title="Numbered List"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive('orderedList') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
            </button>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Text Alignment */}
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              title="Align Left"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              title="Align Center"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              title="Align Right"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <AlignRight className="w-4 h-4" />
            </button>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Blockquote, Code block, Horizontal Rule */}
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              title="Blockquote"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive('blockquote') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Quote className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              title="Code Block"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                editor.isActive('codeBlock') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Code className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal Divider"
              className="p-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Separator */}
            <div className="w-px h-5 bg-slate-200 mx-0.5" />

            {/* Image Upload / URL Insert */}
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              title="Insert Image"
              className="p-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1"
            >
              <ImagePlus className="w-4 h-4" />
            </button>
          </div>

          {/* Right side: Fullscreen */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Contenteditable / WYSIWYG Editor Container */}
        <div className={`overflow-y-auto ${isFullscreen ? 'flex-1 p-4' : 'min-h-[220px]'}`}>
          <EditorContent editor={editor} />
        </div>

        {/* Bottom Footer with Status */}
        <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 select-none rounded-b-xl">
          <div className="flex items-center gap-2">
            <span>Rich Text WYSIWYG</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{charCount} chars</span>
          </div>
        </div>
      </div>

      {/* Hidden File Input for Image Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ImagePlus className="w-4 h-4 text-cyan-600" />
                Insert Image
              </h4>
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Upload Option */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Upload from Device</label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full py-3 px-4 rounded-xl border-2 border-dashed border-cyan-200 hover:border-cyan-500 bg-cyan-50/50 hover:bg-cyan-50 text-cyan-800 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {uploadingImage ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
                    <span>Uploading to Cloudinary...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5 text-cyan-600" />
                    <span>Click to browse and upload image file</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200" />
              <span className="flex-shrink mx-2 text-slate-400 text-[11px] font-bold uppercase">or via url</span>
              <div className="flex-grow border-t border-slate-200" />
            </div>

            {/* Image URL Input */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Image Web Address (URL)</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-600"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowImageModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertImageUrl}
                disabled={!imageUrl.trim()}
                className="px-4 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 rounded-lg flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Insert URL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Link2 className="w-4 h-4 text-cyan-600" />
                Insert / Edit Hyperlink
              </h4>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Link Web Address (URL)</label>
              <input
                type="text"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSetLink();
                  }
                }}
                autoFocus
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-cyan-600 font-mono"
              />
              <p className="text-[11px] text-slate-400">Leave blank and click Save to remove link from selection.</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSetLink}
                className="px-4 py-1.5 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg flex items-center gap-1 shadow-xs"
              >
                <Check className="w-3.5 h-3.5" />
                Apply Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
