import { prisma } from "../../config/database";
import { logger } from "../../config/logger";
import { applyFifoSameHeadOnly, derivePendingStatus, startOfDay } from "./fee-balance.util";
import { roundMoney, toMoneyNumber } from "./fee-money.util";
import {
  linkAllocationToInvoice,
  syncInvoicesForPendingFeeIds,
} from "./fee-invoice.service";
import { resolveTuitionFeeHead } from "./fee-provision.service";
import {
  isApplicationFeePayment,
  materializeApplicationFeeCharge,
} from "../admissions/application-fee-payment.service";

const repairedInstitutes = new Set<string>();

/**
 * Legacy provision stored the full fee-head total on every installment row's
 * `totalFee`. Modern provision stores each installment's own amount in totalFee.
 * Only trim when legacy duplication is detected — never cap modern installment totals.
 */
async function repairInflatedInstallmentGroups(instituteId: string): Promise<number> {
  const rows = await prisma.pendingFee.findMany({
    where: { instituteId },
    include: { feeHeadMaster: { select: { code: true } } },
    orderBy: [{ studentId: "asc" }, { feeHeadMasterId: "asc" }, { installmentNo: "asc" }],
  });

  type Group = {
    rows: Array<{
      id: string;
      amountPaid: number;
      dueAmount: number;
      totalFee: number;
      dueDate: Date;
      installmentNo: number;
    }>;
  };

  const groups = new Map<string, Group>();
  for (const row of rows) {
    if (!row.studentId) continue;
    // Application fee is a one-shot charge — never treat as multi-installment package.
    if (
      row.feeHeadMaster?.code === "APPLICATION_FEE" ||
      /application\s*fee/i.test(row.feeHead || "")
    ) {
      continue;
    }
    const key = `${row.studentId}::${row.feeHeadMasterId || row.feeHead || "none"}`;
    const existing = groups.get(key) || { rows: [] };
    existing.rows.push({
      id: row.id,
      amountPaid: toMoneyNumber(row.amountPaid),
      dueAmount: toMoneyNumber(row.dueAmount),
      totalFee: toMoneyNumber(row.totalFee),
      dueDate: row.dueDate,
      installmentNo: row.installmentNo,
    });
    groups.set(key, existing);
  }

  let fixed = 0;
  const today = startOfDay();

  for (const [, group] of groups) {
    if (group.rows.length < 2) continue;

    const obligation = roundMoney(
      group.rows.reduce((s, r) => s + r.amountPaid + Math.max(0, r.dueAmount), 0)
    );
    const maxStored = Math.max(...group.rows.map((r) => r.totalFee), 0);
    const sumStored = roundMoney(group.rows.reduce((s, r) => s + Math.max(0, r.totalFee), 0));
    const allIdentical =
      maxStored > 0 &&
      group.rows.every((r) => Math.abs(r.totalFee - maxStored) <= 0.009);

    // Legacy duplication: every installment stored the full head total (identical
    // totalFee), so sum(totalFee) exceeds the real obligation. Modern rows store
    // per-installment amounts where sum(totalFee) ≈ obligation.
    const isLegacyDuplicated =
      allIdentical && sumStored > obligation + 0.009 && sumStored > maxStored + 0.009;

    if (!isLegacyDuplicated) continue;

    const headTotal = maxStored;
    let excess = roundMoney(obligation - headTotal);
    if (excess <= 0.009) continue;

    const ordered = [...group.rows].sort((a, b) => a.installmentNo - b.installmentNo);
    for (const row of ordered) {
      if (excess <= 0.009) break;
      if (row.dueAmount <= 0) continue;
      const cut = roundMoney(Math.min(row.dueAmount, excess));
      if (cut <= 0) continue;
      const dueAmount = roundMoney(row.dueAmount - cut);
      const status = derivePendingStatus(dueAmount, row.dueDate, row.amountPaid, today);
      await prisma.pendingFee.update({
        where: { id: row.id },
        data: {
          dueAmount,
          status,
          overdueDays: 0,
          totalFee: roundMoney(row.amountPaid + dueAmount),
        },
      });
      excess = roundMoney(excess - cut);
      fixed += 1;
    }
  }

  return fixed;
}

