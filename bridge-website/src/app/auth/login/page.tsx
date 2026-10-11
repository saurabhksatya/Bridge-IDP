"use client";

import { LoginForm } from "@/components/login-page";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  return (
    <>
      <header className="sticky top-0 z-50 border-b border-indigo-100 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div
            className="flex cursor-pointer items-center gap-3"
            onClick={() => router.push("/")}
          >
            <div className="relative h-10 w-10">
              <div className="text-sidebar-primary-foreground flex aspect-square size-10 items-center justify-center rounded-lg">
                <Image
                  src={"/bridge.svg"}
                  alt="Bridge Logo"
                  width={48}
                  height={48}
                />
              </div>
            </div>
            <span className="truncate text-lg font-medium">
              Bridge Watch
            </span>
          </div>
        </div>
      </header>
      <main className="flex min-h-svh items-center justify-center px-4 py-12">
        <LoginForm />
      </main>
      ;
    </>
  );
}
