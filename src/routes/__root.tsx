import {
  ConnectButton,
  useAccounts,
  useCurrentAccount,
} from "@mysten/dapp-kit";
import {
  createRootRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { ChevronsUpDown, Copy, Home, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";

const RootLayout = () => {
  const currentAccount = useCurrentAccount();
  const accounts = useAccounts();
  const location = useLocation();
  const activeAccount =
    currentAccount || (accounts.length > 0 ? accounts[0] : null);

  const getInitials = (address?: string) => {
    if (address) {
      return address.slice(2, 4).toUpperCase();
    }
    return "??";
  };

  const displayName = activeAccount
    ? `${activeAccount.address.slice(0, 6)}...${activeAccount.address.slice(-4)}`
    : "Guest";

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") {
      return true;
    }
    if (path !== "/" && location.pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Left Sidebar */}
        <Sidebar collapsible="icon" variant="inset">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild size="lg">
                  <Link to="/">
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                      <MessageSquare className="size-5" />
                    </div>
                    <div className="flex flex-col gap-0.5 leading-none">
                      <span className="font-semibold">Chat App</span>
                      <span className="text-muted-foreground text-xs">
                        Decentralized Chat
                      </span>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/")}
                      tooltip="Chat"
                    >
                      <Link to="/">
                        <MessageSquare className="size-5" />
                        <span>Chat</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive("/counter")}
                      tooltip="Counter"
                    >
                      <Link to="/counter">
                        <Home className="size-5" />
                        <span>Counter</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            {activeAccount ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <Popover>
                    <SidebarMenuButton asChild size="lg">
                      <PopoverTrigger>
                        <Avatar className="h-8 w-8 shrink-0 rounded-lg">
                          <AvatarFallback className="rounded-lg">
                            {getInitials(activeAccount.address)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-medium">
                            {displayName}
                          </span>
                          <span className="truncate text-xs">
                            {activeAccount.address.slice(0, 8)}...
                            {activeAccount.address.slice(-6)}
                          </span>
                        </div>
                        <ChevronsUpDown className="ml-auto size-4 shrink-0" />
                      </PopoverTrigger>
                    </SidebarMenuButton>
                    <PopoverContent
                      align="start"
                      className="w-80 rounded-xl border-2 p-0 shadow-2xl"
                      side="right"
                      sideOffset={12}
                    >
                      <div className="p-4">
                        <div className="mb-3">
                          <h3 className="font-semibold text-base">
                            Account details
                          </h3>
                          <p className="text-muted-foreground text-xs">
                            Review your connected wallet information.
                          </p>
                        </div>
                        <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 shrink-0 rounded-lg">
                              <AvatarFallback className="rounded-lg">
                                {getInitials(activeAccount.address)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-medium text-base">
                                {displayName}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 rounded-md bg-background px-3 py-2">
                            <p className="min-w-0 flex-1 break-all font-mono text-muted-foreground text-xs">
                              {activeAccount.address}
                            </p>
                            <Button
                              className="h-7 shrink-0"
                              onClick={async () => {
                                try {
                                  await navigator.clipboard.writeText(
                                    activeAccount.address
                                  );
                                  toast.success("Address copied to clipboard");
                                } catch {
                                  toast.error("Failed to copy address");
                                }
                              }}
                              size="icon-sm"
                              variant="ghost"
                            >
                              <Copy className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <p className="text-muted-foreground text-xs">
                            Switch or disconnect your wallet
                          </p>
                          <div className="overflow-hidden rounded-lg border bg-background">
                            <ConnectButton />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild size="lg">
                    <div>
                      <ConnectButton />
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Main Content Area */}
        <SidebarInset className="flex flex-1 flex-col overflow-hidden">
          <main className="flex flex-1 overflow-y-auto">
            {/* Center Column - Feed */}
            <div className="flex-1 border-border border-x">
              <Outlet />
            </div>

            {/* Right Sidebar */}
            <aside className="hidden w-80 border-border border-l lg:block">
              <div className="sticky top-0 space-y-4 p-4">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <h3 className="mb-2 font-semibold">Quick Actions</h3>
                  <div className="space-y-2 text-muted-foreground text-sm">
                    <p>• Create your profile to start chatting</p>
                    <p>• Join or create rooms</p>
                    <p>• Send messages in rooms</p>
                  </div>
                </div>
              </div>
            </aside>
          </main>
        </SidebarInset>
      </div>
      <Toaster position="bottom-right" />
      {import.meta.env.DEV && <TanStackRouterDevtools position="bottom-left" />}
    </SidebarProvider>
  );
};

export const Route = createRootRoute({ component: RootLayout });
