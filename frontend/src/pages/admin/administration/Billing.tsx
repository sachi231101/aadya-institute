import React from "react";
import { CreditCard, Loader2, AlertCircle, CheckCircle2, Users, Building2, GraduationCap } from "lucide-react";
import {
  useBillingSubscription,
  useBillingInvoices,
  useCreateSubscription,
  useUpdateInvoice,
  useBillingUsage,
} from "@/hooks/useBilling";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function UsageMeter({
  label,
  icon: Icon,
  used,
  limit,
}: {
  label: string;
  icon: React.ElementType;
  used: number;
  limit: number | null;
}) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : null;
  return (
    <div className="border rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-[#1769AA]" />
        {label}
      </div>
      <p className="text-2xl font-extrabold">
        {used.toLocaleString("en-IN")}
        {limit != null && (
          <span className="text-sm font-normal text-text-secondary"> / {limit.toLocaleString("en-IN")}</span>
        )}
      </p>
      {pct != null && (
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-[#1769AA] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {limit == null && <p className="text-xs text-text-secondary">No plan limit configured</p>}
    </div>
  );
}

export const Billing: React.FC = () => {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.roles?.includes("SUPER_ADMIN") ?? false;

  const { data: subData, isLoading: subLoading, isError: subError, refetch: refetchSub } = useBillingSubscription();
  const { data: invoicesData, isLoading: invLoading, refetch: refetchInv } = useBillingInvoices();
  const { data: usageData, isLoading: usageLoading, refetch: refetchUsage } = useBillingUsage();
  const createSubMutation = useCreateSubscription();
  const updateInvoiceMutation = useUpdateInvoice();

  const subscription = subData?.data?.subscription;
  const availablePlans = subData?.data?.availablePlans || [];
  const invoices = invoicesData?.data?.data || invoicesData?.data || [];
  const usage = usageData?.data?.usage;
  const limits = usageData?.data?.limits;

  const handleSubscribe = async (planId: string) => {
    try {
      await createSubMutation.mutateAsync({ billingPlanId: planId });
      refetchSub();
      refetchUsage();
    } catch {
      alert("Failed to update subscription");
    }
  };

  const handleMarkPaid = async (invoiceId: string) => {
    try {
      await updateInvoiceMutation.mutateAsync({
        id: invoiceId,
        data: { status: "PAID", paidAt: new Date().toISOString() },
      });
      refetchInv();
    } catch {
      alert("Failed to update invoice");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">My Subscription</h2>
        <p className="text-sm text-text-secondary">View your institute plan, usage, and invoices.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Current Subscription
          </h3>
          {subLoading ? (
            <div className="py-6 text-center">
              <Loader2 className="w-5 h-5 animate-spin inline" />
            </div>
          ) : subError ? (
            <div className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Failed to load subscription.{" "}
              <Button variant="link" onClick={() => refetchSub()}>
                Retry
              </Button>
            </div>
          ) : subscription ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-secondary">Plan</p>
                <p className="font-bold">{subscription.billingPlan?.name}</p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Price</p>
                <p className="font-bold">
                  ₹{subscription.billingPlan?.price?.toLocaleString("en-IN")}/
                  {subscription.billingPlan?.billingCycle?.toLowerCase()}
                </p>
              </div>
              <div>
                <p className="text-xs text-text-secondary">Status</p>
                <Badge variant="outline">{subscription.status}</Badge>
              </div>
            </div>
          ) : (
            <p className="text-text-secondary">No active subscription.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Usage</h3>
            {usageLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          </div>
          {usage ? (
            <div className="grid md:grid-cols-3 gap-4">
              <UsageMeter label="Students" icon={GraduationCap} used={usage.students ?? 0} limit={limits?.students ?? null} />
              <UsageMeter label="Branches" icon={Building2} used={usage.branches ?? 0} limit={limits?.branches ?? null} />
              <UsageMeter label="Users" icon={Users} used={usage.users ?? 0} limit={limits?.users ?? null} />
            </div>
          ) : (
            <p className="text-sm text-text-secondary">
              Unable to load usage.{" "}
              <Button variant="link" className="h-auto p-0" onClick={() => refetchUsage()}>
                Retry
              </Button>
            </p>
          )}
        </CardContent>
      </Card>

      {isSuperAdmin && (
        <Card className="border-border/50">
          <CardContent className="p-6">
            <h3 className="font-bold mb-4">Available Plans</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {availablePlans.map(
                (plan: { id: string; name: string; price: number; billingCycle: string; code: string }) => (
                  <div key={plan.id} className="border rounded-xl p-4 space-y-2">
                    <p className="font-bold">{plan.name}</p>
                    <p className="text-2xl font-extrabold text-[#1769AA]">
                      ₹{plan.price.toLocaleString("en-IN")}
                      <span className="text-xs font-normal text-text-secondary">
                        /{plan.billingCycle?.toLowerCase()}
                      </span>
                    </p>
                    <Button
                      size="sm"
                      className="w-full bg-[#1769AA] text-white"
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={createSubMutation.isPending}
                    >
                      {subscription?.billingPlanId === plan.id ? "Current Plan" : "Select Plan"}
                    </Button>
                  </div>
                )
              )}
              {availablePlans.length === 0 && (
                <p className="text-text-secondary col-span-3">No billing plans configured yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border/50">
        <CardContent className="p-6">
          <h3 className="font-bold mb-4">Invoices</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                {isSuperAdmin && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {invLoading ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </TableCell>
                </TableRow>
              ) : !Array.isArray(invoices) || invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isSuperAdmin ? 5 : 4} className="text-center py-8 text-text-secondary">
                    No invoices yet.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map(
                  (inv: { id: string; invoiceNo: string; totalAmount: number; dueDate: string; status: string }) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono">{inv.invoiceNo}</TableCell>
                      <TableCell className="font-bold">₹{inv.totalAmount?.toLocaleString("en-IN")}</TableCell>
                      <TableCell>{new Date(inv.dueDate).toLocaleDateString("en-IN")}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === "PAID" ? "default" : "outline"}>{inv.status}</Badge>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell>
                          {inv.status !== "PAID" && (
                            <Button size="sm" variant="outline" onClick={() => handleMarkPaid(inv.id)}>
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Paid
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                )
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
