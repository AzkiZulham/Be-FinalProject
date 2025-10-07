export const getPagination = (query: any) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 50);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};
