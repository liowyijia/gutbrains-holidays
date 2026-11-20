"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { START, END, readable, type Responsibility, type TeamResponse } from "@/lib/calendar";

type Props = {
  apiBase: string; team: TeamResponse[]; profile: TeamResponse | null; profileReady: boolean;
  onChange: (rows: Responsibility[]) => void; onDraftChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void;
};
export default function Responsibilities({ apiBase, team, profile, profileReady, onChange, onDraftChange, onBusyChange }: Props) {
  const [rows, setRows] = useState<Responsibility[]>([]);
  const [editing, setEditing] = useState<Responsibility | null>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const titleInput = useRef<HTMLInputElement>(null);
  const draft = editing
    ? title !== editing.title || startDate !== editing.startDate || endDate !== editing.endDate || notes !== editing.notes
    : !!(title || startDate || endDate || notes);
  useEffect(() => { onDraftChange(draft); }, [draft, onDraftChange]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);

  const refresh = useCallback(async () => {
    const result = await fetch(`${apiBase}/api/responsibilities`, { cache: "no-store" });
    const data = await result.json() as { responsibilities?: Responsibility[]; error?: string };
    if (!result.ok || !Array.isArray(data.responsibilities)) throw new Error(data.error || "Responsibilities could not load.");
    setRows(data.responsibilities); onChange(data.responsibilities); setLoadError("");
  }, [apiBase, onChange]);
  useEffect(() => {
    let active = true;
    const load = () => refresh().catch(err => { if (active) setLoadError(err.message); }).finally(() => { if (active) setLoading(false); });
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [refresh]);
  function reset() {
    setEditing(null); setTitle(""); setStartDate(""); setEndDate(""); setNotes(""); setError("");
  }
  useEffect(() => { reset(); setMessage(""); }, [profile?.id]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profile || !profileReady || busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await fetch(`${apiBase}/api/responsibilities`, {
        method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, title, startDate, endDate: endDate || startDate, notes, ...(editing ? { id: editing.id, revision: editing.revision } : {}) }),
      });
      const data = await result.json() as { responsibility?: Responsibility; error?: string };
      if (!result.ok || !data.responsibility) throw new Error(data.error || "The responsibility could not be saved.");
      const responsibility = data.responsibility;
      const next = [...rows.filter(row => row.id !== responsibility.id), responsibility].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title));
      setRows(next); onChange(next); reset(); setMessage("Responsibility saved and visible to the team.");
      await refresh().catch(err => setLoadError(err.message));
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function edit(row: Responsibility) {
    if (draft && !window.confirm("Discard your unsaved responsibility changes?")) return;
    setEditing(row); setTitle(row.title); setStartDate(row.startDate); setEndDate(row.endDate); setNotes(row.notes); setError(""); setMessage("");
    titleInput.current?.focus(); document.getElementById("responsibility-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  async function remove(row: Responsibility) {
    if (!window.confirm(`Remove “${row.title}” from the shared calendar?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await fetch(`${apiBase}/api/responsibilities`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, profileId: row.profileId, revision: row.revision }) });
      const data = await result.json() as { error?: string };
      if (!result.ok) throw new Error(data.error || "The responsibility could not be removed.");
      const next = rows.filter(item => item.id !== row.id); setRows(next); onChange(next);
      if (editing?.id === row.id) reset();
      setMessage("Responsibility removed.");
      await refresh().catch(err => setLoadError(err.message));
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function download() {
    const cell = (value: string) => '"' + (/^\s*[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""') + '"';
    const csv = [["Name", "Responsibility", "Start date", "End date", "Notes"], ...visible.map(row => [team.find(person => person.id === row.profileId)?.name || "Team member", row.title, row.startDate, row.endDate, row.notes])].map(row => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "duke-responsibilities-2026-27.csv"; link.click(); URL.revokeObjectURL(url);
  }
  const visible = rows.filter(row => !filter || row.profileId === filter);
  const enabled = !!profile && profileReady && !busy;
  return <section className="responsibilities" aria-labelledby="responsibilities-label">
    <div className="section-heading"><span className="micro">02 /</span><h2 id="responsibilities-label">Lab Responsibilities</h2></div>
    <p className="responsibility-intro">Add your own lab tasks, experiments, and routine care so the team can see what is happening and when.</p>
    <form id="responsibility-form" onSubmit={submit} className="responsibility-form">
      <h3>{editing ? "Edit your responsibility" : "Add your responsibility"}{profile && <span> · {profile.name}</span>}</h3>
      {!profile ? <p className="responsibility-help">Enter your name and save your profile above to get started. You can save with no days away.</p> : !profileReady && <p className="responsibility-help">Save or discard your profile changes above before editing responsibilities.</p>}
      <fieldset disabled={!enabled}>
        <label className="task-title"><span>Responsibility</span><input ref={titleInput} required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Daily animal checks"/></label>
        <label><span>Start date</span><input type="date" required min={START} max={END} value={startDate} onChange={event => { const next = event.target.value; setStartDate(next); if (endDate && endDate < next) setEndDate(next); }}/></label>
        <label><span>End date <small>(optional)</small></span><input type="date" min={startDate || START} max={END} value={endDate} onChange={event => setEndDate(event.target.value)} aria-describedby="date-range-help"/></label>
        <p id="date-range-help" className="responsibility-help date-range-help">Leave the end date blank for a single day. A range includes every day between the dates.</p>
        <label className="task-notes"><span>Notes <small>(optional)</small></span><textarea maxLength={1000} rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Timing, location, or details the team should know"/></label>
      </fieldset>
      <div className="responsibility-actions"><button className="primary" disabled={!enabled || !title.trim() || !startDate || (!!editing && !draft)}>{busy ? "Saving…" : editing ? "Save responsibility" : "Add responsibility"}</button>{(editing || draft) && <button type="button" className="subtle-button" disabled={busy} onClick={() => { if (!draft || window.confirm("Discard your unsaved responsibility changes?")) reset(); }}>Cancel</button>}</div>
      {error && <div className="notice error" role="alert">{error}<button type="button" className="subtle-button" disabled={busy} onClick={() => { if (draft && !window.confirm("Discard your unsaved responsibility changes and reload the saved list?")) return; void refresh().then(reset).catch(err => setLoadError(err.message)); }}>Reload saved responsibilities</button></div>}
      <p className="responsibility-message" role="status">{message}</p>
      <p className="responsibility-help">Saved responsibilities are visible to anyone with the calendar link. Select your profile above to edit your entries.</p>
    </form>
    <div className="responsibility-list-heading"><h3>Team responsibilities</h3><div><label htmlFor="responsibility-filter">Show</label><select id="responsibility-filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Everyone</option>{team.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select>{visible.length > 0 && <button type="button" className="subtle-button" onClick={download}>Export responsibilities CSV</button>}</div></div>
    {loadError && <p className="notice error" role="alert">{loadError}<button type="button" className="subtle-button" disabled={busy} onClick={() => void refresh().catch(err => setLoadError(err.message))}>Refresh list</button></p>}
    {visible.length ? <ul className="responsibility-list">{visible.map(row => <li key={row.id}>
      <div className="responsibility-date">{readable(row.startDate, { month: "short", day: "numeric", year: "numeric" })}{row.endDate !== row.startDate && <><span>through</span>{readable(row.endDate, { month: "short", day: "numeric", year: "numeric" })}</>}</div>
      <div className="responsibility-content"><h4>{row.title}</h4><p className="responsibility-owner">{team.find(person => person.id === row.profileId)?.name || "Team member"}</p>{row.notes && <p className="responsibility-notes">{row.notes}</p>}</div>
      {profile?.id === row.profileId && <div className="responsibility-row-actions"><button type="button" className="subtle-button" disabled={!enabled} onClick={() => edit(row)} aria-label={`Edit ${row.title}`}>Edit</button><button type="button" className="subtle-button" disabled={!enabled} onClick={() => void remove(row)} aria-label={`Remove ${row.title}`}>Remove</button></div>}
    </li>)}</ul> : <p className="responsibility-empty">{loading ? "Loading responsibilities…" : loadError ? "Use Refresh list to try again." : filter ? "No responsibilities added for this team member yet." : "No responsibilities added yet. Add yours above."}</p>}
  </section>;
}
