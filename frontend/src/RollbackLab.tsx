import { useEffect, useId, useState } from 'react';
import type { Locale } from './i18n';
import { architectureCopy, tr } from './architectureData';
import { rollbackCopy as c } from './rollbackData';
import { recoveryScenarios as rollbackScenarios, recoveryGuideCopy as g, releaseHazards } from './recoveryGuide';

export function RollbackLab({ locale }: { locale: Locale }) {
  const [scenario, setScenario] = useState(0), [step, setStep] = useState(0), [playing, setPlaying] = useState(false);
  const current = rollbackScenarios[scenario];
  const marker = useId().replace(/:/g, '');
  useEffect(() => {
    if (!playing) return;
    if (step === 4) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setStep(value => value + 1), 2400);
    return () => window.clearTimeout(timer);
  }, [playing, step, scenario]);
  function select(index: number) { setPlaying(false); setStep(0); setScenario(index); }
  function move(index: number) { setPlaying(false); setStep(index); }
  const restoring = step >= 3, broken = step >= 1 && step <= 2;
  const green = current.beforeTraffic || restoring ? 0 : current.frontend || current.afterRelease ? 100 : 10;
  const phases = current.beforeTraffic ? g.blockedPhases : c.phases;
  return <section className={`rollback-lab rollback-step-${step}`} aria-labelledby="rollback-title">
    <p className="architecture-eyebrow">FAILURE RECOVERY / INTERACTIVE</p>
    <h3 id="rollback-title">{tr(c.title, locale)}</h3><p className="rollback-intro">{tr(g.intro, locale)}</p>
    <p className="rollback-relationship">{tr(g.relationship, locale)}</p>
    <p className="rollback-simulation">{tr(c.simulation, locale)}</p>
    <div className="rollback-scenarios" role="group" aria-label={tr(c.title, locale)}>{rollbackScenarios.map((item, index) => <button key={item.id} aria-pressed={scenario === index} onClick={() => select(index)}><span>0{index + 1}</span>{' '}{tr(item.title, locale)}</button>)}</div>
    <section className="recovery-procedures" aria-labelledby="recovery-procedures-title"><h4 id="recovery-procedures-title">{tr(g.procedures, locale)}</h4><ol>{current.procedures.map((item, index) => <li key={index} className={`procedure-${item.mode}`}><span>{tr(g[item.mode], locale)}</span><p>{tr(item.body, locale)}</p></li>)}</ol></section>
    <div className="canary-controls rollback-controls"><button onClick={() => { if (step === 4) setStep(0); setPlaying(value => !value); }}>{tr(playing ? c.pause : c.play, locale)} {playing ? 'Ⅱ' : '▷'}</button><button disabled={step === 0} onClick={() => move(step - 1)}>{tr(c.previous, locale)}</button><button disabled={step === 4} onClick={() => move(step + 1)}>{tr(c.next, locale)}</button><button onClick={() => move(0)}>{tr(c.reset, locale)} ↺</button></div>
    <ol className="rollback-steps" aria-label={tr(c.traffic, locale)}>{phases.map((phase, index) => <li key={index} className={index <= step ? 'reached' : ''}><button aria-current={index === step ? 'step' : undefined} onClick={() => move(index)}><span>0{index + 1}</span>{' '}{tr(phase, locale)}</button></li>)}</ol>
    <div className="rollback-map-scroll" tabIndex={0} role="region" aria-label={tr(c.traffic, locale)}><div className={`rollback-map ${restoring ? 'restoring' : ''} ${broken ? 'broken' : ''}`}>
      <svg viewBox="0 0 900 370" aria-hidden="true">
        <defs><marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="currentColor" strokeWidth="2"/></marker></defs>
        <path className="rollback-wire incoming" d="M180 170H280" markerEnd={`url(#${marker})`}/>
        <path className={`rollback-wire old-route ${green < 100 ? 'has-traffic' : ''}`} d="M460 170H535V75H650" markerEnd={`url(#${marker})`}/>
        <path className={`rollback-wire new-route ${green > 0 ? 'has-traffic' : ''}`} d="M460 170H565V285H650" markerEnd={`url(#${marker})`}/>
        {step >= 2 && !current.beforeTraffic && <path className="rollback-wire rollback-command" d="M650 320H515V225H370V210" markerEnd={`url(#${marker})`}/>}
        {step >= 2 && !current.beforeTraffic && <text className="recovery-control-label" x="435" y="246">{tr(g.control, locale)}</text>}
        <text x="548" y="35">{current.beforeTraffic ? tr(g.unchanged, locale) : restoring ? tr(c.returning, locale) : tr(c.traffic, locale)}</text>
      </svg>
      <div className="rollback-tile rollback-client"><strong>Browser / API</strong><span>{tr(c.traffic, locale)}</span></div>
      <div className="rollback-tile rollback-router"><strong>{current.router}</strong><span>{current.frontend ? `LIVE → ${restoring ? 'previous release' : 'new release'}` : green === 0 ? 'live → Blue · 100%' : green === 100 ? 'live → Green · 100%' : 'live → Blue 90% + Green 10%'}</span></div>
      <div className="rollback-tile rollback-old"><strong>{current.old}</strong><span>{tr(c.old, locale)}</span><b>{100 - green}%</b></div>
      <div className={`rollback-tile rollback-new ${broken ? 'is-broken' : ''}`}><strong>{current.fresh}</strong><span>{tr(current.beforeTraffic ? g.offline : restoring ? c.isolated : broken ? c.failed : c.fresh, locale)}</span><b>{green}% {broken ? '×' : ''}</b></div>
      <span className="rollback-observer">{current.observer}</span>
    </div></div>
    {!current.beforeTraffic && <p className="architecture-fineprint">{tr(g.controlNote, locale)}</p>}
    <div className="rollback-narration" role="status"><span>0{step + 1} / 05</span><div><h4>{tr(phases[step], locale)}</h4><p>{tr(current.steps[step], locale)}</p></div></div>
    {!current.frontend && !current.beforeTraffic && <p className="architecture-fineprint">{tr(architectureCopy.weightNote, locale)}</p>}
    <aside className="rollback-boundary"><h4>{tr(c.boundary, locale)}</h4><p>{tr(current.boundary, locale)}</p></aside>
    <section className="release-hazards"><h4>{tr(g.hazards, locale)}</h4><p>{tr(g.scope, locale)}</p><div>{releaseHazards.map(item => <article key={item.title}><h5>{item.title}</h5><p>{tr(item.risk, locale)}</p><p className="hazard-response">{tr(item.response, locale)}</p></article>)}</div></section>
    <div className="cost-sources">AWS DOCS ↗ <a href="https://docs.aws.amazon.com/codepipeline/latest/userguide/approvals-approve-or-reject.html" target="_blank" rel="noreferrer">Approval</a><a href="https://docs.aws.amazon.com/codedeploy/latest/userguide/deployments-stop.html" target="_blank" rel="noreferrer">Stop deployment</a><a href="https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/publish-function.html" target="_blank" rel="noreferrer">CloudFront Publish</a></div>
  </section>;
}
