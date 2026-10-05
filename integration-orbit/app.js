const STORAGE_KEY = "orbit-board-v1";
const COMMUNICATION_KEY = "orbit-communication-v1";
const GUARDRAIL_KEY = "orbit-ai-guardrails-v1";
const BOARD_META_KEY = "orbit-board-meta-v1";
const AUDIT_KEY = "orbit-audit-v1";
const ADMIN_KEY = "orbit-admin-v1";
const MEMBERS_KEY = "orbit-members-v1";
const GROUPS_KEY = "orbit-groups-v1";
const ACL_KEY = "orbit-acl-v1";
const API_POLICY_KEY = "orbit-api-policy-v1";
const IR_STATE_KEY = "orbit-ir-state-v1";
const PERMISSIONS = [
  { id: "read", label: "Read board" },
  { id: "edit", label: "Edit tasks" },
  { id: "discuss", label: "Discuss" },
  { id: "analytics", label: "View analytics" },
  { id: "agents", label: "Run bots" },
  { id: "admin", label: "Manage access" },
];
const STATUSES = [
  { id: "todo", title: "To do", className: "column-todo" },
  { id: "doing", title: "In progress", className: "column-doing" },
  { id: "done", title: "Done", className: "column-done" },
];

const seedTasks = [
  { id: "task-1", title: "Finalize product positioning", description: "Align on the core story and what makes us different.", status: "todo", label: "Strategy", priority: "High", assignee: "Alex Lee", initials: "AL", due: "2026-10-12", comments: [] },
  { id: "task-2", title: "Plan launch announcement", description: "Draft the rollout plan for our launch channels.", status: "todo", label: "Marketing", priority: "Medium", assignee: "Jamie Davis", initials: "JD", due: "2026-10-16", comments: [] },
  { id: "task-3", title: "Collect customer testimonials", description: "Reach out to beta users for a few short quotes.", status: "todo", label: "Content", priority: "Low", assignee: "Taylor Stone", initials: "TS", due: "", comments: [] },
  { id: "task-4", title: "Design the launch landing page", description: "Create a focused page that makes it easy to understand and try the product.", status: "doing", label: "Design", priority: "High", assignee: "Morgan Kim", initials: "MK", due: "2026-10-08", comments: [{ author: "Morgan Kim", initials: "MK", text: "First concept is ready for a review. Let me know what you think!", at: "Today, 10:24 AM" }, { author: "Alex Lee", initials: "AL", text: "Looking good — could we bring the customer quote up a little higher?", at: "Today, 11:02 AM" }] },
  { id: "task-5", title: "Set up product analytics", description: "Instrument the key activation and onboarding events.", status: "doing", label: "Development", priority: "Medium", assignee: "Jordan Rivera", initials: "JR", due: "2026-10-10", comments: [] },
  { id: "task-6", title: "QA onboarding flow", description: "Test the first-run experience across desktop and mobile.", status: "doing", label: "Development", priority: "High", assignee: "Alex Lee", initials: "AL", due: "", comments: [] },
  { id: "task-7", title: "Interview beta customers", description: "Summarize feedback and identify the biggest launch-day wins.", status: "done", label: "Research", priority: "Medium", assignee: "Taylor Stone", initials: "TS", due: "2026-10-02", comments: [] },
  { id: "task-8", title: "Create visual identity", description: "Lock in colors, type, and core launch graphics.", status: "done", label: "Design", priority: "Low", assignee: "Morgan Kim", initials: "MK", due: "2026-10-01", comments: [] },
];

let tasks = loadTasks();
let activeTaskId = null;
let searchTerm = "";
let highPriorityOnly = false;
let toastTimer;
let communication = loadCommunication();
let guardrails = loadGuardrails();
let boardMeta = loadBoardMeta();
let auditEvents = loadAuditEvents();
let adminSettings = loadAdminSettings();
let members = loadMembers();
let directoryGroups = loadDirectoryGroups();
let userAcl = loadUserAcl();
let apiPolicy = loadApiPolicy();
let irState = loadIrState();
let generatedTicketTitles = [];
let selectedElasticEventId = null;

const columns = document.querySelector("#board-columns");
const taskDialog = document.querySelector("#task-dialog");
const shareDialog = document.querySelector("#share-dialog");
const taskForm = document.querySelector("#task-form");
const toast = document.querySelector("#toast");

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(seedTasks);
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.some((task) => !isValidTask(task))) {
      throw new Error("Saved board data is not a valid task list.");
    }
    return parsed;
  } catch (error) {
    console.error("Could not load the saved board.", error);
    return structuredClone(seedTasks);
  }
}

function isValidTask(task) {
  return task && typeof task.id === "string" && typeof task.title === "string" &&
    STATUSES.some((status) => status.id === task.status);
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function loadBoardMeta() {
  try {
    const saved = JSON.parse(localStorage.getItem(BOARD_META_KEY));
    if (saved && typeof saved.name === "string" && typeof saved.description === "string") return saved;
  } catch (error) {
    console.error("Could not load board settings.", error);
  }
  return { name: "Product launch", description: "Everything we need to make launch day a success." };
}

function loadAuditEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIT_KEY));
    if (Array.isArray(saved)) return saved.map(normalizeAuditEvent).filter(Boolean);
  } catch (error) {
    console.error("Could not load local audit events.", error);
  }
  const now = Date.now();
  return [
    createAuditEvent("security", "Workspace board initialized", "Local-first demo session started", "Orbit system", now - 3_600_000),
    createAuditEvent("task", "Launch checklist imported", "Markdown task list loaded", "Jamie Davis", now - 1_800_000),
    createAuditEvent("communication", "Team discussion opened", "Board communication channel viewed", "Jamie Davis", now - 900_000),
  ];
}

function loadAdminSettings() {
  const defaults = { retentionDays: "90", maskSensitive: true, logExternal: true, restrictIntegrations: true, shareAnalyticsBots: true };
  try {
    const saved = JSON.parse(localStorage.getItem(ADMIN_KEY));
    if (!saved) return defaults;
    return {
      retentionDays: ["30", "90", "365"].includes(String(saved.retentionDays)) ? String(saved.retentionDays) : defaults.retentionDays,
      maskSensitive: saved.maskSensitive !== false,
      logExternal: saved.logExternal !== false,
      restrictIntegrations: saved.restrictIntegrations !== false,
      shareAnalyticsBots: saved.shareAnalyticsBots !== false,
    };
  } catch (error) {
    console.error("Could not load administrative settings.", error);
    return defaults;
  }
}

function loadMembers() {
  const defaults = [
    { email: "jamie@studionorth.co", role: "Admin", kind: "human" },
    { email: "morgan@studionorth.co", role: "Member", kind: "human" },
    { email: "alex@studionorth.co", role: "Viewer", kind: "human" },
    { email: "orbit-analytics-bot", role: "Analytics bot", kind: "bot" },
  ];
  try {
    const saved = JSON.parse(localStorage.getItem(MEMBERS_KEY));
    if (Array.isArray(saved) && saved.every((member) => member && typeof member.email === "string")) return saved;
  } catch (error) {
    console.error("Could not load workspace members.", error);
  }
  return defaults;
}

function defaultPermissions() {
  return Object.fromEntries(PERMISSIONS.map((permission) => [permission.id, false]));
}

function loadDirectoryGroups() {
  const defaults = [
    { id: "group-admins", name: "Workspace Admins", members: ["jamie@studionorth.co"], permissions: { read: true, edit: true, discuss: true, analytics: true, agents: true, admin: true } },
    { id: "group-contributors", name: "Project Contributors", members: ["morgan@studionorth.co"], permissions: { read: true, edit: true, discuss: true, analytics: true, agents: false, admin: false } },
    { id: "group-analytics", name: "Analytics Readers", members: ["alex@studionorth.co", "orbit-analytics-bot"], permissions: { read: true, edit: false, discuss: false, analytics: true, agents: false, admin: false } },
  ];
  try {
    const saved = JSON.parse(localStorage.getItem(GROUPS_KEY));
    if (Array.isArray(saved) && saved.every((group) => group && typeof group.id === "string" && typeof group.name === "string" && Array.isArray(group.members))) {
      return saved.map((group) => ({
        id: group.id,
        name: group.name,
        members: group.members.filter((email) => typeof email === "string"),
        permissions: Object.fromEntries(PERMISSIONS.map(({ id }) => [id, group.permissions?.[id] === true])),
      }));
    }
  } catch (error) {
    console.error("Could not load directory groups.", error);
  }
  return defaults;
}

function loadUserAcl() {
  try {
    const saved = JSON.parse(localStorage.getItem(ACL_KEY));
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      return Object.fromEntries(Object.entries(saved).map(([email, permissions]) => [
        email,
        Object.fromEntries(PERMISSIONS.map(({ id }) => [id, permissions?.[id]]).filter(([, value]) => typeof value === "boolean")),
      ]));
    }
  } catch (error) {
    console.error("Could not load individual access policies.", error);
  }
  return {};
}

function loadApiPolicy() {
  const defaults = { perAgent: 6, perWorkspace: 20, concurrency: 2, spacingSeconds: 10, queueSize: 10, maxRetries: 1, approveWrites: true, autoQueue: true };
  const ranges = { perAgent: [1, 30], perWorkspace: [1, 120], concurrency: [1, 5], spacingSeconds: [2, 120], queueSize: [1, 100], maxRetries: [0, 3] };
  try {
    const saved = JSON.parse(localStorage.getItem(API_POLICY_KEY));
    if (!saved) return defaults;
    return {
      ...Object.fromEntries(Object.entries(ranges).map(([key, [minimum, maximum]]) => [
        key,
        Number.isInteger(saved[key]) && saved[key] >= minimum && saved[key] <= maximum ? saved[key] : defaults[key],
      ])),
      approveWrites: saved.approveWrites !== false,
      autoQueue: saved.autoQueue !== false,
    };
  } catch (error) {
    console.error("Could not load API rate policies.", error);
    return defaults;
  }
}

function loadIrState() {
  try {
    const saved = JSON.parse(localStorage.getItem(IR_STATE_KEY));
    if (saved && typeof saved === "object" && !Array.isArray(saved)) {
      return {
        reviewed: Array.isArray(saved.reviewed) ? saved.reviewed.filter((id) => typeof id === "string") : [],
        cases: Array.isArray(saved.cases) ? saved.cases.filter((item) => item && typeof item.id === "string" && typeof item.title === "string" && Array.isArray(item.eventIds)) : [],
      };
    }
  } catch (error) {
    console.error("Could not load local investigation state.", error);
  }
  return { reviewed: [], cases: [] };
}

function persistIrState() {
  localStorage.setItem(IR_STATE_KEY, JSON.stringify(irState));
}

function effectivePermissions(member) {
  const roleDefaults = {
    Admin: { read: true, edit: true, discuss: true, analytics: true, agents: true, admin: true },
    Member: { read: true, edit: true, discuss: true, analytics: true, agents: false, admin: false },
    Viewer: { read: true, edit: false, discuss: true, analytics: true, agents: false, admin: false },
    "Analytics bot": { read: true, edit: false, discuss: false, analytics: true, agents: false, admin: false },
  };
  const permissions = { ...(roleDefaults[member.role] || defaultPermissions()) };
  directoryGroups.filter((group) => group.members.includes(member.email)).forEach((group) => {
    PERMISSIONS.forEach(({ id }) => { permissions[id] ||= group.permissions[id] === true; });
  });
  return { ...permissions, ...(userAcl[member.email] || {}) };
}

