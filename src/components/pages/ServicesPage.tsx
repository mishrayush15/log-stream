import { useState } from "react";
import { useLogData } from "../../context/LogProvider";
import type { TrackedService } from "../../types";

const statusConfig = {
  running: { dot: "bg-emerald-400", text: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Running", ping: true },
  stopped: { dot: "bg-slate-400",   text: "text-slate-400",   bg: "bg-slate-500/10",   border: "border-slate-500/20",   label: "Stopped", ping: false },
  error:   { dot: "bg-red-400",     text: "text-red-400",     bg: "bg-red-500/10",     border: "border-red-500/20",     label: "Error",   ping: false },
};

export default function ServicesPage() {
  const { trackedServices: services, addService, updateService, removeService, toggleServiceStatus } = useLogData();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [port, setPort] = useState("");
  const [nameError, setNameError] = useState("");
  const [portError, setPortError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | TrackedService["status"]>("all");

  const validate = () => {
    let valid = true;
    setNameError("");
    setPortError("");

    if (!name.trim()) {
      setNameError("Service name is required");
      valid = false;
    } else if (!editingId && services.some((s) => s.name.toLowerCase() === name.trim().toLowerCase())) {
      setNameError("Service name already exists");
      valid = false;
    }

    const portNum = Number(port);
    if (!port.trim()) {
      setPortError("Port is required");
      valid = false;
    } else if (isNaN(portNum) || portNum < 1 || portNum > 65535 || !Number.isInteger(portNum)) {
      setPortError("Enter a valid port (1–65535)");
      valid = false;
    } else if (!editingId && services.some((s) => s.port === portNum)) {
      setPortError("Port already in use by another service");
      valid = false;
    }

    return valid;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    if (editingId) {
      updateService(editingId, name.trim(), Number(port));
      setEditingId(null);
    } else {
      addService(name.trim(), Number(port));
    }

    setName("");
    setPort("");
    setShowForm(false);
  };

  const handleEdit = (svc: TrackedService) => {
    setName(svc.name);
    setPort(String(svc.port));
    setEditingId(svc.id);
    setShowForm(true);
    setNameError("");
    setPortError("");
  };

  const handleDelete = (id: string) => {
    removeService(id);
  };

  const handleToggleStatus = (id: string) => {
    toggleServiceStatus(id);
  };

  const handleCancel = () => {
    setShowForm(false);
    setName("");
    setPort("");
    setEditingId(null);
    setNameError("");
    setPortError("");
  };

  const filtered = services.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return s.name.toLowerCase().includes(q) || String(s.port).includes(q);
    }
    return true;
  });

  const runningCount = services.filter((s) => s.status === "running").length;
  const stoppedCount = services.filter((s) => s.status === "stopped").length;
  const errorCount = services.filter((s) => s.status === "error").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
            </div>
            Tracked Services
          </h2>
          <p className="text-sm text-slate-400 mt-1 ml-13">
            Add services and their ports to monitor log streams from running containers.
          </p>
        </div>

        <button
          onClick={() => { setShowForm(true); setEditingId(null); setName(""); setPort(""); setNameError(""); setPortError(""); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-linear-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 hover:brightness-110 transition-all duration-200 active:scale-95"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add Service
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-400">{runningCount}</p>
            <p className="text-xs text-slate-400">Running</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-500/20 bg-slate-500/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-400">{stoppedCount}</p>
            <p className="text-xs text-slate-400">Stopped</p>
          </div>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
            <div className="w-3 h-3 rounded-full bg-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-400">{errorCount}</p>
            <p className="text-xs text-slate-400">Error</p>
          </div>
        </div>
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-xl border border-cyan-500/20 bg-slate-800/60 p-6 animate-slideUp">
          <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {editingId ? "Edit Service" : "Add New Service"}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Service Name */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Service Name</label>
              <input
                type="text"
                placeholder="e.g. user-service"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(""); }}
                className={`w-full px-3 py-2.5 rounded-lg bg-slate-900/80 border text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  nameError ? "border-red-500/50 focus:ring-red-500/30" : "border-slate-700/50 focus:ring-cyan-500/40 focus:border-cyan-500/40"
                }`}
              />
              {nameError && <p className="text-[11px] text-red-400 mt-1">{nameError}</p>}
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Port Number</label>
              <input
                type="number"
                placeholder="e.g. 8080"
                min={1}
                max={65535}
                value={port}
                onChange={(e) => { setPort(e.target.value); setPortError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className={`w-full px-3 py-2.5 rounded-lg bg-slate-900/80 border text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  portError ? "border-red-500/50 focus:ring-red-500/30" : "border-slate-700/50 focus:ring-cyan-500/40 focus:border-cyan-500/40"
                }`}
              />
              {portError && <p className="text-[11px] text-red-400 mt-1">{portError}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-lg bg-linear-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold hover:brightness-110 transition-all active:scale-95"
            >
              {editingId ? "Save Changes" : "Start Tracking"}
            </button>
            <button
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-lg bg-slate-700/50 border border-slate-600/50 text-slate-300 text-sm font-medium hover:bg-slate-600/50 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search & filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or port…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition-all"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg border border-slate-700/50">
          {(["all", "running", "stopped", "error"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 capitalize ${
                filterStatus === s
                  ? s === "all"
                    ? "bg-slate-600 text-white shadow-sm"
                    : s === "running"
                    ? "bg-emerald-500/20 text-emerald-400 shadow-sm"
                    : s === "stopped"
                    ? "bg-slate-500/20 text-slate-300 shadow-sm"
                    : "bg-red-500/20 text-red-400 shadow-sm"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Services list */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[1fr_100px_120px_160px_140px] gap-4 px-5 py-3 bg-slate-800/60 border-b border-slate-700/50 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Service Name</span>
          <span>Port</span>
          <span>Status</span>
          <span>Added</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <p className="text-sm font-medium">No services found</p>
            <p className="text-xs mt-1">Add a service to start tracking its logs.</p>
          </div>
        ) : (
          filtered.map((svc, i) => {
            const cfg = statusConfig[svc.status];
            const addedDate = new Date(svc.addedAt);
            const dateStr = addedDate.toLocaleDateString([], { month: "short", day: "numeric" });
            const timeStr = addedDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <div
                key={svc.id}
                className="grid grid-cols-[1fr_100px_120px_160px_140px] gap-4 px-5 py-4 border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors animate-slideUp"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                {/* Name */}
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <svg className={`w-4 h-4 ${cfg.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-slate-200 truncate">{svc.name}</span>
                </div>

                {/* Port */}
                <div className="flex items-center">
                  <span className="font-mono text-sm text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded">
                    :{svc.port}
                  </span>
                </div>

                {/* Status */}
                <div className="flex items-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                    <span className="relative flex h-1.5 w-1.5">
                      {cfg.ping && (
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`} />
                      )}
                      <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${cfg.dot}`} />
                    </span>
                    {cfg.label}
                  </span>
                </div>

                {/* Date added */}
                <div className="flex items-center text-xs text-slate-500">
                  {dateStr} at {timeStr}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-2">
                  {/* Toggle start/stop */}
                  <button
                    onClick={() => handleToggleStatus(svc.id)}
                    title={svc.status === "running" ? "Stop tracking" : "Start tracking"}
                    className={`p-1.5 rounded-lg border transition-all duration-200 ${
                      svc.status === "running"
                        ? "border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                        : "border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10"
                    }`}
                  >
                    {svc.status === "running" ? (
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

                  {/* Edit */}
                  <button
                    onClick={() => handleEdit(svc)}
                    title="Edit service"
                    className="p-1.5 rounded-lg border border-slate-600/30 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(svc.id)}
                    title="Remove service"
                    className="p-1.5 rounded-lg border border-slate-600/30 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 transition-all duration-200"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-800/40 border-t border-slate-700/50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {filtered.length} service{filtered.length !== 1 ? "s" : ""}{filterStatus !== "all" ? ` (${filterStatus})` : ""}
          </span>
          <span className="text-xs text-slate-500">
            Total ports tracked: {services.filter((s) => s.status === "running").map((s) => s.port).join(", ") || "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
