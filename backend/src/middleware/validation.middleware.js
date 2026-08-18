function validatePipeline(req, res, next) {
  const { name, mappings, transformations, validationRules } = req.body;

  if (!name || typeof name !== 'string' || name.trim() === '') {
    return res.status(400).json({ error: { message: 'Pipeline name is required and must be a string' } });
  }

  if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
    return res.status(400).json({ error: { message: 'Mappings are required and must be a non-empty array' } });
  }

  for (let i = 0; i < mappings.length; i++) {
    const m = mappings[i];
    if (!m.source || typeof m.source !== 'string' || m.source.trim() === '' ||
        !m.destination || typeof m.destination !== 'string' || m.destination.trim() === '') {
      return res.status(400).json({
        error: { message: `Mapping at index ${i} must have valid non-empty 'source' and 'destination' strings` }
      });
    }
  }

  if (transformations) {
    if (!Array.isArray(transformations)) {
      return res.status(400).json({ error: { message: 'Transformations must be an array' } });
    }
    for (let i = 0; i < transformations.length; i++) {
      const t = transformations[i];
      if (!t.field || typeof t.field !== 'string' || t.field.trim() === '' ||
          !t.code || typeof t.code !== 'string') {
        return res.status(400).json({
          error: { message: `Transformation at index ${i} must have valid non-empty 'field' and 'code' strings` }
        });
      }
    }
  }

  if (validationRules) {
    if (!Array.isArray(validationRules)) {
      return res.status(400).json({ error: { message: 'Validation rules must be an array' } });
    }
    for (let i = 0; i < validationRules.length; i++) {
      const r = validationRules[i];
      if (!r.field || typeof r.field !== 'string' || r.field.trim() === '') {
        return res.status(400).json({
          error: { message: `Validation rule at index ${i} must have a valid non-empty 'field' string` }
        });
      }
      if (r.type && !['string', 'number', 'boolean', 'date'].includes(r.type)) {
        return res.status(400).json({
          error: { message: `Validation rule at index ${i} has invalid type '${r.type}'. Allowed: string, number, boolean, date` }
        });
      }
    }
  }

  next();
}

module.exports = {
  validatePipeline
};
