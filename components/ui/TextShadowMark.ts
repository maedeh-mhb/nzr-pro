import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textShadow: {
      setTextShadow: (options: { shadow: string }) => ReturnType;
      unsetTextShadow: () => ReturnType;
    };
  }
}

const SHADOW_PRESETS = [
  { label: "None", value: "none" },
  { label: "Light", value: "1px 1px 2px rgba(0,0,0,0.2)" },
  { label: "Medium", value: "2px 2px 4px rgba(0,0,0,0.3)" },
  { label: "Heavy", value: "3px 3px 6px rgba(0,0,0,0.4), 1px 1px 2px rgba(0,0,0,0.2)" },
  { label: "Glow", value: "0 0 8px rgba(0,0,0,0.3)" },
  { label: "Outline", value: "1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000" },
];

export { SHADOW_PRESETS };

const TextShadow = Mark.create({
  name: "textShadow",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[style]",
        getAttrs: (element) => {
          const style = (element as HTMLElement).getAttribute("style") || "";
          const match = style.match(/text-shadow:\s*([^;]+)/);
          return match ? { shadow: match[1].trim() } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setTextShadow:
        (options: { shadow: string }) =>
        ({ chain }) => {
          return chain().setMark(this.name, { shadow: options.shadow }).run();
        },
      unsetTextShadow:
        () =>
        ({ chain }) => {
          return chain().setMark(this.name, { shadow: "none" }).run();
        },
    };
  },

  addAttributes() {
    return {
      shadow: {
        default: "none",
        parseHTML: (element) => {
          const style = element.getAttribute("style") || "";
          const match = style.match(/text-shadow:\s*([^;]+)/);
          return match ? match[1].trim() : "none";
        },
        renderHTML: (attributes) => {
          if (!attributes.shadow || attributes.shadow === "none") return {};
          return { style: `text-shadow: ${attributes.shadow}` };
        },
      },
    };
  },
});

export default TextShadow;
