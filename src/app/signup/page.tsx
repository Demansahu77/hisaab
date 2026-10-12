import { Suspense } from "react";
import { AuthPage } from "@/components/auth-page";
import { LoadingShell } from "@/components/ui";

export const metadata = { title: "Sign up" };

export default function Page(props: PageProps<"/signup">) {
  return (
    <Suspense fallback={<LoadingShell />}>
      <Content {...props} />
    </Suspense>
  );
}

async function Content({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  return <AuthPage mode="signup" next={typeof next === "string" ? next : undefined} />;
}
