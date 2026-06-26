import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor"
import content from "@/components/tiptap-templates/simple/data/content.json"

export default function Page() {
  return <SimpleEditor value={content} />
}
