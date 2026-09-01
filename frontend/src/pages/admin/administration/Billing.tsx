import React, { useState } from "react";
import { CreditCard, Loader2, AlertCircle, Plus, CheckCircle2 } from "lucide-react";
import {
  useBillingPlans,
  useBillingSubscription,
  useBillingInvoices,
  useCreateSubscription,
  useUpdateInvoice,
} from "@/hooks/useBilling";
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

export const Billing: React.FC = () => {
  const { data: subData, isLoading: subLoading, isError: subError, refetch: refetchSub } = useBillingSubscription();
  const { data: invoicesData, isLoading: invLoading, refetch: refetchInv } = useBillingInvoices();
  const createSubMutation = useCreateSubscription();
  const updateInvoiceMutation = useUpdateInvoice();

  const subscription = subData?.data?.subscription;
  const availablePlans = subData?.data?.availablePlans || [];
  const invoices = invoicesData?.data?.data || invoicesData?.data || [];

  const handleSubscribe = async (planId: string) => {
    try {
      await createSubMutation.mutateAsync({ billingPlanId: planId });
      refetchSub();
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
        <h2 className="text-2xl font-bold text-text-primary">Subscription & Billing</h2>
        <p className="text-sm text-text-secondary">Manage institute subscription plan and invoices.</p>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5" /> Current Subscription</h3>
          {subLoading ? (
            <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
          ) : subError ? (
            <div className="text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Failed to load subscription. <Button variant="link" onClick={() => refetchSub()}>Retry</Button></div>
          ) : subscription ? (
            <div className="grid md:grid-cols-3 gap-4">
              <div><p className="text-xs text-text-secondary">Plan</p><p className="font-bold">{subscription.billingPlan?.name}</p></div>
              <div><p className="text-xs text-text-secondary">Price</p><p className="font-bold">₹{subscription.billingPlan?.price?.toLocaleString("en-IN")}/{subscription.billingPlan?.billingCycle?.toLowerCase()}</p></div>
              <div><p className="text-xs text-text-secondary">Status</p><Badge variant="outline">{subscription.status}</Badge></div>
            </div>
          ) : (
            <p className="text-text-secondary">No active subscription. Select a plan below.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <h3 className="font-bold mb-4">Available Plans</h3>
          <div className="grid md:grid-cols-3 gap-4">
            {availablePlans.map((plan: { id: string; name: string; price: number; billingCycle: string; code: string }) => (
              <div key={plan.id} className="border rounded-xl p-4 space-y-2">
                <p className="font-bold">{plan.name}</p>
                <p className="text-2xl font-extrabold text-[#1769AA]">₹{plan.price.toLocaleString("en-IN")}<span className="text-xs font-normal text-text-secondary">/{plan.billingCycle?.toLowerCase()}</span></p>
                <Button size="sm" className="w-full bg-[#1769AA] text-white" onClick={() => handleSubscribe(plan.id)} disabled={createSubMutation.isPending}>
                  {subscription?.billingPlanId === plan.id ? "Current Plan" : "Select Plan"}
                </Button>
              </div>
            ))}
            {availablePlans.length === 0 && <p className="text-text-secondary col-span-3">No billing plans configured yet.</p>}
          </div>
        </CardContent>
      </Card>

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
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invLoading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></TableCell></TableRow>
              ) : !Array.isArray(invoices) || invoices.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-text-secondary">No invoices yet.</TableCell></TableRow>
              ) : (
                invoices.map((inv: { id: string; invoiceNo: string; totalAmount: number; dueDate: string; status: string }) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono">{inv.invoiceNo}</TableCell>
                    <TableCell className="font-bold">₹{inv.totalAmount?.toLocaleString("en-IN")}</TableCell>
                    <TableCell>{new Date(inv.dueDate).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell><Badge variant={inv.status === "PAID" ? "default" : "outline"}>{inv.status}</Badge></TableCell>
                    <TableCell>
                      {inv.status !== "PAID" && (
                        <Button size="sm" variant="outline" onClick={() => handleMarkPaid(inv.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Mark Paid
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
