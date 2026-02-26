'use client'

import { FormEvent, useMemo, useState } from 'react'
import { Orbitron, Press_Start_2P } from 'next/font/google'
import styles from './birthday.module.css'

const orbitron = Orbitron({ subsets: ['latin'], weight: ['500', '700'] })
const arcade = Press_Start_2P({ subsets: ['latin'], weight: ['400'] })

const MAGIC_ANSWER = 'pipierno'
const YOUTUBE_EMBED_URL = ''

const makeRainColumns = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: index,
    bits: Array.from({ length: 14 }, () => (Math.random() > 0.5 ? '1' : '0')).join(''),
    duration: `${6 + Math.random() * 6}s`,
    delay: `${Math.random() * 4}s`,
    opacity: 0.2 + Math.random() * 0.6,
  }))

export default function BirthdayPage() {
  const [answer, setAnswer] = useState('')
  const [status, setStatus] = useState<'question' | 'error' | 'success'>('question')
  const rainColumns = useMemo(() => makeRainColumns(30), [])

  const submitAnswer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = answer.trim().toLowerCase()
    if (normalized === MAGIC_ANSWER) {
      setStatus('success')
      return
    }

    setStatus('error')
    setTimeout(() => {
      setStatus('question')
      setAnswer('')
    }, 2200)
  }

  return (
    <main
      className={`${styles.page} ${orbitron.className} ${
        status === 'error' ? styles.pageError : ''
      }`}
    >
      <div className={styles.rainLayer} aria-hidden>
        {rainColumns.map((column) => (
          <span
            key={column.id}
            className={`${styles.column} ${status === 'error' ? styles.columnError : ''}`}
            style={{
              left: `${(column.id / rainColumns.length) * 100}%`,
              animationDuration: column.duration,
              animationDelay: column.delay,
              opacity: column.opacity,
            }}
          >
            {column.bits}
          </span>
        ))}
      </div>

      <section className={styles.centerCard}>
        {status !== 'success' && (
          <>
            <h1 className={styles.title}>come si chiama il bottone magico del tuo fidanzato</h1>

            <form className={styles.form} onSubmit={submitAnswer}>
              <input
                className={styles.input}
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Scrivi la risposta"
                autoComplete="off"
                disabled={status === 'error'}
              />
              <button className={styles.button} type="submit" disabled={status === 'error'}>
                Invia
              </button>
            </form>
          </>
        )}

        {status === 'error' && <p className={`${styles.errorText} ${arcade.className}`}>SYSTEM ERROR</p>}

        {status === 'success' && (
          <div className={styles.videoWrap}>
            {YOUTUBE_EMBED_URL ? (
              <iframe
                className={styles.video}
                src={YOUTUBE_EMBED_URL}
                title="Birthday video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            ) : (
              <p className={styles.pendingVideo}>Set `YOUTUBE_EMBED_URL` in `src/app/birthday/page.tsx`.</p>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