/**
 * When Tuition head was missing, course charges were wrongly stored under
 * Application Fee. Retag down-payment / installment rows to the tuition head
 * and restore zeroed remaining installments from the course fee.
 */
async function repairCourseFeesTaggedAsApplicationFee(instituteId: string): Promise<number> {
  const appHead = await prisma.masterRecord.findFirst({
    where: {
      instituteId,
      entityType: "feeheads",
      OR: [
        { code: "APPLICATION_FEE" },
        { name: { equals: "Application Fee", mode: "insensitive" } },
      ],
      status: "ACTIVE",
    },
    orderBy: { createdAt: "asc" },
  });
  if (!appHead) return 0;

  const tuition = await resolveTuitionFeeHead(prisma, instituteId);
  if (tuition.id === appHead.id) return 0;

  const badPayments = await prisma.payment.findMany({
    where: {
      instituteId,
      status: "SUCCESS",
      feeHeadMasterId: appHead.id,
      OR: [
        { notes: { contains: "down payment", mode: "insensitive" } },
        { notes: { startsWith: "Initial" } },
        { notes: { contains: "Initial /", mode: "insensitive" } },
      ],
    },
    include: {
      allocations: { select: { pendingFeeId: true } },
    },
  });

  let fixed = 0;
  const touchedAdmissionIds = new Set<string>();
  const today = startOfDay();

  for (const payment of badPayments) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        feeHeadMasterId: tuition.id,
        feeHead: tuition.name,
      },
    });
    fixed += 1;

    for (const alloc of payment.allocations) {
      const pending = await prisma.pendingFee.findFirst({
        where: { id: alloc.pendingFeeId, instituteId },
        select: { id: true, admissionId: true, feeHeadMasterId: true },
      });
      if (!pending) continue;
      if (pending.feeHeadMasterId === appHead.id) {
        await prisma.pendingFee.update({
          where: { id: pending.id },
          data: {
            feeHeadMasterId: tuition.id,
            feeHead: tuition.name,
          },
        });
        fixed += 1;
      }
      if (pending.admissionId) touchedAdmissionIds.add(pending.admissionId);
    }

    if (payment.admissionId) touchedAdmissionIds.add(payment.admissionId);
  }

  // Sibling installments still on Application Fee (e.g. zeroed inst #2)
  const siblingRows = await prisma.pendingFee.findMany({
    where: {
      instituteId,
      feeHeadMasterId: appHead.id,
      installmentNo: { gt: 1 },
      admissionId: { not: null },
    },
  });

  for (const row of siblingRows) {
    if (!row.admissionId) continue;
    const hasTuitionSibling = await prisma.pendingFee.findFirst({
      where: {
        instituteId,
        admissionId: row.admissionId,
        feeHeadMasterId: tuition.id,
        installmentNo: 1,
      },
      select: { id: true },
    });
    if (!hasTuitionSibling) continue;

    await prisma.pendingFee.update({
      where: { id: row.id },
      data: {
        feeHeadMasterId: tuition.id,
        feeHead: tuition.name,
      },
    });
    touchedAdmissionIds.add(row.admissionId);
    fixed += 1;
  }

  // Restore remaining course due from course.fee when installments were wiped
  for (const admissionId of touchedAdmissionIds) {
    const admission = await prisma.admission.findFirst({
      where: { id: admissionId, instituteId },
      include: {
        course: { select: { fee: true, name: true } },
        student: {
          include: { user: { select: { name: true, phone: true } } },
        },
      },
    });
    if (!admission?.course) continue;

    const courseFee = toMoneyNumber(admission.course.fee);
    if (courseFee <= 0) continue;

    const tuitionRows = await prisma.pendingFee.findMany({
      where: {
        instituteId,
        admissionId,
        feeHeadMasterId: tuition.id,
      },
      orderBy: { installmentNo: "asc" },
    });
    if (tuitionRows.length === 0) continue;

    const charged = roundMoney(
      tuitionRows.reduce(
        (s, r) => s + toMoneyNumber(r.amountPaid) + Math.max(0, toMoneyNumber(r.dueAmount)),
        0
      )
    );
    const gap = roundMoney(courseFee - charged);
    if (gap <= 0.009) continue;

    const zeroed = tuitionRows.find(
      (r) =>
        r.installmentNo > 1 &&
        toMoneyNumber(r.totalFee) <= 0.009 &&
        toMoneyNumber(r.dueAmount) <= 0.009 &&
        toMoneyNumber(r.amountPaid) <= 0.009
    );

    if (zeroed) {
      await prisma.pendingFee.update({
        where: { id: zeroed.id },
        data: {
          totalFee: gap,
          amountPaid: 0,
          dueAmount: gap,
          status: derivePendingStatus(gap, zeroed.dueDate, 0, today),
          overdueDays: 0,
          feeHeadMasterId: tuition.id,
          feeHead: tuition.name,
        },
      });
      await syncInvoicesForPendingFeeIds(prisma as never, [zeroed.id]);
      fixed += 1;
      logger.info("Restored zeroed course installment", {
        instituteId,
        admissionId,
        pendingFeeId: zeroed.id,
        amount: gap,
      });
      continue;
    }

    // No zeroed sibling — create the missing remaining installment
    const maxInst = Math.max(...tuitionRows.map((r) => r.installmentNo), 1);
    const template = tuitionRows[0];
    const dueDate = new Date(template.dueDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const created = await prisma.pendingFee.create({
      data: {
        instituteId,
        branchId: template.branchId,
        studentId: template.studentId,
        admissionId,
        studentName:
          admission.student?.user?.name || template.studentName || "Student",
        admissionNo: admission.admissionNo || template.admissionNo,
        phone: admission.student?.user?.phone || template.phone || "",
        courseName: admission.course.name || template.courseName,
        totalFee: gap,
        amountPaid: 0,
        dueAmount: gap,
        dueDate,
        installmentNo: maxInst + 1,
        status: derivePendingStatus(gap, dueDate, 0, today),
        overdueDays: 0,
        feeHeadMasterId: tuition.id,
        feeHead: tuition.name,
      },
    });
    await syncInvoicesForPendingFeeIds(prisma as never, [created.id]);
    fixed += 1;
    logger.info("Created missing course installment", {
      instituteId,
      admissionId,
      pendingFeeId: created.id,
      amount: gap,
    });
  }

  // Sync invoices for retagged tuition rows
  if (touchedAdmissionIds.size > 0) {
    const tuitionIds = await prisma.pendingFee.findMany({
      where: {
        instituteId,
        admissionId: { in: [...touchedAdmissionIds] },
        feeHeadMasterId: tuition.id,
      },
      select: { id: true },
    });
    await syncInvoicesForPendingFeeIds(
      prisma as never,
      tuitionIds.map((r) => r.id)
    ).catch(() => undefined);
  }

  if (fixed > 0) {
    logger.info("Repaired course fees tagged as application fee", {
      instituteId,
      fixed,
      admissions: touchedAdmissionIds.size,
    });
  }

  return fixed;
}

