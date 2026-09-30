import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { MovementBadge } from "@/components/movement-badge";
import { SaveButton } from "@/components/save-button";
import { TimeframeToggle } from "@/components/timeframe-toggle";
import { WorkflowProcessTabs } from "@/components/workflow-process-tabs";
import { WorkflowStack } from "@/components/workflow-stack";
import { creatorWorkflowRelationships, creators, evidenceSourcesForTool, getWorkflow, toolsForWorkflow, workflows } from "@/lib/data";
import type { ToolEvidenceSource } from "@/lib/types";

export function generateStaticParams() {
  return workflows.map((workflow) => ({ slug: workflow.slug }));
}

export default function WorkflowDetailPage({ params }: { params: { slug: string } }) {
  const workflow = getWorkflow(params.slug);
  if (!workflow) notFound();
  const stackTools = toolsForWorkflow(workflow);
  const workflowProcessSteps = stackTools.map((tool, index) => ({
    toolSlug: tool.slug,
    toolName: tool.name,
    officialLogoUrl: tool.officialLogoUrl,
    logoUrl: tool.logoUrl,
    faviconUrl: tool.faviconUrl,
    iconUrl: tool.iconUrl,
    task: taskForWorkflowTool(workflow.slug, tool.name),
    lookFor: lookForWorkflowTool(workflow.slug, tool.name),
    output: outputForWorkflowTool(workflow.slug, tool.name),
    connection: connectionForWorkflowTool(workflow.slug, tool.name, index === stackTools.length - 1, workflow.outcome)
  }));
  const workflowCreatorRelationships = creatorWorkflowRelationships.filter((relationship) => relationship.status === "accepted" && relationship.workflowSlug === workflow.slug);
  const related = workflows.filter((item) => item.slug !== workflow.slug && item.toolSlugs.some((slug) => workflow.toolSlugs.includes(slug))).slice(0, 4);
  const proofSources = evidenceForWorkflowStack(workflow.toolSlugs);

  return (
    <div className="stack">
      <section className="detailHeader">
        <div>
          <p className="eyebrow">Workflow</p>
          <h1>{workflow.name}</h1>
          <p>{workflow.description}</p>
        </div>
        <SaveButton kind="workflows" id={workflow.slug} />
      </section>
      <section className="terminalStatus">
        <Metric label="Momentum Score" value={workflow.momentumScore} />
        <Metric label="24h Growth" value={<MovementBadge value={workflow.growth24h} />} />
        <Metric label="7d Growth" value={<MovementBadge value={workflow.growth7d} />} />
        <Metric label="Saves" value={workflow.savesCount.toLocaleString()} />
        <Metric label="Tools in stack" value={workflow.toolSlugs.length} />
        <TimeframeToggle compact />
      </section>
      {workflowProcessSteps.length ? (
        <section className="workflowProcess">
          <div className="sectionHeader"><h2>How This Workflow Breaks Down</h2><p>Step-by-step tool sequence showing how this workflow gets completed.</p></div>
          <WorkflowProcessTabs steps={workflowProcessSteps} />
        </section>
      ) : null}
      <WorkflowProofSources evidenceItems={proofSources} workflowName={workflow.name} />
      <section className="sidePanel">
        <div className="panelHeader"><h2>Creator Relationships</h2></div>
        {workflowCreatorRelationships.length ? (
          <div className="miniList">
            {workflowCreatorRelationships.map((relationship) => {
              const creator = creators.find((item) => item.id === relationship.creatorId);
              if (!creator) return null;
              return (
                <a className="miniRow" href={`/creators/${creator.id}`} key={relationship.id}>
                  <span><strong>{creator.name}</strong><small>{relationship.supportingToolSlugs?.length ?? 0} accepted tool overlaps</small></span>
                </a>
              );
            })}
          </div>
        ) : (
          <p className="emptyState">Verified creator-workflow adoption is pending. This workflow is currently ranked by tool-stack composition and local movement signals.</p>
        )}
      </section>
      <section><div className="sectionHeader"><h2>Related Workflows</h2></div><div className="workflowGrid">{related.map((item) => <a className="workflowRow" href={`/workflows/${item.slug}`} key={item.id}><WorkflowStack toolSlugs={item.toolSlugs} /><span><strong>{item.name}</strong><small>{item.outcome}</small></span><MovementBadge value={item.growth24h} /></a>)}</div></section>
    </div>
  );
}

