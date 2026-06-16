'use client'

import { Fragment, useEffect, useRef, useState } from 'react'

const ZONES = [
  { codes: ['IST'], timeZone: 'Asia/Kolkata', offset: '+5:30' },
  { codes: ['CST'], timeZone: 'Asia/Shanghai', offset: '+7' },
  { codes: ['SGT', 'HKT'], timeZone: 'Asia/Singapore', offset: '+8' },
  { codes: ['KST', 'JST'], timeZone: 'Asia/Tokyo', offset: '+9' },
]

function getZoneInfo(timeZone: string) {
  const now = new Date()
  return {
    day: now.toLocaleString('en-US', { weekday: 'short', timeZone }),
    time: now.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone,
    }),
  }
}

export default function DateTimeDisplay() {
  const [mounted, setMounted] = useState(false)
  const [tick, setTick] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    setMounted(true)
    const msToNextMinute = 60_000 - (Date.now() % 60_000)
    const timeout = setTimeout(() => {
      setTick(t => t + 1)
      intervalRef.current = setInterval(() => setTick(t => t + 1), 60_000)
    }, msToNextMinute)

    return () => {
      clearTimeout(timeout)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  return (
    <p className="flex flex-row items-center gap-3 m-0 text-xs text-gray-400">
      {ZONES.map((zone, index) => {
        const { day, time } = mounted ? getZoneInfo(zone.timeZone) : { day: '···', time: '··:··' }
        return (
          <Fragment key={zone.codes.join('/')}>
            <span className="flex items-center gap-1">
              <span>{zone.codes.join('/')}</span>
              <span>{day}</span>
              <span>{time}</span>
            </span>
            {index < ZONES.length - 1 && (
              <span className="text-gray-300" aria-hidden="true">|</span>
            )}
          </Fragment>
        )
      })}
    </p>
  )
}