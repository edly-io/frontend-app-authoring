import type {
  FeedbackDashboardReport,
  FeedbackDashboardSubject,
  FeedbackDashboardSummary,
  RatingBandFilter,
  RatingDistribution,
  RatingDistributionBucket,
  RatingLevel,
} from './types';

export const RATING_LEVELS: RatingLevel[] = [
  { key: 'excellent', label: 'Excellent', shortLabel: 'Excellent' },
  { key: 'veryGood', label: 'Very Good', shortLabel: 'V. Good' },
  { key: 'good', label: 'Good', shortLabel: 'Good' },
  { key: 'needsAttention', label: 'Needs Attention', shortLabel: 'Needs Attention' },
];

const RATING_LEVEL_WEIGHT: Record<RatingLevel['key'], number> = {
  excellent: 5,
  veryGood: 4,
  good: 3,
  needsAttention: 2,
};

const emptyBucket = (): RatingDistributionBucket => ({
  count: 0,
  percentage: 0,
});

const emptyDistribution = (): RatingDistribution => ({
  total: 0,
  excellent: emptyBucket(),
  veryGood: emptyBucket(),
  good: emptyBucket(),
  needsAttention: emptyBucket(),
});

export const roundTo = (value: number, decimals = 1) => {
  const multiplier = 10 ** decimals;
  return Math.round(value * multiplier) / multiplier;
};

export const formatPercent = (value: number) => `${roundTo(value, value % 1 === 0 ? 0 : 1)}%`;

export const getDistributionPercentage = (
  distribution: RatingDistribution,
  level: RatingLevel,
) => distribution[level.key]?.percentage ?? 0;

export const getDistributionCount = (
  distribution: RatingDistribution,
  level: RatingLevel,
) => distribution[level.key]?.count ?? 0;

export const getInitials = (name: string) => {
  const parts = name
    .replace(/^(Dr\.|Mr\.|Ms\.|Mrs\.|Prof\.)\s+/i, '')
    .trim()
    .split(/\s+/);

  return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase() || 'NA';
};

export const getDistributionScore = (distribution: RatingDistribution) => {
  const weightedTotal = RATING_LEVELS.reduce(
    (total, level) => total + (getDistributionCount(distribution, level) * RATING_LEVEL_WEIGHT[level.key]),
    0,
  );
  const totalResponses = RATING_LEVELS.reduce((total, level) => total + getDistributionCount(distribution, level), 0);

  return totalResponses ? weightedTotal / totalResponses : 0;
};

export const getAverageDistribution = (
  subject: FeedbackDashboardSubject,
  report: FeedbackDashboardReport,
): RatingDistribution => {
  if (subject.averageDistribution) {
    return subject.averageDistribution;
  }

  if (report.criteria.length === 0) {
    return emptyDistribution();
  }

  const totals = report.criteria.reduce((acc, criterion) => {
    const distribution = subject.distributions[criterion.id] ?? emptyDistribution();
    RATING_LEVELS.forEach((level) => {
      acc[level.key].count += getDistributionCount(distribution, level);
      acc[level.key].percentage += getDistributionPercentage(distribution, level);
    });
    acc.total = (acc.total ?? 0) + (distribution.total ?? 0);
    return acc;
  }, emptyDistribution());

  RATING_LEVELS.forEach((level) => {
    totals[level.key].count = Math.round(totals[level.key].count / report.criteria.length);
    totals[level.key].percentage = roundTo(totals[level.key].percentage / report.criteria.length, 1);
  });
  totals.total = Math.round((totals.total ?? 0) / report.criteria.length);

  return totals;
};

export const getSubjectScore = (
  subject: FeedbackDashboardSubject,
  report: FeedbackDashboardReport,
) => subject.rating ?? getDistributionScore(getAverageDistribution(subject, report));

export const getSortedSubjects = (report: FeedbackDashboardReport) => (
  [...report.subjects].sort((left, right) => getSubjectScore(right, report) - getSubjectScore(left, report))
);

export const getRatingBand = (
  subject: FeedbackDashboardSubject,
  report: FeedbackDashboardReport,
): Exclude<RatingBandFilter, 'all'> => {
  const score = getSubjectScore(subject, report);

  if (score >= 4) {
    return 'top';
  }

  if (score >= 3) {
    return 'mid';
  }

  return 'low';
};

export const filterDashboardSubjects = (
  report: FeedbackDashboardReport,
  searchTerm: string,
  ratingBand: RatingBandFilter,
) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();

  return getSortedSubjects(report).filter((subject) => {
    const matchesSearch = !normalizedSearch
      || subject.name.toLowerCase().includes(normalizedSearch)
      || subject.email?.toLowerCase().includes(normalizedSearch)
      || subject.role?.toLowerCase().includes(normalizedSearch)
      || subject.subtitle?.toLowerCase().includes(normalizedSearch);
    const matchesBand = ratingBand === 'all' || getRatingBand(subject, report) === ratingBand;

    return matchesSearch && matchesBand;
  });
};

export const getFeedbackDashboardSummary = (report: FeedbackDashboardReport): FeedbackDashboardSummary => {
  if (report.summary) {
    return report.summary;
  }

  const sortedSubjects = getSortedSubjects(report);
  const subjectScores = report.subjects.map((subject) => getSubjectScore(subject, report));
  const averageRating = subjectScores.length
    ? subjectScores.reduce((total, score) => total + score, 0) / subjectScores.length
    : 0;
  const responseRate = report.totalRequests ? (report.submittedResponses / report.totalRequests) * 100 : 0;
  const topSubject = sortedSubjects[0];
  const topSubjectRating = topSubject ? getSubjectScore(topSubject, report) : 0;

  return {
    subjectCount: report.subjects.length,
    submittedResponses: report.submittedResponses,
    responseRate,
    averageRating,
    topSubjectName: topSubject?.name ?? '--',
    topSubjectRating,
    needsAttentionCount: subjectScores.filter((score) => score < 3).length,
  };
};
