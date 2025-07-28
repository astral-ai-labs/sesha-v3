// // src/lib/lexicalToHtml.ts

// /**
//  * Convert Lexical rich content to HTML string.
//  * This function traverses the Lexical JSON structure and converts it to HTML.
//  */
// export function convertRichContentToHTML(
//   richContent: string,
//   meta: {
//     slug: string;
//     version: string;
//     createdByName: string;
//     date: string;
//     headline: string;
//   }
// ): string {
//   const parsed = JSON.parse(richContent);

//   // Build metadata header
//   const metaHtml = `<p style="font-style: italic; margin-bottom: 1em;">
//       Slug: ${meta.slug}&nbsp;&nbsp;Version: ${meta.version}&nbsp;&nbsp;
//       Export by: ${meta.createdByName} on: ${meta.date}
//       </p>
//       <hr style="border: none; border-bottom: 1px solid #000; margin: 0 0 1em 0;" />
//       <h1 style="margin-top: 1em;">${meta.headline}</h1>
//       <div style="margin-bottom: 1em;"></div>`;

//   // Traverse the Lexical structure and convert to HTML
//   function traverse(nodes: any[]): string {
//     return nodes
//       .map((node) => {
//         switch (node.type) {
//           case "heading": {
//             const tag = node.tag || "h2";
//             const inner = traverse(node.children || []);
//             return `<${tag}>${inner}</${tag}>`;
//           }
//           case "paragraph": {
//             const inner = traverse(node.children || []);
//             return `<p>${inner}</p>`;
//           }
//           case "quote": {
//             const inner = traverse(node.children || []);
//             return `<blockquote>${inner}</blockquote>`;
//           }
//           case "list": {
//             // Handle bullet, number, and checklist
//             if (node.listType === "check") {
//               const items = (node.children || [])
//                 .map((item: any) => {
//                   const inner = traverse(item.children || []);
//                   const checked = item.checked ? "☑" : "☐";
//                   return `<li>${checked} ${inner}</li>`;
//                 })
//                 .join("");
//               return `<ul style="list-style: none; padding-left: 0;">${items}</ul>`;
//             } else {
//               const tag = node.listType === "number" ? "ol" : "ul";
//               const items = (node.children || [])
//                 .map((item: any) => {
//                   const content = traverse(item.children || []);
//                   return `<li>${content}</li>`;
//                 })
//                 .join("");
//               return `<${tag}>${items}</${tag}>`;
//             }
//           }
//           case "list-item": {
//             const inner = traverse(node.children || []);
//             return `<li>${inner}</li>`;
//           }
//           case "text": {
//             let text = node.text || "";
//             if (node.format & 1) text = `<strong>${text}</strong>`;
//             if (node.format & 2) text = `<em>${text}</em>`;
//             if (node.format & 4) text = `<s>${text}</s>`;
//             if (node.format & 8) text = `<u>${text}</u>`;
//             // Code style
//             if (node.format & 16) {
//               // assuming bit 16 reserved for code
//               text = `<code style="background-color: #f3f4f6; padding: 0.2em 0.4em; border-radius: 0.25rem;">${text}</code>`;
//             }
//             // Inline CSS for color/background
//             if (node.style) return `<span style="${node.style}">${text}</span>`;
//             return text;
//           }
//           default:
//             return "";
//         }
//       })
//       .join("");
//   }

//   const body = traverse(parsed.root.children || []);
//   return `<html><body><div>${metaHtml}</div><div>${body}</div></body></html>`;
// }
