import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertCircle, Save } from "lucide-react";
import { api } from "@/services/api";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type OrgFormState = {
  name: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  gstNumber: string;
  timezone: string;
  currency: string;
  dateFormat: string;
  logoUrl: string;
};

const emptyForm: OrgFormState = {
  name: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  gstNumber: "",
  timezone: "",
  currency: "",
  dateFormat: "",
  logoUrl: "",
};

export const Organization: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["administration", "organization"],
    queryFn: async () => {
      const res = await api.get("/administration/organization");
      return res.data.data;
    },
  });

  const [form, setForm] = useState<OrgFormState>(emptyForm);

  React.useEffect(() => {
    if (data) {
      setForm({
        name: data.name || "",
        email: data.email || "",
        phone: data.phone || "",
        address: data.address || "",
        website: data.website || "",
        city: data.city || "",
        state: data.state || "",
        country: data.country || "",
        postalCode: data.postalCode || "",
        gstNumber: data.gstNumber || "",
        timezone: data.timezone || "",
        currency: data.currency || "",
        dateFormat: data.dateFormat || "",
        logoUrl: data.logoUrl || "",
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: OrgFormState) => {
      const res = await api.patch("/administration/organization", payload);
      return res.data;
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["administration", "organization"] }),
  });

  const setField = (key: keyof OrgFormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync(form);
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
