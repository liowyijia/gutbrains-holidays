"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { START, END, readable, type Responsibility, type TeamResponse } from "@/lib/calendar";
import { CALENDAR_MONTHS, inSeason, localDate, monthDays, ownerColor, selectionRange } from "@/lib/task-calendar";

type Props = {
  apiBase: string; team: TeamResponse[]; profile: TeamResponse | null; profileReady: boolean;
  onDraftChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void;
};
const HOLIDAYS: Record<string, string> = { "2026-11-26": "Thanksgiving", "2026-12-25": "Christmas Day", "2027-01-01": "New Year’s Day" };
const fullDate = (day: string) => readable(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

export default function Responsibilities({ apiBase, team, profile, profileReady, onDraftChange, onBusyChange }: Props) {
  const [rows, setRows] = useState<Responsibility[]>([]);
  const [editing, setEditing] = useState<Responsibility | null>(null);
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("");
  const [showAway, setShowAway] = useState(true);
  const [monthIndex, setMonthIndex] = useState(0);
  const [today, setToday] = useState("");
  const [selection, setSelection] = useState<{ start: string; end: string } | null>(null);
  const [dialogMode, setDialogMode] = useState<"task" | "day" | null>(null);
  const [agendaDay, setAgendaDay] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const titleInput = useRef<HTMLInputElement>(null);
  const drag = useRef<{ anchor: string; end: string } | null>(null);
  const suppressClick = useRef(false);
  const baseline = useRef({ start: "", end: "" });
  const draft = editing
    ? title !== editing.title || startDate !== editing.startDate || endDate !== editing.endDate || notes !== editing.notes
    : !!(title || notes || startDate !== baseline.current.start || endDate !== baseline.current.end);
  const month = CALENDAR_MONTHS[monthIndex];
  const visible = rows.filter(row => !filter || row.profileId === filter);
  const memberName = (id: string) => team.find(person => person.id === id)?.name || "Team member";
  const canEdit = !!profile && profileReady && (!editing || editing.profileId === profile.id);
  const enabled = canEdit && !busy;
  const tasksOn = (day: string) => visible.filter(row => day >= row.startDate && day <= row.endDate);
  const awayOn = (day: string) => showAway ? team.filter(person => (!filter || person.id === filter) && person.days.includes(day)) : [];

  useEffect(() => { onDraftChange(draft); }, [draft, onDraftChange]);
  useEffect(() => { onBusyChange(busy); }, [busy, onBusyChange]);
  useEffect(() => {
    const now = localDate(new Date());
    setToday(now);
    const current = CALENDAR_MONTHS.indexOf(now.slice(0, 7));
    if (current >= 0) setMonthIndex(current);
  }, []);
  const refresh = useCallback(async () => {
    const result = await fetch(`${apiBase}/api/responsibilities`, { cache: "no-store" });
    const data = await result.json() as { responsibilities?: Responsibility[]; error?: string };
    if (!result.ok || !Array.isArray(data.responsibilities)) throw new Error(data.error || "Responsibilities could not load.");
    setRows(data.responsibilities); setLoadError("");
  }, [apiBase]);
  useEffect(() => {
    let active = true;
    const load = () => refresh().catch(err => { if (active) setLoadError(err.message); }).finally(() => { if (active) setLoading(false); });
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [refresh]);
  function reset() {
    setEditing(null); setTitle(""); setStartDate(""); setEndDate(""); setNotes(""); setError("");
    baseline.current = { start: "", end: "" };
  }
  useEffect(() => { reset(); setDialogMode(null); setMessage(""); }, [profile?.id]);
  useEffect(() => {
    if (dialogMode) {
      if (!dialog.current?.open) dialog.current?.showModal();
      if (dialogMode === "task" && canEdit) titleInput.current?.focus();
    } else if (!dialogMode && dialog.current?.open) dialog.current.close();
  }, [dialogMode, canEdit]);

  function closeDialog() {
    if (busy || (draft && !window.confirm("Discard your unsaved responsibility changes?"))) return;
    reset(); setDialogMode(null);
  }
  function openNew(first: string, last = first) {
    if (!inSeason(first) || !inSeason(last) || busy) return;
    const range = selectionRange(first, last);
    reset(); baseline.current = range;
    setStartDate(range.start); setEndDate(range.end); setMessage(""); setDialogMode("task");
  }
  const openNewRef = useRef(openNew);
  openNewRef.current = openNew;
  useEffect(() => {
    function finish() {
      const range = drag.current;
      drag.current = null; setSelection(null);
      if (range && range.anchor !== range.end) {
        suppressClick.current = true;
        openNewRef.current(range.anchor, range.end);
      }
    }
    function cancel() { drag.current = null; setSelection(null); }
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("blur", cancel);
    return () => { window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", cancel); window.removeEventListener("blur", cancel); };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!profile || !enabled) return;
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
      setRows(next); reset(); setDialogMode(null); if (filter && filter !== profile.id) setFilter(profile.id); setMonthIndex(CALENDAR_MONTHS.indexOf(responsibility.startDate.slice(0, 7))); setMessage("Responsibility saved and visible to the team.");
      await refresh().catch(err => setLoadError(err.message));
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function edit(row: Responsibility) {
    setEditing(row); setTitle(row.title); setStartDate(row.startDate); setEndDate(row.endDate); setNotes(row.notes); setError(""); setMessage(""); setDialogMode("task");
  }
  async function remove(row: Responsibility) {
    if (!enabled || !window.confirm(`Remove “${row.title}” from the shared calendar?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await fetch(`${apiBase}/api/responsibilities`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: row.id, profileId: row.profileId, revision: row.revision }) });
      const data = await result.json() as { error?: string };
      if (!result.ok) throw new Error(data.error || "The responsibility could not be removed.");
      const next = rows.filter(item => item.id !== row.id); setRows(next);
      reset(); setDialogMode(null); setMessage("Responsibility removed.");
      await refresh().catch(err => setLoadError(err.message));
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function download() {
    const cell = (value: string) => '"' + (/^\s*[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""') + '"';
    const csv = [["Name", "Responsibility", "Start date", "End date", "Notes"], ...visible.map(row => [memberName(row.profileId), row.title, row.startDate, row.endDate, row.notes])].map(row => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "duke-responsibilities-2026-27.csv"; link.click(); URL.revokeObjectURL(url);
  }
  return <section className="lab-calendar" aria-labelledby="lab-calendar-title" id="lab-calendar">
    <div className="calendar-toolbar">
      <div><h2 id="lab-calendar-title">Lab Calendar</h2></div>
      <div className="calendar-filters"><label htmlFor="responsibility-filter">Show</label><select id="responsibility-filter" value={filter} onChange={event => setFilter(event.target.value)}><option value="">Everyone</option>{team.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select><label className="away-toggle"><input type="checkbox" checked={showAway} onChange={event => setShowAway(event.target.checked)}/>Days away</label></div>
    </div>
    <div className="calendar-month-nav"><div className="month-navigation"><button type="button" aria-label="Previous month" disabled={monthIndex === 0} onClick={() => setMonthIndex(index => Math.max(0, index - 1))}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m10 3-5 5 5 5"/></svg></button><button type="button" aria-label="Next month" disabled={monthIndex === CALENDAR_MONTHS.length - 1} onClick={() => setMonthIndex(index => Math.min(CALENDAR_MONTHS.length - 1, index + 1))}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button><h3 aria-live="polite">{readable(month + "-01", { month: "long", year: "numeric" })}</h3></div><div className="month-actions">{inSeason(today) && <button className="calendar-button" type="button" onClick={() => setMonthIndex(CALENDAR_MONTHS.indexOf(today.slice(0, 7)))}>Today</button>}{visible.length > 0 && <button className="calendar-button" type="button" onClick={download}>Export tasks CSV</button>}</div></div>
    {loadError && <p className="notice error" role="alert">{loadError}<button type="button" className="subtle-button" disabled={busy} onClick={() => void refresh().catch(err => setLoadError(err.message))}>Refresh tasks</button></p>}
    <p className="calendar-message" role="status">{loading ? "Loading responsibilities…" : message}</p>
    <div className="month-grid-scroll" role="region" aria-label="Monthly lab calendar; scroll horizontally on smaller screens" tabIndex={0}>
      <div className="task-month-grid" onPointerDownCapture={() => { suppressClick.current = false; }} role="table" aria-label={readable(month + "-01", { month: "long", year: "numeric" })}>
        <div className="task-week-header" role="row">{["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map(day => <span role="columnheader" key={day}><span className="weekday-full">{day}</span><span className="weekday-short" aria-hidden="true">{day.slice(0, 3)}</span></span>)}</div>
        {Array.from({ length: 6 }, (_, week) => <div className="task-week" role="row" key={week}>{monthDays(month).slice(week * 7, week * 7 + 7).map(day => {
          const tasks = tasksOn(day);
          const away = awayOn(day);
          const selected = selection && day >= selection.start && day <= selection.end;
          const count = tasks.length + away.length;
          return <div role="cell" className={`task-day-cell ${day.startsWith(month) ? "" : "other-month"} ${inSeason(day) ? "" : "outside-season"} ${selected ? "range-selected" : ""}`} key={day} onPointerEnter={event => { if (event.pointerType === "mouse" && event.buttons === 1 && drag.current && inSeason(day)) { drag.current.end = day; setSelection(selectionRange(drag.current.anchor, day)); } }}>
            <button className="day-hit-area" type="button" disabled={!inSeason(day) || busy || loading} aria-label={`Add responsibility on ${fullDate(day)}`} onPointerDown={event => { suppressClick.current = false; if (event.pointerType === "mouse" && event.button === 0) { event.preventDefault(); event.currentTarget.focus(); drag.current = { anchor: day, end: day }; setSelection({ start: day, end: day }); } }} onClick={event => { if (event.detail === 0 || !suppressClick.current) openNew(day); suppressClick.current = false; }} />
            <div className="day-number-line"><span className={`day-number ${day === today ? "is-today" : ""}`} aria-current={day === today ? "date" : undefined}>{day.slice(8).replace(/^0/, "")}</span>{HOLIDAYS[day] && <span className="day-holiday">{HOLIDAYS[day]}</span>}</div>
            <div className="day-entries">{tasks.slice(0, 3).map(task => <button type="button" key={task.id} className={`calendar-event event-${ownerColor(task.profileId)}`} aria-label={`${task.title}, ${memberName(task.profileId)}, ${fullDate(day)}; open responsibility`} title={`${task.title} · ${memberName(task.profileId)}`} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } edit(task); }}><strong>{task.title}</strong><span>{memberName(task.profileId)}</span></button>)}{away.slice(0, Math.max(0, 3 - tasks.length)).map(person => <span className="calendar-away" key={person.id} title={`${person.name} · Away`}>{person.name} · Away</span>)}{count > 3 && <button type="button" className="calendar-more" aria-label={`Show all ${count} entries for ${fullDate(day)}`} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setAgendaDay(day); setDialogMode("day"); }}>{count - 3} more</button>}</div>
          </div>;
        })}</div>)}
      </div>
    </div>
    <dialog ref={dialog} className="task-dialog" aria-labelledby="task-dialog-title" onCancel={event => { event.preventDefault(); closeDialog(); }} onClick={event => { if (event.target === dialog.current) closeDialog(); }}>
      <div className="task-dialog-heading"><h3 id="task-dialog-title">{dialogMode === "day" ? fullDate(agendaDay) : editing ? "Responsibility" : "Add responsibility"}</h3><button type="button" className="dialog-close" aria-label="Close task dialog" disabled={busy} onClick={closeDialog}>×</button></div>
      {dialogMode === "day" ? <div className="day-agenda"><div className="agenda-entries">{tasksOn(agendaDay).map(task => <button type="button" key={task.id} className={`calendar-event event-${ownerColor(task.profileId)}`} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } edit(task); }}><strong>{task.title}</strong><span>{memberName(task.profileId)}</span></button>)}{awayOn(agendaDay).map(person => <p className="calendar-away" key={person.id}>{person.name} · Away</p>)}</div><button className="primary" type="button" onClick={() => openNew(agendaDay)}>Add responsibility</button></div> : <form id="responsibility-form" className="calendar-task-form" onSubmit={submit}>
        <p className="task-dialog-owner">{editing ? memberName(editing.profileId) : profile?.name || "Your profile"}</p>
        {!profile ? <p className="responsibility-help">Select or save your profile above before adding a task. <button type="button" className="subtle-button" onClick={() => { closeDialog(); document.getElementById("profile-settings")?.scrollIntoView({ behavior: "smooth" }); }}>Go to your profile</button></p> : !profileReady ? <p className="responsibility-help">Save or discard your profile changes before editing responsibilities.</p> : editing && editing.profileId !== profile.id && <p className="responsibility-help">Select {memberName(editing.profileId)}’s profile to edit this entry.</p>}
        <fieldset disabled={!enabled}><label className="task-title"><span>Responsibility</span><input ref={titleInput} required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Daily animal checks"/></label><div className="task-date-fields"><label><span>Start date</span><input type="date" required min={START} max={END} value={startDate} onChange={event => { const next = event.target.value; setStartDate(next); if (endDate && endDate < next) setEndDate(next); }}/></label><label><span>End date</span><input type="date" required min={startDate || START} max={END} value={endDate} onChange={event => setEndDate(event.target.value)} aria-describedby="date-range-help"/></label></div><p id="date-range-help" className="responsibility-help">Use the same date for a single day. A range includes every day between the dates.</p><label className="task-notes"><span>Notes <small>(optional)</small></span><textarea maxLength={1000} rows={3} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Timing, location, or details the team should know"/></label></fieldset>
        {error && <div className="notice error" role="alert">{error}<button type="button" className="subtle-button" disabled={busy} onClick={() => { if (draft && !window.confirm("Discard your changes and reload the saved task?")) return; const id = editing?.id; void refresh().then(() => { reset(); setDialogMode(null); if (id) setMessage("Calendar refreshed. Click the task to reopen the latest version."); }).catch(err => setLoadError(err.message)); }}>Reload saved tasks</button></div>}
        <div className="task-dialog-actions">{editing && canEdit && <button type="button" className="task-delete" disabled={busy} onClick={() => void remove(editing)}>Remove</button>}<button type="button" className="calendar-button" disabled={busy} onClick={closeDialog}>{canEdit ? "Cancel" : "Close"}</button>{canEdit && <button className="primary" disabled={!enabled || !title.trim() || !startDate || !endDate || (!!editing && !draft)}>{busy ? "Saving…" : "Save task"}</button>}</div>
      </form>}
    </dialog>
  </section>;
}
