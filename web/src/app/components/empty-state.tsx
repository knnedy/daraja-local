import { Button } from "@/components/ui/button";
import { PlusIcon, SmartphoneIcon } from "lucide-react";
import Link from "next/link";

export default function EmptyState() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl border border-green-mid bg-green-light">
        <SmartphoneIcon className="size-6 text-green" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-xl font-medium text-foreground">
          No projects yet
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Create a project to get your API credentials, a generated{" "}
          <code className="rounded bg-secondary px-1 py-0.5 font-mono text-xs">
            .env
          </code>{" "}
          file, and a live dashboard.
        </p>
      </div>

      <Button
        size="lg"
        className="gap-1.5"
        nativeButton={false}
        render={<Link href="/new" />}>
        <PlusIcon />
        Create your first project
      </Button>

      <p className="max-w-xs text-xs text-muted-foreground">
        Each project gets its own credentials, callback URLs, and request
        history — completely isolated from the others.
      </p>
    </div>
  );
}
