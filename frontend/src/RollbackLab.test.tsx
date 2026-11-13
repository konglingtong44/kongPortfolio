import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { RollbackLab } from './RollbackLab';
import { recoveryGraph, recoveryGroups } from './recoveryMapData';
import { tr } from './architectureData';

function choose(group: string, route?: string) {
  fireEvent.click(screen.getByRole('button', { name: new RegExp(group) }));
  if (route) fireEvent.click(within(screen.getByRole('group', { name: 'Specific case' })).getByRole('button', { name: route }));
}
function tile(title: string, sub = '') { return screen.getByRole('button', { name: (_name, element) => element.querySelector('strong')?.textContent === title && element.textContent!.includes(sub) }); }
function story() { return document.getElementById('architecture-node-story')!; }

it('groups recovery by five mechanisms and removes the simulation badge and separate player', () => {
  const { container } = render(<RollbackLab locale="en"/>);
  expect(within(screen.getByRole('group', { name: 'When a release goes wrong' })).getAllByRole('button')).toHaveLength(5);
  expect(screen.queryByText(/simulation|no AWS actions/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Play animation/ })).not.toBeInTheDocument();
  expect(container.querySelector('.architecture-canvas')).toBeInTheDocument();
  expect(container.querySelectorAll('.architecture-node')).toHaveLength(8);
});

it('uses the shared node selection, tooltip markup and connected animated wires', () => {
  const { container } = render(<RollbackLab locale="en"/>);
  const codebuild = tile('CodeBuild');
  fireEvent.focus(codebuild);
  expect(codebuild).toHaveAttribute('aria-pressed', 'true');
  expect(codebuild).toHaveAttribute('aria-controls', 'architecture-node-story');
  expect(codebuild.querySelector('.node-tooltip')).toHaveTextContent('report failures to CodePipeline');
  expect(story()).toHaveTextContent('report failures to CodePipeline');
  fireEvent.mouseEnter(tile('Engineer'));
  expect(story()).toHaveTextContent('Inspect failed CodeBuild logs');
  expect(container.querySelectorAll('.architecture-wires .wire-active path').length).toBeGreaterThan(0);
  fireEvent.click(tile('New candidate'));
  expect(story()).toHaveTextContent('both approvals');
});

it('keeps production unchanged for both verification failures and both rejected approvals', () => {
  render(<RollbackLab locale="en"/>);
  for (const [group, route] of [['Failed verification', 'Build / STG'], ['Failed verification', 'Direct Green check'], ['Rejected approval', 'Approval ①'], ['Rejected approval', 'Approval ②']]) {
    choose(group, route);
    for (const outcome of ['When the fault occurs', 'After handling']) {
      fireEvent.click(screen.getByRole('button', { name: outcome }));
      expect(tile('Blue')).toHaveTextContent('Production 100%');
      expect(tile('Green / Candidate')).toHaveTextContent('Production 0%');
    }
  }
  choose('Rejected approval', 'Approval ①');
  fireEvent.click(tile('Green / Candidate'));
  expect(story()).toHaveTextContent('not created');
  choose('Rejected approval', 'Approval ②');
  fireEvent.click(tile('ApproveTrafficShift'));
  expect(story()).toHaveTextContent('submit Reject and a reason');
});

it('distinguishes human, script, deployment failure and alarm recovery triggers', () => {
  render(<RollbackLab locale="en"/>);
  choose('Backend release recovery', 'Human detects bad behavior');
  fireEvent.click(tile('Stop + rollback'));
  expect(story()).toHaveTextContent('Stopping CodePipeline alone does not restore traffic');
  choose('Backend release recovery', 'Script health check fails');
  fireEvent.click(tile('Deployment script'));
  expect(story()).toHaveTextContent('separate CodeDeploy restore');
  choose('Backend release recovery', 'Deployment itself fails');
  fireEvent.click(tile('Auto rollback'));
  expect(story()).toHaveTextContent('DEPLOYMENT_FAILURE');
  choose('Backend release recovery', 'CloudWatch alarm');
  fireEvent.click(tile('CloudWatch'));
  expect(story()).toHaveTextContent('without a human Stop');
  expect(tile('Blue')).toHaveTextContent('90%');
  fireEvent.click(screen.getByRole('button', { name: 'After handling' }));
  expect(tile('Blue')).toHaveTextContent('100%');
  expect(tile('Green / Candidate')).toHaveTextContent('0%');
});

