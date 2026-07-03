import { renderToHTMLString } from '@tiptap/static-renderer/pm/html-string';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import TiptapLink from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';

const content = {"type":"doc","content":[{"type":"paragraph","content":[{"text":"Test para.","type":"text"}]},{"type":"heading","attrs":{"level":2},"content":[{"text":"A heading","type":"text"}]},{"type":"paragraph","content":[{"text":"Browse ","type":"text"},{"text":"verified listings","type":"text","marks":[{"type":"link","attrs":{"rel":null,"href":"/perfumes","class":null,"target":null}}]},{"text":" before you buy.","type":"text"}]}]};

const html = renderToHTMLString({
  content,
  extensions: [StarterKit, Image, TiptapLink, Underline],
});

console.log(html);
