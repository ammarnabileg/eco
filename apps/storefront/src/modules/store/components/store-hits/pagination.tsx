"use client"

import { usePagination } from "react-instantsearch"

import { useT } from "@i18n/client"
import { clx } from "@modules/common/components/ui"

const SearchPagination = () => {
  const t = useT()
  const { pages, currentRefinement, nbPages, refine } = usePagination({
    padding: 2,
  })

  if (nbPages <= 1) {
    return null
  }

  const renderPage = (page: number) => (
    <button
      key={page}
      className={clx(
        "min-w-10 h-10 px-2 rounded-btn border text-sm font-bold transition-colors",
        page === currentRefinement
          ? "bg-laly-teal border-laly-teal text-white"
          : "bg-white border-laly-line text-laly-ink hover:border-laly-teal hover:text-laly-teal"
      )}
      disabled={page === currentRefinement}
      aria-label={t("catalog.page_number", { number: page + 1 })}
      aria-current={page === currentRefinement ? "page" : undefined}
      onClick={() => refine(page)}
    >
      {page + 1}
    </button>
  )

  const renderEllipsis = (key: string) => (
    <span
      key={key}
      className="h-10 flex items-center text-sm font-bold text-laly-faint cursor-default"
    >
      ...
    </span>
  )

  const lastPage = nbPages - 1

  return (
    <div className="flex justify-center w-full mt-10">
      <nav
        className="flex flex-wrap justify-center gap-2 items-center"
        aria-label={t("catalog.pagination")}
        data-testid="product-pagination"
      >
        {!pages.includes(0) && renderPage(0)}
        {!pages.includes(0) && !pages.includes(1) && renderEllipsis("start")}
        {pages.map(renderPage)}
        {!pages.includes(lastPage) &&
          !pages.includes(lastPage - 1) &&
          renderEllipsis("end")}
        {!pages.includes(lastPage) && renderPage(lastPage)}
      </nav>
    </div>
  )
}

export default SearchPagination
