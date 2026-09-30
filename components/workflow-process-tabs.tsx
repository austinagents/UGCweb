"use client";

import { useState } from "react";
import Link from "next/link";
import { ToolLogo } from "./tool-logo";

export type WorkflowProcessStep = {
  toolSlug: string;
  toolName: string;
  officialLogoUrl: string;
  logoUrl: string;
  faviconUrl: string;
  iconUrl: string;
  task: string;
  lookFor?: string;
  output: string;
  connection: string;
};

export function WorkflowProcessTabs({ steps }: { steps: WorkflowProcessStep[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedStep = steps[selectedIndex] ?? steps[0];

  if (!selectedStep) return null;

  return (
    <div className="workflowProcessTabs">
      <div className="workflowProcessNav" aria-label="Workflow process steps">
        {steps.map((step, index) => (
          <div className={`workflowProcessStep${index === selectedIndex ? " active" : ""}`} key={`${step.toolName}-${index}`}>
            <div className="workflowProcessStepTop">
              <button className="workflowProcessStepButton workflowProcessStepNumber" type="button" onClick={() => setSelectedIndex(index)}>
                <small>Step {index + 1}</small>
              </button>
            </div>
            <div className="workflowProcessToolRow">
              <Link className="workflowProcessLogoLink" href={`/tools/${step.toolSlug}`} aria-label={`View ${step.toolName}`} title={`View ${step.toolName}`}>
                <ToolLogo officialSrc={step.officialLogoUrl} src={step.logoUrl} faviconSrc={step.faviconUrl} fallback={step.iconUrl} alt="" size={22} />
              </Link>
              <button className="workflowProcessStepButton" type="button" onClick={() => setSelectedIndex(index)}>
                <strong>{step.toolName}</strong>
              </button>
            </div>
            <button className="workflowProcessStepButton" type="button" onClick={() => setSelectedIndex(index)}>
              <span>{step.output}</span>
            </button>
          </div>
        ))}
      </div>
      <div className="workflowProcessDetail">
        <article className="workflowProcessPanel">
          <small>Step {selectedIndex + 1}</small>
          <h3>{selectedStep.toolName}</h3>
          {selectedStep.lookFor ? (
            <>
              <div className="workflowProcessMeta"><span>What to do</span><strong>{selectedStep.task}</strong></div>
              <div className="workflowProcessMeta"><span>What to look for</span><strong>{selectedStep.lookFor}</strong></div>
              <div className="workflowProcessMeta"><span>Output</span><strong>{selectedStep.output}</strong></div>
              <div className="workflowProcessMeta"><span>Why this step matters</span><strong>{selectedStep.connection}</strong></div>
            </>
          ) : (
            <>
              <p>{selectedStep.task}</p>
              <div className="workflowProcessMeta"><span>Output</span><strong>{selectedStep.output}</strong></div>
              <div className="workflowProcessMeta"><span>Why this step matters</span><strong>{selectedStep.connection}</strong></div>
            </>
          )}
        </article>
      </div>
    </div>
  );
}
