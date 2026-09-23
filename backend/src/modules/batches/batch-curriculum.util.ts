export type TopicProgressItem = {
  topicId: string;
  isCompleted: boolean;
  completedAt?: string | null;
  completedById?: string | null;
};

const parseCourseTopics = (topics: unknown): Array<{ id: string }> => {
  if (!Array.isArray(topics)) return [];
  const result: Array<{ id: string }> = [];
  for (const t of topics) {
    if (!t || typeof t !== "object") continue;
    const id = (t as { id?: unknown }).id;
    if (typeof id === "string" && id.trim() !== "") {
      result.push({ id });
    }
  }
  return result;
};

export const parseTopicProgress = (value: unknown): TopicProgressItem[] => {
  if (!Array.isArray(value)) return [];
  const result: TopicProgressItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.topicId !== "string" || row.topicId.trim() === "") continue;
    result.push({
      topicId: row.topicId,
      isCompleted: Boolean(row.isCompleted),
      completedAt: typeof row.completedAt === "string" ? row.completedAt : null,
      completedById: typeof row.completedById === "string" ? row.completedById : null,
    });
  }
  return result;
};

/** Build topicProgress from course topics, preserving completion for matching topicIds. */
export const buildTopicProgressFromCourseTopics = (
  courseTopics: unknown,
  preservedProgress?: unknown
): TopicProgressItem[] => {
  const topics = parseCourseTopics(courseTopics);
  const preserved = new Map(
    parseTopicProgress(preservedProgress).map((p) => [p.topicId, p])
  );
  return topics.map((t) => {
    const prev = preserved.get(t.id);
    if (prev?.isCompleted) {
      return {
        topicId: t.id,
        isCompleted: true,
        completedAt: prev.completedAt ?? null,
        completedById: prev.completedById ?? null,
      };
    }
    return { topicId: t.id, isCompleted: false };
  });
};

/**
 * Courses a faculty member may mark on this batch:
 * - BatchCourse.facultyId === facultyId
 * - or primary Batch.facultyId === facultyId → include batch.courseId
 */
export const resolveTeachableCourseIds = (
  batch: {
    courseId: string;
    facultyId: string | null;
    batchCourses: Array<{ courseId: string; facultyId: string | null }>;
  },
  facultyId: string
): Set<string> => {
  const ids = new Set<string>();
  for (const bc of batch.batchCourses) {
    if (bc.facultyId === facultyId) {
      ids.add(bc.courseId);
    }
  }
  if (batch.facultyId === facultyId && batch.courseId) {
    ids.add(batch.courseId);
  }
  return ids;
};

export const applyModuleCompletion = (
  topicProgress: TopicProgressItem[],
  isCompleted: boolean,
  actorUserId: string,
  nowIso: string
): {
  topicProgress: TopicProgressItem[];
  isCompleted: boolean;
  completedAt: string | null;
  completedById: string | null;
} => {
  if (isCompleted) {
    return {
      topicProgress: topicProgress.map((t) => ({
        ...t,
        isCompleted: true,
        completedAt: t.completedAt ?? nowIso,
        completedById: t.completedById ?? actorUserId,
      })),
      isCompleted: true,
      completedAt: nowIso,
      completedById: actorUserId,
    };
  }
  return {
    topicProgress: topicProgress.map((t) => ({
      topicId: t.topicId,
      isCompleted: false,
    })),
    isCompleted: false,
    completedAt: null,
    completedById: null,
  };
};

/** Summarize curriculum completion from BatchModule rows (+ topicProgress). */
export const summarizeCurriculumProgress = (
  modules: Array<{ isCompleted: boolean; topicProgress: unknown }>
): {
  modulesTotal: number;
  modulesCompleted: number;
  topicsTotal: number;
  topicsCompleted: number;
  pct: number | null;
} => {
  let topicsTotal = 0;
  let topicsCompleted = 0;
  let modulesCompleted = 0;

  for (const mod of modules) {
    const topics = parseTopicProgress(mod.topicProgress);
    topicsTotal += topics.length;
    topicsCompleted += topics.filter((t) => t.isCompleted).length;
    if (mod.isCompleted || (topics.length > 0 && topics.every((t) => t.isCompleted))) {
      modulesCompleted += 1;
    }
  }

  const modulesTotal = modules.length;
  const pct =
    topicsTotal > 0
      ? Math.round((topicsCompleted / topicsTotal) * 100)
      : modulesTotal > 0
        ? Math.round((modulesCompleted / modulesTotal) * 100)
        : null;

  return { modulesTotal, modulesCompleted, topicsTotal, topicsCompleted, pct };
};

export const applyTopicCompletion = (
  topicProgress: TopicProgressItem[],
  topicId: string,
  isCompleted: boolean,
  actorUserId: string,
  nowIso: string
): {
  topicProgress: TopicProgressItem[];
  isCompleted: boolean;
  completedAt: string | null;
  completedById: string | null;
  topicFound: boolean;
} => {
  let topicFound = false;
  const next = topicProgress.map((t) => {
    if (t.topicId !== topicId) return t;
    topicFound = true;
    if (isCompleted) {
      return {
        ...t,
        isCompleted: true,
        completedAt: nowIso,
        completedById: actorUserId,
      };
    }
    return { topicId: t.topicId, isCompleted: false };
  });

  if (!topicFound) {
    return {
      topicProgress,
      isCompleted: false,
      completedAt: null,
      completedById: null,
      topicFound: false,
    };
  }

  const allComplete = next.length > 0 && next.every((t) => t.isCompleted);
  if (allComplete) {
    return {
      topicProgress: next,
      isCompleted: true,
      completedAt: nowIso,
      completedById: actorUserId,
      topicFound: true,
    };
  }

  return {
    topicProgress: next,
    isCompleted: false,
    completedAt: null,
    completedById: null,
    topicFound: true,
  };
};
