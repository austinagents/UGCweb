import Link from "next/link";
import { MovementBadge } from "@/components/movement-badge";
import { SaveButton } from "@/components/save-button";
import { Sparkline } from "@/components/sparkline";
import { TimeframeToggle } from "@/components/timeframe-toggle";
import { WorkflowStack } from "@/components/workflow-stack";
import { toolsForWorkflow, workflows } from "@/lib/data";

export default function WorkflowsPage() {
  return (
    <div className="stack">
      <section className="compactControlRow">
        <TimeframeToggle compact />
      </section>
      <div className="tableWrap">
        <table className="terminalTable">
          <thead><tr><th>Stack</th><th>Outcome</th><th>Tools</th><th>Momentum</th><th>Saves</th><th>Stack Size</th><th>Growth</th><th>Sparkline</th><th>Detail</th><th></th></tr></thead>
          <tbody>
            {workflows.map((workflow) => (
              <tr key={workflow.id}>
                <td><Link href={`/workflows/${workflow.slug}`} className="workflowNameCell"><WorkflowStack toolSlugs={workflow.toolSlugs} /><strong>{workflow.name}</strong></Link></td>
                <td>{workflow.outcome}</td>
                <td>{toolsForWorkflow(workflow).slice(0, 4).map((tool) => tool.name).join(", ")} +{Math.max(0, workflow.toolSlugs.length - 4)}</td>
                <td><span className="score">{workflow.momentumScore}</span></td>
                <td>{workflow.savesCount.toLocaleString()}</td>
                <td>{workflow.toolSlugs.length}</td>
                <td><MovementBadge value={workflow.growth24h} /></td>
                <td><Sparkline data={workflow.sparkline} /></td>
                <td><Link href={`/workflows/${workflow.slug}`} className="viewLink">View workflow</Link></td>
                <td><SaveButton kind="workflows" id={workflow.slug} label="Save" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
