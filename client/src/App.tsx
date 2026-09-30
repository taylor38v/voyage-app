import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import TripDetails from "@/pages/trip-details";
import ClientView from "@/pages/client-view";
import TripPrint from "@/pages/trip-print";
import AdminPage from "@/pages/admin";
import Pricing from "@/pages/pricing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import AccountPage from "@/pages/account";
import { CGV, MentionsLegales, PolitiqueConfidentialite } from "@/pages/legal";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "@/components/theme-provider";

function Router() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/share/:token/imprimer" component={TripPrint} />
      <Route path="/share/:token" component={ClientView} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/cgv" component={CGV} />
      <Route path="/mentions-legales" component={MentionsLegales} />
      <Route path="/confidentialite" component={PolitiqueConfidentialite} />
      {!user ? (
        <Switch>
          <Route path="/" component={Landing} />
          <Route component={Landing} />
        </Switch>
      ) : (
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/trip/:id" component={TripDetails} />
          <Route path="/admin" component={AdminPage} />
          <Route path="/account" component={AccountPage} />
          <Route component={NotFound} />
        </Switch>
      )}
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