function escapeLdapRdn(value) {
  return value.replace(/([,+"\\<>;=])/g, "\\$1").replace(/^ /, "\\ ").replace(/ $/, "\\ ");
}

function recordAudit(category, action, detail) {
  auditEvents.unshift(createAuditEvent(category, action, detail));
  auditEvents = auditEvents.slice(0, 5000);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(auditEvents));
  const count = document.querySelector("#audit-count");
  if (count) count.textContent = auditEvents.length;
}

function createAuditEvent(category, action, detail, actor = "Jamie Davis", timestamp = Date.now()) {
  const ecsCategory = category === "security" ? "iam"
    : category === "communication" ? "web"
      : category === "task" ? "process" : "configuration";
  const eventId = makeId();
  const email = actor.includes("@") ? actor : ({
    "Jamie Davis": "jamie@studionorth.co",
    "Morgan Kim": "morgan@studionorth.co",
    "Alex Lee": "alex@studionorth.co",
    "Taylor Stone": "taylor@studionorth.co",
    "Orbit system": "system@orbit.local",
  }[actor] || null);
  return {
    "@timestamp": new Date(timestamp).toISOString(),
    ecs: { version: "8.17.0" },
    event: {
      id: eventId,
      kind: "event",
      category: [ecsCategory],
      type: [category === "communication" ? "access" : "change"],
      dataset: "orbit.audit",
      module: "orbit",
      provider: "orbit-board",
      code: category,
      action,
      outcome: "success",
      severity: category === "security" ? 3 : category === "communication" ? 6 : 4,
    },
    user: { id: email || actor.toLowerCase().replace(/\s+/g, "-"), name: actor, ...(email ? { email } : {}), roles: [actor === "Orbit system" ? "system" : "Admin"] },
    service: { name: "orbit-board", type: "project-management", environment: "browser-preview" },
    agent: { type: "browser", name: "orbit-local-preview" },
    host: { name: "local-browser" },
    organization: { id: "studio-north-local", name: "Studio North (demo)" },
    message: detail,
    related: { user: email ? [email] : [actor] },
    labels: { source: "local-browser", retention: "demo-local" },
    trace: { id: eventId },
    orbit: { category, correlation_id: eventId, visibility: "local-demo" },
  };
}

function normalizeAuditEvent(event) {
  if (!event || typeof event !== "object") return null;
  if (typeof event["@timestamp"] === "string" && !Number.isNaN(Date.parse(event["@timestamp"])) &&
      typeof event.event?.action === "string" && event.event.action.length <= 200 &&
      Array.isArray(event.event.category) && event.event.category.every((value) => typeof value === "string") &&
      typeof event.event.outcome === "string" && event.event.outcome.length <= 100) {
    const category = ["task", "communication", "settings", "security"].includes(event.orbit?.category)
      ? event.orbit.category
      : event.event.category.includes("iam") || event.event.category.includes("authentication") ? "security"
        : event.event.category.includes("web") ? "communication"
          : event.event.category.includes("process") ? "task" : "settings";
    const id = typeof event.event.id === "string" && event.event.id.length <= 200 ? event.event.id : makeId();
    return {
      ...event,
      event: {
        ...event.event,
        id,
        severity: Number.isInteger(event.event.severity) && event.event.severity >= 0 && event.event.severity <= 7
          ? event.event.severity : undefined,
      },
      orbit: { ...event.orbit, category, correlation_id: event.orbit?.correlation_id || event.trace?.id || id },
    };
  }
  if (typeof event.action === "string" && typeof event.at === "number") {
    return createAuditEvent(event.category || "task", event.action, event.detail || "", event.actor || "Jamie Davis", event.at);
  }
  return null;
}

function loadCommunication() {
  const defaults = {
    messages: [
      { author: "Morgan Kim", initials: "MK", at: "10:24 AM", text: "First landing page concept is ready for a look — dropped it in the design folder ✨" },
      { author: "Alex Lee", initials: "AL", at: "11:02 AM", text: "Nice! The new direction feels really clear. Let's get a quick review in before standup." },
    ],
    subscribers: ["jamie@studionorth.co", "morgan@studionorth.co", "alex@studionorth.co"],
    frequency: "daily",
    subscriptions: ["status", "comments", "digest"],
  };
  try {
    const saved = localStorage.getItem(COMMUNICATION_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return {
      messages: Array.isArray(parsed.messages) ? parsed.messages.filter((message) => typeof message.text === "string") : defaults.messages,
      subscribers: Array.isArray(parsed.subscribers) ? parsed.subscribers.filter((email) => typeof email === "string") : defaults.subscribers,
      frequency: ["daily", "weekly", "important"].includes(parsed.frequency) ? parsed.frequency : defaults.frequency,
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions.filter((item) => ["status", "comments", "digest"].includes(item)) : defaults.subscriptions,
    };
  } catch (error) {
    console.error("Could not load communication settings.", error);
    return defaults;
  }
}

function persistCommunication() {
  localStorage.setItem(COMMUNICATION_KEY, JSON.stringify(communication));
}

function loadGuardrails() {
  const defaults = {
    maxTokens: 8000,
    maxRuntime: 5,
    dailyBudget: 50000,
    concurrency: "1",
    approvalRequired: true,
    stopOnStall: true,
    validateOutput: true,
    approvedToolsOnly: true,
    approveExternalWrites: true,
    untrustedInputs: true,
    repoScopeOnly: true,
  };
  try {
    const saved = localStorage.getItem(GUARDRAIL_KEY);
    if (!saved) return defaults;
    const parsed = JSON.parse(saved);
    return {
      maxTokens: Number.isInteger(parsed.maxTokens) && parsed.maxTokens >= 1000 && parsed.maxTokens <= 50000 ? parsed.maxTokens : defaults.maxTokens,
      maxRuntime: Number.isInteger(parsed.maxRuntime) && parsed.maxRuntime >= 1 && parsed.maxRuntime <= 60 ? parsed.maxRuntime : defaults.maxRuntime,
      dailyBudget: Number.isInteger(parsed.dailyBudget) && parsed.dailyBudget >= 10000 && parsed.dailyBudget <= 1000000 ? parsed.dailyBudget : defaults.dailyBudget,
      concurrency: ["1", "2", "3"].includes(String(parsed.concurrency)) ? String(parsed.concurrency) : defaults.concurrency,
      approvalRequired: parsed.approvalRequired !== false,
      stopOnStall: parsed.stopOnStall !== false,
      validateOutput: parsed.validateOutput !== false,
      approvedToolsOnly: parsed.approvedToolsOnly !== false,
      approveExternalWrites: parsed.approveExternalWrites !== false,
      untrustedInputs: parsed.untrustedInputs !== false,
      repoScopeOnly: parsed.repoScopeOnly !== false,
    };
  } catch (error) {
    console.error("Could not load AI guardrail preferences.", error);
    return defaults;
  }
}

function persistGuardrails() {
  guardrails = {
    maxTokens: Number(document.querySelector("#max-tokens").value),
    maxRuntime: Number(document.querySelector("#max-runtime").value),
    dailyBudget: Number(document.querySelector("#daily-budget").value),
    concurrency: document.querySelector("#max-concurrency").value,
    approvalRequired: document.querySelector("#approval-required").checked,
    stopOnStall: document.querySelector("#stop-on-stall").checked,
    validateOutput: document.querySelector("#validate-output").checked,
    approvedToolsOnly: document.querySelector("#approved-tools-only").checked,
    approveExternalWrites: document.querySelector("#approve-external-writes").checked,
    untrustedInputs: document.querySelector("#untrusted-inputs").checked,
    repoScopeOnly: document.querySelector("#repo-scope-only").checked,
  };
  localStorage.setItem(GUARDRAIL_KEY, JSON.stringify(guardrails));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function labelClass(label) {
  const normalized = String(label || "Task").toLowerCase();
  if (normalized.includes("design")) return "tag-design";
  if (normalized.includes("dev") || normalized.includes("engineer")) return "tag-development";
  if (normalized.includes("content")) return "tag-content";
  if (normalized.includes("research")) return "tag-research";
  if (normalized.includes("market")) return "tag-marketing";
  return "tag-marketing";
}

function initialsFor(name) {
  return String(name || "JD").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0].toUpperCase()).join("") || "JD";
}

function formatDate(date) {
  if (!date) return "";
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function matchesFilters(task) {
  const matchesSearch = !searchTerm || [task.title, task.description, task.label, task.assignee]
    .some((value) => String(value || "").toLowerCase().includes(searchTerm));
  return matchesSearch && (!highPriorityOnly || task.priority === "High");
}

function renderBoard() {
  columns.innerHTML = STATUSES.map((status) => {
    const visibleTasks = tasks.filter((task) => task.status === status.id && matchesFilters(task));
    const count = tasks.filter((task) => task.status === status.id).length;
    const cards = visibleTasks.length
      ? visibleTasks.map(renderTask).join("")
      : `<div class="empty-state">${searchTerm || highPriorityOnly ? "No matching tasks" : "Drop a task here"}</div>`;
    return `<section class="board-column ${status.className}" data-status="${status.id}">
      <div class="column-heading"><span class="column-color"></span><h2>${status.title}</h2><span class="column-count">${count}</span>
      <button class="column-menu" type="button" aria-label="${status.title} options">···</button>
      <button class="column-add" type="button" data-add-status="${status.id}" aria-label="Add task to ${status.title}">+</button></div>
      <div class="task-list" data-drop-status="${status.id}">${cards}</div>
      <button class="add-task-row" type="button" data-add-status="${status.id}"><span>＋</span> Add a task</button>
    </section>`;
  }).join("");
  document.querySelector("#filter-count").textContent = highPriorityOnly ? "1" : "";
}

function renderBoardIdentity() {
  document.querySelector("#board-title").textContent = boardMeta.name;
  document.querySelector("#board-description").textContent = boardMeta.description;
  document.querySelector("#breadcrumb-board-title").textContent = boardMeta.name;
  document.querySelector("#sidebar-board-title").textContent = boardMeta.name;
}

function renderMetrics() {
  const total = tasks.length;
  const done = tasks.filter((task) => task.status === "done").length;
  const doing = tasks.filter((task) => task.status === "doing").length;
  const overdue = tasks.filter((task) => task.due && task.due < new Date().toISOString().slice(0, 10) && task.status !== "done").length;
  const completion = total ? Math.round(done / total * 100) : 0;
  const cards = [
    ["Total tickets", total, `${doing} currently in progress`, "▤"],
    ["Completion rate", `${completion}%`, `${done} of ${total} tasks complete`, "◔"],
    ["Overdue tasks", overdue, overdue ? "Needs a team review" : "No overdue work", "◷"],
    ["Shared analytics", adminSettings.shareAnalyticsBots ? "Enabled" : "Paused", `${members.filter((member) => member.kind === "bot").length} bot · scoped read access`, "⌘"],
  ];
  document.querySelector("#metrics-grid").innerHTML = cards.map(([label, value, foot, icon]) => `
    <article class="metric-card"><div class="metric-label">${label}<span class="metric-icon">${icon}</span></div>
    <div class="metric-value">${value}</div><div class="metric-foot">${escapeHtml(foot)}</div></article>`).join("");

  const statusCounts = STATUSES.map((status) => ({ ...status, count: tasks.filter((task) => task.status === status.id).length }));
  const maximum = Math.max(1, ...statusCounts.map((status) => status.count));
  document.querySelector("#status-chart").innerHTML = statusCounts.map((status) => `
    <div class="bar-row" data-status="${status.id}"><span>${status.title}</span><div class="bar-track"><div class="bar-fill" style="width:${status.count / maximum * 100}%"></div></div><span class="bar-count">${status.count}</span></div>`).join("");

  const categories = tasks.reduce((counts, task) => {
    const label = task.label || "Uncategorized";
    counts[label] = (counts[label] || 0) + 1;
    return counts;
  }, {});
  const categoryEntries = Object.entries(categories).sort((left, right) => right[1] - left[1]).slice(0, 5);
  const palette = ["#7963e7", "#4bb89f", "#f1ae50", "#e783a0", "#56a0bd"];
  let angle = 0;
  const slices = categoryEntries.map(([, count], index) => {
    const next = angle + (total ? count / total * 360 : 0);
    const slice = `${palette[index]} ${angle}deg ${next}deg`;
    angle = next;
    return slice;
  });
  document.querySelector("#category-chart").innerHTML = `<div class="category-donut" style="background:conic-gradient(${slices.join(",") || "#ececf2 0deg 360deg"})"><span class="donut-total">${total}<small>tickets</small></span></div>
    <div class="category-legend">${categoryEntries.map(([label, count], index) => `<div class="legend-row"><i class="legend-dot" style="background:${palette[index]}"></i><span>${escapeHtml(label)}</span><strong class="legend-count">${count}</strong></div>`).join("") || '<span class="legend-row">No task data yet</span>'}</div>`;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 6);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    const count = auditEvents.filter((event) => {
      const timestamp = Date.parse(event["@timestamp"]);
      return timestamp >= date.getTime() && timestamp < nextDay.getTime();
    }).length;
    return { label: date.toLocaleDateString("en-US", { weekday: "short" }), count };
  });
  const maxActivity = Math.max(1, ...days.map((day) => day.count));
  document.querySelector("#activity-chart").innerHTML = days.map((day, index) => `
    <div class="activity-day${index === days.length - 1 ? " today" : ""}"><span class="activity-total">${day.count || ""}</span><div class="activity-bar" style="height:${Math.max(3, day.count / maxActivity * 68)}%"></div><span>${day.label}</span></div>`).join("");
}

