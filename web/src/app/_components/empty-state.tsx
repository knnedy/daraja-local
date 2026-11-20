import Link from "next/link";
import { ArrowRightIcon, BanknoteArrowUpIcon, LogsIcon, SmartphoneNfcIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/logo";

const features = [
  { icon: SmartphoneNfcIcon, title: "STK Push on a virtual phone", body: "Enter the PIN, cancel, or let it time out." },
  { icon: BanknoteArrowUpIcon, title: "C2B, B2C, B2B, reversals", body: "Real callbacks to your server, real failure codes." },
  { icon: LogsIcon, title: "Every request, logged", body: "See exactly what your app sent and what came back." },
];

/** First run: what Daraja Local is, and the one thing to do next. */
export default function EmptyState() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center px-4 pt-16 pb-20 text-center sm:px-6 sm:pt-24">
      <div className="relative">
        <div aria-hidden className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,color-mix(in_oklch,var(--green-2)_22%,transparent),transparent_70%)]" />
        <LogoMark className="relative size-16 drop-shadow-[0_12px_24px_oklch(0.45_0.12_155/0.35)]" />
      </div>
      <h1 className="mt-8 text-[34px] leading-[1.1] font-semibold tracking-[-0.03em] text-balance text-foreground sm:text-[42px]">
        M-PESA&apos;s Daraja API, running on your machine
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-pretty text-muted-foreground">
        Build and test against STK Push, C2B, B2C and the rest without a sandbox account, a tunnel, or a real phone.
        Start with a project: it gets its own shortcode and keys.
      </p>
      <Button size="lg" className="mt-8 h-11 px-5 text-[14px]" nativeButton={false} render={<Link href="/new" />}>
        Create your first project
        <ArrowRightIcon className="size-4" />
      </Button>

      <ul className="mt-16 grid w-full gap-3 text-left sm:grid-cols-3">
        {features.map((f) => (
          <li key={f.title} className="flex flex-col gap-2 panel p-4">
            <f.icon className="size-4.5 text-green" />
            <p className="text-[13.5px] font-medium text-foreground">{f.title}</p>
            <p className="text-[12.5px] text-pretty text-muted-foreground">{f.body}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
