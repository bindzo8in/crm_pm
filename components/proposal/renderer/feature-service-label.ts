import type { JSONContent } from "@tiptap/react";

interface ProposalFeatureService {
  serviceName: string;
  packageName?: string | null;
}

function getNodeText(node: JSONContent): string {
  if (node.text) return node.text;
  return node.content?.map(getNodeText).join("") ?? "";
}

export function getProposalFeaturePageTitle(nodes: JSONContent[]): string | null {
  const heading = nodes.find(
    (node) => node.type === "heading" && node.attrs?.level === 2,
  );
  const title = heading ? getNodeText(heading).trim() : "";
  return title || null;
}

export function getProposalFeatureServiceLabel(
  pageTitle: string | null,
  services?: ProposalFeatureService[],
): string | null {
  if (!pageTitle) return null;

  const normalizedTitle = pageTitle.trim().toLocaleLowerCase();
  const service = services?.find((candidate) => {
    const serviceName = candidate.serviceName.trim();
    if (!serviceName || serviceName.toLocaleLowerCase() === "custom items") {
      return false;
    }

    const groupTitle = candidate.packageName
      ? `${candidate.packageName.trim()} (${serviceName})`
      : serviceName;
    return groupTitle.toLocaleLowerCase() === normalizedTitle;
  });

  if (!service) return null;
  const serviceName = service.serviceName.trim();
  const packageName = service.packageName?.trim();
  return packageName
    ? `${serviceName} (${packageName})`
    : serviceName;
}