function formatAuditTime(timestamp) {
  const date = new Date(timestamp);
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })} ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

function renderAuditLog() {
  const query = document.querySelector("#audit-search").value.trim().toLowerCase();
  const category = document.querySelector("#audit-filter").value;
  const visibleEvents = auditEvents.filter((event) => {
    const eventCategory = event.orbit.category;
    const matchesCategory = category === "all" || eventCategory === category;
    const matchesText = !query || `${event.event.action} ${event.message} ${event.user.name}`.toLowerCase().includes(query);
    return matchesCategory && matchesText;
  });
  document.querySelector("#audit-table-body").innerHTML = visibleEvents.map((event) => {
    const eventCategory = event.orbit.category;
    return `
    <tr><td><span class="audit-kind ${escapeHtml(eventCategory)}">${escapeHtml(eventCategory)}</span> ${escapeHtml(event.event.action)}</td>
    <td><span class="audit-actor"><span class="avatar ${avatarClass(initialsFor(event.user.name))}">${escapeHtml(initialsFor(event.user.name))}</span>${escapeHtml(event.user.name)}</span></td>
    <td>${escapeHtml(event.message)}</td><td>${escapeHtml(formatAuditTime(event["@timestamp"]))}</td></tr>`;
  }).join("");
  document.querySelector("#audit-empty").hidden = visibleEvents.length > 0;
  document.querySelector("#audit-count").textContent = auditEvents.length;
}

function severityName(value) {
  const severity = Number(value);
  if (!Number.isInteger(severity) || severity < 0 || severity > 7) return "unknown";
  if (severity <= 1) return "critical";
  if (severity <= 3) return "high";
  if (severity === 4) return "medium";
  if (severity <= 6) return "low";
  if (severity === 7) return "info";
  return "unknown";
}

function eventUser(event) {
  return event.user?.name || event.user?.email || event.user?.id || "Unknown principal";
}

function eventSummary(event) {
  return JSON.stringify(event).toLowerCase();
}

function elasticTimeCutoff(range) {
  const durations = { "15m": 15 * 60_000, "24h": 24 * 60 * 60_000, "7d": 7 * 24 * 60 * 60_000 };
  return durations[range] ? Date.now() - durations[range] : 0;
}

function getElasticEvents() {
  const query = document.querySelector("#elastic-query").value.trim().toLowerCase();
  const range = document.querySelector("#elastic-time").value;
  const severity = document.querySelector("#elastic-severity").value;
  const category = document.querySelector("#elastic-category").value;
  const cutoff = elasticTimeCutoff(range);
  return auditEvents.filter((event) => {
    const time = Date.parse(event["@timestamp"]);
    const level = severityName(event.event.severity);
    const ecsCategories = event.event.category || [];
    const matchesCategory = category === "all" ||
      (category === "iam" && (ecsCategories.includes("iam") || ecsCategories.includes("authentication"))) ||
      (category === "configuration" && ecsCategories.includes("configuration")) ||
      (category === "web" && ecsCategories.includes("web")) ||
      (category === "process" && ecsCategories.includes("process"));
    return time >= cutoff && matchesCategory && (severity === "all" || level === severity) &&
      (!query || eventSummary(event).includes(query));
  }).sort((first, second) => Date.parse(second["@timestamp"]) - Date.parse(first["@timestamp"]));
}

function renderElasticTimeline(events) {
  const range = document.querySelector("#elastic-time").value;
  const duration = range === "15m" ? 15 * 60_000 : range === "24h" ? 24 * 60 * 60_000 : range === "7d" ? 7 * 24 * 60 * 60_000 : 24 * 60 * 60_000;
  const start = range === "all" ? Math.min(...events.map((event) => Date.parse(event["@timestamp"])), Date.now() - duration) : Date.now() - duration;
  const count = 24;
  const bucketMs = duration / count;
  const buckets = Array.from({ length: count }, () => ({ total: 0, critical: 0, high: 0, medium: 0 }));
  events.forEach((event) => {
    const index = Math.min(count - 1, Math.max(0, Math.floor((Date.parse(event["@timestamp"]) - start) / bucketMs)));
    if (Date.parse(event["@timestamp"]) >= start) {
      buckets[index].total += 1;
      const level = severityName(event.event.severity);
      if (level === "critical" || level === "high" || level === "medium") buckets[index][level] += 1;
    }
  });
  const maximum = Math.max(1, ...buckets.map((bucket) => bucket.total));
  document.querySelector("#elastic-timeline").innerHTML = buckets.map((bucket, index) => {
    const height = bucket.total ? Math.max(5, bucket.total / maximum * 100) : 2;
    const tone = bucket.critical ? "critical" : bucket.high ? "high" : bucket.medium ? "medium" : "normal";
    const tooltip = `${bucket.total} events · ${new Date(start + index * bucketMs).toLocaleString()}`;
    return `<span class="timeline-bin ${tone}" style="height:${height}%" title="${escapeHtml(tooltip)}"></span>`;
  }).join("");
  const labels = range === "15m" ? ["15 min ago", "7 min ago", "Now"]
    : range === "7d" ? ["7 days ago", "3 days ago", "Now"]
      : range === "all" ? ["Oldest", "—", "Now"] : ["24 hours ago", "12 hours ago", "Now"];
  document.querySelector("#elastic-range-label").textContent = range === "all" ? "All local events" : labels[0].replace(" ago", "") + " → now";
  document.querySelector("#elastic-timeline-labels").innerHTML = labels.map((label) => `<span>${label}</span>`).join("");
}

