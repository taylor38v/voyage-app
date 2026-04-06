import { Layout } from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useState } from "react";
import {
  User, Lock, CreditCard, Sparkles, Loader2, Eye, EyeOff,
  Calendar, Shield, Wand2, Users, Crown, AlertCircle
} from "lucide-react";
import { Link } from "wouter";

const profileSchema = z.object({
  firstName: z.string().min(1, "Le prénom est requis"),
  lastName: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis"),
  newPassword: z.string().min(8, "Au moins 8 caractères"),
  confirmPassword: z.string().min(1, "Confirmation requise"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ProfileValues = z.infer<typeof profileSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

export default function AccountPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const authUser = user as any;

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: authUser?.firstName || "",
      lastName: authUser?.lastName || "",
      email: authUser?.email || "",
    },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileValues) => {
      const res = await apiRequest("PUT", "/api/auth/profile", values);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: "Profil mis à jour" });
    },
    onError: (err: Error) => {
      toast({ title: err.message || "Erreur", variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordValues) => {
      const res = await apiRequest("PUT", "/api/auth/password", {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Mot de passe mis à jour" });
      passwordForm.reset();
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    },
    onError: (err: Error) => {
      toast({ title: err.message || "Erreur", variant: "destructive" });
    },
  });

  const openStripePortal = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST", credentials: "include" });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch {}
  };

  const plan = authUser?.plan || "free";
  const planLimits = authUser?.planLimits;
  const planInterval = authUser?.planInterval;
  const planStatus = authUser?.planStatus;
  const planExpiresAt = authUser?.planExpiresAt;
  const activeTripsCount = authUser?.activeTripsCount ?? 0;
  const maxTrips = planLimits?.maxTrips ?? 1;
  const isSuperAdmin = authUser?.role === "super_admin";

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    solo: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    pro: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    agency: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold" data-testid="text-account-title">Mon compte</h1>
          <p className="text-sm text-muted-foreground">Gérez votre profil, votre mot de passe et votre abonnement</p>
        </div>

        <Card className="p-6 space-y-5" data-testid="card-profile">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Profil</h2>
              <p className="text-xs text-muted-foreground">Vos informations personnelles</p>
            </div>
          </div>

          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit((v) => profileMutation.mutate(v))} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prénom</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Prénom" data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nom" data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="votre@email.com" data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={profileMutation.isPending} data-testid="button-save-profile">
                  {profileMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enregistrer
                </Button>
                {authUser?.createdAt && (
                  <span className="text-xs text-muted-foreground">
                    Membre depuis {new Date(authUser.createdAt).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                  </span>
                )}
              </div>
            </form>
          </Form>
        </Card>

        <Card className="p-6 space-y-5" data-testid="card-password">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-lg">Mot de passe</h2>
              <p className="text-xs text-muted-foreground">Changez votre mot de passe</p>
            </div>
          </div>

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit((v) => passwordMutation.mutate(v))} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe actuel</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="Votre mot de passe actuel"
                          data-testid="input-current-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          data-testid="button-toggle-current-password"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showNewPassword ? "text" : "password"}
                          placeholder="Au moins 8 caractères"
                          data-testid="input-new-password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          data-testid="button-toggle-new-password"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="Retapez le nouveau mot de passe"
                        data-testid="input-confirm-password"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={passwordMutation.isPending}
                variant="outline"
                data-testid="button-change-password"
              >
                {passwordMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Changer le mot de passe
              </Button>
            </form>
          </Form>
        </Card>

        {!isSuperAdmin && planLimits && (
          <Card className="p-6 space-y-5" data-testid="card-subscription">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-violet-500" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-lg">Abonnement</h2>
                <p className="text-xs text-muted-foreground">Votre plan et votre facturation</p>
              </div>
            </div>

            {planStatus === "past_due" && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md flex items-center gap-2 text-sm" data-testid="text-payment-failed">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-destructive">Paiement en échec. Mettez à jour votre moyen de paiement.</span>
                <Button size="sm" variant="destructive" className="ml-auto" onClick={openStripePortal} data-testid="button-fix-payment">
                  Mettre à jour
                </Button>
              </div>
            )}

            <div className="bg-muted/30 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={`text-sm px-3 py-1 ${planColors[plan] || planColors.free}`} data-testid="badge-plan-name">
                    {plan === "agency" ? <Crown className="w-3.5 h-3.5 mr-1" /> : null}
                    Plan {planLimits.name}
                  </Badge>
                  {plan !== "free" && planInterval && (
                    <span className="text-sm text-muted-foreground" data-testid="text-plan-interval">
                      {planInterval === "year" ? "Annuel" : "Mensuel"}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  <span data-testid="text-trips-quota">
                    {maxTrips === -1 ? `${activeTripsCount} voyages` : `${activeTripsCount}/${maxTrips} voyages`}
                  </span>
                </div>
                {planLimits.hasAI && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Wand2 className="w-4 h-4" />
                    <span>IA incluse</span>
                  </div>
                )}
                {planLimits.maxAdmins !== 1 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{planLimits.maxAdmins === -1 ? "Admins illimités" : `${planLimits.maxAdmins} admins`}</span>
                  </div>
                )}
              </div>

              {planExpiresAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span data-testid="text-plan-renewal">
                    Prochain renouvellement : {new Date(planExpiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {plan === "free" ? (
                <Link href="/pricing">
                  <Button data-testid="button-upgrade">
                    <Sparkles className="w-4 h-4 mr-2" /> Passer à un plan payant
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/pricing">
                    <Button variant="outline" data-testid="button-change-plan">
                      <Sparkles className="w-4 h-4 mr-2" /> Changer de plan
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={openStripePortal} data-testid="button-billing">
                    <CreditCard className="w-4 h-4 mr-2" /> Facturation et factures
                  </Button>
                </>
              )}
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
