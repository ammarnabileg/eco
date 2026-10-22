"use client"

import { Dialog, Transition } from "@headlessui/react"
import { Fragment, ReactNode } from "react"

import { useT } from "@i18n/client"

/**
 * A dialog that is a centred card on desktop and a bottom sheet on phones.
 */
export default function Sheet({
  open,
  onClose,
  title,
  layout = "desktop",
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  layout?: "mobile" | "desktop"
  children: ReactNode
}) {
  const t = useT()
  const mobile = layout === "mobile"

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[80]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-laly-ink/40" aria-hidden="true" />
        </Transition.Child>

        <div
          className={`fixed inset-0 flex ${
            mobile ? "items-end" : "items-center justify-center p-4"
          }`}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom={mobile ? "translate-y-full" : "opacity-0 scale-95"}
            enterTo={mobile ? "translate-y-0" : "opacity-100 scale-100"}
            leave="ease-in duration-150"
            leaveFrom={mobile ? "translate-y-0" : "opacity-100 scale-100"}
            leaveTo={mobile ? "translate-y-full" : "opacity-0 scale-95"}
          >
            <Dialog.Panel
              className={`bg-white w-full flex flex-col max-h-[90vh] ${
                mobile
                  ? "rounded-t-[22px] pb-[max(16px,env(safe-area-inset-bottom))]"
                  : "max-w-lg rounded-card shadow-laly"
              }`}
            >
              {mobile && (
                <span
                  className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-laly-line"
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-laly-line">
                <Dialog.Title className="text-base font-extrabold">
                  {title}
                </Dialog.Title>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t("layout.close")}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-laly-mut hover:bg-laly-bg"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <div className="overflow-y-auto px-5 py-4">{children}</div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
