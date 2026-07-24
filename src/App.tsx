import { useEffect, useState, type FormEvent } from 'react'
import {
  fetchComputeSeries,
  fetchMetrics,
  fetchModels,
  formatFlop,
  generateInsight,
  type ComputePoint,
  type HeadlineMetric,
  type ModelRow,
} from './api'
import { ComputeChart } from './components/ComputeChart'
import './App.css'

type DomainFilter = 'All' | 'Language' | 'Multimodal' | 'Reasoning'

const domains: DomainFilter[] = ['All', 'Language', 'Multimodal', 'Reasoning']

const DEFAULT_QUESTION =
  'What stands out about frontier training compute growth?'

export default function App() {
  const [domain, setDomain] = useState<DomainFilter>('All')
  const [metrics, setMetrics] = useState<HeadlineMetric[]>([])
  const [series, setSeries] = useState<ComputePoint[]>([])
  const [models, setModels] = useState<ModelRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [question, setQuestion] = useState(DEFAULT_QUESTION)
  const [insight, setInsight] = useState<string | null>(null)
  const [insightMeta, setInsightMeta] = useState<string | null>(null)
  const [insightLoading, setInsightLoading] = useState(false)
  const [insightError, setInsightError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [metricsData, seriesData, modelsData] = await Promise.all([
          fetchMetrics(),
          fetchComputeSeries(),
          fetchModels(),
        ])
        if (cancelled) return
        setMetrics(metricsData)
        setSeries(seriesData)
        setModels(modelsData)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadModels() {
      try {
        const data = await fetchModels(domain)
        if (!cancelled) setModels(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load models')
        }
      }
    }

    if (!loading) void loadModels()
    return () => {
      cancelled = true
    }
  }, [domain, loading])

  async function onAskInsight(event: FormEvent) {
    event.preventDefault()
    setInsightLoading(true)
    setInsightError(null)
    try {
      const result = await generateInsight(question.trim())
      setInsight(result.insight)
      setInsightMeta(
        `${result.model}${result.cached ? ' · cached' : ' · fresh'}`,
      )
    } catch (err) {
      setInsightError(
        err instanceof Error ? err.message : 'Failed to generate insight',
      )
    } finally {
      setInsightLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="nav">
        <a className="nav__brand" href="#top">
          AI Trends
        </a>
        <a className="nav__link" href="#data">
          Explore data
        </a>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero__copy">
            <p className="hero__brand">AI Trends</p>
            <h1 className="hero__headline">
              Watch frontier compute climb in plain sight.
            </h1>
            <p className="hero__lede">
              Local MVP backed by Postgres and Ollama — models, training
              compute, and a short AI-written read of the curve.
            </p>
            <div className="hero__actions">
              <a className="btn btn--primary" href="#data">
                Explore the data
              </a>
              <a className="btn btn--ghost" href="#insight">
                Ask Ollama
              </a>
            </div>
          </div>
          <div className="hero__visual" aria-hidden="true">
            {series.length > 0 ? (
              <ComputeChart series={series} variant="hero" />
            ) : null}
          </div>
        </section>

        {error ? (
          <p className="banner banner--error" role="alert">
            {error}. Is the API running on port 8000?
          </p>
        ) : null}
        {loading ? <p className="banner">Loading trends from the API…</p> : null}

        <section className="signals" id="data" aria-labelledby="signals-title">
          <div className="section-head">
            <h2 id="signals-title">Signals worth watching</h2>
            <p>Headline numbers loaded from PostgreSQL.</p>
          </div>
          <ul className="signals__list">
            {metrics.map((m) => (
              <li key={m.id} className="signal">
                <p className="signal__value">
                  {m.value}
                  {m.unit ? <span>{m.unit}</span> : null}
                </p>
                <p className="signal__label">{m.label}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel" aria-labelledby="chart-title">
          <div className="section-head">
            <h2 id="chart-title">Frontier training compute</h2>
            <p>
              Hover a point to inspect each milestone. Values are approximate
              sample estimates seeded into the database.
            </p>
          </div>
          {series.length > 0 ? (
            <ComputeChart series={series} variant="panel" />
          ) : null}
        </section>

        <section className="insight" id="insight" aria-labelledby="insight-title">
          <div className="section-head">
            <h2 id="insight-title">Ask the local model</h2>
            <p>
              Ollama reads the same seeded data and returns a short briefing.
              Responses are cached in Postgres.
            </p>
          </div>
          <form className="insight__form" onSubmit={onAskInsight}>
            <label className="insight__label" htmlFor="insight-question">
              Question
            </label>
            <textarea
              id="insight-question"
              className="insight__input"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              minLength={3}
            />
            <button
              className="btn btn--primary"
              type="submit"
              disabled={insightLoading || question.trim().length < 3}
            >
              {insightLoading ? 'Thinking…' : 'Generate insight'}
            </button>
          </form>
          {insightError ? (
            <p className="banner banner--error" role="alert">
              {insightError}
            </p>
          ) : null}
          {insight ? (
            <div className="insight__result">
              <p className="insight__meta">{insightMeta}</p>
              <p className="insight__body">{insight}</p>
            </div>
          ) : null}
        </section>

        <section className="models" id="models" aria-labelledby="models-title">
          <div className="section-head section-head--row">
            <div>
              <h2 id="models-title">Notable models</h2>
              <p>Filter the roster by domain (API-backed).</p>
            </div>
            <div className="filters" role="group" aria-label="Filter by domain">
              {domains.map((d) => (
                <button
                  key={d}
                  type="button"
                  className={`filter${domain === d ? ' is-active' : ''}`}
                  aria-pressed={domain === d}
                  onClick={() => setDomain(d)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">Model</th>
                  <th scope="col">Org</th>
                  <th scope="col">Year</th>
                  <th scope="col">Domain</th>
                  <th scope="col">Train compute</th>
                </tr>
              </thead>
              <tbody>
                {models.map((m) => (
                  <tr key={m.id}>
                    <th scope="row">{m.name}</th>
                    <td>{m.org}</td>
                    <td>{m.year}</td>
                    <td>{m.domain}</td>
                    <td>{formatFlop(m.flop)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          AI Trends MVP · Postgres + FastAPI + Ollama · inspired by{' '}
          <a href="https://epoch.ai/" rel="noreferrer" target="_blank">
            Epoch AI
          </a>
        </p>
      </footer>
    </div>
  )
}
