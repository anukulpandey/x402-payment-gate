import type { AgentRow } from '../../lib/api';
import { shortAddr, timeAgo, usd } from '../../lib/api';
import { Badge, Card } from '../ui';

export function AgentsLeaderboard({ agents }: { agents: AgentRow[] }) {
  const maxSpend = agents.reduce((max, a) => Math.max(max, a.spendUsd), 0);
  return (
    <Card>
      <div className='px-4 py-3 border-b border-white/8'>
        <h3 className='text-sm font-semibold text-white'>Top agents</h3>
      </div>
      {agents.length === 0 ? (
        <div className='px-4 py-8 text-center text-slate-500'>No paying agents in this period.</div>
      ) : (
        <div className='divide-y divide-white/5'>
          {agents.map((agent, i) => (
            <div key={`${agent.payer}:${i}`} className='relative px-4 py-2.5'>
              {maxSpend > 0 && (
                <div
                  className='absolute inset-y-1 left-1 rounded-md bg-accent-500/[0.07]'
                  style={{ width: (agent.spendUsd / maxSpend) * 100 + '%' }}
                />
              )}
              <div className='relative z-10 flex items-center justify-between gap-3'>
                <div className='flex items-center gap-2'>
                  <span className='text-slate-600 font-mono text-xs w-5'>{i + 1}</span>
                  <span className='font-mono text-xs text-white'>
                    {agent.agentId != null ? (
                      <>
                        agent #{agent.agentId}{' '}
                        <span className='text-amber-300'>⭐ {agent.agentReputation ?? 0}</span>
                      </>
                    ) : (
                      shortAddr(agent.payer)
                    )}
                  </span>
                  {agent.demo && <Badge tone='violet'>demo</Badge>}
                </div>
                <div className='text-right'>
                  <div className='font-mono text-white text-xs'>{usd(agent.spendUsd)}</div>
                  <div className='text-[10px] text-slate-500'>
                    {agent.calls} calls · {timeAgo(agent.lastTs)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
