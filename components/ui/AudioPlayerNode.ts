import { Node, mergeAttributes } from "@tiptap/core";

const AudioPlayer = Node.create({
  name: "audioPlayer",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-audio-player]',
        getAttrs: (element) => {
          const audio = (element as HTMLElement).querySelector("audio");
          return { src: audio?.getAttribute("src") || null };
        },
      },
      {
        tag: "audio",
        getAttrs: (element) => ({
          src: (element as HTMLElement).getAttribute("src") || null,
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-audio-player": "" }),
      [
        "audio",
        {
          controls: "controls",
          src: HTMLAttributes.src,
          style: "width:100%;max-width:400px;",
        },
      ],
    ];
  },
});

export default AudioPlayer;
