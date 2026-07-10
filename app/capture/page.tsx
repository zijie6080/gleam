"use client";

import { motion } from "framer-motion";
import { Moon } from "lucide-react";
import Art from "@/components/Art";
import TabBar from "@/components/TabBar";
import { fadeIn } from "@/lib/motion";

export default function CapturePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-14">
      <Moon strokeWidth={1.5} className="h-7 w-7 text-gold" />

      <motion.div
        {...fadeIn}
        className="flex flex-1 flex-col items-center justify-center gap-16"
      >
        <h1 className="font-serif text-4xl tracking-[0.2em] text-ink">
          说吧，我在听
        </h1>

        <Art className="aspect-square w-72 rounded-full" />

        <p className="text-sm text-muted">松手结束 · 07:14</p>
      </motion.div>

      <TabBar active="echo" />
    </main>
  );
}