function renderElasticDetails(event) {
  const container = document.querySelector("#elastic-event-detail");
  if (!event) {
    container.hidden = true;
    container.innerHTML = "";
    selectedElasticEventId = null;
    return;
  }
  selectedElasticEventId = event.event.id;
  const fields = [
    ["Timestamp", event["@timestamp"]],
    ["ECS version", event.ecs?.version],
    ["Event ID", event.event?.id],
    ["Dataset", event.event?.dataset],
    ["Category", event.event?.category?.join(", ")],
    ["Action", event.event?.action],
    ["Outcome", event.event?.outcome],
    ["Severity", `${severityName(event.event?.severity)} (${event.event?.severity ?? "unknown"})`],
    ["User", eventUser(event)],
    ["User ID", event.user?.id],
    ["Email", event.user?.email],
    ["Roles", event.user?.roles?.join(", ")],
    ["Source IP", event.source?.ip || "Not collected"],
    ["Source address", event.source?.address || "Not collected"],
    ["Client", event.user_agent?.original || event.agent?.name || "Not collected"],
    ["Service", event.service?.name],
    ["Host", event.host?.name],
    ["Workspace", event.organization?.id],
    ["Correlation / trace ID", event.orbit?.correlation_id || event.trace?.id],
    ["Retention / provenance", event.labels?.retention || event.orbit?.visibility],
  ].filter(([, value]) => value !== undefined && value !== null && value !== "");
  const reviewed = irState.reviewed.includes(event.event.id);
  const relatedCase = irState.cases.find((item) => item.eventIds.includes(event.event.id));
  container.hidden = false;
  container.innerHTML = `<div class="event-detail-heading"><div><span class="severity-pill severity-${severityName(event.event?.severity)}">${severityName(event.event?.severity)}</span><strong>${escapeHtml(event.event?.action || "Event details")}</strong><small>${escapeHtml(event.event?.id || "")}</small></div>
    <div class="event-detail-actions"><button type="button" data-mark-reviewed="${escapeHtml(event.event?.id || "")}">${reviewed ? "✓ Reviewed" : "Mark reviewed"}</button><button type="button" data-create-case="${escapeHtml(event.event?.id || "")}">${relatedCase ? `Case ${escapeHtml(relatedCase.id.slice(0, 8))}` : "＋ Create case"}</button><button type="button" data-investigate-user="${escapeHtml(event.user?.email || event.user?.id || "")}">Filter principal</button><button type="button" data-copy-event="${escapeHtml(event.event?.id || "")}">Copy event ID</button><button type="button" class="event-detail-close" aria-label="Close event details">×</button></div></div>
    ${relatedCase ? `<div class="linked-case"><strong>Investigation case:</strong> ${escapeHtml(relatedCase.title)} <span>${escapeHtml(relatedCase.status)}</span></div>` : ""}
    <div class="event-field-grid">${fields.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><span>${escapeHtml(value)}</span></div>`).join("")}</div>
    <details class="event-json"><summary>Full ECS event document <span>Inspect all captured metadata</span></summary><pre>${escapeHtml(JSON.stringify(event, null, 2))}</pre></details>
    <div class="event-ir-note">Network address, authentication provider, and device posture are not present unless they were captured by the trusted source. Do not infer them from this local preview.</div>`;
}

function renderElasticLogs() {
  const events = getElasticEvents();
  const severities = ["critical", "high", "medium", "low"];
  const counts = Object.fromEntries(severities.map((level) => [level, events.filter((event) => severityName(event.event.severity) === level).length]));
  const uniquePrincipals = new Set(events.map(eventUser));
  document.querySelector("#elastic-kpis").innerHTML = `
    <article class="elastic-kpi"><small>EVENTS MATCHING</small><strong>${events.length}</strong><span>Current investigation filters</span></article>
    <article class="elastic-kpi severity-kpi severity-critical-kpi"><small>CRITICAL / HIGH</small><strong>${counts.critical + counts.high}</strong><span>${counts.critical} critical · ${counts.high} high</span></article>
    <article class="elastic-kpi severity-medium-kpi"><small>MEDIUM</small><strong>${counts.medium}</strong><span>Review for suspicious activity</span></article>
    <article class="elastic-kpi"><small>PRINCIPALS</small><strong>${uniquePrincipals.size}</strong><span>Distinct actors in filtered events</span></article>`;
  renderElasticTimeline(events);
  document.querySelector("#elastic-result-count").textContent = events.length;
  document.querySelector("#elastic-count").textContent = auditEvents.length;
  document.querySelector("#elastic-event-rows").innerHTML = events.map((event) => {
    const category = event.event.category?.join(", ") || "uncategorized";
    const level = severityName(event.event.severity);
    const timestamp = new Date(event["@timestamp"]);
    return `<tr data-elastic-event="${escapeHtml(event.event.id)}" tabindex="0" aria-label="Inspect ${escapeHtml(event.event.action)} by ${escapeHtml(eventUser(event))}" class="${selectedElasticEventId === event.event.id ? "selected-event" : ""}">
      <td class="elastic-timestamp">${escapeHtml(timestamp.toLocaleDateString("en-US", { month: "short", day: "numeric" }))}<small>${escapeHtml(timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }))}</small></td>
      <td><span class="severity-pill severity-${level}">${level.toUpperCase()}</span></td>
      <td><strong>${escapeHtml(event.event.action)}</strong><small>${escapeHtml(category)} · ${escapeHtml(event.event.dataset || "dataset unknown")}</small></td>
      <td>${escapeHtml(eventUser(event))}<small>${escapeHtml(event.user?.id || "user.id unavailable")}</small></td>
      <td>${escapeHtml(event.source?.ip || event.agent?.name || "not collected")}</td>
      <td><span class="outcome-${escapeHtml(event.event.outcome)}">${escapeHtml(event.event.outcome)}</span></td></tr>`;
  }).join("");
  document.querySelector("#elastic-empty").hidden = events.length > 0;
  if (selectedElasticEventId && !events.some((event) => event.event.id === selectedElasticEventId)) renderElasticDetails(null);
}

function importEcsDocument(document) {
  let rows;
  if (typeof document === "string") {
    rows = document.split(/\r?\n/).filter((line) => line.trim()).map((line) => JSON.parse(line));
  } else if (Array.isArray(document)) {
    rows = document;
  } else if (Array.isArray(document?.hits?.hits)) {
    rows = document.hits.hits.map((hit) => hit?._source);
  } else {
    rows = [document];
  }
  if (!rows.length) throw new Error("No ECS events were found in that file.");
  if (rows.length > 5000) throw new Error("Import is limited to 5,000 events per file.");
  const normalized = rows.map((event, index) => {
    const valid = normalizeAuditEvent(event);
    if (!valid) throw new Error(`Event ${index + 1} is missing valid ECS timestamp, category, action, or outcome fields.`);
    return valid;
  });
  const known = new Set(auditEvents.map((event) => event.event.id));
  const added = normalized.filter((event) => {
    if (known.has(event.event.id)) return false;
    known.add(event.event.id);
    return true;
  });
  const nextEvents = [
    createAuditEvent("security", "ECS event import completed", `${added.length} new ECS events imported (${normalized.length - added.length} duplicates skipped)`),
    ...added,
    ...auditEvents,
  ].slice(0, 5000);
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(nextEvents));
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      throw new Error("The event set exceeds this browser's local storage. Use smaller imports or connect an Elastic cluster.");
    }
    throw error;
  }
  auditEvents = nextEvents;
  const count = document.querySelector("#audit-count");
  if (count) count.textContent = auditEvents.length;
  return { added: added.length, duplicates: normalized.length - added.length };
}

function renderMembers() {
  document.querySelector("#member-list").innerHTML = members.map((member, index) => `
    <div class="member-row"><span class="avatar ${avatarClass(initialsFor(member.email))}">${member.kind === "bot" ? "BOT" : escapeHtml(initialsFor(member.email))}</span>
    <span title="${escapeHtml(member.email)}">${escapeHtml(member.email)}</span>
    <select data-member-role="${index}" aria-label="Role for ${escapeHtml(member.email)}">
      ${["Admin", "Member", "Viewer", "Analytics bot"].map((role) => `<option${member.role === role ? " selected" : ""}>${role}</option>`).join("")}
    </select>
    ${member.email !== "jamie@studionorth.co" ? `<button type="button" data-remove-member="${index}" aria-label="Remove ${escapeHtml(member.email)}">×</button>` : ""}
    </div>`).join("");
}

function renderPermissionRow(subject, type, subjectId, permissions) {
  const cells = PERMISSIONS.map(({ id, label }) => `<td><input type="checkbox" data-acl-type="${type}" data-subject="${escapeHtml(subjectId)}" data-permission="${id}" aria-label="${escapeHtml(subject)}: ${label}"${permissions[id] ? " checked" : ""}></td>`).join("");
  return `<tr><td><span class="principal-name">${type === "group" ? "♧" : "♙"} ${escapeHtml(subject)}</span><small>${type === "group" ? "Directory group" : "Individual identity"}</small></td>${cells}</tr>`;
}

function renderAccessControl() {
  const groupRows = directoryGroups.map((group) => renderPermissionRow(group.name, "group", group.id, group.permissions || defaultPermissions()));
  const userRows = members.map((member) => renderPermissionRow(member.email, "user", member.email, effectivePermissions(member)));
  document.querySelector("#permission-matrix").innerHTML = [...groupRows, ...userRows].join("");
  document.querySelector("#directory-groups").innerHTML = directoryGroups.map((group) => {
    const candidates = members.filter((member) => !group.members.includes(member.email));
    return `<article class="directory-group"><div class="directory-group-heading"><div><strong>${escapeHtml(group.name)}</strong><small>cn=${escapeHtml(escapeLdapRdn(group.name))},ou=Groups,dc=orbit,dc=local</small></div><button type="button" data-delete-group="${escapeHtml(group.id)}" aria-label="Delete ${escapeHtml(group.name)}">×</button></div>
      <div class="group-member-chips">${group.members.map((email) => `<span>${escapeHtml(email)}<button type="button" data-group-remove="${escapeHtml(group.id)}" data-member-email="${escapeHtml(email)}" aria-label="Remove ${escapeHtml(email)} from group">×</button></span>`).join("") || '<small>No members assigned</small>'}</div>
      ${candidates.length ? `<div class="group-add-member"><select data-group-select="${escapeHtml(group.id)}" aria-label="Select a person for ${escapeHtml(group.name)}">${candidates.map((member) => `<option value="${escapeHtml(member.email)}">${escapeHtml(member.email)}</option>`).join("")}</select><button type="button" data-group-add="${escapeHtml(group.id)}">Add member</button></div>` : ""}
    </article>`;
  }).join("");
}

function renderAdminSettings() {
  document.querySelector("#admin-board-name").value = boardMeta.name;
  document.querySelector("#admin-board-description").value = boardMeta.description;
  document.querySelector("#retention-days").value = adminSettings.retentionDays;
  document.querySelector("#mask-sensitive-data").checked = adminSettings.maskSensitive;
  document.querySelector("#log-external-actions").checked = adminSettings.logExternal;
  document.querySelector("#restrict-integrations").checked = adminSettings.restrictIntegrations;
  document.querySelector("#share-analytics-bots").checked = adminSettings.shareAnalyticsBots;
  document.querySelector("#api-agent-rate").value = apiPolicy.perAgent;
  document.querySelector("#api-workspace-rate").value = apiPolicy.perWorkspace;
  document.querySelector("#api-concurrency").value = apiPolicy.concurrency;
  document.querySelector("#api-action-delay").value = apiPolicy.spacingSeconds;
  document.querySelector("#api-queue-size").value = apiPolicy.queueSize;
  document.querySelector("#api-max-retries").value = apiPolicy.maxRetries;
  document.querySelector("#api-human-writes").checked = apiPolicy.approveWrites;
  document.querySelector("#api-auto-queue").checked = apiPolicy.autoQueue;
  renderMembers();
}

function openConsole(section) {
  const titles = { insights: "Business insights", audit: "Activity & audit", admin: "Administration", access: "Identity & access", elastic: "Elastic logs · Incident response" };
  document.querySelector("#console-title").textContent = titles[section];
  document.querySelectorAll(".console-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.consoleTab === section));
  document.querySelector("#insights-view").hidden = section !== "insights";
  document.querySelector("#audit-view").hidden = section !== "audit";
  document.querySelector("#admin-view").hidden = section !== "admin";
  document.querySelector("#access-view").hidden = section !== "access";
  document.querySelector("#elastic-view").hidden = section !== "elastic";
  if (section === "insights") renderMetrics();
  if (section === "audit") renderAuditLog();
  if (section === "admin") renderAdminSettings();
  if (section === "access") renderAccessControl();
  if (section === "elastic") renderElasticLogs();
  document.querySelector("#console-dialog").showModal();
}

function renderTask(task) {
  const comments = Array.isArray(task.comments) ? task.comments.length : 0;
  const due = formatDate(task.due);
  const overdue = due && task.status !== "done" && task.due < new Date().toISOString().slice(0, 10);
  return `<article class="task-card" draggable="true" data-task-id="${escapeHtml(task.id)}" tabindex="0" aria-label="${escapeHtml(task.title)}">
    <div class="task-card-top"><span class="tag ${labelClass(task.label)}">${escapeHtml(task.label || "Task")}</span><button class="card-menu" type="button" aria-label="Task options">···</button></div>
    <h3>${escapeHtml(task.title)}</h3>${task.description ? `<p>${escapeHtml(task.description)}</p>` : ""}
    <div class="task-card-bottom"><span class="card-priority"><i class="priority-dot ${String(task.priority).toLowerCase()}"></i>${escapeHtml(task.priority || "Medium")}</span>
    <div class="card-meta-right">${due ? `<span class="due-date${overdue ? " overdue" : ""}">${escapeHtml(due)}</span>` : ""}
    ${comments ? `<span class="card-comments"><span>☷</span>${comments}</span>` : ""}
    <span class="avatar card-assignee ${avatarClass(task.initials)}" title="${escapeHtml(task.assignee || "Unassigned")}">${escapeHtml(task.initials || initialsFor(task.assignee))}</span></div></div>
  </article>`;
}

function avatarClass(initials) {
  const classes = ["avatar-pink", "avatar-blue", "avatar-yellow", "avatar-green"];
  const sum = String(initials || "").split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return classes[sum % classes.length];
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2600);
}

function openTask(task = null, status = "todo") {
  activeTaskId = task?.id ?? null;
  document.querySelector("#dialog-kicker").textContent = task ? "TASK DETAILS" : "NEW TASK";
  document.querySelector("#task-title-input").value = task?.title ?? "";
  document.querySelector("#task-description-input").value = task?.description ?? "";
  document.querySelector("#task-status-input").value = task?.status ?? status;
  document.querySelector("#task-priority-input").value = task?.priority ?? "Medium";
  document.querySelector("#task-assignee-input").value = task?.assignee ?? "";
  document.querySelector("#task-due-input").value = task?.due ?? "";
  document.querySelector("#delete-task").hidden = !task;
  document.querySelector("#comment-input").value = "";
  renderComments(task);
  taskDialog.showModal();
  document.querySelector("#task-title-input").focus();
}

function renderComments(task) {
  const comments = task?.comments ?? [];
  document.querySelector("#comment-count").textContent = `${comments.length} ${comments.length === 1 ? "comment" : "comments"}`;
  document.querySelector("#comment-list").innerHTML = comments.map((comment) => `
    <div class="comment-item"><span class="avatar ${avatarClass(comment.initials)}">${escapeHtml(comment.initials)}</span>
    <div class="comment-body"><strong>${escapeHtml(comment.author)}</strong><time>${escapeHtml(comment.at)}</time><p>${escapeHtml(comment.text)}</p></div></div>`).join("");
}

function renderChat() {
  document.querySelector("#chat-messages").innerHTML = communication.messages.map((message) => `
    <article class="chat-message${message.author === "Jamie Davis" ? " own-message" : ""}">
      <span class="avatar ${avatarClass(message.initials)}">${escapeHtml(message.initials || initialsFor(message.author))}</span>
      <div class="chat-message-body"><div class="chat-message-header"><strong>${escapeHtml(message.author)}</strong><time>${escapeHtml(message.at)}</time></div><p>${escapeHtml(message.text)}</p></div>
    </article>`).join("");
  document.querySelector("#message-tab-count").textContent = communication.messages.length;
  const messages = document.querySelector("#chat-messages");
  messages.scrollTop = messages.scrollHeight;
}

function renderSubscribers() {
  const list = document.querySelector("#subscriber-list");
  list.innerHTML = communication.subscribers.map((email) => `
    <div class="subscriber-row"><span class="avatar ${avatarClass(initialsFor(email))}">${escapeHtml(initialsFor(email))}</span>
    <span title="${escapeHtml(email)}">${escapeHtml(email)}</span><button type="button" data-remove-subscriber="${escapeHtml(email)}" aria-label="Remove ${escapeHtml(email)}">×</button></div>`).join("");
  document.querySelector("#subscriber-count").textContent = communication.subscribers.length;
}

function buildEmailSummary() {
  const done = tasks.filter((task) => task.status === "done");
  const doing = tasks.filter((task) => task.status === "doing");
  const todo = tasks.filter((task) => task.status === "todo");
  const recentComments = tasks.flatMap((task) => (task.comments || []).map((comment) => `${comment.author} on "${task.title}": ${comment.text}`)).slice(-3);
  const lines = [
    `${boardMeta.name.toUpperCase()} — BOARD SUMMARY`,
    `${done.length} of ${tasks.length} tasks complete · ${doing.length} in progress · ${todo.length} to do`,
    "",
    "IN PROGRESS",
    ...(doing.length ? doing.map((task) => `• ${task.title}${task.assignee ? ` — ${task.assignee}` : ""}`) : ["• Nothing in progress"]),
    "",
    "COMPLETED",
    ...(done.length ? done.map((task) => `• ${task.title}`) : ["• No completed tasks yet"]),
    "",
    "UP NEXT",
    ...(todo.length ? todo.slice(0, 5).map((task) => `• ${task.title}`) : ["• Backlog is clear"]),
  ];
  if (recentComments.length) lines.push("", "RECENT DISCUSSION", ...recentComments.map((comment) => `• ${comment}`));
  lines.push("", `Open the ${boardMeta.name} board to see the latest.`);
  return lines.join("\n");
}

function openCommunication(tab = "messages") {
  const panel = document.querySelector("#communication-panel");
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  document.querySelector("#panel-backdrop").classList.add("visible");
  document.querySelector("#message-badge").textContent = "";
  setCommunicationTab(tab);
}

function closeCommunication() {
  document.querySelector("#communication-panel").classList.remove("open");
  document.querySelector("#communication-panel").setAttribute("aria-hidden", "true");
  document.querySelector("#panel-backdrop").classList.remove("visible");
}

function setCommunicationTab(tab) {
  const messagesActive = tab === "messages";
  document.querySelector("#messages-tab").classList.toggle("active", messagesActive);
  document.querySelector("#messages-tab").setAttribute("aria-selected", String(messagesActive));
  document.querySelector("#email-tab").classList.toggle("active", !messagesActive);
  document.querySelector("#email-tab").setAttribute("aria-selected", String(!messagesActive));
  document.querySelector("#messages-view").hidden = !messagesActive;
  document.querySelector("#email-view").hidden = messagesActive;
}

function submitComment() {
  const input = document.querySelector("#comment-input");
  const text = input.value.trim();
  if (!text) return;
  if (!activeTaskId) {
    showToast("Save the task before adding a comment.");
    return;
  }
  const task = tasks.find((item) => item.id === activeTaskId);
  task.comments ??= [];
  task.comments.push({ author: "Jamie Davis", initials: "JD", text, at: "Just now" });
  persist();
  recordAudit("communication", "Task comment added", `Discussion updated on "${task.title}"`);
  renderComments(task);
  renderBoard();
  input.value = "";
  showToast("Comment added");
}

function parseMarkdown(text) {
  const result = [];
  let status = "todo";
  const headings = /^(?:#{1,4}\s*)?(to[\s-]?do|backlog|in[\s-]?progress|doing|in progress|done|completed|complete)\s*:?\s*$/i;
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const heading = line.trim().replace(/^#+\s*/, "").replace(/:$/, "").trim();
    const match = heading.match(headings);
    if (match) {
      const name = match[1].toLowerCase().replace(/[\s-]/g, "");
      status = ["done", "completed", "complete"].includes(name) ? "done"
        : ["inprogress", "doing"].includes(name) ? "doing" : "todo";
      continue;
    }
    const taskLine = line.match(/^\s*(?:[-*+]\s+)(?:\[([ xX])\]\s*)?(.+?)\s*$/);
    if (!taskLine) continue;
    const checked = taskLine[1]?.toLowerCase() === "x";
    const title = taskLine[2].trim();
    if (!title || title.toLowerCase() === "none") continue;
    result.push({ id: makeId(), title, description: "", status: checked && status === "todo" ? "done" : status, label: "Imported", priority: "Medium", assignee: "", initials: "JD", due: "", comments: [] });
  }
  return result;
}

function normalizeImportedTask(task, index) {
  const statusInput = String(task.status || task.column || task.state || "todo").toLowerCase().replace(/[\s_-]/g, "");
  const status = ["done", "complete", "completed"].includes(statusInput) ? "done"
    : ["doing", "inprogress", "active"].includes(statusInput) ? "doing" : "todo";
  const title = task.title ?? task.name;
  if (typeof title !== "string" || !title.trim()) throw new Error(`Task ${index + 1} needs a title.`);
  const assignee = String(task.assignee || task.owner || "");
  return {
    id: makeId(), title: title.trim(), description: String(task.description || ""),
    status, label: String(task.label || task.category || "Imported"),
    priority: ["High", "Medium", "Low"].includes(task.priority) ? task.priority : "Medium",
    assignee, initials: initialsFor(assignee), due: String(task.due || task.dueDate || ""),
    comments: Array.isArray(task.comments) ? task.comments.filter((comment) => typeof comment?.text === "string").map((comment) => ({
      author: String(comment.author || "Teammate"), initials: initialsFor(comment.initials || comment.author),
      text: comment.text, at: String(comment.at || ""),
    })) : [],
  };
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function download(name, contents, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toMarkdown() {
  return `# ${boardMeta.name}\n\n${boardMeta.description}\n\n${STATUSES.map((status) => {
    const cards = tasks.filter((task) => task.status === status.id);
    return `## ${status.title}\n\n${cards.length ? cards.map((task) => `- [${status.id === "done" ? "x" : " "}] ${task.title}${task.description ? ` — ${task.description}` : ""}${task.assignee ? ` (Assignee: ${task.assignee})` : ""}`).join("\n") : "- None"}`;
  }).join("\n\n")}\n`;
}

function toBoardConfig() {
  return {
    "$schema": "./schemas/orbit-board-config.schema.json",
    version: 1,
    board: boardMeta,
    tasks: tasks.map(({ id, title, description, status, label, priority, assignee, due }) => ({
      id, title, description, status, label, priority, assignee, ...(due ? { due } : {}),
    })),
    settings: {
      aiGuardrails: {
        maxTokens: guardrails.maxTokens,
        maxRuntimeMinutes: guardrails.maxRuntime,
        dailyTokenBudget: guardrails.dailyBudget,
        maxConcurrentRuns: Number(guardrails.concurrency),
        requireHumanApproval: guardrails.approvalRequired,
        validateOutput: guardrails.validateOutput,
      },
      agentApi: {
        requestsPerPrincipalPerMinute: apiPolicy.perAgent,
        requestsPerWorkspacePerMinute: apiPolicy.perWorkspace,
        maxConcurrentRuns: apiPolicy.concurrency,
        minimumActionSpacingSeconds: apiPolicy.spacingSeconds,
        maximumQueuedRuns: apiPolicy.queueSize,
        maximumRetries: apiPolicy.maxRetries,
        requireHumanApprovalForExternalWrites: apiPolicy.approveWrites,
        autoQueueApprovedRequests: apiPolicy.autoQueue,
      },
    },
  };
}

function validateBoardConfig(config) {
  const allowedRoot = new Set(["$schema", "version", "board", "tasks", "settings"]);
  if (!config || typeof config !== "object" || Array.isArray(config) ||
      Object.keys(config).some((key) => !allowedRoot.has(key)) || config.version !== 1) {
    throw new Error("Configuration must match Orbit board config version 1.");
  }
  if (config.$schema !== undefined && typeof config.$schema !== "string") {
    throw new Error("Configuration $schema must be a string.");
  }
  const board = config.board;
  if (!board || typeof board.name !== "string" || !board.name.trim() || board.name.length > 80 ||
      typeof board.description !== "string" || board.description.length > 240 ||
      Object.keys(board).some((key) => !["name", "description"].includes(key))) {
    throw new Error("Configuration board needs a name and description within the schema limits.");
  }
  if (!Array.isArray(config.tasks)) throw new Error("Configuration needs a tasks array.");
  for (const [index, task] of config.tasks.entries()) {
    const allowedTask = new Set(["id", "title", "description", "status", "label", "priority", "assignee", "due"]);
    if (!task || typeof task !== "object" || Array.isArray(task) ||
        Object.keys(task).some((key) => !allowedTask.has(key)) ||
        typeof task.title !== "string" || !task.title.trim() || task.title.length > 120 ||
        !["todo", "doing", "done"].includes(task.status)) {
      throw new Error(`Task ${index + 1} does not match the board config schema.`);
    }
    if (task.description !== undefined && (typeof task.description !== "string" || task.description.length > 5000)) {
      throw new Error(`Task ${index + 1} has an invalid description.`);
    }
    if (task.priority !== undefined && !["High", "Medium", "Low"].includes(task.priority)) {
      throw new Error(`Task ${index + 1} has an invalid priority.`);
    }
    if (task.due !== undefined) {
      const date = new Date(`${task.due}T00:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(task.due) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== task.due) {
        throw new Error(`Task ${index + 1} due date must be a valid YYYY-MM-DD date.`);
      }
    }
    if (task.id !== undefined && (typeof task.id !== "string" || task.id.length > 100)) throw new Error(`Task ${index + 1} has an invalid id.`);
    if (task.label !== undefined && (typeof task.label !== "string" || task.label.length > 40)) throw new Error(`Task ${index + 1} has an invalid label.`);
    if (task.assignee !== undefined && (typeof task.assignee !== "string" || task.assignee.length > 160)) throw new Error(`Task ${index + 1} has an invalid assignee.`);
  }
  const guardrailFields = new Set(["maxTokens", "maxRuntimeMinutes", "dailyTokenBudget", "maxConcurrentRuns", "requireHumanApproval", "validateOutput"]);
  if (config.settings !== undefined &&
      (!config.settings || typeof config.settings !== "object" || Array.isArray(config.settings) ||
       Object.keys(config.settings).some((key) => !["aiGuardrails", "agentApi"].includes(key)))) {
    throw new Error("Configuration settings contain unsupported fields.");
  }
  const limits = config.settings?.aiGuardrails;
  if (limits !== undefined && (!limits || typeof limits !== "object" || Array.isArray(limits) ||
      Object.keys(limits).some((key) => !guardrailFields.has(key)))) {
    throw new Error("AI guardrails contain unsupported fields.");
  }
  if (limits) {
    const ranges = {
      maxTokens: [1000, 50000],
      maxRuntimeMinutes: [1, 60],
      dailyTokenBudget: [10000, 1000000],
      maxConcurrentRuns: [1, 3],
    };
    for (const [key, [minimum, maximum]] of Object.entries(ranges)) {
      if (limits[key] !== undefined && (!Number.isInteger(limits[key]) || limits[key] < minimum || limits[key] > maximum)) {
        throw new Error(`AI guardrail ${key} is outside the supported range.`);
      }
      const agentApi = config.settings?.agentApi;
      if (agentApi !== undefined) {
        const ranges = {
          requestsPerPrincipalPerMinute: [1, 30],
          requestsPerWorkspacePerMinute: [1, 120],
          maxConcurrentRuns: [1, 5],
          minimumActionSpacingSeconds: [2, 120],
          maximumQueuedRuns: [1, 100],
          maximumRetries: [0, 3],
        };
        const fields = new Set([...Object.keys(ranges), "requireHumanApprovalForExternalWrites", "autoQueueApprovedRequests"]);
        if (!agentApi || typeof agentApi !== "object" || Array.isArray(agentApi) || Object.keys(agentApi).some((key) => !fields.has(key))) {
          throw new Error("Agent API settings contain unsupported fields.");
        }
        for (const [key, [minimum, maximum]] of Object.entries(ranges)) {
          if (agentApi[key] !== undefined && (!Number.isInteger(agentApi[key]) || agentApi[key] < minimum || agentApi[key] > maximum)) {
            throw new Error(`Agent API setting ${key} is outside the supported range.`);
          }
        }
        for (const key of ["requireHumanApprovalForExternalWrites", "autoQueueApprovedRequests"]) {
          if (agentApi[key] !== undefined && typeof agentApi[key] !== "boolean") throw new Error(`Agent API setting ${key} must be boolean.`);
        }
        const perAgent = agentApi.requestsPerPrincipalPerMinute;
        const perWorkspace = agentApi.requestsPerWorkspacePerMinute;
        if (perAgent !== undefined && perWorkspace !== undefined && perAgent > perWorkspace) {
          throw new Error("Per-principal requests cannot exceed the workspace request cap.");
        }
      }
    }
    for (const key of ["requireHumanApproval", "validateOutput"]) {
      if (limits[key] !== undefined && typeof limits[key] !== "boolean") throw new Error(`AI guardrail ${key} must be boolean.`);
    }
  }
}

