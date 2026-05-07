export function sanitizeRankPoints(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.floor(numeric));
}

export function normalizeCustomerRankRules(rules) {
  const source = Array.isArray(rules) ? rules : [];

  const normalized = source
    .map((rule, index) => ({
      name: String(rule?.name ?? "").trim(),
      min_points: sanitizeRankPoints(rule?.min_points),
      _index: index,
    }))
    .filter((rule) => rule.name);

  if (normalized.length === 0) {
    return [];
  }

  normalized.sort((left, right) => {
    if (left.min_points === right.min_points) {
      return left._index - right._index;
    }

    return left.min_points - right.min_points;
  });

  return normalized.map(({ name, min_points }) => ({
    name,
    min_points,
  }));
}

export function resolveCustomerRankName(points, rules) {
  const normalizedRules = normalizeCustomerRankRules(rules);
  const safePoints = sanitizeRankPoints(points);
  let currentRank = normalizedRules[0]?.name || "";

  normalizedRules.forEach((rule) => {
    if (safePoints >= rule.min_points) {
      currentRank = rule.name;
    }
  });

  return currentRank;
}
