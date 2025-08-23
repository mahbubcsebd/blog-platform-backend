/**
 * Exclude one or more fields from a Prisma model result
 * @param {object} obj - Prisma model object
 * @param {string[]} keys - Keys to exclude /remove
 * @returns {object} New object without excluded keys
 */

const excludeFields = (obj, keys) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keys.includes(key))
  );
};

module.exports = excludeFields;
