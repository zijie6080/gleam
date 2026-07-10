import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center">
      <Link
        href="/tokens"
        className="font-serif text-lg text-gold transition-opacity duration-fade hover:opacity-70"
      >
        查看设计系统 /tokens
      </Link>
    </main>
  );
}
