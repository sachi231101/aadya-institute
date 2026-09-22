import React from "react";
import { Link } from "react-router-dom";
import { Award, FileText, Receipt } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROUTES } from "@/constants/routes";
import { CANVAS_SLUGS, CANVAS_DOCUMENTS } from "./document-canvas.catalog";

const ICONS = {
  receipt: Receipt,
  invoice: FileText,
  certificate: Award,
} as const;

export const CanvasHome: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="Canvas"
        description="Design how receipts, invoices, and certificates look. Each document keeps its own layout."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {CANVAS_SLUGS.map((slug) => {
          const doc = CANVAS_DOCUMENTS[slug];
          const Icon = ICONS[slug];
          return (
            <Link key={slug} to={ROUTES.ADMIN.ADMINISTRATION.canvas(slug)} className="group">
              <Card className="h-full border-border/60 transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle>{doc.title}</CardTitle>
                  <CardDescription>{doc.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm font-medium text-primary">Edit design</span>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
};
