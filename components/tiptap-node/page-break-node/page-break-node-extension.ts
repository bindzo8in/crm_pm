import { Node, mergeAttributes } from "@tiptap/react"

export const PageBreak = Node.create({
  name: "pageBreak",
  group: "block",
  parseHTML() {
    return [{ tag: "div[data-type='pageBreak']" }]
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "pageBreak", class: "proposal-page-break-after print:break-after-page", style: "page-break-after: always; break-after: page; height: 0; width: 100%; border: none; margin: 0; padding: 0;" }),
    ]
  },
  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) => {
          return chain().insertContent({ type: this.name }).run()
        },
    }
  },
})

export default PageBreak
