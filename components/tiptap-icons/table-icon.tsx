import { memo } from "react"
import { Table } from "lucide-react"

type SvgProps = React.ComponentPropsWithoutRef<"svg">

export const TableIcon = memo(({ className, ...props }: SvgProps) => {
  return <Table className={className} {...props as any} />
})

TableIcon.displayName = "TableIcon"
