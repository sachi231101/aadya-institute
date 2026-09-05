import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Shield, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  useAcceptInvitePreview,
  useAcceptInvitation,
} from "@/hooks/useInvitations";

export const AcceptInvite: React.FC = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();

  const { data, isLoading, isError, error } = useAcceptInvitePreview(token);
  const acceptMutation = useAcceptInvitation();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const preview = data?.data;

  const passwordOk = useMemo(() => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[0-9]/.test(password)
    );
  }, [password]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!token) {
      setFormError("Missing invitation token.");
      return;
    }
    if (!passwordOk) {
      setFormError("Password must be at least 8 characters with an uppercase letter and a number.");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    acceptMutation.mutate(
      { token, password },
      {
        onSuccess: () => {
          setDone(true);
          setTimeout(() => navigate("/login"), 1800);
        },
        onError: (err: any) => {
          setFormError(
            err?.response?.data?.message || "Could not accept invitation."
          );
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border shadow-lg rounded-2xl bg-card">
        <CardContent className="p-6 sm:p-8 space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Shield className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">
              Accept Invitation
            </h1>
            <p className="text-sm text-muted-foreground">
              Create your password to join Aadya Institute.
            </p>
          </div>

          {!token && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              Invitation token is missing. Use the link from your invite email.
            </div>
          )}

          {token && isLoading && (
            <div className="flex flex-col items-center py-8 gap-3 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-medium">Validating invitation…</p>
            </div>
          )}

          {token && isError && (
            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 p-3 text-sm text-red-700 dark:text-red-300">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {(error as any)?.response?.data?.message ||
                "This invitation is invalid, expired, or already used."}
            </div>
          )}

          {done && (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="font-bold text-foreground">Account created</p>
              <p className="text-sm text-muted-foreground">Redirecting to login…</p>
            </div>
          )}

          {token && preview && !done && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1 text-sm">
                <p className="font-bold text-foreground">{preview.name}</p>
                <p className="text-muted-foreground">{preview.email}</p>
                <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                  {preview.roleName}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 rounded-xl"
                    placeholder="Min 8 chars, uppercase + number"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm password</Label>
                <Input
                  id="confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="rounded-xl"
                  autoComplete="new-password"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
              )}

              <Button
                type="submit"
                className="w-full rounded-xl font-bold"
                disabled={acceptMutation.isPending}
              >
                {acceptMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating account…
                  </>
                ) : (
                  "Accept & create account"
                )}
              </Button>
            </form>
          )}

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
