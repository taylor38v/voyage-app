import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { LogOut, Home, Moon, Sun, Menu, Shield, UserCircle } from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/components/theme-provider";
import { useQuery } from "@tanstack/react-query";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { data: adminData } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    enabled: !!user,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });
  const isAdmin = adminData?.isAdmin || false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <div className="p-6 space-y-6">
                  <span className="font-display font-bold text-2xl gradient-text">Voyageo</span>
                  <nav className="space-y-2">
                    <Link href="/" onClick={() => setIsMobileOpen(false)}>
                      <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}>
                        <Home className="w-5 h-5" />
                        Mes voyages
                      </div>
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setIsMobileOpen(false)}>
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors cursor-pointer ${location === "/admin" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`} data-testid="link-admin-mobile">
                          <Shield className="w-5 h-5" />
                          Administration
                        </div>
                      </Link>
                    )}
                    <Link href="/account" onClick={() => setIsMobileOpen(false)}>
                      <Button variant="ghost" className={`w-full justify-start gap-3 px-4 py-3 h-auto rounded-md ${location === "/account" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`} data-testid="link-account-mobile">
                        <UserCircle className="w-5 h-5" />
                        Mon compte
                      </Button>
                    </Link>
                  </nav>
                  {user && (
                    <div className="pt-4 border-t border-border/50">
                      <div className="flex items-center gap-3 mb-4 px-2">
                        <Avatar className="h-10 w-10 border-2 border-border">
                          <AvatarImage src={user.profileImageUrl || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {user.firstName?.[0]}{user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground" onClick={() => logout()} data-testid="button-logout-mobile">
                        <LogOut className="w-4 h-4" />
                        Déconnexion
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/">
              <span className="font-display font-bold text-xl gradient-text cursor-pointer" data-testid="text-logo">Voyageo</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleTheme} data-testid="button-theme-toggle">
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
            {user && isAdmin && (
              <Link href="/admin">
                <Button variant={location === "/admin" ? "secondary" : "ghost"} size="sm" className="hidden md:flex gap-1.5" data-testid="link-admin-desktop">
                  <Shield className="w-4 h-4" />
                  <span className="hidden lg:inline">Admin</span>
                </Button>
              </Link>
            )}
            {user && (
              <>
                <Link href="/account">
                  <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-2 h-auto py-1.5 px-2" data-testid="link-account-desktop">
                    <Avatar className="h-8 w-8 border border-border">
                      <AvatarImage src={user.profileImageUrl || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {user.firstName?.[0]}{user.lastName?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium hidden lg:inline">{user.firstName}</span>
                  </Button>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => logout()} className="hidden md:flex" data-testid="button-logout">
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <a
        href="https://wa.me/33668467347"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
        data-testid="link-whatsapp"
        aria-label="Contacter sur WhatsApp"
      >
        <SiWhatsapp className="w-7 h-7 text-white" />
      </a>
    </div>
  );
}