function encodeBoard() {
  const bytes = new TextEncoder().encode(JSON.stringify({ version: 1, metadata: boardMeta, tasks }));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeBoard(encoded) {
  const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const data = JSON.parse(new TextDecoder().decode(bytes));
  const imported = Array.isArray(data) ? data : data.tasks;
  if (!Array.isArray(imported) || imported.some((task) => !isValidTask(task))) throw new Error("This board link is invalid.");
  const metadata = data.metadata && typeof data.metadata.name === "string" && typeof data.metadata.description === "string"
    ? data.metadata
    : null;
  return { tasks: imported, metadata };
}

function shareMessage() {
  const total = tasks.length;
  const completed = tasks.filter((task) => task.status === "done").length;
  return `${boardMeta.name} — ${completed}/${total} tasks complete\n${window.location.href.split("#")[0]}#board=${encodeBoard()}`;
}

function updateChannel() {
  const channel = document.querySelector("#channel-select").value;
  const isGithub = channel !== "team";
  const notes = document.querySelector("#github-channel-note");
  notes.hidden = !isGithub;
  document.querySelector("#chat-messages").hidden = isGithub;
  document.querySelector("#chat-form").hidden = isGithub;
  if (isGithub) {
    const discussions = channel === "github-discussions";
    const link = document.querySelector("#github-channel-link");
    link.href = discussions
      ? "https://github.com/tyfoon-sec/Projects/discussions"
      : "https://github.com/tyfoon-sec/Projects/issues";
    link.firstChild.textContent = discussions ? "Open GitHub Discussions " : "Open GitHub Issues ";
    document.querySelector("#github-channel-note strong").textContent = discussions
      ? "Continue in GitHub Discussions"
      : "Continue in GitHub Issues";
    document.querySelector("#github-channel-note p").textContent = discussions
      ? "Start or join a project-wide conversation in the repository's Discussions."
      : "Report a task, ask a question, or follow up with the project in its Issues.";
  }
}

function sendChatMessage(event) {
  event.preventDefault();
  const input = document.querySelector("#chat-input");
  const text = input.value.trim();
  if (!text) return;
  communication.messages.push({
    author: "Jamie Davis",
    initials: "JD",
    at: new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
    text,
  });
  persistCommunication();
  recordAudit("communication", "Team message sent", "Local board chat message added");
  renderChat();
  input.value = "";
}

function makeTicketDrafts(text, limit) {
  const lines = text.split(/\r?\n/).map((line) => line
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+|\[[ xX]\]\s*)/, "")
    .trim())
    .filter((line) => line && !/^#{1,6}\s/.test(line));
  const items = lines.length > 1 || /^(?:[-*+]|\d+[.)]|\[)/.test(text.trim())
    ? lines
    : (lines[0] || "").split(/(?<=[.!?])\s+|;\s+/).map((line) => line.trim()).filter(Boolean);
  const normalized = items.map((item) => item.replace(/[.!?]+$/, "").trim()).filter(Boolean);
  const candidates = guardrails.validateOutput ? [...new Set(normalized)] : normalized;
  return candidates.slice(0, limit);
}

