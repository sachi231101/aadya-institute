import { prisma } from "../../config/database";
import type { Prisma, Status, InvoiceStatus, SubscriptionStatus } from "@prisma/client";

export const BillingRepository = {
  async findPlans(params: { search?: string; status?: Status; skip: number; take: number }) {
    const where: Prisma.BillingPlanWhereInput = {
      ...(params.status ? { status: params.status } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { code: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };
    const [total, data] = await Promise.all([
      prisma.billingPlan.count({ where }),
      prisma.billingPlan.findMany({ where, orderBy: { name: "asc" }, skip: params.skip, take: params.take }),
    ]);
    return { total, data };
  },

  async findPlanById(id: string) {
    return prisma.billingPlan.findUnique({ where: { id } });
  },

  async createPlan(data: Prisma.BillingPlanCreateInput) {
    return prisma.billingPlan.create({ data });
  },

  async updatePlan(id: string, data: Prisma.BillingPlanUpdateInput) {
    return prisma.billingPlan.update({ where: { id }, data });
  },

  async findSubscription(instituteId: string) {
    return prisma.subscription.findFirst({
      where: { instituteId, status: "ACTIVE" },
      include: { billingPlan: true, invoices: { orderBy: { createdAt: "desc" }, take: 10 } },
      orderBy: { createdAt: "desc" },
    });
  },

  async findSubscriptions(instituteId: string) {
    return prisma.subscription.findMany({
      where: { instituteId },
      include: { billingPlan: true },
      orderBy: { createdAt: "desc" },
    });
  },

  async createSubscription(data: Prisma.SubscriptionCreateInput) {
    return prisma.subscription.create({ data, include: { billingPlan: true } });
  },

  async updateSubscription(id: string, instituteId: string, data: Prisma.SubscriptionUpdateInput) {
    await prisma.subscription.updateMany({ where: { id, instituteId }, data });
    return prisma.subscription.findFirst({ where: { id, instituteId }, include: { billingPlan: true } });
  },

  async findInvoices(instituteId: string, params: { status?: InvoiceStatus; skip: number; take: number }) {
    const where: Prisma.InvoiceWhereInput = {
      instituteId,
      ...(params.status ? { status: params.status } : {}),
    };
    const [total, data] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findMany({
        where,
        include: { subscription: { include: { billingPlan: true } } },
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
      }),
    ]);
    return { total, data };
  },

  async createInvoice(data: Prisma.InvoiceCreateInput) {
    return prisma.invoice.create({ data });
  },

  async updateInvoice(id: string, instituteId: string, data: Prisma.InvoiceUpdateInput) {
    await prisma.invoice.updateMany({ where: { id, instituteId }, data });
    return prisma.invoice.findFirst({ where: { id, instituteId } });
  },

  async generateInvoiceNo() {
    const count = await prisma.invoice.count();
    const year = new Date().getFullYear();
    return `INV-${year}-${String(count + 1).padStart(5, "0")}`;
  },
};