/**
 * After a bad inflated-installment trim, remaining tuition rows can be left at
 * totalFee/due/paid = 0 while course.fee is still higher. Restore the gap onto
 * zeroed installments (or create a new installment) per admission.
 */
async function repairWipedTuitionInstallments(instituteId: string): Promise<number> {
  const tuition = await resolveTuitionFeeHead(prisma, instituteId);
  const today = startOfDay();

  const admissions = await prisma.admission.findMany({
    where: {
      instituteId,
      status: { not: "CANCELLED" },
    },
    include: {
      course: { select: { fee: true, name: true } },
      student: {
        include: { user: { select: { name: true, phone: true } } },
      },
    },
  });

  let fixed = 0;

  for (const admission of admissions) {
    if (!admission.course) continue;
    const courseFee = toMoneyNumber(admission.course.fee);
    if (courseFee <= 0) continue;

    const tuitionRows = await prisma.pendingFee.findMany({
      where: {
        instituteId,
        admissionId: admission.id,
        feeHeadMasterId: tuition.id,
      },
      orderBy: { installmentNo: "asc" },
    });
    if (tuitionRows.length === 0) continue;

    const charged = roundMoney(
      tuitionRows.reduce(
        (s, r) => s + toMoneyNumber(r.amountPaid) + Math.max(0, toMoneyNumber(r.dueAmount)),
        0
      )
    );
    let gap = roundMoney(courseFee - charged);
    if (gap <= 0.009) continue;

    const zeroed = tuitionRows.filter(
      (r) =>
        r.installmentNo > 1 &&
        toMoneyNumber(r.totalFee) <= 0.009 &&
        toMoneyNumber(r.dueAmount) <= 0.009 &&
        toMoneyNumber(r.amountPaid) <= 0.009
    );

    const touchedIds: string[] = [];

    if (zeroed.length > 0) {
      // Restore remaining obligation across Installment 2, 3, … (not one course lump).
      let allocated = 0;
      for (let i = 0; i < zeroed.length; i++) {
        const row = zeroed[i];
        const part =
          i === zeroed.length - 1
            ? roundMoney(gap - allocated)
            : Math.floor(gap / zeroed.length);
        if (part <= 0) continue;
        allocated = roundMoney(allocated + part);
        await prisma.pendingFee.update({
          where: { id: row.id },
          data: {
            totalFee: part,
            amountPaid: 0,
            dueAmount: part,
            status: derivePendingStatus(part, row.dueDate, 0, today),
            overdueDays: 0,
            feeHeadMasterId: tuition.id,
            feeHead: tuition.name,
          },
        });
        touchedIds.push(row.id);
        fixed += 1;
      }
      gap = roundMoney(gap - allocated);
    }

    if (gap > 0.009) {
      const maxInst = Math.max(...tuitionRows.map((r) => r.installmentNo), 1);
      const template = tuitionRows[0];
      const dueDate = new Date(template.dueDate);
      dueDate.setDate(dueDate.getDate() + 30 * Math.max(1, maxInst));

      const created = await prisma.pendingFee.create({
        data: {
          instituteId,
          branchId: template.branchId,
          studentId: template.studentId,
          admissionId: admission.id,
          studentName:
            admission.student?.user?.name || template.studentName || "Student",
          admissionNo: admission.admissionNo || template.admissionNo,
          phone: admission.student?.user?.phone || template.phone || "",
          courseName: admission.course.name || template.courseName,
          totalFee: gap,
          amountPaid: 0,
          dueAmount: gap,
          dueDate,
          installmentNo: maxInst + 1,
          status: derivePendingStatus(gap, dueDate, 0, today),
          overdueDays: 0,
          feeHeadMasterId: tuition.id,
          feeHead: tuition.name,
        },
      });
      touchedIds.push(created.id);
      fixed += 1;
      logger.info("Created missing course installment after wipe", {
        instituteId,
        admissionId: admission.id,
        pendingFeeId: created.id,
        amount: gap,
      });
    }

    if (touchedIds.length > 0) {
      await syncInvoicesForPendingFeeIds(prisma as never, touchedIds).catch(() => undefined);
      logger.info("Restored wiped tuition installments", {
        instituteId,
        admissionId: admission.id,
        course: admission.course.name,
        courseFee,
        charged,
        restoredRows: touchedIds.length,
      });
    }
  }

  return fixed;
}

