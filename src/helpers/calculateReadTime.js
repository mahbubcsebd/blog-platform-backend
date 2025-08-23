// Helper function
const calculateReadTime = (content) => {
  if (!content) return 1; // empty content
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200)); // minimum 1 minute
};

module.exports = calculateReadTime;
