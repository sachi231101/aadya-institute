import React, { useMemo, useState } from "react";
import { Loader2, AlertCircle, Save } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  emptyOrganizationForm,
  organizationContextToForm,
  useAdministrationOrganization,
  useOrganization,
  useUpdateOrganization,
  type OrganizationFormState,
} from "@/hooks/useOrganizationContext";
import { formatCurrency } from "@/utils/format";
import { formatOrganizationDate } from "@/utils/date";

export const Organization: React.FC = () => {
  const { updateOrganizationContext } = useOrganization();
  const { data, isLoading, isError, refetch } = useAdministrationOrganization();
  const updateMutation = useUpdateOrganization();

  const serverForm = useMemo(
    () => (data ? organizationContextToForm(data) : emptyOrganizationForm),
    [data]
  );
  const [draft, setDraft] = useState<OrganizationFormState | null>(null);
  const form = draft ?? serverForm;

  const setField =
    (key: keyof OrganizationFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({ ...(prev ?? serverForm), [key]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateMutation.mutateAsync({
      ...form,
      dateFormat: (form.dateFormat || undefined) as
        | "DD/MM/YYYY"
        | "MM/DD/YYYY"
        | "YYYY-MM-DD"
        | ""
        | undefined,
    });
    updateOrganizationContext(updated);
    setDraft(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-20 text-red-600">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        Failed to load.
        <Button variant="link" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const previewCurrency = form.currency || "INR";
  const previewDate = formatOrganizationDate(
    new Date(),
    (form.dateFormat as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD") || "DD/MM/YYYY",
    form.timezone || "Asia/Kolkata"
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Organization Settings</h2>
        <p className="text-sm text-text-secondary">Institute profile and contact information.</p>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Institute Name</Label>
              <Input value={form.name} onChange={setField("name")} required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={setField("email")} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={setField("phone")} />
              </div>
            </div>
            <div>
              <Label>Website</Label>
              <Input
                type="url"
                placeholder="https://"
                value={form.website}
                onChange={setField("website")}
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={setField("address")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={setField("city")} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={setField("state")} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Country</Label>
                <Input value={form.country} onChange={setField("country")} />
              </div>
              <div>
                <Label>Postal Code</Label>
                <Input value={form.postalCode} onChange={setField("postalCode")} />
              </div>
            </div>
            <div>
              <Label>GST Number</Label>
              <Input value={form.gstNumber} onChange={setField("gstNumber")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Timezone</Label>
                <Input
                  placeholder="Asia/Kolkata"
                  value={form.timezone}
                  onChange={setField("timezone")}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <Input placeholder="INR" value={form.currency} onChange={setField("currency")} />
              </div>
              <div>
                <Label>Date Format</Label>
                <Input
                  placeholder="DD/MM/YYYY"
                  value={form.dateFormat}
                  onChange={setField("dateFormat")}
                />
              </div>
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input
                type="url"
                placeholder="https://"
                value={form.logoUrl}
                onChange={setField("logoUrl")}
              />
            </div>

            <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground space-y-1">
              <p>
                Preview currency:{" "}
                <span className="font-semibold text-foreground">
                  {formatCurrency(12500, previewCurrency)}
                </span>
              </p>
              <p>
                Preview date:{" "}
                <span className="font-semibold text-foreground">{previewDate}</span>
              </p>
            </div>

            {updateMutation.isError && (
              <p className="text-sm text-red-600">Failed to save. Please try again.</p>
            )}
            {updateMutation.isSuccess && (
              <p className="text-sm text-green-600">Organization updated successfully.</p>
            )}
            <Button
              type="submit"
              className="bg-[#1769AA] text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
