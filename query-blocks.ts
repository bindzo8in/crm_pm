import prisma from './lib/prisma';

async function main() {
  const proposal = await prisma.proposal.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true }
  });
  
  if (!proposal) return;

  // Clear features block so it regenerates cleanly with the new title formats
  await prisma.proposalBlock.updateMany({
    where: { proposalId: proposal.id, type: "FEATURES" },
    data: { content: { type: "doc", content: [] } }
  });

  console.log("Cleared FEATURES block content for regeneration");
}

main().catch(console.error).finally(() => prisma.$disconnect());
