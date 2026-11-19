interface ProposalBlockVisibility {
  type: string;
  isVisible?: boolean;
}

export function isProposalBlockVisible(block: ProposalBlockVisibility): boolean {
  return block.type === "TIMELINE"
    ? block.isVisible === true
    : block.isVisible !== false;
}
