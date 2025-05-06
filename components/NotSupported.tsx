import React, { type FC } from 'react'

const NotSupported: FC = () => {
  return (
    <section className="flex h-svh flex-col items-center justify-center space-y-4 p-8 text-center">
      <h2 className="text-5xl font-medium tracking-tight">Not supported by this browser</h2>
      <p className="text-light text-blue text-4xl leading-loose">
        This experiences uses an experimental technology (WebGPU).
        <br />
        Open it using a{' '}
        <a
          target="_blank"
          rel="noreferrer"
          className="text-white underline"
          href="https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API#browser_compatibility">
          compatible browser
        </a>
        . If you&apos;re using Safari, you can enable WebGPU by going to Settings/Feature Flags.
      </p>
    </section>
  )
}

export default NotSupported
