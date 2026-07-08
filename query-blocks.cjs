const { PrismaClient } = require('./app/generated/prisma/client');
const prisma = new PrismaClient();

async function main() {
  const proposal = await prisma.proposal.findFirst({
    orderBy: { createdAt: 'desc' },
    select: { id: true, title: true }
  });
  
  console.log('Proposal:', proposal);
  
  const blocks = await prisma.proposalBlock.findMany({
    where: { proposalId: proposal.id },
    select: { id: true, type: true, title: true, sortOrder: true, isVisible: true },
    orderBy: { sortOrder: 'asc' }
  });
  
  console.log('Blocks:', JSON.stringify(blocks, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
