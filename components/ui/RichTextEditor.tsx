"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TextAlign from "@tiptap/extension-text-align";
import AudioPlayerNode from "./AudioPlayerNode";
import { Mark, mergeAttributes } from "@tiptap/core";
import TextShadow, { SHADOW_PRESETS } from "./TextShadowMark";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiType,
  FiList,
  FiHash,
  FiLink,
  FiImage,
  FiMusic,
  FiMinus,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiCode,
  FiMessageSquare,
  FiCornerUpLeft,
  FiCornerUpRight,
} from "react-icons/fi";
import styles from "@/styles/components/_richTextEditor.module.scss";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string>;
  onAudioUpload?: (file: File) => Promise<string>;
}

const TEXT_COLORS = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#6b7280" },
  { label: "Brown", value: "#92400e" },
  { label: "Orange", value: "#ea580c" },
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
  { label: "Purple", value: "#9333ea" },
  { label: "Red", value: "#dc2626" },
  { label: "Pink", value: "#db2777" },
  { label: "Teal", value: "#0d9488" },
];

const FONT_SIZES = [
  { label: "12px", value: "12px" },
  { label: "14px", value: "14px" },
  { label: "16px", value: "16px" },
  { label: "18px", value: "18px" },
  { label: "20px", value: "20px" },
  { label: "24px", value: "24px" },
  { label: "32px", value: "32px" },
];

