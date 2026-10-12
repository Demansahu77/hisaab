import { logout } from "@/app/actions";

export function AppNav({ name }: { name: string }) {
  return (
    <>
      <span className="hidden sm:inline">{name}</span>
      <form action={logout}>
        <button type="submit" className="text-link cursor-pointer">
          Log out
        </button>
      </form>
    </>
  );
}