it('only animates live traffic connections and resets routing when switching cases', () => {
  const { container } = render(<RollbackLab locale="en"/>);
  fireEvent.click(tile('Lambda · live'));
  expect(container.querySelector('.wire-inactive')).not.toHaveClass('wire-active');
  choose('Backend release recovery', 'CloudWatch alarm');
  fireEvent.click(screen.getByRole('button', { name: 'After handling' }));
  expect(tile('Blue')).toHaveTextContent('100%');
  choose('Backend release recovery', 'Human detects bad behavior');
  expect(tile('Blue')).toHaveTextContent('90%');
  expect(screen.getByRole('button', { name: 'When the fault occurs' })).toHaveAttribute('aria-pressed', 'true');
});

it('keeps frontend restoration separate from backend alias rollback', () => {
  render(<RollbackLab locale="en"/>);
  choose('Frontend restoration', 'Publication script running');
  fireEvent.click(tile('Release script'));
  expect(story()).toHaveTextContent('Refuse to overwrite concurrent changes');
  expect(tile('S3 · new release')).toHaveTextContent('100%');
  fireEvent.click(screen.getByRole('button', { name: 'After handling' }));
  expect(tile('S3 · old release')).toHaveTextContent('100%');
  choose('Frontend restoration', 'Page fault after publication');
  expect(screen.queryByRole('button', { name: /^CodeDeploy / })).not.toBeInTheDocument();
  fireEvent.click(tile('CloudFront Function', 'Human republishes old route'));
  expect(story()).toHaveTextContent('DEVELOPMENT route, Test, Publish');
});

it('models post-exit API recovery as a new release with both fresh approvals', () => {
  render(<RollbackLab locale="en"/>);
  choose('API re-release after completion');
  expect(tile('Faulty version')).toHaveTextContent('100%');
  expect(tile('Recovery candidate')).toHaveTextContent('0%');
  expect(tile('ApproveProduction')).toBeInTheDocument();
  expect(tile('ApproveTrafficShift')).toBeInTheDocument();
  fireEvent.click(tile('CodeDeploy'));
  expect(story()).toHaveTextContent('baseline, which may still be faulty');
  fireEvent.click(screen.getByRole('button', { name: 'After handling' }));
  expect(tile('Faulty version')).toHaveTextContent('0%');
  expect(tile('Recovery candidate')).toHaveTextContent('100%');
  expect(story()).toHaveTextContent('10% for five minutes');
});

it('renders every case in Japanese, Chinese and English without network requests', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch');
  for (const locale of ['ja', 'zh', 'en'] as const) {
    const { container, unmount } = render(<RollbackLab locale={locale}/>);
    for (const group of recoveryGroups) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(tr(group.title, locale)) }));
      for (const route of group.routes) {
        fireEvent.click(within(container.querySelector('.recovery-cases') as HTMLElement).getByRole('button', { name: tr(route.title, locale) }));
        expect(container.querySelector('.recovery-summary')).toHaveTextContent(tr(route.summary, locale));
        for (const node of container.querySelectorAll<HTMLButtonElement>('.architecture-node')) {
          fireEvent.focus(node);
          expect(story().textContent).not.toMatch(/undefined/);
          expect(node).toHaveAttribute('aria-pressed', 'true');
        }
      }
    }
    unmount();
  }
  expect(fetchSpy).not.toHaveBeenCalled(); fetchSpy.mockRestore();
});

it('keeps every graph connected, uniquely identified and inside the common canvas', () => {
  for (const group of recoveryGroups) for (const route of group.routes) for (const recovered of [false, true]) {
    const { nodes, edges } = recoveryGraph(route, recovered);
    const ids = new Set(nodes.map(node => node.id));
    expect(ids.size).toBe(nodes.length);
    for (const node of nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0); expect(node.x + 180).toBeLessThanOrEqual(1070);
      expect(node.y).toBeGreaterThanOrEqual(0); expect(node.y + 90).toBeLessThanOrEqual(620);
    }
    for (const edge of edges) { expect(ids.has(edge.from)).toBe(true); expect(ids.has(edge.to)).toBe(true); }
    for (const node of nodes) expect(edges.some(edge => edge.from === node.id || edge.to === node.id)).toBe(true);
  }
});
