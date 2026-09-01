import type { Prisma } from "@prisma/client";
import { AppError } from "../../middlewares/error.middleware";
import { buildMeta } from "../../utils/pagination";
import type { AuthUser } from "../auth/auth.types";
import { BillingRepository } from "./billing.repository";
import type {
  ListPlansQuery,
  CreatePlanInput,
  UpdatePlanInput,
  CreateSubscriptionInput,
  UpdateSubscriptionInput,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesQuery,
} from "./billing.validation";

export const BillingService = {
  async listPlans(query: ListPlansQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await BillingRepository.findPlans({
      search: query.search,
      status: query.status,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },

  async createPlan(input: CreatePlanInput) {
    const existing = await BillingRepository.findPlans({ skip: 0, take: 1 });
    void existing;
    return BillingRepository.createPlan({
      name: input.name,
      code: input.code,
      price: input.price,
      billingCycle: input.billingCycle,
      features: input.features as Prisma.InputJsonValue | undefined,
    });
  },

  async updatePlan(id: string, input: UpdatePlanInput) {
    const plan = await BillingRepository.findPlanById(id);
    if (!plan) throw new AppError("Billing plan not found", 404);
    return BillingRepository.updatePlan(id, {
      ...input,
      features: input.features as Prisma.InputJsonValue | undefined,
    });
  },

  async getSubscription(currentUser: AuthUser) {
    const sub = await BillingRepository.findSubscription(currentUser.instituteId);
    const plans = await BillingRepository.findPlans({ skip: 0, take: 50 });
    return { subscription: sub, availablePlans: plans.data };
  },

  async createSubscription(currentUser: AuthUser, input: CreateSubscriptionInput) {
    const plan = await BillingRepository.findPlanById(input.billingPlanId);
    if (!plan) throw new AppError("Billing plan not found", 404);

    const existing = await BillingRepository.findSubscription(currentUser.instituteId);
    if (existing) {
      await BillingRepository.updateSubscription(existing.id, currentUser.instituteId, {
        status: "CANCELLED",
      });
    }

    return BillingRepository.createSubscription({
      institute: { connect: { id: currentUser.instituteId } },
      billingPlan: { connect: { id: input.billingPlanId } },
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      autoRenew: input.autoRenew ?? true,
    });
  },

  async updateSubscription(currentUser: AuthUser, id: string, input: UpdateSubscriptionInput) {
    const sub = await BillingRepository.updateSubscription(id, currentUser.instituteId, {
      ...(input.billingPlanId ? { billingPlan: { connect: { id: input.billingPlanId } } } : {}),
      status: input.status,
      endDate: input.endDate === null ? null : input.endDate ? new Date(input.endDate) : undefined,
      autoRenew: input.autoRenew,
    });
    if (!sub) throw new AppError("Subscription not found", 404);
    return sub;
  },

  async listInvoices(currentUser: AuthUser, query: ListInvoicesQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { total, data } = await BillingRepository.findInvoices(currentUser.instituteId, {
      status: query.status,
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, meta: buildMeta(total, page, limit) };
  },

  async createInvoice(currentUser: AuthUser, input: CreateInvoiceInput) {
    const taxAmount = input.taxAmount ?? 0;
    const totalAmount = input.amount + taxAmount;
    const invoiceNo = await BillingRepository.generateInvoiceNo();

    return BillingRepository.createInvoice({
      institute: { connect: { id: currentUser.instituteId } },
      ...(input.subscriptionId
        ? { subscription: { connect: { id: input.subscriptionId } } }
        : {}),
      invoiceNo,
      amount: input.amount,
      taxAmount,
      totalAmount,
      dueDate: new Date(input.dueDate),
      notes: input.notes,
    });
  },

  async updateInvoice(currentUser: AuthUser, id: string, input: UpdateInvoiceInput) {
    const invoice = await BillingRepository.updateInvoice(id, currentUser.instituteId, {
      status: input.status,
      paidAt: input.paidAt === null ? null : input.paidAt ? new Date(input.paidAt) : undefined,
      notes: input.notes,
    });
    if (!invoice) throw new AppError("Invoice not found", 404);
    return invoice;
  },
};
