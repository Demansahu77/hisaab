import { Suspense } from "react";
import { AuthPage } from "@/components/auth-page";
import { LoadingShell } from "@/components/ui";

export const metadata = { title: "Log in" };

export default function Page(props: PageProps<"/login">) {
  return (
    <Suspense fallback={<LoadingShell />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <AuthPage mode="login" next={typeof next === "string" ? next : undefined} />;
}