const FontSize = Mark.create({
  name: "fontSize",
  addOptions() { return { HTMLAttributes: {} }; },
  parseHTML() {
    return [{
      tag: "span[style]",
      getAttrs: (element) => {
        const style = (element as HTMLElement).getAttribute("style") || "";
        const match = style.match(/font-size:\s*([^;]+)/);
        return match ? { size: match[1].trim() } : false;
      },
    }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },
  addAttributes() {
    return {
      size: {
        default: null,
        parseHTML: (element) => {
          const style = element.getAttribute("style") || "";
          const match = style.match(/font-size:\s*([^;]+)/);
          return match ? match[1].trim() : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.size) return {};
          return { style: `font-size: ${attributes.size}` };
        },
      },
    };
  },
  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) => {
          return chain().setMark(this.name, { size }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark(this.name, { size: null }).run();
        },
    };
  },
});

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  onImageUpload,
  onAudioUpload,
}: RichTextEditorProps) {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");
  const [showFontSizePicker, setShowFontSizePicker] = useState(false);
  const [showShadowPicker, setShowShadowPicker] = useState(false);
  const fontSizeRef = useRef<HTMLDivElement>(null);
  const shadowRef = useRef<HTMLDivElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        horizontalRule: {
          HTMLAttributes: { class: "editor-section-break" },
        },
      }),
      Underline,
      TextStyle,
      Color,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      FontSize,
      TextShadow,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "editor-link" },
      }),
      Image.configure({
        HTMLAttributes: { class: "editor-image" },
      }),
      AudioPlayerNode,
    ],
    content: value,
    editorProps: {
      attributes: { class: styles.editorContent },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(e.target as Node)) {
        setShowColorPicker(false);
      }
      if (fontSizeRef.current && !fontSizeRef.current.contains(e.target as Node)) {
        setShowFontSizePicker(false);
      }
      if (shadowRef.current && !shadowRef.current.contains(e.target as Node)) {
        setShowShadowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openLinkModal = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, "");

    if (previousUrl) {
      setIsEditingLink(true);
      setLinkUrl(previousUrl);
      setLinkText(selectedText || "");
    } else {
      setIsEditingLink(false);
      setLinkUrl("");
      setLinkText(selectedText || "");
    }
    setShowLinkModal(true);
  }, [editor]);

  const handleLinkSubmit = useCallback(() => {
    if (!editor) return;
    if (linkUrl === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else if (isEditingLink) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    } else {
      const { from, to } = editor.state.selection;
      const selectedText = editor.state.doc.textBetween(from, to, "");
      if (selectedText) {
        editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
      } else {
        editor.chain().focus().insertContent(`<a href="${linkUrl}">${linkText || linkUrl}</a>`).run();
      }
    }
    setShowLinkModal(false);
    setLinkUrl("");
    setLinkText("");
  }, [editor, linkUrl, linkText, isEditingLink]);

  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setShowLinkModal(false);
    setLinkUrl("");
    setLinkText("");
  }, [editor]);

  const handleImageSubmit = useCallback(async () => {
    if (!editor) return;
    if (imageUrl) {
      editor.chain().focus().setImage({ src: imageUrl }).run();
    }
    setShowImageModal(false);
    setImageUrl("");
  }, [editor, imageUrl]);

  const handleImageFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const file = e.target.files?.[0];
    if (!file || !onImageUpload) return;
    const url = await onImageUpload(file);
    editor.chain().focus().setImage({ src: url }).run();
    setShowImageModal(false);
    setImageUrl("");
  }, [editor, onImageUpload]);

  const handleAudioSubmit = useCallback(() => {
    if (!editor) return;
    if (audioUrl) {
      const html = `<div data-audio-player=""><audio controls="controls" src="${audioUrl}" style="width:100%;max-width:400px;"></audio></div>`;
      editor.chain().focus().insertContent(html).run();
    }
    setShowAudioModal(false);
    setAudioUrl("");
  }, [editor, audioUrl]);

  const handleAudioFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editor) return;
    const file = e.target.files?.[0];
    if (!file || !onAudioUpload) return;
    const url = await onAudioUpload(file);
    const html = `<div data-audio-player=""><audio controls="controls" src="${url}" style="width:100%;max-width:400px;"></audio></div>`;
    editor.chain().focus().insertContent(html).run();
    setShowAudioModal(false);
    setAudioUrl("");
  }, [editor, onAudioUpload]);

  const addSectionBreak = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().setHorizontalRule().run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={styles.editorContainer}>
      <div className={styles.toolbar}>
        <button type="button" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
          <FiCornerUpLeft size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
          <FiCornerUpRight size={16} />
        </button>

        <span className={styles.toolbarDivider} />

        <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={editor.isActive("bold") ? styles.active : ""} title="Bold">
          <FiBold size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={editor.isActive("italic") ? styles.active : ""} title="Italic">
          <FiItalic size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleUnderline().run()} className={editor.isActive("underline") ? styles.active : ""} title="Underline">
          <FiUnderline size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={editor.isActive("strike") ? styles.active : ""} title="Strikethrough">
          <s style={{ fontSize: "0.85rem", fontWeight: 600 }}>S</s>
        </button>

        <span className={styles.toolbarDivider} />

        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={editor.isActive("heading", { level: 2 }) ? styles.active : ""} title="Heading 2">
          <FiType size={16} /><span style={{ fontSize: "0.65rem", fontWeight: 700 }}>2</span>
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={editor.isActive("heading", { level: 3 }) ? styles.active : ""} title="Heading 3">
          <FiType size={16} /><span style={{ fontSize: "0.65rem", fontWeight: 700 }}>3</span>
        </button>

        <span className={styles.toolbarDivider} />

        <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={editor.isActive("bulletList") ? styles.active : ""} title="Bullet List">
          <FiList size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={editor.isActive("orderedList") ? styles.active : ""} title="Ordered List">
          <FiHash size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={editor.isActive("blockquote") ? styles.active : ""} title="Blockquote">
          <FiMessageSquare size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().toggleCodeBlock().run()} className={editor.isActive("codeBlock") ? styles.active : ""} title="Code Block">
          <FiCode size={16} />
        </button>

        <span className={styles.toolbarDivider} />

        <button type="button" onClick={() => editor.chain().focus().setTextAlign("left").run()} className={editor.isActive({ textAlign: "left" }) ? styles.active : ""} title="Align Left">
          <FiAlignLeft size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("center").run()} className={editor.isActive({ textAlign: "center" }) ? styles.active : ""} title="Align Center">
          <FiAlignCenter size={16} />
        </button>
        <button type="button" onClick={() => editor.chain().focus().setTextAlign("right").run()} className={editor.isActive({ textAlign: "right" }) ? styles.active : ""} title="Align Right">
          <FiAlignRight size={16} />
        </button>

        <span className={styles.toolbarDivider} />

        <div className={styles.colorPickerContainer} ref={colorPickerRef}>
          <button type="button" onClick={() => setShowColorPicker(!showColorPicker)} className={showColorPicker ? styles.active : ""} title="Text Color">
            <FiAlignLeft size={16} />
            <span className={styles.colorIndicator} style={{ backgroundColor: editor.getAttributes("textStyle").color || "#333" }} />
          </button>
          {showColorPicker && (
            <div className={styles.colorPickerDropdown}>
              {TEXT_COLORS.map((color) => (
                <button key={color.value || "default"} type="button" className={styles.colorOption} onClick={() => {
                  color.value ? editor.chain().focus().setColor(color.value).run() : editor.chain().focus().unsetColor().run();
                  setShowColorPicker(false);
                }}>
                  <span className={styles.colorSwatch} style={{ backgroundColor: color.value || "#333" }} />
                  <span>{color.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className={styles.toolbarDivider} />

        <button type="button" onClick={openLinkModal} className={editor.isActive("link") ? styles.active : ""} title="Add Link">
          <FiLink size={16} />
        </button>
        <button type="button" onClick={() => setShowImageModal(true)} title="Add Image">
          <FiImage size={16} />
        </button>
        <button type="button" onClick={() => setShowAudioModal(true)} title="Add Audio">
          <FiMusic size={16} />
        </button>

        <span className={styles.toolbarDivider} />

        <div className={styles.colorPickerContainer} ref={fontSizeRef}>
          <button
            type="button"
            onClick={() => { setShowFontSizePicker(!showFontSizePicker); setShowShadowPicker(false); }}
            title="Font Size"
            style={{ fontSize: "0.75rem", fontWeight: 600 }}
          >
            Aa
          </button>
          {showFontSizePicker && (
            <div className={styles.colorPickerDropdown}>
              {FONT_SIZES.map((fs) => (
                <button
                  key={fs.value}
                  type="button"
                  className={styles.colorOption}
                  onClick={() => {
                    editor.chain().focus().setFontSize(fs.value).run();
                    setShowFontSizePicker(false);
                  }}
                >
                  <span style={{ fontSize: fs.value, fontWeight: 600 }}>{fs.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.colorPickerContainer} ref={shadowRef}>
          <button
            type="button"
            onClick={() => { setShowShadowPicker(!showShadowPicker); setShowFontSizePicker(false); }}
            title="Text Shadow"
            style={{ textShadow: "1px 1px 2px rgba(0,0,0,0.3)", fontWeight: 600 }}
          >
            S<sub style={{ fontSize: "0.5em" }}>h</sub>
          </button>
          {showShadowPicker && (
            <div className={styles.colorPickerDropdown}>
              {SHADOW_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  className={styles.colorOption}
                  onClick={() => {
                    if (preset.value === "none") {
                      editor.chain().focus().unsetTextShadow().run();
                    } else {
                      editor.chain().focus().setTextShadow({ shadow: preset.value }).run();
                    }
                    setShowShadowPicker(false);
                  }}
                >
                  <span style={{ textShadow: preset.value, fontWeight: 600, fontSize: "0.9rem" }}>{preset.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className={styles.toolbarDivider} />

        <button type="button" onClick={addSectionBreak} title="Section Break">
          <FiMinus size={16} />
        </button>
      </div>
      <EditorContent editor={editor} placeholder={placeholder} />

      {showLinkModal && (
        <div className={styles.linkModalOverlay} onClick={() => setShowLinkModal(false)}>
          <div className={styles.linkModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.linkModalHeader}>
              <h3>{isEditingLink ? "Edit Link" : "Insert Link"}</h3>
              <button type="button" className={styles.linkModalClose} onClick={() => setShowLinkModal(false)}>&times;</button>
            </div>
            <div className={styles.linkModalBody}>
              <div className={styles.linkModalField}>
                <label>URL</label>
                <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://example.com or /products" autoFocus />
              </div>
              {!isEditingLink && (
                <div className={styles.linkModalField}>
                  <label>Link Text (optional)</label>
                  <input type="text" value={linkText} onChange={(e) => setLinkText(e.target.value)} placeholder="Click here" />
                </div>
              )}
            </div>
            <div className={styles.linkModalFooter}>
              {isEditingLink && (
                <button type="button" className={styles.linkModalRemove} onClick={removeLink}>Remove Link</button>
              )}
              <div className={styles.linkModalActions}>
                <button type="button" className={styles.linkModalCancel} onClick={() => setShowLinkModal(false)}>Cancel</button>
                <button type="button" className={styles.linkModalSubmit} onClick={handleLinkSubmit}>{isEditingLink ? "Update" : "Insert"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showImageModal && (
        <div className={styles.linkModalOverlay} onClick={() => setShowImageModal(false)}>
          <div className={styles.linkModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.linkModalHeader}>
              <h3>Insert Image</h3>
              <button type="button" className={styles.linkModalClose} onClick={() => setShowImageModal(false)}>&times;</button>
            </div>
            <div className={styles.linkModalBody}>
              <div className={styles.linkModalField}>
                <label>Image URL</label>
                <input type="text" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://example.com/image.jpg or /uploads/image.jpg" autoFocus />
              </div>
              <div className={styles.linkModalOr}>or</div>
              <div className={styles.linkModalField}>
                <label>Upload from device</label>
                <input type="file" accept="image/*" onChange={handleImageFileUpload} className={styles.fileInput} />
              </div>
            </div>
            <div className={styles.linkModalFooter}>
              <div className={styles.linkModalActions}>
                <button type="button" className={styles.linkModalCancel} onClick={() => setShowImageModal(false)}>Cancel</button>
                <button type="button" className={styles.linkModalSubmit} onClick={handleImageSubmit} disabled={!imageUrl}>Insert</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAudioModal && (
        <div className={styles.linkModalOverlay} onClick={() => setShowAudioModal(false)}>
          <div className={styles.linkModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.linkModalHeader}>
              <h3>Insert Audio</h3>
              <button type="button" className={styles.linkModalClose} onClick={() => setShowAudioModal(false)}>&times;</button>
            </div>
            <div className={styles.linkModalBody}>
              <div className={styles.linkModalField}>
                <label>Audio URL</label>
                <input type="text" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://example.com/audio.mp3 or /uploads/audio.mp3" autoFocus />
              </div>
              <div className={styles.linkModalOr}>or</div>
              <div className={styles.linkModalField}>
                <label>Upload from device</label>
                <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/mp4" onChange={handleAudioFileUpload} className={styles.fileInput} />
              </div>
            </div>
            <div className={styles.linkModalFooter}>
              <div className={styles.linkModalActions}>
                <button type="button" className={styles.linkModalCancel} onClick={() => setShowAudioModal(false)}>Cancel</button>
                <button type="button" className={styles.linkModalSubmit} onClick={handleAudioSubmit} disabled={!audioUrl}>Insert</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
