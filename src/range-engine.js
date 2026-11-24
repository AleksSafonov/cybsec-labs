const rangeEngine = (() => {
  function reachable(project, start, end, linkType, excluded = new Set()) {
    const visited = new Set(excluded);
    const queue = [start];
    for (let index = 0; index < queue.length; index++) {
      const id = queue[index];
      if (visited.has(id)) continue;
      if (id === end) return true;
      visited.add(id);
      for (const link of project.links) {
        if (link.from === id && link.type === linkType) queue.push(link.to);
      }
    }
    return false;
  }

  function evaluate(mission, project, context) {
    const checks = mission.rules.map(rule => ({
      title: rule.title,
      hint: rule.hint,
      critical: Boolean(rule.critical),
      passed: rule.test(project, context)
    }));
    const score = Math.round(100 * checks.filter(check => check.passed).length / checks.length);
    return { score, passed: score >= mission.threshold && !checks.some(c => c.critical && !c.passed), checks };
  }

  return { reachable, evaluate };
})();
