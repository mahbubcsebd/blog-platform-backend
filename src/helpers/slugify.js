function slugify(title) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // non-word character বাদ
    .replace(/\s+/g, '-') // space → dash
    .replace(/-+/g, '-') // multiple dash → single
    .replace(/^-+|-+$/g, ''); // starting & ending dash বাদ

  const timestamp = Date.now().toString(36); // time-based unique
  const random = Math.random().toString(36).slice(2, 8); // random unique

  return `${base}-${timestamp}${random}`;
}

module.exports = slugify;
