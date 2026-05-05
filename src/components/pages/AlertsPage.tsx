import { useState, useMemo } from "react";
import { useLogData } from "../../context/LogProvider";
import type { AlertRule, Alert } from "../../types";

const severityConfig = {
  critical: { dot: "bg-red-400",    text: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    label: "Critical" },
  warning:  { dot: "bg-amber-400",  text: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  label: "Warning" },
  info:     { dot: "bg-cyan-400",   text: "text-cyan-400",   bg: "bg-cyan-500/10",   border: "border-cyan-500/20",   label: "Info" },
};

const conditionLabels: Record<AlertRule["condition"], string> = {
  error_rate: "Error Rate (per min)",
  error_count: "Error Count",
  service_down: "Service Down (seconds)",
  high_latency: "High Latency (ms)",
};

export default function AlertsPage() {
  const {
    alertRules, addAlertRule, updateAlertRule, removeAlertRule, toggleAlertRule,
    alerts, acknowledgeAlert, clearAlerts,
    trackedServices,
  } = useLogData();

  /* ── tabs ── */
  const [activeTab, setActiveTab] = useState<"alerts" | "rules">("alerts");

  /* ── alert filters ── */
  const [alertFilter, setAlertFilter] = useState<"all" | Alert["severity"]>("all");
  const [alertShowAcked, setAlertShowAcked] = useState(false);

  /* ── rule form ── */
  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleCondition, setRuleCondition] = useState<AlertRule["condition"]>("error_rate");
  const [ruleThreshold, setRuleThreshold] = useState("");
  const [ruleService, setRuleService] = useState("all");
  const [formError, setFormError] = useState("");

  const serviceNames = useMemo(
    () => ["all", ...trackedServices.map((s) => s.name)],
    [trackedServices]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (alertFilter !== "all" && a.severity !== alertFilter) return false;
      if (!alertShowAcked && a.acknowledged) return false;
      return true;
    });
  }, [alerts, alertFilter, alertShowAcked]);

  const unackedCount = alerts.filter((a) => !a.acknowledged).length;
  const criticalCount = alerts.filter((a) => a.severity === "critical" && !a.acknowledged).length;

  /* ── form handlers ── */
  const resetForm = () => {
    setShowRuleForm(false);
    setEditRuleId(null);
    setRuleName("");
    setRuleCondition("error_rate");
    setRuleThreshold("");
    setRuleService("all");
    setFormError("");
  };

  const handleSaveRule = () => {
    if (!ruleName.trim()) { setFormError("Rule name is required"); return; }
    const thr = Number(ruleThreshold);
    if (!ruleThreshold || isNaN(thr) || thr <= 0) { setFormError("Enter a valid threshold > 0"); return; }
    setFormError("");

    if (editRuleId) {
      updateAlertRule(editRuleId, {
        name: ruleName.trim(),
        condition: ruleCondition,
        threshold: thr,
        service: ruleService,
      });
    } else {
      addAlertRule({
        name: ruleName.trim(),
        condition: ruleCondition,
        threshold: thr,
        service: ruleService,
        enabled: true,
      });
    }
    resetForm();
  };

  const startEditRule = (rule: AlertRule) => {
    setRuleName(rule.name);
    setRuleCondition(rule.condition);
    setRuleThreshold(String(rule.threshold));
    setRuleService(rule.service);
    setEditRuleId(rule.id);
    setShowRuleForm(true);
    setFormError("");
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-red-500 to-orange-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            Alerts & Rules
            {unackedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-bold animate-pulse">
                {unackedCount} unread
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-400 mt-1 ml-13">
            Configure alert rules and monitor triggered alerts across all services.
          </p>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Unacknowledged" value={unackedCount} color="red" />
        <StatCard label="Critical" value={criticalCount} color="rose" />
        <StatCard label="Active Rules" value={alertRules.filter((r) => r.enabled).length} color="cyan" />
        <StatCard label="Total Alerts" value={alerts.length} color="slate" />
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50 w-fit">
        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === "alerts" ? "bg-red-500/20 text-red-400 shadow-sm" : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Fired Alerts
          {unackedCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 rounded-full bg-red-500/30 text-red-400 text-[10px] font-bold">
              {unackedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
            activeTab === "rules" ? "bg-cyan-500/20 text-cyan-400 shadow-sm" : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Alert Rules
          <span className="ml-2 px-1.5 py-0.5 rounded-full bg-slate-600/50 text-slate-400 text-[10px] font-bold">
            {alertRules.length}
          </span>
        </button>
      </div>

      {/* ─────────── ALERTS TAB ─────────── */}
      {activeTab === "alerts" && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
              {(["all", "critical", "warning", "info"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setAlertFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize ${
                    alertFilter === s
                      ? s === "all"   ? "bg-slate-600 text-white shadow-sm"
                      : s === "critical" ? "bg-red-500/20 text-red-400 shadow-sm"
                      : s === "warning"  ? "bg-amber-500/20 text-amber-400 shadow-sm"
                      : "bg-cyan-500/20 text-cyan-400 shadow-sm"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={alertShowAcked}
                onChange={(e) => setAlertShowAcked(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/30 w-3.5 h-3.5"
              />
              Show acknowledged
            </label>

            <div className="ml-auto">
              <button
                onClick={clearAlerts}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/50 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Alert list */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
            {filteredAlerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm font-medium">All clear!</p>
                <p className="text-xs mt-1">No alerts match your current filters.</p>
              </div>
            ) : (
              filteredAlerts.map((alert, i) => {
                const cfg = severityConfig[alert.severity];
                const time = new Date(alert.triggeredAt);
                const timeStr = time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                const dateStr = time.toLocaleDateString([], { month: "short", day: "numeric" });
                return (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 px-5 py-4 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors animate-slideUp ${
                      alert.acknowledged ? "opacity-50" : ""
                    }`}
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    {/* Severity icon */}
                    <div className={`mt-0.5 w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                      {alert.severity === "critical" ? (
                        <svg className={`w-4 h-4 ${cfg.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : alert.severity === "warning" ? (
                        <svg className={`w-4 h-4 ${cfg.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className={`w-4 h-4 ${cfg.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.bg} ${cfg.text} ${cfg.border} uppercase tracking-wider`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">{alert.ruleName}</span>
                        <span className="text-[10px] text-slate-600">•</span>
                        <span className="text-xs text-slate-500">{alert.service}</span>
                      </div>
                      <p className="text-sm text-slate-300">{alert.message}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{dateStr} at {timeStr}</p>
                    </div>

                    {/* Actions */}
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        title="Acknowledge"
                        className="px-3 py-1.5 rounded-lg text-xs font-medium border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 transition-all shrink-0"
                      >
                        Ack
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ─────────── RULES TAB ─────────── */}
      {activeTab === "rules" && (
        <div className="space-y-4">
          {/* Add rule button */}
          <div className="flex justify-end">
            <button
              onClick={() => { resetForm(); setShowRuleForm(true); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-linear-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:brightness-110 transition-all duration-200 active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Rule
            </button>
          </div>

          {/* Rule form */}
          {showRuleForm && (
            <div className="rounded-xl border border-cyan-500/20 bg-slate-800/60 p-6 animate-slideUp">
              <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {editRuleId ? "Edit Rule" : "Create Alert Rule"}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Rule Name</label>
                  <input
                    type="text"
                    placeholder="e.g. High Error Rate"
                    value={ruleName}
                    onChange={(e) => setRuleName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Condition</label>
                  <select
                    value={ruleCondition}
                    onChange={(e) => setRuleCondition(e.target.value as AlertRule["condition"])}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer transition-all"
                  >
                    {Object.entries(conditionLabels).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Threshold</label>
                  <input
                    type="number"
                    placeholder="e.g. 5"
                    min={1}
                    value={ruleThreshold}
                    onChange={(e) => setRuleThreshold(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Service</label>
                  <select
                    value={ruleService}
                    onChange={(e) => setRuleService(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-900/80 border border-slate-700/50 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 cursor-pointer transition-all"
                  >
                    {serviceNames.map((name) => (
                      <option key={name} value={name}>{name === "all" ? "All Services" : name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {formError && <p className="text-[11px] text-red-400 mt-3">{formError}</p>}

              <div className="flex items-center gap-3 mt-5">
                <button
                  onClick={handleSaveRule}
                  className="px-5 py-2.5 rounded-lg bg-linear-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold hover:brightness-110 transition-all active:scale-95"
                >
                  {editRuleId ? "Save Changes" : "Create Rule"}
                </button>
                <button
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 text-sm font-medium hover:bg-slate-600/50 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Rules list */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
            <div className="grid grid-cols-[1fr_160px_100px_120px_100px] gap-4 px-5 py-3 bg-slate-800/60 border-b border-slate-700/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Rule</span>
              <span>Condition</span>
              <span>Threshold</span>
              <span>Service</span>
              <span className="text-right">Actions</span>
            </div>

            {alertRules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <p className="text-sm font-medium">No alert rules configured</p>
                <p className="text-xs mt-1">Create a rule to start monitoring.</p>
              </div>
            ) : (
              alertRules.map((rule, i) => (
                <div
                  key={rule.id}
                  className={`grid grid-cols-[1fr_160px_100px_120px_100px] gap-4 px-5 py-4 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors animate-slideUp ${
                    !rule.enabled ? "opacity-50" : ""
                  }`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${rule.enabled ? "bg-emerald-400" : "bg-slate-500"}`} />
                    <span className="text-sm font-medium text-slate-200 truncate">{rule.name}</span>
                  </div>
                  <span className="text-xs text-slate-400 flex items-center">{conditionLabels[rule.condition]}</span>
                  <span className="text-sm text-cyan-400 font-mono flex items-center">{rule.threshold}</span>
                  <span className="text-xs text-slate-400 flex items-center truncate">{rule.service === "all" ? "All" : rule.service}</span>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleAlertRule(rule.id)}
                      title={rule.enabled ? "Disable rule" : "Enable rule"}
                      className={`p-1.5 rounded-lg border transition-all duration-200 ${
                        rule.enabled
                          ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                          : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                      }`}
                    >
                      {rule.enabled ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                    </button>
                    <button
                      onClick={() => startEditRule(rule)}
                      title="Edit rule"
                      className="p-1.5 rounded-lg border border-slate-600/30 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeAlertRule(rule.id)}
                      title="Delete rule"
                      className="p-1.5 rounded-lg border border-slate-600/30 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-200"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Stat card helper ── */
function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    red: "border-red-500/20 bg-red-500/5 text-red-400",
    rose: "border-rose-500/20 bg-rose-500/5 text-rose-400",
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
    slate: "border-slate-500/20 bg-slate-500/5 text-slate-400",
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
