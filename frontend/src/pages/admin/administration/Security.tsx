import React, { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Loader2,
  AlertCircle,
  Save,
  KeyRound,
  MonitorSmartphone,
  History,
  Globe,
  Bell,
  Lock,
  Trash2,
  Plus,
  CheckCircle2,
} from "lucide-react";
import { securityApi, type SecurityPolicy } from "@/services/security.api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const getStoredRefreshToken = () => {
  try {
    return (
      localStorage.getItem("refreshToken") ||
      sessionStorage.getItem("refreshToken") ||
      null
    );
  } catch {
    return null;
  }
};

export const Security: React.FC = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("login");
  const [policyForm, setPolicyForm] = useState<SecurityPolicy | null>(null);
  const [cidr, setCidr] = useState("");
  const [cidrLabel, setCidrLabel] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [otpauthUrl, setOtpauthUrl] = useState<string | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [alertsPage, setAlertsPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const policyQuery = useQuery({
    queryKey: ["security", "policy"],
    queryFn: securityApi.getPolicy,
  });

  useEffect(() => {
    if (policyQuery.data) setPolicyForm(policyQuery.data);
  }, [policyQuery.data]);

  const sessionsQuery = useQuery({
    queryKey: ["security", "sessions"],
    queryFn: () => securityApi.getSessions(getStoredRefreshToken()),
    enabled: tab === "sessions",
  });

  const historyQuery = useQuery({
    queryKey: ["security", "login-history", historyPage],
    queryFn: () => securityApi.getLoginHistory({ page: historyPage, limit: 20 }),
    enabled: tab === "history",
  });

  const ipsQuery = useQuery({
    queryKey: ["security", "allowed-ips"],
    queryFn: securityApi.getAllowedIps,
    enabled: tab === "ips",
  });

  const alertsQuery = useQuery({
    queryKey: ["security", "alerts", alertsPage],
    queryFn: () =>
      securityApi.getAlerts({ page: alertsPage, limit: 20, resolved: false }),
    enabled: tab === "alerts",
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const updatePolicyMutation = useMutation({
    mutationFn: securityApi.updatePolicy,
    onSuccess: (data) => {
      setPolicyForm(data);
      queryClient.invalidateQueries({ queryKey: ["security", "policy"] });
      showToast("Security policy saved");
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || "Failed to save policy");
    },
  });

  const revokeSessionMutation = useMutation({
    mutationFn: securityApi.revokeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", "sessions"] });
      showToast("Session revoked");
    },
  });

  const logoutOthersMutation = useMutation({
    mutationFn: () => securityApi.logoutOtherSessions(getStoredRefreshToken()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", "sessions"] });
      showToast("Other sessions signed out");
    },
  });

  const addIpMutation = useMutation({
    mutationFn: () =>
      securityApi.addAllowedIp({
        cidr: cidr.trim(),
        label: cidrLabel.trim() || undefined,
      }),
    onSuccess: () => {
      setCidr("");
      setCidrLabel("");
      queryClient.invalidateQueries({ queryKey: ["security", "allowed-ips"] });
      showToast("IP added");
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || "Failed to add IP");
    },
  });

  const removeIpMutation = useMutation({
    mutationFn: securityApi.removeAllowedIp,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", "allowed-ips"] });
      showToast("IP removed");
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || "Failed to remove IP");
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: securityApi.resolveAlert,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["security", "alerts"] });
      showToast("Alert resolved");
    },
  });

  const setup2faMutation = useMutation({
    mutationFn: securityApi.setup2fa,
    onSuccess: (data) => {
      setSetupSecret(data.secret);
      setOtpauthUrl(data.otpauthUrl);
      setRecoveryCodes(null);
      showToast("Scan the secret in your authenticator app");
    },
  });

  const verify2faMutation = useMutation({
    mutationFn: () => securityApi.verify2fa(totpCode),
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
      setTotpCode("");
      showToast("2FA enabled — save your recovery codes");
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || "Invalid code");
    },
  });

  const disable2faMutation = useMutation({
    mutationFn: () => securityApi.disable2fa({ password: disablePassword }),
    onSuccess: () => {
      setSetupSecret(null);
      setOtpauthUrl(null);
      setRecoveryCodes(null);
      setDisablePassword("");
      showToast("2FA disabled");
    },
    onError: (err: any) => {
      showToast(err?.response?.data?.message || "Failed to disable 2FA");
    },
  });

  const setPolicyField = <K extends keyof SecurityPolicy>(
    key: K,
    value: SecurityPolicy[K]
  ) => {
    setPolicyForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveLoginPolicy = () => {
    if (!policyForm) return;
    updatePolicyMutation.mutate({
      maxLoginAttempts: Number(policyForm.maxLoginAttempts),
      lockDurationMinutes: Number(policyForm.lockDurationMinutes),
      loginRateLimitPerMinute: Number(policyForm.loginRateLimitPerMinute),
    });
  };

  const savePasswordPolicy = () => {
    if (!policyForm) return;
    updatePolicyMutation.mutate({
      minPasswordLength: Number(policyForm.minPasswordLength),
      requireUppercase: policyForm.requireUppercase,
      requireLowercase: policyForm.requireLowercase,
      requireNumber: policyForm.requireNumber,
      requireSpecialChar: policyForm.requireSpecialChar,
      passwordExpiryDays: policyForm.passwordExpiryDays
        ? Number(policyForm.passwordExpiryDays)
        : null,
      preventPasswordReuse: policyForm.preventPasswordReuse
        ? Number(policyForm.preventPasswordReuse)
        : null,
    });
  };

  if (policyQuery.isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (policyQuery.isError || !policyForm) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-red-600">
        <AlertCircle className="w-8 h-8" />
        <p>Failed to load security settings.</p>
        <Button variant="outline" onClick={() => policyQuery.refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Security
          </h2>
          <p className="text-sm text-muted-foreground">
            Login protection, password rules, 2FA, sessions, and alerts.
          </p>
        </div>
        {toast && (
          <Badge variant="secondary" className="shrink-0">
            {toast}
          </Badge>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full justify-start">
          <TabsTrigger value="login">Login Security</TabsTrigger>
          <TabsTrigger value="password">Password Policy</TabsTrigger>
          <TabsTrigger value="2fa">2FA</TabsTrigger>
          <TabsTrigger value="sessions">Active Sessions</TabsTrigger>
          <TabsTrigger value="history">Login History</TabsTrigger>
          <TabsTrigger value="ips">IP Restrictions</TabsTrigger>
          <TabsTrigger value="alerts">Security Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="login">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Lock className="h-4 w-4" /> Login lockout settings
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Max login attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    value={policyForm.maxLoginAttempts}
                    onChange={(e) =>
                      setPolicyField("maxLoginAttempts", Number(e.target.value))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lock duration (minutes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={policyForm.lockDurationMinutes}
                    onChange={(e) =>
                      setPolicyField(
                        "lockDurationMinutes",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Rate limit / minute</Label>
                  <Input
                    type="number"
                    min={1}
                    value={policyForm.loginRateLimitPerMinute}
                    onChange={(e) =>
                      setPolicyField(
                        "loginRateLimitPerMinute",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>
              </div>
              <Button
                onClick={saveLoginPolicy}
                disabled={updatePolicyMutation.isPending}
              >
                {updatePolicyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save login policy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <KeyRound className="h-4 w-4" /> Password requirements
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Minimum length</Label>
                  <Input
                    type="number"
                    min={6}
                    value={policyForm.minPasswordLength}
                    onChange={(e) =>
                      setPolicyField(
                        "minPasswordLength",
                        Number(e.target.value)
                      )
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Password expiry (days, optional)</Label>
                  <Input
                    type="number"
                    min={1}
                    placeholder="No expiry"
                    value={policyForm.passwordExpiryDays ?? ""}
                    onChange={(e) =>
                      setPolicyField(
                        "passwordExpiryDays",
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["requireUppercase", "Require uppercase"],
                    ["requireLowercase", "Require lowercase"],
                    ["requireNumber", "Require number"],
                    ["requireSpecialChar", "Require special character"],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <Label>{label}</Label>
                    <Switch
                      checked={Boolean(policyForm[key])}
                      onCheckedChange={(v) => setPolicyField(key, v)}
                    />
                  </div>
                ))}
              </div>
              <Button
                onClick={savePasswordPolicy}
                disabled={updatePolicyMutation.isPending}
              >
                {updatePolicyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save password policy
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="2fa">
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Enable authenticator-app 2FA for your account. Recovery codes are
                shown once after verification.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setup2faMutation.mutate()}
                  disabled={setup2faMutation.isPending}
                >
                  {setup2faMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  )}
                  Start 2FA setup
                </Button>
              </div>
              {setupSecret && (
                <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                  <p className="text-sm font-medium">Secret (enter in app)</p>
                  <code className="block text-sm break-all">{setupSecret}</code>
                  {otpauthUrl && (
                    <p className="text-xs text-muted-foreground break-all">
                      {otpauthUrl}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2 items-end">
                    <div className="space-y-1">
                      <Label>Verification code</Label>
                      <Input
                        value={totpCode}
                        onChange={(e) => setTotpCode(e.target.value)}
                        placeholder="6-digit code"
                        className="w-40"
                      />
                    </div>
                    <Button
                      onClick={() => verify2faMutation.mutate()}
                      disabled={verify2faMutation.isPending || totpCode.length < 6}
                    >
                      Verify & enable
                    </Button>
                  </div>
                </div>
              )}
              {recoveryCodes && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-amber-900">
                    Save these recovery codes now
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-1 font-mono text-sm">
                    {recoveryCodes.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="border-t pt-4 space-y-2">
                <Label>Disable 2FA (enter password)</Label>
                <div className="flex flex-wrap gap-2">
                  <Input
                    type="password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    placeholder="Current password"
                    className="max-w-xs"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => disable2faMutation.mutate()}
                    disabled={
                      !disablePassword || disable2faMutation.isPending
                    }
                  >
                    Disable 2FA
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MonitorSmartphone className="h-4 w-4" /> Active sessions
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoutOthersMutation.mutate()}
                  disabled={logoutOthersMutation.isPending}
                >
                  Sign out other sessions
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Last seen</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessionsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : !sessionsQuery.data?.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No active sessions.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessionsQuery.data.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {s.userName || s.userId}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {s.userEmail}
                          </div>
                          {s.isCurrent && (
                            <Badge className="mt-1" variant="secondary">
                              Current
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.ipAddress || "—"}
                        </TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate">
                          {s.userAgent || "—"}
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.lastSeenAt
                            ? new Date(s.lastSeenAt).toLocaleString("en-IN")
                            : new Date(s.createdAt).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.tokenMasked}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeSessionMutation.mutate(s.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <History className="h-4 w-4" /> Login history
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : !historyQuery.data?.data?.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No login events.
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyQuery.data.data.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm">
                          {new Date(h.createdAt).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {h.user?.name || h.emailOrPhone || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              h.status === "SUCCESS"
                                ? "default"
                                : h.status === "FAILED" || h.status === "LOCKED"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {h.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {h.ipAddress || "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-xs truncate">
                          {h.message || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {(historyQuery.data?.meta?.totalPages ?? 1) > 1 && (
                <div className="flex justify-between text-sm">
                  <span>
                    Page {historyQuery.data?.meta.page} of{" "}
                    {historyQuery.data?.meta.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage <= 1}
                      onClick={() => setHistoryPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        historyPage >=
                        (historyQuery.data?.meta.totalPages ?? 1)
                      }
                      onClick={() => setHistoryPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ips">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Globe className="h-4 w-4" /> IP allowlist
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Enable restriction</Label>
                  <Switch
                    checked={policyForm.ipRestrictionEnabled}
                    onCheckedChange={(v) => {
                      setPolicyField("ipRestrictionEnabled", v);
                      updatePolicyMutation.mutate({
                        ipRestrictionEnabled: v,
                      });
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                <div className="space-y-1">
                  <Label>CIDR / IP</Label>
                  <Input
                    value={cidr}
                    onChange={(e) => setCidr(e.target.value)}
                    placeholder="192.168.1.0/24"
                    className="w-48"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Label</Label>
                  <Input
                    value={cidrLabel}
                    onChange={(e) => setCidrLabel(e.target.value)}
                    placeholder="Office"
                    className="w-40"
                  />
                </div>
                <Button
                  onClick={() => addIpMutation.mutate()}
                  disabled={!cidr.trim() || addIpMutation.isPending}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CIDR</TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ipsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : !ipsQuery.data?.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No allowed IPs yet. Add your current IP before enabling
                        restriction.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ipsQuery.data.map((ip) => (
                      <TableRow key={ip.id}>
                        <TableCell className="font-mono text-sm">
                          {ip.cidr}
                        </TableCell>
                        <TableCell>{ip.label || "—"}</TableCell>
                        <TableCell>
                          {ip.isActive ? (
                            <Badge>Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIpMutation.mutate(ip.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bell className="h-4 w-4" /> Unresolved security alerts
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Severity</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertsQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin inline mr-2" />
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : !alertsQuery.data?.data?.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                        No open alerts.
                      </TableCell>
                    </TableRow>
                  ) : (
                    alertsQuery.data.data.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="text-sm">
                          {new Date(a.createdAt).toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell className="text-xs">{a.type}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              a.severity === "HIGH"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {a.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{a.title}</div>
                          <div className="text-xs text-muted-foreground max-w-md truncate">
                            {a.message}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => resolveAlertMutation.mutate(a.id)}
                          >
                            Resolve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {(alertsQuery.data?.meta?.totalPages ?? 1) > 1 && (
                <div className="flex justify-between text-sm">
                  <span>
                    Page {alertsQuery.data?.meta.page} of{" "}
                    {alertsQuery.data?.meta.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={alertsPage <= 1}
                      onClick={() => setAlertsPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        alertsPage >= (alertsQuery.data?.meta.totalPages ?? 1)
                      }
                      onClick={() => setAlertsPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Security;