/**
 * Undo “dump remaining onto one installment” repairs: when Installment 1 is
 * paid and later slots exist but only the next one holds all remaining due,
 * re-spread that due evenly across Installment 2, 3, … as whole rupees.
 */
async function redistributeLumpedRemainingInstallments(
  instituteId: string
): Promise<number> {
  const tuition = await resolveTuitionFeeHead(prisma, instituteId);
  const today = startOfDay();

  const admissions = await prisma.admission.findMany({
    where: { instituteId, status: { not: "CANCELLED" } },
    select: { id: true },
  });

  let fixed = 0;

  for (const admission of admissions) {
    const tuitionRows = await prisma.pendingFee.findMany({
      where: {
        instituteId,
        admissionId: admission.id,
        feeHeadMasterId: tuition.id,
      },
      orderBy: { installmentNo: "asc" },
    });
    if (tuitionRows.length < 3) continue;

    const hasPaid = tuitionRows.some((r) => toMoneyNumber(r.amountPaid) > 0.009);
    if (!hasPaid) continue;

    const open = tuitionRows.filter((r) => toMoneyNumber(r.dueAmount) > 0.009);
    if (open.length !== 1) continue;

    const emptyTrail = tuitionRows.filter(
      (r) =>
        r.installmentNo > open[0].installmentNo &&
        toMoneyNumber(r.amountPaid) <= 0.009 &&
        toMoneyNumber(r.dueAmount) <= 0.009
    );
    if (emptyTrail.length === 0) continue;

    const slots = [open[0], ...emptyTrail];
    const totalDue = roundMoney(toMoneyNumber(open[0].dueAmount));
    if (totalDue <= 0.009) continue;

    let allocated = 0;
    const touchedIds: string[] = [];
    for (let i = 0; i < slots.length; i++) {
      const row = slots[i];
      const part =
        i === slots.length - 1
          ? roundMoney(totalDue - allocated)
          : Math.floor(totalDue / slots.length);
      allocated = roundMoney(allocated + part);
      await prisma.pendingFee.update({
        where: { id: row.id },
        data: {
          totalFee: part,
          amountPaid: 0,
          dueAmount: part,
          status: derivePendingStatus(part, row.dueDate, 0, today),
          overdueDays: 0,
          feeHeadMasterId: tuition.id,
          feeHead: tuition.name,
        },
      });
      touchedIds.push(row.id);
      fixed += 1;
    }

    await syncInvoicesForPendingFeeIds(prisma as never, touchedIds).catch(() => undefined);
    logger.info("Redistributed lumped tuition back to installments", {
      instituteId,
      admissionId: admission.id,
      totalDue,
      slots: slots.map((s) => s.installmentNo),
    });
  }

  return fixed;
}

