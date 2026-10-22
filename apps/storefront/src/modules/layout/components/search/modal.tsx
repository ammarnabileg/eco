"use client"

import { Dialog, Transition } from "@headlessui/react"
import React, { Fragment } from "react"

// Search opens in the middle of the screen on desktop and full-screen on
// phones; Esc or a click outside closes it.
export default function SearchModal({ isOpen, close, children }: { isOpen: boolean; close: () => void; children: React.ReactNode }) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[75]" onClose={close}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[#0B333B]/55 backdrop-blur-sm" />
        </Transition.Child>
        <div className="fixed inset-0 small:flex small:items-start small:justify-center small:px-6 small:pt-[8vh]">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200 motion-reduce:duration-0"
            enterFrom="opacity-0 small:scale-95 translate-y-2 small:translate-y-0"
            enterTo="opacity-100 small:scale-100 translate-y-0"
            leave="ease-in duration-150 motion-reduce:duration-0"
            leaveFrom="opacity-100 small:scale-100"
            leaveTo="opacity-0 small:scale-95"
          >
            <Dialog.Panel
              className="flex flex-col w-full h-[100dvh] small:h-auto small:max-h-[84vh] small:max-w-[860px] bg-white small:rounded-[22px] shadow-[0_30px_80px_-20px_rgba(11,51,59,.55)] overflow-hidden"
              data-testid="search-drawer"
            >
              {children}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  )
}
