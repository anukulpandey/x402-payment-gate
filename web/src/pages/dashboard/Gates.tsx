import { useState } from 'react'
import { useDashboard } from '../../lib/dashboard'
import { api } from '../../lib/api'
import type { Endpoint } from '../../lib/api'
import { Card, Button } from '../../components/ui'
import { EndpointCard } from '../../components/EndpointCard'
import { GateForm } from '../../components/GateForm'
import { Playground } from '../../components/Playground'

export function Gates() {
  const { endpoints, erc8004, loaded, refresh } = useDashboard()
  const [playing, setPlaying] = useState<Endpoint | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [loadingExamples, setLoadingExamples] = useState(false)

  async function loadExamples() {
    setLoadingExamples(true)
    try {
      await api.loadExamples()
      refresh()
    } finally {
      setLoadingExamples(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold text-white">Your gated APIs</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">{endpoints.length} live</span>
          <Button onClick={() => setShowCreate(true)}>+ New gate</Button>
        </div>
      </div>

      {loaded && endpoints.length === 0 ? (
        <Card className="px-6 py-14 text-center">
          <p className="text-slate-400">No gates yet — wrap your first API.</p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button onClick={() => setShowCreate(true)}>+ New gate</Button>
            <Button variant="ghost" loading={loadingExamples} onClick={loadExamples}>
              Load examples
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          {endpoints.map((e) => (
            <EndpointCard key={e.id} endpoint={e} onRun={setPlaying} onChanged={refresh} />
          ))}
        </div>
      )}

      {showCreate && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setShowCreate(false)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <GateForm
              erc8004={erc8004}
              onCreated={() => {
                setShowCreate(false)
                refresh()
              }}
            />
            <button
              onClick={() => setShowCreate(false)}
              className="mt-3 mx-auto block text-xs text-slate-400 hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {playing && (
        <Playground endpoint={playing} onClose={() => setPlaying(null)} onDone={refresh} />
      )}
    </div>
  )
}
