import React, { useMemo, useRef, useState } from "react";
import { Loader2, AlertCircle, Save, Upload, Trash2, ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import {
  emptyOrganizationForm,
  organizationContextToForm,
  useAdministrationOrganization,
  useOrganization,
  useUpdateOrganization,
  useUploadOrganizationLogo,
  type OrganizationFormState,
} from "@/hooks/useOrganizationContext";
import { formatCurrency } from "@/utils/format";
import { formatOrganizationDate } from "@/utils/date";
import { PageContainer, PageHeader } from "@/components/layout";
import { sanitizeMobileInput } from "@/utils/validation";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

const errorMessage = (err: unknown, fallback: string): string =>
  (err as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

export const Organization: React.FC = () => {
  const { updateOrganizationContext } = useOrganization();
  const { data, isLoading, isError, refetch } = useAdministrationOrganization();
  const updateMutation = useUpdateOrganization();

  const serverForm = useMemo(
    () => (data ? organizationContextToForm(data) : emptyOrganizationForm),
    [data]
  );
  const [draft, setDraft] = useState<OrganizationFormState | null>(null);
  const uploadLogo = useUploadOrganizationLogo();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const form = draft ?? serverForm;

  const setField =
    (key: keyof OrganizationFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDraft((prev) => ({ ...(prev ?? serverForm), [key]: e.target.value }));
    };

  const setLogoUrl = (logoUrl: string) =>
    setDraft((prev) => ({ ...(prev ?? serverForm), logoUrl }));

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    uploadLogo.reset();
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("Logo must be an image under 2 MB.");
      return;
    }
    setLogoError(null);
    try {
      setLogoUrl(await uploadLogo.mutateAsync(file));
    } catch (err) {
      setLogoError(errorMessage(err, "Logo upload failed. Please try again."));
    }
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
      <PageContainer maxWidth="narrow">
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
        </div>
      </PageContainer>
    );
  }

  if (isError) {
    return (
      <PageContainer maxWidth="narrow">
        <div className="text-center py-20 text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-2" />
          Failed to load.
          <Button variant="link" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      </PageContainer>
    );
  }

  const previewCurrency = form.currency || "INR";
  const previewDate = formatOrganizationDate(
    new Date(),
    (form.dateFormat as "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD") || "DD/MM/YYYY",
    form.timezone || "Asia/Kolkata"
  );

  return (
    <PageContainer maxWidth="narrow">
      <PageHeader
        title="Organization Settings"
        description="Institute profile and contact information."
      />
      <Card className="border-border/50 rounded-xl">
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
                <Input
                  value={form.phone}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...(prev ?? serverForm),
                      phone: sanitizeMobileInput(e.target.value),
                    }))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit mobile"
                />
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
            <div className="space-y-2">
              <Label htmlFor="organization-logo">Logo</Label>
              <div className="flex items-center gap-4">
                <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-lg border border-border/60 bg-muted/30">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Organization logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    id="organization-logo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    disabled={uploadLogo.isPending}
                    onChange={handleLogoFile}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploadLogo.isPending}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      {uploadLogo.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {form.logoUrl ? "Change logo" : "Upload logo"}
                    </Button>
                    {form.logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        disabled={uploadLogo.isPending}
                        onClick={() => setLogoUrl("")}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">PNG, JPG, WEBP or GIF, up to 2 MB.</p>
                  {logoError && <p className="text-xs text-red-600">{logoError}</p>}
                </div>
              </div>
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
            <PermissionGate itemKey="admin.organization" mode="write">
            <Button
              type="submit"
              className="bg-[#2563EB] text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save Changes
            </Button>
            </PermissionGate>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
};
