import React from 'react';
import { cn } from '../utils/helpers';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  if (totalItems <= itemsPerPage) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter((page) => {
    if (totalPages <= 5) return true;
    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
  });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full py-1">
      <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400 dark:text-surface-500">
        Showing {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(totalItems, currentPage * itemsPerPage)} of {totalItems}
      </span>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-[11px] font-bold text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-400 dark:hover:bg-surface-800"
        >
          Prev
        </button>
        {pages.map((page, index) => {
          const prevPage = pages[index - 1];
          const showGap = prevPage && page - prevPage > 1;
          return (
            <React.Fragment key={page}>
              {showGap ? <span className="px-1 text-xs font-bold text-gray-300 dark:text-surface-600">...</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(page)}
                className={cn(
                  'h-8 min-w-8 rounded-lg px-2 text-xs font-bold transition-all',
                  currentPage === page
                    ? 'bg-[#00a3ff] text-white shadow-lg shadow-blue-500/20'
                    : 'border border-gray-100 bg-white text-gray-500 hover:bg-gray-100 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-400 dark:hover:bg-surface-800'
                )}
              >
                {page}
              </button>
            </React.Fragment>
          );
        })}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-[11px] font-bold text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-800 dark:bg-surface-900 dark:text-surface-400 dark:hover:bg-surface-800"
        >
          Next
        </button>
      </div>
    </div>
  );
};