/**
 * Multi-course admission used to create one "Initial / down payment" receipt
 * per course. Merge same-student batches created within a short window into
 * a single receipt (dues stay paid; only payment rows are consolidated).
 */
async function mergeSplitInitialDownPayments(instituteId: string): Promise<number> {
  const payments = await prisma.payment.findMany({
    where: {
      instituteId,
      status: "SUCCESS",
      notes: { contains: "Initial / down payment", mode: "insensitive" },
      studentId: { not: null },
    },
    include: { allocations: true },
    orderBy: [{ studentId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 2000,
  });

  type Pay = (typeof payments)[number];
  const byStudent = new Map<string, Pay[]>();
  for (const p of payments) {
    if (!p.studentId) continue;
    const list = byStudent.get(p.studentId) || [];
    list.push(p);
    byStudent.set(p.studentId, list);
  }

  const WINDOW_MS = 5 * 60 * 1000;
  let merged = 0;

  for (const [, list] of byStudent) {
    if (list.length < 2) continue;

    // Cluster by createdAt proximity
    const clusters: Pay[][] = [];
    let current: Pay[] = [list[0]];
    for (let i = 1; i < list.length; i += 1) {
      const prev = current[current.length - 1];
      const gap = list[i].createdAt.getTime() - prev.createdAt.getTime();
      if (gap <= WINDOW_MS) {
        current.push(list[i]);
      } else {
        clusters.push(current);
        current = [list[i]];
      }
    }
    clusters.push(current);

    for (const cluster of clusters) {
      if (cluster.length < 2) continue;
      const [primary, ...extras] = cluster;
      const extraIds = extras.map((e) => e.id);

      try {
        await prisma.$transaction(async (tx) => {
          let total = toMoneyNumber(primary.amount);
          for (const extra of extras) {
            total = roundMoney(total + toMoneyNumber(extra.amount));
            for (const alloc of extra.allocations) {
              const exists = await tx.paymentAllocation.findFirst({
                where: {
                  paymentId: primary.id,
                  pendingFeeId: alloc.pendingFeeId,
                },
              });
              if (exists) {
                await tx.paymentAllocation.update({
                  where: { id: exists.id },
                  data: {
                    amount: roundMoney(toMoneyNumber(exists.amount) + toMoneyNumber(alloc.amount)),
                  },
                });
                await tx.paymentAllocation.delete({ where: { id: alloc.id } });
              } else {
                await tx.paymentAllocation.update({
                  where: { id: alloc.id },
                  data: { paymentId: primary.id },
                });
              }
            }
            await tx.payment.delete({ where: { id: extra.id } });
          }
          await tx.payment.update({
            where: { id: primary.id },
            data: {
              amount: total,
              notes: "Initial / down payment",
              pendingFeeId: null,
            },
          });
        });
        merged += extras.length;
        logger.info("Merged split initial down-payment receipts", {
          instituteId,
          studentId: primary.studentId,
          keptReceipt: primary.receiptNo,
          removed: extras.map((e) => e.receiptNo),
          totalAmount: toMoneyNumber(primary.amount),
        });
      } catch (err) {
        logger.warn("Failed to merge split down-payment receipts", {
          instituteId,
          studentId: primary.studentId,
          paymentIds: [primary.id, ...extraIds],
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return merged;
}

/**
 * Legacy admissions sometimes created SUCCESS receipts without PaymentAllocation
 * rows, so PendingFee dues never decreased. Allocate those receipts FIFO onto
 * the student's open charge lines (once per process per institute).
 */
export async function repairUnallocatedPayments(instituteId: string): Promise<number> {
  if (repairedInstitutes.has(instituteId)) return 0;

  const inflatedFixed = await repairInflatedInstallmentGroups(instituteId).catch((err) => {
    logger.warn("Failed inflated installment repair", {
      instituteId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  });

  const misattributedFixed = await repairCourseFeesTaggedAsApplicationFee(instituteId).catch(
    (err) => {
      logger.warn("Failed course-as-application-fee repair", {
        instituteId,
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  );

  const wipedFixed = await repairWipedTuitionInstallments(instituteId).catch((err) => {
    logger.warn("Failed wiped-tuition installment repair", {
      instituteId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  });

  const redistributedFixed = await redistributeLumpedRemainingInstallments(instituteId).catch(
    (err) => {
      logger.warn("Failed installment redistribute repair", {
        instituteId,
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  );

  const mergedDownPayments = await mergeSplitInitialDownPayments(instituteId).catch((err) => {
    logger.warn("Failed merge split down-payment repair", {
      instituteId,
      error: err instanceof Error ? err.message : String(err),
    });
    return 0;
  });

  const orphans = await prisma.payment.findMany({
    where: {
      instituteId,
      status: "SUCCESS",
      allocations: { none: {} },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    take: 500,
  });

  if (
    orphans.length === 0 &&
    inflatedFixed === 0 &&
    misattributedFixed === 0 &&
    wipedFixed === 0 &&
    redistributedFixed === 0 &&
    mergedDownPayments === 0
  ) {
    repairedInstitutes.add(instituteId);
    return 0;
  }

  let repaired =
    inflatedFixed +
    misattributedFixed +
    wipedFixed +
    redistributedFixed +
    mergedDownPayments;

  for (const payment of orphans) {
    if (!payment.studentId) continue;
    const amount = toMoneyNumber(payment.amount);
    if (amount <= 0) continue;

    try {
      const applied = await prisma.$transaction(async (tx) => {
        // Re-check inside txn — may have been repaired concurrently
        const allocCount = await tx.paymentAllocation.count({
          where: { paymentId: payment.id },
        });
        if (allocCount > 0) return 0;

        const feeHeadMaster = payment.feeHeadMasterId
          ? await tx.masterRecord.findFirst({
              where: { id: payment.feeHeadMasterId },
              select: { code: true },
            })
          : null;

        const isAppFee = isApplicationFeePayment({
          feeHeadMasterId: payment.feeHeadMasterId,
          feeHead: payment.feeHead,
          notes: payment.notes,
          feeHeadCode: feeHeadMaster?.code ?? null,
        });

        // Application fee orphans need their own PAID charge line — do not
        // FIFO onto tuition / other open dues.
        if (isAppFee) {
          let admissionId = payment.admissionId;
          if (!admissionId) {
            const admission = await tx.admission.findFirst({
              where: {
                instituteId,
                studentId: payment.studentId!,
                status: { not: "CANCELLED" },
              },
              orderBy: { createdAt: "desc" },
              select: { id: true },
            });
            admissionId = admission?.id ?? null;
          }
          if (!admissionId) return 0;
          const result = await materializeApplicationFeeCharge(tx, {
            paymentId: payment.id,
            instituteId,
            studentId: payment.studentId!,
            admissionId,
          });
          return result ? amount : 0;
        }

        const openPending = await tx.pendingFee.findMany({
          where: {
            instituteId,
            studentId: payment.studentId!,
            dueAmount: { gt: 0 },
          },
          orderBy: [{ installmentNo: "asc" }, { dueDate: "asc" }],
        });
        if (openPending.length === 0) return 0;

        const balanceRows = openPending.map((p) => ({
          id: p.id,
          dueAmount: toMoneyNumber(p.dueAmount),
          amountPaid: toMoneyNumber(p.amountPaid),
          dueDate: p.dueDate,
          installmentNo: p.installmentNo,
          feeHeadMasterId: p.feeHeadMasterId,
        }));

        const { allocations } = applyFifoSameHeadOnly(
          balanceRows,
          amount,
          payment.feeHeadMasterId
        );
        if (allocations.length === 0) return 0;

        let appliedTotal = 0;
        for (const alloc of allocations) {
          if (!alloc.row.id || alloc.applied <= 0) continue;
          appliedTotal = roundMoney(appliedTotal + alloc.applied);
          await tx.paymentAllocation.create({
            data: {
              paymentId: payment.id,
              pendingFeeId: alloc.row.id,
              amount: alloc.applied,
            },
          });
          await tx.pendingFee.update({
            where: { id: alloc.row.id },
            data: {
              amountPaid: alloc.amountPaid,
              dueAmount: alloc.dueAmount,
              status: alloc.status,
              overdueDays: alloc.overdueDays,
            },
          });
          await linkAllocationToInvoice(tx, payment.id, alloc.row.id);
        }

        if (appliedTotal <= 0) return 0;

        await syncInvoicesForPendingFeeIds(
          tx,
          allocations.map((a) => a.row.id!).filter(Boolean)
        );

        if (allocations.length === 1 && allocations[0].row.id) {
          await tx.payment.update({
            where: { id: payment.id },
            data: { pendingFeeId: allocations[0].row.id },
          });
        }

        return appliedTotal;
      });

      if (applied > 0) {
        repaired += 1;
        logger.info("Repaired unallocated payment", {
          instituteId,
          paymentId: payment.id,
          receiptNo: payment.receiptNo,
          applied,
        });
      }
    } catch (err) {
      logger.warn("Failed to repair unallocated payment", {
        instituteId,
        paymentId: payment.id,
        receiptNo: payment.receiptNo,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Re-run inflation trim after allocations may have changed balances
  repaired += await repairInflatedInstallmentGroups(instituteId).catch(() => 0);

  repairedInstitutes.add(instituteId);
  return repaired;
}

/** Test helper — allow re-running repair in the same process. */
export function resetUnallocatedPaymentRepairState(): void {
  repairedInstitutes.clear();
}
