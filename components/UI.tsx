'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useRouter } from 'next/navigation'
import React, {
  type Dispatch,
  type FC,
  type FormEvent,
  forwardRef,
  type SetStateAction,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { SwitchTransition, Transition, TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { RING_RADIUS } from './TheRingScene'

type Props = {
  name?: string
  setTextPoints: Dispatch<SetStateAction<Float32Array | null>>
}

// TODO: add sound effects to make this creepy
// TODO: record Youtube video

export const UI: FC<Props> = ({ name, setTextPoints }) => {
  const { push } = useRouter()
  const [inputName, setInputName] = useState<string>(name ?? '')
  const container = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    setInputName(name ?? '')
  }, [name])

  useEffect(() => {
    function generateTextPoints() {
      if (!name) return
      const lowercaseName = name.toLowerCase()
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')

      // Show the canvas:
      // canvas.style.position = "fixed";
      // canvas.style.top = "0";
      // canvas.style.left = "0";
      // canvas.style.zIndex = "2000";
      // document.body.appendChild(canvas);
      if (!ctx) return
      const size = 640
      canvas.width = size
      canvas.height = size

      // Fill the canvas with a black background.
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, size, size)

      // Start with an initially large font size.
      let fontSize = 120
      // Set the font using the custom font-family.
      ctx.font = `${fontSize}px "Long Cang", "Long Cang Fallback"`
      ctx.letterSpacing = `${Math.round(120 / name.length)}px`

      // Measure the text width to adjust the font size so that it fills the canvas width.
      const measuredWidth = ctx.measureText(lowercaseName).width
      fontSize = fontSize * (size / measuredWidth)
      ctx.font = `${fontSize}px "Long Cang", "Long Cang Fallback"`

      ctx.fillStyle = 'white'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(lowercaseName, size / 2, size / 2)

      const data = ctx.getImageData(0, 0, size, size).data
      const textPointsWorldPos = []

      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 200) {
          const pixelX = (i / 4) % size
          const pixelY = Math.floor(i / 4 / size)
          // Normalize to [-1, 1]
          const normX = (pixelX / size) * 2 - 1
          const normY = -((pixelY / size) * 2 - 1) // Invert Y if needed
          const x = normX * RING_RADIUS
          const y = normY * RING_RADIUS
          const z = 0
          textPointsWorldPos.push(x, y, z)
        }
      }

      const points = new Float32Array(textPointsWorldPos)
      setTextPoints(points)
    }

    generateTextPoints()
  }, [name, setTextPoints])

  const onNameSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!inputName) return
    setTextPoints(null)
    push(`?name=${inputName}`)
  }

  const onResetClick = () => {
    setTextPoints(null)
    push('?')
  }

  const hasName = !!name

  return (
    <SwitchTransition>
      <Transition key={`${hasName}`} appear={true} nodeRef={container} timeout={{ enter: 0, exit: 500 }}>
        {(transitionStatus) => {
          if (hasName)
            return (
              <MainUI
                ref={container}
                transitionStatus={transitionStatus}
                onNameSubmit={onNameSubmit}
                inputName={inputName}
                setInputName={setInputName}
                onResetClick={onResetClick}
              />
            )
          return (
            <Landing
              ref={container}
              transitionStatus={transitionStatus}
              inputName={inputName}
              setInputName={setInputName}
              onNameSubmit={onNameSubmit}
            />
          )
        }}
      </Transition>
    </SwitchTransition>
  )
}

type CommonUIProps = {
  transitionStatus: TransitionStatus
  inputName: string
  setInputName: Dispatch<SetStateAction<string>>
  onNameSubmit: (e: FormEvent) => void
}

type MainUIProps = CommonUIProps & {
  onResetClick: () => void
}

const MainUI = forwardRef<HTMLDivElement, MainUIProps>(
  ({ transitionStatus, inputName, setInputName, onNameSubmit, onResetClick }, ref) => {
    const [isUrlCopied, setIsUrlCopied] = useState(false)

    const onCopyUrlClick = () => {
      try {
        navigator.clipboard.writeText(window.location.href)
        setIsUrlCopied(true)
        setTimeout(() => setIsUrlCopied(false), 2000)
      } catch (err) {
        console.error('Failed to copy text to clipboard:', err)
      }
    }

    useGSAP(
      () => {
        const onEnter = () => {
          gsap.fromTo(
            'input, button, a',
            { opacity: 0 },
            {
              opacity: 1,
              duration: 1,
              stagger: 0.1,
            },
          )
        }

        const onExiting = () => {
          gsap.to('#ui', {
            opacity: 0,
            duration: 0.4,
          })
        }

        if (transitionStatus === 'exiting') onExiting()
        if (transitionStatus === 'entering') onEnter()
      },
      {
        dependencies: [transitionStatus],
      },
    )

    return (
      <section ref={ref} id="ui" className="fixed top-8 left-8 z-50 flex flex-col gap-2">
        <form onSubmit={onNameSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={inputName}
            className="active:border-light focus:border-light placeholder:text-light/50 max-w-xs rounded-lg border border-white/10 bg-black/20 p-2 text-4xl tracking-widest text-white outline-none"
            onChange={(e) => setInputName(e.target.value)}
            placeholder="Enter a name"
          />
        </form>

        <button
          className={twJoin(
            'text-light p-2 text-left text-2xl tracking-wide uppercase hover:text-white',
            isUrlCopied && 'text-white',
          )}
          onClick={onCopyUrlClick}>
          {isUrlCopied ? "it's all yours!" : 'copy the URL'}
        </button>

        <button
          className="text-light p-2 text-left text-2xl tracking-wide uppercase hover:text-white"
          onClick={onResetClick}>
          reset
        </button>

        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://github.com/prag-matt-ic/the-ring-r3f-next"
          className="text-light p-2 text-2xl tracking-wide uppercase hover:text-white">
          see the code
        </a>
      </section>
    )
  },
)
MainUI.displayName = 'MainUI' // Set display name for debugging

// Use forwardRef for Landing
const Landing = forwardRef<HTMLDivElement, CommonUIProps>(
  ({ inputName, setInputName, onNameSubmit, transitionStatus }, ref) => {
    useGSAP(
      () => {
        const onEnter = () => {
          gsap.fromTo(
            'input, button',
            { opacity: 0 },
            {
              opacity: 1,
              duration: 0.7,
              stagger: 0.2,
            },
          )
        }

        if (transitionStatus === 'entering') onEnter()

        const onExiting = () => {
          gsap.to('#landing', {
            opacity: 0,
            duration: 0.4,
          })
        }

        if (transitionStatus === 'exiting') onExiting()
      },
      {
        dependencies: [transitionStatus],
      },
    )

    return (
      <section ref={ref} id="landing" className="relative z-50 flex size-full items-center justify-center">
        <form onSubmit={onNameSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={inputName}
            className="placeholder:text-light/50 border-white bg-black p-3 text-center text-7xl tracking-widest text-white opacity-0 outline-none"
            onChange={(e) => setInputName(e.target.value)}
            placeholder="Enter a name"
          />
          <button
            formAction="submit"
            className="hover:text-light cursor-pointer p-2 text-2xl tracking-wide opacity-0"
            disabled={!inputName}>
            press enter
          </button>
        </form>
      </section>
    )
  },
)

Landing.displayName = 'Landing' // Set display name for debugging
