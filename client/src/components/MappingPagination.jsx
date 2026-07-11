const MappingPagination = ({
  page,
  totalPages,
  total,
  limit,
  onPageChange,

}) => {

  const getPages = () => {
    const pages = [];

    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
    
  };

  return (
    <div className="flex items-center justify-between border-t border-slate-100 bg-white px-5 py-3">

      <p className="text-[11px] font-medium text-slate-500 tracking-wide lowercase">
        Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} items
      </p>

      <div className="flex items-center gap-1">

        {/* Previous */}
        <button
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m15 18-6-6 6-6"></path>
          </svg>
        </button>

        {/* Page Numbers */}
        {getPages().map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold ${
              page === p
                ? "bg-[#2B86C5] text-white border border-[#2B86C5]"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {p}
          </button>
        ))}

        {/* Next */}
        <button
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path d="m9 18 6-6-6-6"></path>
          </svg>
        </button>

      </div>

    </div>
  );
};

export default MappingPagination;