function updateTicketPreview() {
  const brief = document.querySelector("#ticket-brief").value;
  const limit = Number(document.querySelector("#ticket-limit").value);
  generatedTicketTitles = makeTicketDrafts(brief, limit);
  const preview = document.querySelector("#ticket-preview");
  preview.hidden = false;
  preview.innerHTML = generatedTicketTitles.length
    ? generatedTicketTitles.map((title) => `<div class="ticket-preview-item"><span>◈</span>${escapeHtml(title)}</div>`).join("")
    : `<div class="ticket-preview-empty">Add a brief or checklist to preview ticket titles.</div>`;
  document.querySelector("#add-generated-tickets").disabled = generatedTicketTitles.length === 0;
}

function addGeneratedTickets() {
  if (!generatedTicketTitles.length) return;
  const newTasks = generatedTicketTitles.map((title) => ({
    id: makeId(),
    title,
    description: "Generated from a project brief. Review and refine before starting.",
    status: "todo",
    label: "AI draft",
    priority: "Medium",
    assignee: "",
    initials: "JD",
    due: "",
    comments: [],
  }));
  tasks.push(...newTasks);
  persist();
  recordAudit("task", "Draft tickets generated", `${newTasks.length} tickets added from a local brief preview`);
  renderBoard();
  document.querySelector("#ai-dialog").close();
  document.querySelector("#ticket-brief").value = "";
  document.querySelector("#ticket-preview").hidden = true;
  generatedTicketTitles = [];
  document.querySelector("#add-generated-tickets").disabled = true;
  showToast(`${newTasks.length} draft ${newTasks.length === 1 ? "ticket" : "tickets"} added to To do`);
}

columns.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-status]");
  if (addButton) {
    openTask(null, addButton.dataset.addStatus);
    return;
  }
  const card = event.target.closest(".task-card");
  if (card) openTask(tasks.find((task) => task.id === card.dataset.taskId));
});

columns.addEventListener("keydown", (event) => {
  const card = event.target.closest(".task-card");
  if (card && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    openTask(tasks.find((task) => task.id === card.dataset.taskId));
  }
});

columns.addEventListener("dragstart", (event) => {
  const card = event.target.closest(".task-card");
  if (!card) return;
  event.dataTransfer.setData("text/plain", card.dataset.taskId);
  event.dataTransfer.effectAllowed = "move";
  requestAnimationFrame(() => card.classList.add("dragging"));
});

columns.addEventListener("dragend", (event) => event.target.closest(".task-card")?.classList.remove("dragging"));
columns.addEventListener("dragover", (event) => {
  const list = event.target.closest("[data-drop-status]");
  if (!list) return;
  event.preventDefault();
  list.classList.add("drag-over");
});
columns.addEventListener("dragleave", (event) => {
  const list = event.target.closest("[data-drop-status]");
  if (list && !list.contains(event.relatedTarget)) list.classList.remove("drag-over");
});
columns.addEventListener("drop", (event) => {
  const list = event.target.closest("[data-drop-status]");
  if (!list) return;
  event.preventDefault();
  list.classList.remove("drag-over");
  const task = tasks.find((item) => item.id === event.dataTransfer.getData("text/plain"));
  if (!task || task.status === list.dataset.dropStatus) return;
  task.status = list.dataset.dropStatus;
  persist();
  recordAudit("task", "Task moved", `${task.title} moved to ${STATUSES.find((status) => status.id === task.status).title}`);
  renderBoard();
  showToast(`Moved to ${STATUSES.find((status) => status.id === task.status).title}`);
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = document.querySelector("#task-title-input").value.trim();
  if (!title) return;
  const previous = tasks.find((task) => task.id === activeTaskId);
  const assignee = document.querySelector("#task-assignee-input").value.trim();
  const task = {
    ...(previous || { id: makeId(), comments: [], label: "Task" }),
    title,
    description: document.querySelector("#task-description-input").value.trim(),
    status: document.querySelector("#task-status-input").value,
    priority: document.querySelector("#task-priority-input").value,
    assignee,
    initials: initialsFor(assignee),
    due: document.querySelector("#task-due-input").value,
  };
  if (previous) tasks = tasks.map((item) => item.id === task.id ? task : item);
  else tasks.push(task);
  persist();
  recordAudit("task", previous ? "Task updated" : "Task created", task.title);
  renderBoard();
  taskDialog.close();
  showToast(previous ? "Task updated" : "Task created");
});

