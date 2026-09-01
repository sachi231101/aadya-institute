import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building, Loader2, AlertCircle, Save } from "lucide-react";
import { api } from "@/services/api";
import { useAuthStore } from "@/store/auth.store";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export const Organization: React.FC = () => {
  const queryClient = useQueryClient();
  const instituteId = useAuthStore((s) => s.user?.instituteId);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["institutes", instituteId],
    queryFn: async () => {
      const res = await api.get(`/institutes/${instituteId}`);
      return res.data.data;
    },
    enabled: !!instituteId,
  });

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  React.useEffect(() => {
    if (data) {
      setName(data.name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setAddress(data.address || "");
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Record<string, string>) => {
      const res = await api.patch(`/institutes/${instituteId}`, payload);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["institutes"] }),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateMutation.mutateAsync({ name, email, phone, address });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-[#1769AA]" /></div>;
  if (isError) return <div className="text-center py-20 text-red-600"><AlertCircle className="w-8 h-8 mx-auto mb-2" />Failed to load.<Button variant="link" onClick={() => refetch()}>Retry</Button></div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-text-primary">Organization Settings</h2>
        <p className="text-sm text-text-secondary">Institute profile and contact information.</p>
      </div>
      <Card className="border-border/50">
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Institute Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label>Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} /></div>
            <Button type="submit" className="bg-[#1769AA] text-white" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
