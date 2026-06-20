import prisma from "@/lib/prisma";

export default async function Home() {
  const users = await prisma.user.findMany()
  return (
    <main>
      <div>Hello world!</div>
    </main>
  );
}
