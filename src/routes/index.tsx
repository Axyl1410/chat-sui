import { createFileRoute } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-border border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="flex h-14 items-center gap-4 px-4">
          <SidebarTrigger className="md:hidden" />
          <h1 className="font-bold text-xl">Home</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-muted-foreground">Welcome to Sui DApp</p>
      </div>
    </div>
  );
}
