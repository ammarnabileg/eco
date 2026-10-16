const SkeletonProductPreview = () => {
  return (
    <div
      className="animate-pulse h-full flex flex-col bg-white border border-laly-line rounded-card p-3 small:p-3.5"
      aria-hidden="true"
    >
      <div className="aspect-[4/3] w-full rounded-[13px] bg-laly-bg" />
      <div className="flex flex-col gap-2 pt-3">
        <div className="w-4/5 h-4 rounded bg-laly-bg" />
        <div className="w-3/5 h-4 rounded bg-laly-bg" />
        <div className="mt-2 w-2/5 h-5 rounded bg-laly-bg" />
      </div>
    </div>
  )
}

export default SkeletonProductPreview