document.querySelector("#send-comment").addEventListener("click", submitComment);
document.querySelector("#comment-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submitComment(); }
});
document.querySelector("#delete-task").addEventListener("click", () => {
  if (!activeTaskId || !confirm("Delete this task and its discussion?")) return;
  tasks = tasks.filter((task) => task.id !== activeTaskId);
  persist();
  recordAudit("task", "Task deleted", "Task and its discussion removed");
  renderBoard();
  taskDialog.close();
  showToast("Task deleted");
});
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
document.querySelector("#search-input").addEventListener("input", (event) => {
  searchTerm = event.target.value.trim().toLowerCase();
  renderBoard();
});
document.querySelector("#filter-button").addEventListener("click", () => {
  highPriorityOnly = !highPriorityOnly;
  renderBoard();
  showToast(highPriorityOnly ? "Showing high-priority tasks" : "Filters cleared");
});
document.querySelector("#sort-button").addEventListener("click", () => {
  const priority = { High: 0, Medium: 1, Low: 2 };
  tasks.sort((first, second) => priority[first.priority] - priority[second.priority]);
  persist();
  renderBoard();
  showToast("Sorted by priority");
});
document.querySelector("#import-button").addEventListener("click", () => document.querySelector("#file-input").click());
document.querySelector("#file-input").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    let imported;
    let importedBoardMeta = null;
    let importedGuardrails = null;
    let importedApiPolicy = null;
    if (file.name.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed) && parsed && typeof parsed === "object" && parsed.version !== undefined) {
        validateBoardConfig(parsed);
        importedBoardMeta = { name: parsed.board.name.trim(), description: parsed.board.description.trim() };
        imported = parsed.tasks.map(normalizeImportedTask);
        importedGuardrails = parsed.settings?.aiGuardrails;
        importedApiPolicy = parsed.settings?.agentApi;
      } else {
        const data = Array.isArray(parsed) ? parsed : parsed?.tasks;
        if (!Array.isArray(data)) throw new Error("JSON must contain a task list or version 1 board configuration.");
        imported = data.map(normalizeImportedTask);
      }
    } else {
      imported = parseMarkdown(text);
      if (imported.length === 0) throw new Error("No task bullets found. Add Markdown list items under To do, In progress, or Done headings.");
    }
    tasks = imported;
    persist();
    if (importedBoardMeta) {
      boardMeta = importedBoardMeta;
      localStorage.setItem(BOARD_META_KEY, JSON.stringify(boardMeta));
      renderBoardIdentity();
    }
    if (importedGuardrails) {
      guardrails = {
        ...guardrails,
        maxTokens: importedGuardrails.maxTokens ?? guardrails.maxTokens,
        maxRuntime: importedGuardrails.maxRuntimeMinutes ?? guardrails.maxRuntime,
        dailyBudget: importedGuardrails.dailyTokenBudget ?? guardrails.dailyBudget,
        concurrency: String(importedGuardrails.maxConcurrentRuns ?? guardrails.concurrency),
        approvalRequired: importedGuardrails.requireHumanApproval ?? guardrails.approvalRequired,
        validateOutput: importedGuardrails.validateOutput ?? guardrails.validateOutput,
      };
      localStorage.setItem(GUARDRAIL_KEY, JSON.stringify(guardrails));
    }
    if (importedApiPolicy) {
      apiPolicy = {
        ...apiPolicy,
        perAgent: importedApiPolicy.requestsPerPrincipalPerMinute ?? apiPolicy.perAgent,
        perWorkspace: importedApiPolicy.requestsPerWorkspacePerMinute ?? apiPolicy.perWorkspace,
        concurrency: importedApiPolicy.maxConcurrentRuns ?? apiPolicy.concurrency,
        spacingSeconds: importedApiPolicy.minimumActionSpacingSeconds ?? apiPolicy.spacingSeconds,
        queueSize: importedApiPolicy.maximumQueuedRuns ?? apiPolicy.queueSize,
        maxRetries: importedApiPolicy.maximumRetries ?? apiPolicy.maxRetries,
        approveWrites: importedApiPolicy.requireHumanApprovalForExternalWrites ?? apiPolicy.approveWrites,
        autoQueue: importedApiPolicy.autoQueueApprovedRequests ?? apiPolicy.autoQueue,
      };
      localStorage.setItem(API_POLICY_KEY, JSON.stringify(apiPolicy));
    }
    recordAudit("task", "Board imported", `${imported.length} tasks imported from ${file.name}`);
    renderBoard();
    showToast(`Imported ${imported.length} ${imported.length === 1 ? "task" : "tasks"}`);
  } catch (error) {
    console.error("Board import failed.", error);
    showToast(`Import failed: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});
document.querySelector("#export-button").addEventListener("click", () => {
  download(`${boardMeta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.md`, toMarkdown(), "text/markdown;charset=utf-8");
  recordAudit("task", "Board exported", "Markdown snapshot downloaded");
  showToast("Markdown board exported");
});
document.querySelector("#export-config").addEventListener("click", () => {
  const fileName = `${boardMeta.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "orbit-board"}.config.json`;
  download(fileName, `${JSON.stringify(toBoardConfig(), null, 2)}\n`, "application/json;charset=utf-8");
  recordAudit("settings", "Board configuration exported", "Version 1 JSON configuration downloaded");
  showToast("JSON configuration exported");
});
document.querySelector("#share-button").addEventListener("click", () => shareDialog.showModal());
document.querySelector("#invite-button").addEventListener("click", () => {
  shareDialog.showModal();
  showToast("Share a snapshot with your teammates");
});
document.querySelector("#copy-link-button").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareMessage().split("\n")[1]);
    showToast("Portable board link copied");
  } catch (error) {
    console.error("Could not copy board link.", error);
    showToast("Clipboard unavailable — use Export to share a file");
  }
});
document.querySelectorAll("[data-share]").forEach((button) => button.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareMessage());
    showToast(`${button.dataset.share[0].toUpperCase()}${button.dataset.share.slice(1)} message copied`);
  } catch (error) {
    console.error("Could not copy share message.", error);
    showToast("Clipboard unavailable — use Export to share a file");
  }
}));

document.querySelector("#communication-button").addEventListener("click", () => openCommunication());
document.querySelector("#close-communication").addEventListener("click", closeCommunication);
document.querySelector("#panel-backdrop").addEventListener("click", closeCommunication);
document.querySelector("#messages-tab").addEventListener("click", () => setCommunicationTab("messages"));
document.querySelector("#email-tab").addEventListener("click", () => setCommunicationTab("email"));
document.querySelector("#channel-select").addEventListener("change", updateChannel);
document.querySelector("#chat-form").addEventListener("submit", sendChatMessage);
document.querySelector("#chat-input").addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    document.querySelector("#chat-form").requestSubmit();
  }
});
document.querySelector("#digest-frequency").value = communication.frequency;
document.querySelectorAll(".subscription-choice input").forEach((checkbox) => {
  checkbox.checked = communication.subscriptions.includes(checkbox.value);
  checkbox.addEventListener("change", () => {
    communication.subscriptions = [...document.querySelectorAll(".subscription-choice input:checked")].map((input) => input.value);
    persistCommunication();
  });
});
document.querySelector("#digest-frequency").addEventListener("change", (event) => {
  communication.frequency = event.target.value;
  persistCommunication();
  recordAudit("settings", "Email schedule updated", `Summary cadence set to ${event.target.selectedOptions[0].text}`);
  showToast("Email schedule updated");
});
document.querySelector("#subscriber-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#subscriber-email");
  const email = input.value.trim().toLowerCase();
  if (communication.subscribers.some((subscriber) => subscriber.toLowerCase() === email)) {
    showToast("That email is already subscribed");
    return;
  }
  communication.subscribers.push(email);
  persistCommunication();
  recordAudit("communication", "Email subscriber added", email);
  renderSubscribers();
  input.value = "";
  showToast("Subscriber added");
});
document.querySelector("#subscriber-list").addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-subscriber]");
  if (!removeButton) return;
  communication.subscribers = communication.subscribers.filter((email) => email !== removeButton.dataset.removeSubscriber);
  persistCommunication();
  recordAudit("communication", "Email subscriber removed", removeButton.dataset.removeSubscriber);
  renderSubscribers();
  showToast("Subscriber removed");
});
document.querySelector("#generate-summary").addEventListener("click", () => {
  document.querySelector("#summary-content").textContent = buildEmailSummary();
  document.querySelector("#digest-preview").hidden = false;
});
document.querySelector("#copy-summary").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(document.querySelector("#summary-content").textContent);
    recordAudit("communication", "Email summary copied", "Board recap copied for email delivery");
    showToast("Email summary copied");
  } catch (error) {
    console.error("Could not copy email summary.", error);
    showToast("Clipboard unavailable — select and copy the summary");
  }
});
document.querySelector("#analytics-nav").addEventListener("click", () => openConsole("insights"));
document.querySelector("#elastic-nav").addEventListener("click", () => openConsole("elastic"));
document.querySelector("#admin-nav").addEventListener("click", () => openConsole("admin"));
document.querySelectorAll("[data-console-tab]").forEach((tab) => {
  tab.addEventListener("click", () => openConsole(tab.dataset.consoleTab));
});
document.querySelector("#refresh-metrics").addEventListener("click", () => {
  renderMetrics();
  showToast("Metrics recalculated from local board data");
});
document.querySelector("#audit-search").addEventListener("input", renderAuditLog);
document.querySelector("#audit-filter").addEventListener("change", renderAuditLog);
document.querySelector("#export-audit").addEventListener("click", () => {
  download("orbit-audit.ecs.ndjson", auditEvents.map((event) => JSON.stringify(event)).join("\n") + "\n", "application/x-ndjson;charset=utf-8");
  showToast("ECS event log exported");
});
["elastic-query", "elastic-time", "elastic-severity", "elastic-category"].forEach((id) => {
  document.querySelector(`#${id}`).addEventListener(id === "elastic-query" ? "input" : "change", renderElasticLogs);
});
document.querySelector("#elastic-query").addEventListener("keydown", (event) => {
  if (event.key === "Enter") renderElasticLogs();
});
document.querySelector("#elastic-event-rows").addEventListener("click", (event) => {
  const row = event.target.closest("[data-elastic-event]");
  if (!row) return;
  const selected = auditEvents.find((item) => item.event.id === row.dataset.elasticEvent);
  if (!selected) return;
  renderElasticDetails(selected);
  renderElasticLogs();
  document.querySelector("#elastic-event-detail").scrollIntoView({ block: "nearest", behavior: "smooth" });
});
document.querySelector("#elastic-event-rows").addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  const row = event.target.closest("[data-elastic-event]");
  if (!row) return;
  event.preventDefault();
  row.click();
});
document.querySelector("#elastic-event-detail").addEventListener("click", async (event) => {
  if (event.target.closest(".event-detail-close")) {
    renderElasticDetails(null);
    renderElasticLogs();
    return;
  }
  const userFilter = event.target.closest("[data-investigate-user]");
  if (userFilter?.dataset.investigateUser) {
    document.querySelector("#elastic-query").value = userFilter.dataset.investigateUser;
    renderElasticLogs();
    document.querySelector("#elastic-query").focus();
    return;
  }
  const reviewButton = event.target.closest("[data-mark-reviewed]");
  if (reviewButton) {
    const eventId = reviewButton.dataset.markReviewed;
    if (!irState.reviewed.includes(eventId)) {
      irState.reviewed.push(eventId);
      persistIrState();
      recordAudit("security", "IR event marked reviewed", `Event ${eventId} reviewed`);
    }
    const item = auditEvents.find((auditEvent) => auditEvent.event.id === eventId);
    renderElasticDetails(item);
    renderElasticLogs();
    return;
  }
  const caseButton = event.target.closest("[data-create-case]");
  if (caseButton) {
    const eventId = caseButton.dataset.createCase;
    let incident = irState.cases.find((item) => item.eventIds.includes(eventId));
    if (!incident) {
      const sourceEvent = auditEvents.find((item) => item.event.id === eventId);
      if (!sourceEvent) return;
      incident = {
        id: makeId(),
        title: `IR: ${sourceEvent.event.action}`,
        status: "open",
        eventIds: [eventId],
        createdAt: new Date().toISOString(),
      };
      irState.cases.unshift(incident);
      persistIrState();
      recordAudit("security", "IR case created", `${incident.title} linked to event ${eventId}`);
    }
    renderElasticDetails(auditEvents.find((item) => item.event.id === eventId));
    renderElasticLogs();
    return;
  }
  const copyButton = event.target.closest("[data-copy-event]");
  if (copyButton) {
    try {
      await navigator.clipboard.writeText(copyButton.dataset.copyEvent);
      showToast("Event ID copied");
    } catch (error) {
      console.error("Could not copy event ID.", error);
      showToast("Clipboard unavailable");
    }
  }
});
document.querySelector("#export-ecs-filtered").addEventListener("click", () => {
  const events = getElasticEvents();
  const data = events.map((event) => JSON.stringify(event)).join("\n");
  download("orbit-elastic-events.ndjson", data ? `${data}\n` : "", "application/x-ndjson;charset=utf-8");
  recordAudit("security", "Elastic event export", `${events.length} filtered ECS events exported`);
  showToast(`${events.length} ECS events exported`);
});
document.querySelector("#import-ecs-logs").addEventListener("click", () => document.querySelector("#ecs-log-file").click());
document.querySelector("#ecs-log-file").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 10 * 1024 * 1024) throw new Error("Event import is limited to 10 MB per file.");
    const text = await file.text();
    const parsed = file.name.toLowerCase().endsWith(".ndjson") || file.name.toLowerCase().endsWith(".jsonl")
      ? text : JSON.parse(text);
    const result = importEcsDocument(parsed);
    renderElasticLogs();
    showToast(`${result.added} imported · ${result.duplicates} duplicates skipped`);
  } catch (error) {
    console.error("ECS event import failed.", error);
    showToast(`Log import failed: ${error.message}`);
  } finally {
    event.target.value = "";
  }
});
document.querySelector("#board-settings-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const name = document.querySelector("#admin-board-name").value.trim();
  if (!name) return;
  boardMeta = {
    name,
    description: document.querySelector("#admin-board-description").value.trim(),
  };
  adminSettings.retentionDays = document.querySelector("#retention-days").value;
  localStorage.setItem(BOARD_META_KEY, JSON.stringify(boardMeta));
  localStorage.setItem(ADMIN_KEY, JSON.stringify(adminSettings));
  renderBoardIdentity();
  recordAudit("settings", "Board settings updated", `Board renamed to ${name}`);
  showToast("Board settings saved");
});
document.querySelector("#member-add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const emailInput = document.querySelector("#member-email");
  const email = emailInput.value.trim().toLowerCase();
  if (members.some((member) => member.email.toLowerCase() === email)) {
    showToast("That teammate is already listed");
    return;
  }
  const role = document.querySelector("#member-role").value;
  members.push({ email, role, kind: role === "Analytics bot" ? "bot" : "human" });
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  recordAudit("settings", "Workspace member added", `${email} added as ${role}`);
  renderMembers();
  renderMetrics();
  emailInput.value = "";
  showToast("Workspace member added");
});
document.querySelector("#member-list").addEventListener("change", (event) => {
  const roleSelect = event.target.closest("[data-member-role]");
  if (!roleSelect) return;
  const member = members[Number(roleSelect.dataset.memberRole)];
  if (!member) return;
  member.role = roleSelect.value;
  member.kind = roleSelect.value === "Analytics bot" ? "bot" : "human";
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  localStorage.setItem(ACL_KEY, JSON.stringify(userAcl));
  recordAudit("security", "Workspace role changed", `${member.email} assigned ${member.role}`);
  renderMembers();
  renderMetrics();
});
document.querySelector("#member-list").addEventListener("click", (event) => {
  const removeButton = event.target.closest("[data-remove-member]");
  if (!removeButton) return;
  const [removed] = members.splice(Number(removeButton.dataset.removeMember), 1);
  if (!removed) return;
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
  directoryGroups.forEach((group) => { group.members = group.members.filter((email) => email !== removed.email); });
  delete userAcl[removed.email];
  localStorage.setItem(GROUPS_KEY, JSON.stringify(directoryGroups));
  localStorage.setItem(ACL_KEY, JSON.stringify(userAcl));
  recordAudit("security", "Workspace member removed", `${removed.email} access removed`);
  renderMembers();
  renderMetrics();
});
document.querySelector("#retention-days").addEventListener("change", (event) => {
  adminSettings.retentionDays = event.target.value;
  localStorage.setItem(ADMIN_KEY, JSON.stringify(adminSettings));
  recordAudit("settings", "Audit retention preference changed", `${event.target.value} day retention requested`);
});
document.querySelectorAll("#mask-sensitive-data, #log-external-actions, #restrict-integrations, #share-analytics-bots").forEach((control) => {
  control.addEventListener("change", () => {
    adminSettings = {
      ...adminSettings,
      maskSensitive: document.querySelector("#mask-sensitive-data").checked,
      logExternal: document.querySelector("#log-external-actions").checked,
      restrictIntegrations: document.querySelector("#restrict-integrations").checked,
      shareAnalyticsBots: document.querySelector("#share-analytics-bots").checked,
    };
    localStorage.setItem(ADMIN_KEY, JSON.stringify(adminSettings));
    recordAudit("security", "Data sharing policy changed", `${control.id} updated in local preferences`);
    renderMetrics();
    showToast("Local policy preference saved");
  });
});
document.querySelector("#save-api-policy").addEventListener("click", () => {
  const fields = {
    perAgent: "#api-agent-rate",
    perWorkspace: "#api-workspace-rate",
    concurrency: "#api-concurrency",
    spacingSeconds: "#api-action-delay",
    queueSize: "#api-queue-size",
    maxRetries: "#api-max-retries",
  };
  const inputs = Object.values(fields).map((selector) => document.querySelector(selector));
  if (inputs.some((input) => !input.checkValidity())) {
    inputs.find((input) => !input.checkValidity()).reportValidity();
    return;
  }
  const values = Object.fromEntries(Object.entries(fields).map(([key, selector]) => [key, Number(document.querySelector(selector).value)]));
  if (values.perAgent > values.perWorkspace) {
    showToast("Per-agent calls/min cannot exceed the workspace cap");
    return;
  }
  apiPolicy = {
    ...values,
    approveWrites: document.querySelector("#api-human-writes").checked,
    autoQueue: document.querySelector("#api-auto-queue").checked,
  };
  localStorage.setItem(API_POLICY_KEY, JSON.stringify(apiPolicy));
  recordAudit("security", "Agent API rate policy updated", `${values.perAgent} calls/min per agent; ${values.perWorkspace} workspace calls/min`);
  showToast("Agent API policy saved locally");
});
document.querySelectorAll("[data-idp]").forEach((button) => button.addEventListener("click", () => {
  recordAudit("security", "Identity provider setup requested", `${button.dataset.idp} requires a backend configuration`);
  showToast("Configure OAuth/OIDC in the server identity service; no client secret belongs here");
}));
document.querySelector("#permission-matrix").addEventListener("change", (event) => {
  const checkbox = event.target.closest("[data-acl-type]");
  if (!checkbox) return;
  const { aclType, subject, permission } = checkbox.dataset;
  if (aclType === "group") {
    const group = directoryGroups.find((item) => item.id === subject);
    if (!group) return;
    group.permissions ??= defaultPermissions();
    group.permissions[permission] = checkbox.checked;
    localStorage.setItem(GROUPS_KEY, JSON.stringify(directoryGroups));
    recordAudit("security", "Group permission changed", `${group.name}: ${permission} ${checkbox.checked ? "allowed" : "denied"}`);
  } else {
    userAcl[subject] ??= {};
    userAcl[subject][permission] = checkbox.checked;
    localStorage.setItem(ACL_KEY, JSON.stringify(userAcl));
    recordAudit("security", "Individual permission changed", `${subject}: ${permission} ${checkbox.checked ? "allowed" : "denied"}`);
  }
  renderAccessControl();
});
document.querySelector("#group-add-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#group-name");
  const name = input.value.trim();
  if (!name || directoryGroups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
    showToast("Enter a unique directory group name");
    return;
  }
  directoryGroups.push({ id: makeId(), name, members: [], permissions: { ...defaultPermissions(), read: true } });
  localStorage.setItem(GROUPS_KEY, JSON.stringify(directoryGroups));
  recordAudit("security", "Directory group created", `Group ${name} created`);
  renderAccessControl();
  input.value = "";
});
document.querySelector("#directory-groups").addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-group-add]");
  if (addButton) {
    const group = directoryGroups.find((item) => item.id === addButton.dataset.groupAdd);
    if (!group) return;
    const memberSelect = document.querySelector(`[data-group-select="${CSS.escape(group.id)}"]`);
    const email = memberSelect?.value;
    if (!email) return;
    group.members.push(email);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(directoryGroups));
    recordAudit("security", "Directory membership added", `${email} added to ${group.name}`);
    renderAccessControl();
    return;
  }
  const removeMember = event.target.closest("[data-group-remove]");
  if (removeMember) {
    const group = directoryGroups.find((item) => item.id === removeMember.dataset.groupRemove);
    if (!group) return;
    group.members = group.members.filter((email) => email !== removeMember.dataset.memberEmail);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(directoryGroups));
    recordAudit("security", "Directory membership removed", `${removeMember.dataset.memberEmail} removed from ${group.name}`);
    renderAccessControl();
    return;
  }
  const deleteButton = event.target.closest("[data-delete-group]");
  if (deleteButton) {
    const group = directoryGroups.find((item) => item.id === deleteButton.dataset.deleteGroup);
    if (!group || !confirm(`Delete the ${group.name} group?`)) return;
    directoryGroups = directoryGroups.filter((item) => item.id !== group.id);
    localStorage.setItem(GROUPS_KEY, JSON.stringify(directoryGroups));
    recordAudit("security", "Directory group deleted", `Group ${group.name} deleted`);
    renderAccessControl();
  }
});
document.querySelector("#generate-tickets-button").addEventListener("click", () => {
  document.querySelector("#max-tokens").value = guardrails.maxTokens;
  document.querySelector("#max-runtime").value = guardrails.maxRuntime;
  document.querySelector("#daily-budget").value = guardrails.dailyBudget;
  document.querySelector("#max-concurrency").value = guardrails.concurrency;
  document.querySelector("#approval-required").checked = guardrails.approvalRequired;
  document.querySelector("#stop-on-stall").checked = guardrails.stopOnStall;
  document.querySelector("#validate-output").checked = guardrails.validateOutput;
  document.querySelector("#approved-tools-only").checked = guardrails.approvedToolsOnly;
  document.querySelector("#approve-external-writes").checked = guardrails.approveExternalWrites;
  document.querySelector("#untrusted-inputs").checked = guardrails.untrustedInputs;
  document.querySelector("#repo-scope-only").checked = guardrails.repoScopeOnly;
  document.querySelector("#ai-dialog").showModal();
});
document.querySelector("#preview-tickets").addEventListener("click", updateTicketPreview);
document.querySelector("#ticket-brief").addEventListener("input", () => {
  generatedTicketTitles = [];
  document.querySelector("#add-generated-tickets").disabled = true;
});
document.querySelector("#add-generated-tickets").addEventListener("click", addGeneratedTickets);
document.querySelector("#max-tokens").value = guardrails.maxTokens;
document.querySelector("#max-runtime").value = guardrails.maxRuntime;
document.querySelector("#daily-budget").value = guardrails.dailyBudget;
document.querySelector("#max-concurrency").value = guardrails.concurrency;
document.querySelector("#approval-required").checked = guardrails.approvalRequired;
document.querySelector("#stop-on-stall").checked = guardrails.stopOnStall;
document.querySelector("#validate-output").checked = guardrails.validateOutput;
document.querySelector("#approved-tools-only").checked = guardrails.approvedToolsOnly;
document.querySelector("#approve-external-writes").checked = guardrails.approveExternalWrites;
document.querySelector("#untrusted-inputs").checked = guardrails.untrustedInputs;
document.querySelector("#repo-scope-only").checked = guardrails.repoScopeOnly;
document.querySelectorAll("#ai-dialog input, #ai-dialog select").forEach((control) => {
  control.addEventListener("change", () => {
    if (!control.checkValidity()) {
      control.reportValidity();
      return;
    }
    persistGuardrails();
    recordAudit("security", "AI guardrail changed", `${control.id} updated in local preferences`);
    showToast("Guardrail preference saved locally");
  });
});

window.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    document.querySelector("#search-input").focus();
  }
  if (event.key === "Escape") closeCommunication();
});

try {
  const match = window.location.hash.match(/^#board=(.+)$/);
  if (match) {
    const sharedBoard = decodeBoard(match[1]);
    tasks = sharedBoard.tasks;
    persist();
    if (sharedBoard.metadata) {
      boardMeta = sharedBoard.metadata;
      localStorage.setItem(BOARD_META_KEY, JSON.stringify(boardMeta));
    }
    window.history.replaceState(null, "", window.location.href.split("#")[0]);
  }
} catch (error) {
  console.error("Could not open shared board.", error);
  showToast("This board link could not be opened.");
}

document.querySelector("#share-link-preview").textContent = `${window.location.host || "local board"}/#board=…`;
renderChat();
renderSubscribers();
renderBoardIdentity();
document.querySelector("#audit-count").textContent = auditEvents.length;
renderBoard();