function WorkflowProofSources({ evidenceItems, workflowName }: { evidenceItems: ToolEvidenceSource[]; workflowName: string }) {
  const buckets = sourceTypesFor(evidenceItems);
  return (
    <section className="toolIntelPanel">
      <div className="toolPanelHeader">
        <div><h2>Proof Sources</h2><p>Public receipts discussing the {workflowName} stack.</p></div>
      </div>
      {buckets.length ? (
        <div className="toolEvidenceRow">
          {buckets.map((sourceType) => (
            <article className="toolEvidenceCard" key={sourceType}>
              <div className="toolReceiptSourceHeader"><span>{sourceTypeIcon(sourceType)}</span><strong>{sourceTypeLabel(sourceType)}</strong></div>
              <div className="toolReceiptPreviewList">
                {evidenceItems.filter((item) => item.sourceType === sourceType).slice(0, 3).map((item) => (
                  <article className="toolReceiptPreview" key={item.id}>
                    {item.sourceImageUrl ? <img src={item.sourceImageUrl} alt="" /> : null}
                    <div className="toolEvidenceIdentity"><strong>{item.sourceAuthor || item.platformLabel}</strong><p>{item.sourceTitle}</p></div>
                    {item.snippet ? <p className="toolEvidenceSnippet">{item.snippet}</p> : null}
                    <a className="toolReportCta" href={item.sourceUrl} target="_blank" rel="noreferrer">Open source →</a>
                  </article>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="emptyState">No proof sources are indexed for this workflow stack yet.</p>
      )}
    </section>
  );
}

function evidenceForWorkflowStack(toolSlugs: string[]) {
  const stackTools = toolsForWorkflow({ toolSlugs } as (typeof workflows)[number]);
  const stackNames = new Set(stackTools.map((tool) => normalizeToolName(tool.name)));
  const expectedSize = stackNames.size;
  const byId = new Map<string, ToolEvidenceSource>();

  toolSlugs.forEach((toolSlug) => {
    evidenceSourcesForTool(toolSlug).forEach((source) => {
      const matched = new Set(source.matchedTools.map(normalizeToolName));
      if (matched.size !== expectedSize) return;
      if (![...stackNames].every((toolName) => matched.has(toolName))) return;
      byId.set(source.id, source);
    });
  });

  return [...byId.values()].sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
}

function sourceTypesFor(evidenceItems: ToolEvidenceSource[]) {
  const ordered: ToolEvidenceSource["sourceType"][] = ["x", "youtube", "github", "news", "newsletter_blog", "article", "directory", "docs", "official", "other"];
  return ordered.filter((sourceType) => evidenceItems.some((item) => item.sourceType === sourceType));
}

function sourceTypeLabel(type: ToolEvidenceSource["sourceType"]) {
  if (type === "x") return "X";
  if (type === "youtube") return "YouTube";
  if (type === "github") return "GitHub";
  if (type === "docs") return "Docs";
  if (type === "official") return "Official";
  if (type === "news") return "News";
  if (type === "newsletter_blog") return "Newsletter / Blog";
  if (type === "directory") return "Directory";
  if (type === "article") return "Article";
  return "Other";
}

function sourceTypeIcon(type: ToolEvidenceSource["sourceType"]) {
  if (type === "youtube") return "YT";
  if (type === "github") return "GH";
  if (type === "newsletter_blog") return "NB";
  if (type === "directory") return "DIR";
  return sourceTypeLabel(type).slice(0, 2).toUpperCase();
}

function normalizeToolName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

type WorkflowEducationStep = {
  do: string;
  look: string;
  get: string;
  check: string;
  why: string;
};

const step = (doThis: string, look: string, get: string, check: string, why: string): WorkflowEducationStep => ({ do: doThis, look, get, check, why });

const workflowEducation: Record<string, Record<string, WorkflowEducationStep>> = {
  "solo-founder-mvp": {
    Claude: step("Describe the user, the painful job, and the result you want, then ask for the smallest version worth launching.", "Look for one target user, one core promise, one must-have action, and a clear list of features to ignore.", "MVP Plan", "You can explain the product in one sentence and name what you will not build yet.", "This prevents the classic founder mistake: building the dream product before proving the tiny version matters."),
    V0: step("Give v0 the MVP Plan and ask for the homepage, dashboard, and core user flow.", "Look for screens that make the main action obvious without extra explanation.", "Clickable Prototype", "A stranger can click through the flow and understand what the product does.", "The prototype lets you inspect the product shape before spending time on real code."),
    Cursor: step("Use the prototype as the target and build the real product behavior behind each screen.", "Look for the smallest working path: user action, saved data, and visible result.", "Working Product", "The core user can complete the promised action end to end.", "This is the moment the idea becomes usable instead of merely understandable."),
    Vercel: step("Connect the app, add production settings, and publish it to a public URL.", "Look for a clean live link, working environment variables, and no local-only setup.", "Live Website", "Someone outside your machine can open the product and try it.", "Real feedback only starts once real users can reach the product.")
  },
  "saas-in-a-weekend": {
    ChatGPT: step("Describe the SaaS idea and ask what version could realistically launch by Sunday.", "Look for one buyer, one repeated pain, one paid feature, and a two-day build boundary.", "Weekend Build Plan", "The plan fits on one page and cuts anything that does not prove demand.", "A weekend build works only when the product is small enough to finish."),
    Lovable: step("Generate the app shell from the plan, including the core pages and first working flow.", "Look for a prototype that demonstrates the paid promise, not every future feature.", "Working Prototype", "You can click through the main flow and see where the value will happen.", "This gives you a real object to improve instead of a blank project."),
    Cursor: step("Tighten the prototype by fixing the core feature, data flow, and rough edges users would notice.", "Look for the one workflow customers need to trust before anything else.", "Usable SaaS", "The main feature works reliably enough for a first user to test.", "Customers judge whether their problem is solved, not whether the prototype was AI-generated."),
    Vercel: step("Publish the SaaS publicly and make sure the live version matches the working build.", "Look for a stable URL, working sign-in or demo path, and no broken production settings.", "Live SaaS", "A user can open the link and complete the main action.", "A launched product can collect feedback; a private build cannot.")
  },
  "ai-agent-builder": {
    Claude: step("Describe one repetitive thinking task and ask Claude to turn it into an agent plan.", "Look for clear inputs, decisions, allowed actions, and the exact result the agent should return.", "Agent Plan", "The task is narrow enough that you can describe success in one sentence.", "Good agents are not general helpers; they are repeatable decision loops."),
    Cursor: step("Build the agent logic from the plan, including prompts, rules, memory needs, and outputs.", "Look for the input-to-decision-to-result path rather than a vague chatbot.", "Working Agent", "You can run a sample input and get the expected answer or action back.", "This turns the agent from an idea into a testable worker."),
    n8n: step("Connect the agent to triggers and apps such as forms, Slack, email, CRM, or databases.", "Look for the handoff points: what starts the agent, where it sends results, and who gets notified.", "Automated Agent", "The agent can run from a real trigger without you manually copying information around.", "An agent becomes useful when it lives inside the workflow where the work already happens.")
  },
  "landing-page-builder": {
    Claude: step("Explain the offer and ask Claude to clarify the problem, promise, proof, and call to action.", "Look for a message that makes the visitor think: this is for me, and I know what to do next.", "Landing Page Copy", "The headline, benefits, proof, and CTA all point to the same promise.", "A landing page is an argument before it is a design."),
    V0: step("Turn the copy into a page layout with hero, proof, offer, FAQ, and CTA sections.", "Look for hierarchy: the most important promise should be visible first.", "Landing Page Mockup", "The page can be skimmed from top to bottom without losing the story.", "Structure helps visitors understand the offer quickly enough to keep reading."),
    Framer: step("Polish the generated page, make it responsive, and publish it live.", "Look for mobile readability, clear buttons, and no distracting visual clutter.", "Live Landing Page", "The page is public, legible on mobile, and has one obvious conversion action.", "The page only starts learning once real visitors can react to it.")
  },
  "research-assistant": {
    Perplexity: step("Ask focused questions and collect sources, examples, numbers, and opposing views.", "Look for credible sources, repeated patterns, and facts that change the decision.", "Research Packet", "The packet includes links, evidence, and at least one counterpoint.", "Strong AI research starts by improving the inputs before asking for conclusions."),
    NotebookLM: step("Upload the research and ask it to group what repeats, what conflicts, and what seems irrelevant.", "Look for clusters of evidence, not isolated interesting facts.", "Research Summary", "You can name the three strongest patterns and the weakest sources.", "This separates signal from noise before you ask for judgment."),
    Claude: step("Ask Claude to turn the summary into a brief with conclusions, risks, opportunities, and next steps.", "Look for recommendations that cite evidence from the packet, not generic advice.", "Research Brief", "The brief tells you what to do next and why the evidence supports it.", "Research becomes valuable only when it changes the next decision.")
  },
  "competitive-intelligence": {
    Perplexity: step("Collect competitor pricing, positioning, features, reviews, complaints, and customer language.", "Look for promises competitors repeat and complaints customers repeat.", "Competitor Research", "You have evidence for what competitors claim and where customers are unhappy.", "You cannot find an opening until you know the existing choices."),
    NotebookLM: step("Group competitors side by side by promise, price, strengths, weaknesses, gaps, and complaints.", "Look for rows where one competitor is strong and another is visibly weak.", "Competitor Comparison Table", "The table makes gaps and repeated complaints easy to scan.", "Comparison turns scattered research into a map of where the market is vulnerable."),
    Claude: step("Ask Claude to identify the best gaps to exploit and the clearest positioning angle.", "Look for opportunities tied to customer pain, not just feature differences.", "Opportunity Report", "The report names where to compete, what to avoid, and why the opening exists.", "Strategy comes from choosing the gap where your offer can be meaningfully different.")
  },
  "founder-outbound-engine": {
    Apollo: step("Filter for companies and roles that match your ideal customer profile.", "Look for prospects with a clear reason to care now, not just a matching title.", "Prospect List", "The list has the right roles, company types, and enough volume to test.", "Outbound starts with list quality; better targeting makes every later step easier."),
    Clay: step("Enrich each prospect with company context, signals, contact data, and personalization angles.", "Look for specific facts that explain why this person belongs in the campaign.", "Qualified Lead List", "Each row has a reason for outreach and a usable personalization point.", "Enrichment turns a cold list into a list you can write to intelligently."),
    ChatGPT: step("Generate an opener, email, and follow-up using the enrichment fields.", "Look for messages that mention a real signal and make one clear ask.", "Outreach Sequence", "The message sounds written for that prospect, not a generic blast.", "Relevant messages earn replies because they reduce the recipient's effort to understand why you reached out."),
    Lindy: step("Automate the follow-up timing, reminders, reply tracking, and next actions.", "Look for a sequence that keeps moving without spamming or losing warm replies.", "Outbound Campaign", "Replies, reminders, and follow-ups are tracked without manual memory.", "Consistent follow-up is what turns good prospects into actual conversations.")
  },
  "ai-influencer": {
    ChatGPT: step("Pick a topic and ask for a short script with hook, point, example, and call to action.", "Look for a hook that creates curiosity in the first few seconds.", "Creator Script", "The script has one idea, one clear example, and no wandering setup.", "AI creator content works when the point of view is recognizable and repeatable."),
    ElevenLabs: step("Generate narration that matches the tone and pacing of the script.", "Look for a voice that sounds clear, energetic, and easy to follow.", "Voice Track", "The narration is understandable without reading captions.", "Audio carries retention; weak pacing makes even good visuals feel flat."),
    HeyGen: step("Use the voice track to create an avatar video with matching delivery and framing.", "Look for facial pacing, scene framing, and a clean export that fits the platform.", "Creator Video", "The video feels like one coherent presenter, not separate generated parts.", "The avatar makes the content feel presentable without requiring you to record yourself.")
  },
  "faceless-tiktok-engine": {
    ChatGPT: step("Write a TikTok script with hook, story beats, visual ideas, and a sharp ending.", "Look for a first line that makes the viewer want the next line.", "TikTok Content Package", "The script can be split into clear visual beats.", "Short-form content needs structure before it needs effects."),
    ElevenLabs: step("Turn the script into narration with pacing that matches the beat changes.", "Look for natural emphasis on the hook and fast, clean delivery.", "Voice Track", "The audio sets the rhythm for the edit.", "The voice track becomes the timing backbone for the whole video."),
    Kling: step("Create one visual clip for each story beat.", "Look for visuals that change when the idea changes, not decorative filler.", "Video Clips", "Each clip matches a specific line or moment in the script.", "Visual variety keeps the viewer's attention moving with the story."),
    CapCut: step("Combine voice, clips, captions, cuts, and pacing into the final short.", "Look for captions that land with the voice and cuts that remove dead time.", "Finished TikTok", "The video is understandable with sound off and feels fast without feeling chaotic.", "Editing turns generated assets into something people can actually watch.")
  },
  "faceless-youtube-channel": {
    Perplexity: step("Find a video topic with curiosity, demand, tension, and enough examples to sustain the story.", "Look for a question viewers already care about but have not fully resolved.", "Video Brief", "The brief includes title angle, key facts, examples, and the central curiosity.", "A weak topic cannot be saved by production quality."),
    Claude: step("Turn the brief into a story with opening hook, sections, transitions, and payoff.", "Look for a script that keeps raising questions and answering them in order.", "YouTube Script", "Each section has a reason to keep watching.", "Long-form retention comes from structure, not just information."),
    ElevenLabs: step("Generate narration from the script with clear pacing and emphasis.", "Look for a voice track that supports the story without sounding rushed.", "Voice Track", "The narration is clear enough to guide the entire edit.", "The voice gives the video its rhythm and personality."),
    Runway: step("Create visuals that match each section of the narration.", "Look for visuals that explain or intensify the story rather than merely decorate it.", "Finished YouTube Video", "The visuals, voice, and story feel aligned from beginning to end.", "The final video should feel like a coherent viewing experience, not a slideshow.")
  },
  "podcast-repurposing": {
    Descript: step("Upload the episode and pull out stories, quotes, lessons, and moments people would share.", "Look for segments that stand alone without needing the whole episode.", "Content Highlights", "You have several short moments with a clear idea or emotional beat.", "A long recording usually hides many smaller pieces of content."),
    Claude: step("Turn the highlights into clip concepts, post ideas, threads, and quote graphics.", "Look for multiple formats that preserve the original insight.", "Content Plan", "Each highlight has a suggested format and platform angle.", "Planning prevents you from turning every clip into the same bland snippet."),
    CapCut: step("Cut the strongest moments into short videos with captions, pacing, and emphasis.", "Look for clips that communicate the point quickly and reward the first five seconds.", "Ready-To-Post Clips", "Each clip makes sense without extra context.", "Short clips work when the idea is clear before the viewer scrolls away."),
    Typefully: step("Schedule the supporting text posts, threads, hooks, and quote posts.", "Look for a calendar that spreads the episode's ideas across several days.", "30-Day Content Calendar", "One recording now has a posting schedule, not just isolated assets.", "Distribution turns one recording into repeated audience touchpoints.")
  },
  "newsletter-operator": {
    Perplexity: step("Collect this week's stories, examples, data, and links around one reader problem.", "Look for useful information your reader would be glad you found for them.", "Research Packet", "The packet has enough evidence for a clear issue, not just a link dump.", "The best newsletters save the reader time and sharpen their judgment."),
    Claude: step("Turn the packet into an issue with headline, intro, key insights, and takeaway.", "Look for one story thread that connects the facts.", "Newsletter Draft", "The draft has a clear beginning, useful middle, and memorable takeaway.", "A newsletter is curated thinking, not a pile of links."),
    "Notion AI": step("Organize the draft, saved links, future ideas, and issue status.", "Look for a workspace that makes the next issue easier to start.", "Upcoming Newsletter Ideas", "You can see current draft, future topics, and saved research in one place.", "Consistency gets easier when the editorial memory lives outside your head."),
    Jasper: step("Polish the final draft for readability, subject line, flow, and engagement.", "Look for clearer sentences, stronger transitions, and a subject line worth opening.", "Publish-Ready Newsletter", "The issue reads smoothly and has one clear reason to send it today.", "Small writing improvements can change whether people open, finish, and share the issue.")
  },
  "daily-ai-news-channel": {
    Perplexity: step("Find AI stories from the last 24 hours that affect builders, creators, or operators.", "Look for consequence: what changed, who is affected, and why people will talk about it.", "Daily AI Brief", "The brief has a ranked story list with links and plain-English stakes.", "News works when it filters for importance, not novelty."),
    Claude: step("Turn the brief into a short episode script explaining what happened and why it matters.", "Look for simple explanations that make complex updates easy to repeat.", "News Episode Script", "A viewer could understand the update without already following AI news.", "The script turns raw announcements into a useful daily lens."),
    HeyGen: step("Create a presenter-style video from the script.", "Look for clear delivery, clean framing, and a pace that feels like a quick briefing.", "Ready-To-Publish News Video", "The video explains the top stories in minutes.", "A presenter format makes the update feel immediate and easy to consume.")
  },
  "linkedin-thought-leader": {
    Perplexity: step("Find industry conversations, repeated challenges, strong opinions, and common mistakes.", "Look for the thing your audience already feels but has not named clearly.", "Industry Insights", "You have a short list of timely tensions and audience pain points.", "Authority starts by understanding what people are already trying to make sense of."),
    Claude: step("Turn the insights into posts with a lesson, opinion, story, or practical takeaway.", "Look for a point of view that teaches, challenges, or reframes a familiar problem.", "Authority Posts", "Each post makes one sharp point and gives the reader language for it.", "Thought leadership is useful when it helps people think more clearly."),
    Taplio: step("Schedule the posts and manage publishing rhythm.", "Look for a cadence that gives each idea room to breathe and be discussed.", "Scheduled LinkedIn Posts", "The posts are queued with timing and a follow-up habit.", "Consistency builds trust because people learn what kind of insight to expect from you.")
  },
  "x-growth-engine": {
    Perplexity: step("Find active conversations, emerging narratives, and news people are already debating.", "Look for conversations with momentum where you can add a sharper angle.", "Trending Topics", "You have topics with evidence that attention already exists.", "Growth is easier when you enter active conversations instead of shouting into empty space."),
    Claude: step("Turn the topics into posts, threads, replies, and strong opinions.", "Look for concise angles that say something specific, not generic commentary.", "Posts & Threads", "The drafts include hooks, claims, and reply-worthy points.", "The goal is to contribute a useful take, not just repeat the trend."),
    Typefully: step("Schedule posts and threads into a consistent publishing rhythm.", "Look for a queue that mixes timely posts, deeper threads, and follow-up replies.", "Scheduled Posts & Threads", "You have a publishable queue for the next several days.", "Consistency compounds when good ideas are captured and shipped before the moment passes.")
  },
  "market-research-sprint": {
    Perplexity: step("Collect competitors, trends, customer segments, pricing signals, and demand evidence.", "Look for proof that people already spend time or money around this problem.", "Market Research", "You have evidence for demand, alternatives, and who the market serves.", "Market research is about reducing uncertainty before committing resources."),
    NotebookLM: step("Group the research into patterns, risks, opportunities, and unanswered questions.", "Look for repeated signals across different sources, not one-off facts.", "Market Summary", "The summary separates strong evidence from weak guesses.", "Pattern finding shows what the market is already telling you."),
    Claude: step("Write recommendations with opportunities, risks, and next steps.", "Look for decisions that are directly supported by the evidence.", "Market Opportunity Report", "The report names where to act, what to avoid, and what to test next.", "Research becomes useful when it changes the next move.")
  },
  "customer-research-engine": {
    Perplexity: step("Collect customer language from reviews, Reddit, forums, comments, and complaints.", "Look for repeated frustrations, workaround behavior, and urgent desired outcomes.", "Customer Feedback", "You have raw customer quotes grouped by source.", "Customers often describe the product roadmap before teams notice it."),
    NotebookLM: step("Group the feedback into complaints, desired outcomes, requests, and patterns.", "Look for pain that appears often, sounds urgent, and points to behavior.", "Pain Point Summary", "The summary ranks pain points by repetition and intensity.", "Patterned pain is more useful than loud but isolated feedback."),
    Claude: step("Turn the pain points into product opportunities and improvement priorities.", "Look for opportunities tied to repeated customer pain and clear business value.", "Product Opportunities", "You can name what to build, improve, or ignore next.", "Customer research becomes a roadmap when it points to specific choices.")
  },
  "product-discovery": {
    Perplexity: step("Find product opportunities by looking for market gaps, underserved users, and unmet needs.", "Look for evidence that the problem is painful, repeated, and poorly solved today.", "Opportunity List", "The list includes who has the problem and what they do now.", "Most ideas sound good until you compare them with real demand."),
    Claude: step("Score the opportunities by demand, competition, build speed, and evidence quality.", "Look for the idea with the best evidence-to-effort ratio, not the most exciting idea.", "Winning Idea", "The selected idea has a clear reason to win and a clear reason to start small.", "Discovery is choosing what deserves execution."),
    Linear: step("Turn the chosen idea into milestones, priorities, and first tasks.", "Look for a roadmap where the first milestone tests the riskiest assumption.", "Build Roadmap", "The roadmap shows what to build first and what can wait.", "A good idea only becomes real when it turns into sequenced work.")
  },
  "design-to-code": {
    Ideogram: step("Generate visual directions with layout, typography, color, and product mood references.", "Look for a style that fits the product promise and user expectation.", "Design References", "You have visual options with a clear direction to keep and directions to reject.", "Design references teach the AI taste, hierarchy, and mood before code exists."),
    V0: step("Turn the chosen references into interface mockups.", "Look for screens with clear hierarchy, readable sections, and obvious user actions.", "Interface Mockups", "The mockups show the main screens and interaction path.", "Mockups let you evaluate the experience before implementation."),
    Cursor: step("Convert the mockups into working frontend code.", "Look for faithful layout, real components, and clean interaction states.", "Working Frontend", "The interface runs in code and preserves the intended structure.", "Code turns the design direction into usable software.")
  },
  "ai-executive-assistant": {
    ChatGPT: step("Paste tasks, meetings, loose notes, deadlines, and obligations, then ask what to focus on first.", "Look for urgency, leverage, dependencies, and anything waiting on someone else.", "Prioritized Plan", "You know the top priorities, what can wait, and what needs a decision.", "The first job of an assistant is to reduce mental clutter into choices."),
    "Notion AI": step("Turn the plan into projects, task lists, priorities, and a daily view.", "Look for a dashboard that shows today, this week, blocked items, and follow-ups.", "Daily Dashboard", "You can open one page and know what matters now.", "A dashboard helps you trust the plan instead of rethinking everything each morning."),
    Zapier: step("Automate reminders and recurring actions from the dashboard.", "Look for tasks that repeat, deadlines that slip, and reminders you should not remember manually.", "Automatic Reminders", "Important reminders now fire without you checking the system.", "Automation protects the plan from being forgotten.")
  },
  "agency-prospecting": {
    Apollo: step("Find companies that match your ideal client profile by industry, size, location, and decision maker role.", "Look for accounts where your service can solve a visible business problem.", "Prospect List", "The list contains companies and roles that match the offer.", "Good prospecting starts by narrowing the market to people likely to care."),
    Clay: step("Research each prospect with company details, hiring signals, growth clues, and personalization angles.", "Look for a specific reason this company might need help now.", "Qualified Lead List", "Each lead has contact data and a credible outreach angle.", "Qualification gives the message a reason to exist."),
    ChatGPT: step("Write the opening message, email, and follow-up using the qualification details.", "Look for messages that connect your service to a visible prospect signal.", "Outreach Messages", "The message is specific enough that it could not be sent to everyone.", "Personalization works when it proves you understand the prospect's situation."),
    HubSpot: step("Track conversations, deal stage, next action, and opportunity value.", "Look for a pipeline that shows who needs follow-up and what happened last.", "Active Deal Pipeline", "Every opportunity has a status and next step.", "A pipeline prevents warm conversations from disappearing.")
  },
  "b2b-lead-research": {
    Apollo: step("Find companies that match your target market.", "Look for company size, industry, geography, and buying fit.", "Target Company List", "The list contains companies that plausibly need the offer.", "Good lead research starts with the right accounts."),
    Clay: step("Find decision makers, contact details, and buying signals inside each company.", "Look for who owns the problem and what suggests they may care now.", "Decision Maker List", "Each company has a likely buyer and supporting signal.", "Knowing who influences the decision makes outreach more precise."),
    ChatGPT: step("Summarize each opportunity with fit, likely pain, trigger, and value proposition.", "Look for a short account note that makes the outreach angle obvious.", "Lead Research Notes", "Each lead has a clear why them, why now, and what to say.", "Lead research is useful when it makes the next message easier to write.")
  },
  "linkedin-lead-engine": {
    LinkedIn: step("Find people matching the ideal customer profile by title, industry, company, and location.", "Look for people whose role suggests they feel the problem you solve.", "Prospect List", "The list contains specific people, not vague audiences.", "LinkedIn works best when the search starts with the person behind the account."),
    Clay: step("Research each prospect with company context, contact data, and personalization opportunities.", "Look for details that explain what they care about professionally.", "Qualified Lead List", "Each prospect has context you can use without sounding forced.", "Context makes connection requests feel relevant instead of random."),
    ChatGPT: step("Write connection requests and follow-up messages.", "Look for short messages that create curiosity without pitching too hard.", "LinkedIn Outreach Messages", "The message is specific, respectful, and easy to respond to.", "Better conversations start with lower-friction first touches."),
    Taplio: step("Publish posts that support the same theme as the outreach.", "Look for posts that make your profile prove expertise before prospects reply.", "Authority Posts", "The content reinforces the problem your outreach mentions.", "Prospects are warmer when your profile explains why you are credible.")
  },
  "local-business-prospecting": {
    "Google Maps": step("Find businesses by category, location, ratings, and review patterns.", "Look for businesses with visible demand, outdated presence, or repeated customer complaints.", "Business List", "The list includes local businesses with a plausible service gap.", "Reviews and listings are public evidence of unmet needs."),
    Clay: step("Find owners, decision makers, contact details, and business signals.", "Look for a real person to contact and a reason the outreach is relevant.", "Qualified Prospect List", "Each business has a contact path and a specific angle.", "Local outreach works when it connects to something visible about the business."),
    ChatGPT: step("Write a short outreach message and follow-up using the business details.", "Look for language that mentions the business context without sounding automated.", "Local Outreach Messages", "The message feels local, specific, and easy to answer.", "Relevant messages create more replies because they feel less like mass email.")
  },
  "recruiter-outreach-system": {
    LinkedIn: step("Find recruiters hiring for roles you want by company, industry, and job title.", "Look for recruiters connected to active roles that match your background.", "Recruiter List", "The list contains recruiters tied to realistic opportunities.", "The right recruiter can shorten the path to the right role."),
    ChatGPT: step("Write connection requests, introductions, and follow-ups.", "Look for messages that show fit quickly and reduce the recruiter's effort.", "Recruiter Outreach Messages", "The message makes your target role and relevant proof obvious.", "Strong introductions get responses because they make the recruiter's job easier."),
    HubSpot: step("Track every recruiter, company, role, last touch, and next follow-up.", "Look for a simple view of who replied, who needs follow-up, and where each role stands.", "Active Recruiter Conversations", "No conversation is relying on memory.", "Tracking keeps opportunities alive long enough to turn into interviews.")
  },
  "crm-automation": {
    ChatGPT: step("Map where leads come from, what happens next, and which handoffs are repeated.", "Look for every moment a human currently remembers, copies, routes, or follows up.", "Sales Process Map", "The map shows trigger, owner, next action, and failure point for each handoff.", "You cannot automate a process you cannot describe."),
    Zapier: step("Connect forms, CRM, email, calendar, and notifications for the basic lead flow.", "Look for the simple handoffs that should happen every time.", "Automated Lead Flow", "A new lead can move through the first steps without manual copying.", "Basic automation removes the repetitive work that slows response time."),
    Make: step("Build advanced branches for routing, missing fields, duplicate leads, and exceptions.", "Look for edge cases that break simple automations.", "Automated CRM System", "The system handles common exceptions without losing the lead.", "Advanced automation makes the process reliable when real-world data gets messy.")
  },
  "meeting-intelligence": {
    Granola: step("Capture meeting notes automatically while you stay focused on the conversation.", "Look for decisions, questions, commitments, and moments of disagreement.", "Meeting Notes", "The notes preserve what changed, not just what was said.", "Good capture lets you participate instead of typing through the meeting."),
    ChatGPT: step("Extract decisions, owners, deadlines, blockers, opportunities, and open questions.", "Look for action that someone owns and information that changes the plan.", "Key Decisions & Action Items", "Every important item has an owner or a clear next step.", "A meeting summary is useful when it turns conversation into accountable work."),
    Linear: step("Turn action items into assigned tasks.", "Look for tasks with owner, deadline, scope, and priority.", "Execution Plan", "The meeting ends with trackable work, not vague agreement.", "Meetings create value only when decisions become follow-through.")
  },
  "business-operations-hub": {
    ChatGPT: step("List projects, priorities, owners, deadlines, bottlenecks, and recurring updates.", "Look for what is active, what is blocked, what repeats, and who owns each item.", "Business Priorities", "You can see the work that matters and the work creating drag.", "Operations begins with visibility: what is happening, who owns it, and what keeps repeating."),
    "Notion AI": step("Organize the information into dashboards, project pages, and operating notes.", "Look for one place where status, owners, docs, and next actions are easy to find.", "Operations Dashboard", "A teammate can open the workspace and understand the current state.", "A shared dashboard reduces coordination because the answer has a home."),
    Zapier: step("Automate recurring updates, reminders, and notifications from the dashboard.", "Look for status checks and reminders that should happen without a meeting.", "Automated Workflows", "Routine updates reach the right people without manual chasing.", "Automation protects the operating rhythm from depending on memory.")
  },
  "ai-content-repurposing": {
    Claude: step("Paste existing content and ask what ideas, claims, examples, and moments are worth reusing.", "Look for ideas that can stand alone in a different format.", "Repurposing Plan", "The plan identifies which parts become posts, threads, summaries, or hooks.", "Repurposing is translation, not copying."),
    ChatGPT: step("Transform the selected ideas into posts, threads, summaries, and hooks.", "Look for formats that fit how each platform is consumed.", "Repurposed Content", "Each asset makes sense without the original piece beside it.", "The same idea can reach more people when it is reshaped for different attention contexts."),
    Typefully: step("Schedule and organize the repurposed posts.", "Look for a publishing rhythm that spreads the idea without exhausting it.", "Content Calendar", "The assets are queued across days with clear formats and topics.", "Consistent distribution turns one good idea into repeated reach.")
  },
  "customer-support-automation": {
    Glean: step("Collect FAQs, documentation, previous tickets, and policy answers.", "Look for repeatable questions, approved answers, and issues that need escalation.", "Support Knowledge Base", "The knowledge base contains accurate answers and escalation boundaries.", "Good support automation starts with trustworthy source material."),
    Claude: step("Turn the knowledge into response templates, escalation paths, and support rules.", "Look for answers that are consistent but still clear and human.", "Support Playbook", "The playbook tells the assistant what to answer, when to escalate, and what not to guess.", "Support needs judgment rules, not just saved replies."),
    Lindy: step("Automate common support interactions such as FAQs, routing, and follow-ups.", "Look for cases that are safe to handle automatically and cases that need a person.", "Support Assistant", "Common questions get answered while sensitive issues are routed correctly.", "Automation improves support when it separates routine answers from human judgment."),
    Zapier: step("Connect support actions to ticketing, product, and operations updates.", "Look for handoffs that keep teams informed after a support event.", "Connected Support System", "Resolved issues, escalations, and product signals reach the right place.", "Support becomes smarter when customer issues feed the rest of the business.")
  }
};

function educationForWorkflowTool(workflowSlug: string, toolName: string) {
  return workflowEducation[workflowSlug]?.[toolName];
}

function taskForWorkflowTool(workflowSlug: string, toolName: string) {
  const education = educationForWorkflowTool(workflowSlug, toolName);
  return education?.do ?? "Review this tool's role in the workflow and use it to create the artifact needed for the next step.";
}

function lookForWorkflowTool(workflowSlug: string, toolName: string) {
  const education = educationForWorkflowTool(workflowSlug, toolName);
  return education ? `${education.look} ${education.check}` : "A concrete artifact that is clear enough to move into the next step.";
}

function outputForWorkflowTool(workflowSlug: string, toolName: string) {
  return educationForWorkflowTool(workflowSlug, toolName)?.get ?? "Workflow Artifact";
}

function connectionForWorkflowTool(workflowSlug: string, toolName: string, isFinalStep: boolean, workflowOutcome: string) {
  const education = educationForWorkflowTool(workflowSlug, toolName);
  return education?.why ?? (isFinalStep ? workflowOutcome : "Each step should reduce ambiguity before the workflow continues.");
}
