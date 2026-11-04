"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { DAYS, START, END, readable, ranges, weekend, type EditIdentity, type TeamResponse } from "@/lib/calendar";
import { identityFromFragment, privateEditLink, validIdentity } from "@/lib/edit-access";

const STORAGE_KEY = "days-away-edit-v1";
const MONTHS = [
  { year: 2026, month: 10, label: "November", foot: "26 / Thanksgiving" },
  { year: 2026, month: 11, label: "December", foot: "25 / Christmas Day" },
  { year: 2027, month: 0, label: "January", foot: "01 / New Year’s Day" },
];
const HOLIDAYS: Record<string, string> = { "2026-11-26": "Thanksgiving", "2026-12-25": "Christmas Day", "2027-01-01": "New Year’s Day" };

export default function HolidayCalendar({ apiBase = "", siteBase = "/", destinationUrl }: { apiBase?: string; siteBase?: string; destinationUrl?: string } = {}) {
  const [team, setTeam] = useState<TeamResponse[]>([]);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [identity, setIdentity] = useState<EditIdentity | null>(null);
  const [saved, setSaved] = useState<TeamResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [toast, setToast] = useState("");
  const [showRecovery, setShowRecovery] = useState(false);
  const [origin, setOrigin] = useState("");
  const dragMode = useRef<boolean | null>(null);
  const mouseHandled = useRef(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const sortedDays = [...selected].sort();
  const scheduledTeam = team.filter(row => row.days.length > 0);
  const dirty = !!saved && (name.trim() !== saved.name || JSON.stringify(sortedDays) !== JSON.stringify(saved.days));
  const canSave = !loading && !saving && name.trim().length >= 2 && (!saved || dirty);

  const refresh = useCallback(async () => {
    const result = await fetch(`${apiBase}/api/responses`, { cache: "no-store" });
    const data = await result.json() as { responses?: TeamResponse[]; error?: string };
    if (!result.ok || !Array.isArray(data.responses)) throw new Error(data.error || "The calendar could not load. Please try again.");
    setTeam(data.responses);
    setLoadError("");
    return data.responses as TeamResponse[];
  }, [apiBase]);

  const useResponse = useCallback((row: TeamResponse) => {
    setName(row.name); setSelected(new Set(row.days)); setSaved(row); setError("");
  }, []);

  useEffect(() => {
    let active = true;
    let currentIdentity: EditIdentity | null = null;
    setOrigin(window.location.origin + siteBase.replace(/\/$/, ""));
    try {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const edit = fragment.get("edit");
      if (edit) {
        const value = identityFromFragment(window.location.hash);
        if (value) {
          currentIdentity = value;
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { setShowRecovery(true); }
        } else setError("This edit link is invalid. Check that you copied the complete link.");
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      } else {
        const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        if (validIdentity(value)) currentIdentity = value;
      }
    } catch { /* Storage is optional; private edit links also work without it. */ }
    if (destinationUrl) {
      const destination = new URL(destinationUrl);
      if (currentIdentity) destination.hash = `edit=${currentIdentity.id}.${currentIdentity.token}`;
      window.location.replace(destination.href);
      return () => { active = false; };
    }
    setIdentity(currentIdentity);
    refresh().then(rows => {
      if (!active) return;
      const mine = rows.find(row => row.id === currentIdentity?.id);
      if (mine) useResponse(mine);
      else if (currentIdentity) { setIdentity(null); setError("Your saved response could not be found. You can submit a new schedule."); }
    }).catch(err => { if (active) setLoadError(err.message); }).finally(() => { if (active) setLoading(false); });
    const interval = window.setInterval(() => { refresh().catch(err => { if (active) setLoadError(err.message); }); }, 30000);
    const stopDrag = () => { dragMode.current = null; };
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
    return () => { active = false; window.clearInterval(interval); window.removeEventListener("pointerup", stopDrag); window.removeEventListener("pointercancel", stopDrag); };
  }, [refresh, useResponse, siteBase, destinationUrl]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 4000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!dirty && (!selected.size || saved)) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, selected.size, saved]);

  function mark(day: string, value?: boolean) {
    if (saving || loading) return;
    setSelected(previous => {
      const next = new Set(previous);
      const add = value ?? !previous.has(day);
      if (add) next.add(day); else next.delete(day);
      return next;
    });
    setError("");
  }

  async function save() {
    if (!canSave) { nameInput.current?.focus(); return; }
    setSaving(true); setError("");
    try {
      const result = await fetch(`${apiBase}/api/responses`, {
        method: identity && saved ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(identity ? { Authorization: `Bearer ${identity.token}` } : {}) },
        body: JSON.stringify({ name, days: sortedDays, ...(identity && saved ? { id: identity.id, revision: saved.revision } : {}) }),
      });
      const data = await result.json() as { response?: TeamResponse; token?: string; error?: string };
      if (!result.ok || !data.response) throw new Error(data.error || "Your schedule could not be saved.");
      const response = data.response;
      const nextIdentity = data.token ? { id: response.id, token: data.token } : identity;
      setIdentity(nextIdentity);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(nextIdentity)); }
      catch { setShowRecovery(true); }
      useResponse(response);
      setTeam(previous => [...previous.filter(row => row.id !== response.id), response].sort((a, b) => a.name.localeCompare(b.name)));
      setToast("Schedule saved.");
    } catch (err) { setError(err instanceof Error ? err.message : "Your schedule could not be saved."); }
    finally { setSaving(false); }
  }

  async function copyLink() {
    const link = origin + "/";
    try {
      await navigator.clipboard.writeText(link);
      setToast("Team calendar link copied.");
    } catch {
      setToast("Copy the calendar address from your browser to share it.");
    }
  }

  async function copyEditLink() {
    if (!identity) return;
    try {
      await navigator.clipboard.writeText(privateEditLink(origin + "/", identity));
      setToast("Private edit link copied. Open it on your other device. Keep it private.");
    } catch {
      setShowRecovery(true);
      setToast("Open the private edit link below and bookmark it for your other device.");
    }
  }

  function download() {
    const cell = (value: string) => '"' + (/^[=+@\-\t\r]/.test(value) ? "'" : "") + value.replaceAll('"', '""') + '"';
    const csv = [["Name", ...DAYS], ...scheduledTeam.map(row => [row.name, ...DAYS.map(day => row.days.includes(day) ? "Away" : "")])].map(row => row.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a"); link.href = url; link.download = "duke-days-away-2026-27.csv"; link.click(); URL.revokeObjectURL(url);
  }

  async function reloadSaved() {
    try {
      const rows = await refresh();
      const mine = rows.find(row => row.id === identity?.id);
      if (mine) { useResponse(mine); setToast("Your saved schedule has been reloaded."); }
    } catch (err) { setLoadError(err instanceof Error ? err.message : "Please try again."); }
  }

  async function retryLoad() {
    try {
      const rows = await refresh();
      const mine = rows.find(row => row.id === identity?.id);
      if (mine && !saved) useResponse(mine);
    } catch (err) { setLoadError(err instanceof Error ? err.message : "Please try again."); }
  }

  return <div className="shell">
    <a className="skip-link" href="#your-dates">Skip to calendar</a>
    <header className="masthead">
      <div className="wordmark"><img className="lab-symbol" src={`${siteBase}favicon.svg?v=3`} alt="" width={40} height={40}/><div className="lab-identity"><span className="lab-name">Laboratory of Gut-Brain Neurobiology</span><span className="lab-affiliation">Duke University</span></div></div>
      <div className="masthead-right"><button className="text-button" onClick={() => copyLink()}>Share calendar <span aria-hidden="true">↗</span></button></div>
    </header>
    <main>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title">Holiday Season <span>2026 / 2027</span></h1>
      </section>
      <section className="instructions" aria-labelledby="instructions-title">
        <h2 className="micro" id="instructions-title">Instructions</h2>
        <ol role="list">
          <li>Enter your name</li>
          <li>Click on the days when you are away</li>
          <li>Save changes</li>
        </ol>
      </section>
      {loadError && <div className="notice error" role="alert">{loadError}<button className="subtle-button" onClick={retryLoad}>Retry</button></div>}
      {error && <div className="notice error" role="alert">{error}{saved && <button className="subtle-button" onClick={reloadSaved}>Reload saved schedule</button>}</div>}
      <section className="workspace" aria-labelledby="your-dates">
        <div className="editor">
          <div className="section-heading"><span className="micro">01 /</span><h2 id="your-dates">Your Days Away</h2></div>
          <div className="name-row"><label htmlFor="name" className="micro">Your name</label><input ref={nameInput} id="name" autoComplete="name" placeholder="First and last name" value={name} onChange={event => setName(event.target.value)} maxLength={60} disabled={loading || saving}/></div>
          <div className="calendar-help"><p>Click days to select. Click again to undo.</p><span className="legend"><i className="swatch selected" aria-hidden="true"/>Your selection</span></div>
          <div className="months">
            {MONTHS.map(({ year, month, label, foot }) => {
              const offset = new Date(Date.UTC(year, month, 1)).getUTCDay();
              const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
              return <section className="month" key={label} aria-label={`${label} ${year}`}>
                <h3 className="month-heading">{label}<span>{year}</span></h3>
                <div className="weekdays" aria-hidden="true">{["S", "M", "T", "W", "T", "F", "S"].map((day, i) => <span key={i}>{day}</span>)}</div>
                <div className="date-grid">
                  {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`}/>)}
                  {Array.from({ length: count }, (_, i) => {
                    const day = `${year}-${String(month + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
                    const enabled = day >= START && day <= END;
                    return <button key={day} type="button" className={`date ${enabled ? "enabled" : ""} ${weekend(day) ? "weekend" : ""} ${selected.has(day) ? "selected" : ""} ${HOLIDAYS[day] ? "holiday" : ""}`}
                      disabled={!enabled || loading || saving} aria-pressed={selected.has(day)} aria-label={`${readable(day, { weekday: "long", month: "long", day: "numeric", year: "numeric" })}${HOLIDAYS[day] ? `, ${HOLIDAYS[day]}` : ""}`} title={HOLIDAYS[day]}
                      onPointerDown={event => { mouseHandled.current = false; if (event.pointerType === "mouse" && event.button === 0) { event.preventDefault(); event.currentTarget.focus(); mouseHandled.current = true; dragMode.current = !selected.has(day); mark(day, dragMode.current); } }}
                      onPointerEnter={event => { if (event.pointerType === "mouse" && event.buttons === 1 && dragMode.current !== null) mark(day, dragMode.current); }}
                      onClick={event => { if (event.detail === 0 || !mouseHandled.current) mark(day); mouseHandled.current = false; }}
                    >{i + 1}</button>;
                  })}
                </div>
                <p className="month-foot">{foot}</p>
              </section>;
            })}
          </div>
        </div>
        <aside className="plan" aria-labelledby="plan-label">
          <h3 className="micro" id="plan-label">Selected dates</h3>
          <p className="plan-count" aria-live="polite">{String(selected.size).padStart(2, "0")}</p>
          <p className="plan-count-label">{selected.size === 1 ? "day" : "days"} away</p>
          <div className="plan-date-list">{selected.size ? ranges(sortedDays).map(range => <p key={range}>{range}</p>) : <p className="empty-note">No days away. Saving removes your name from Team Schedule.</p>}</div>
          <button className="primary" onClick={save} disabled={!canSave}><span>{saving ? "Saving…" : saved && !dirty ? "Schedule saved" : "Save changes"}</span><span aria-hidden="true">{saved && !dirty ? "✓" : "↗"}</span></button>
          {saved && <><p className="saved-message">{dirty ? "Unsaved changes." : "Saved."}</p><div className="edit-actions">{dirty && <button className="subtle-button" onClick={reloadSaved}>Discard changes</button>}{identity && <button className="subtle-button" onClick={copyEditLink}>Edit on another device ↗</button>}</div></>}
          {showRecovery && identity && <a className="recovery" href={privateEditLink(origin + "/", identity)} target="_blank" rel="noreferrer">Open your private edit link and bookmark it ↗</a>}
        </aside>
        <p className="save-detail">Your saved dates are visible to anyone with the calendar link.</p>
      </section>
      <section className="team" aria-labelledby="team-label">
        <div className="team-title"><div className="section-heading"><span className="micro">02 /</span><h2 id="team-label">Team Schedule</h2></div><div className="team-meta"><span className="micro">{loading ? "Loading…" : `${String(scheduledTeam.length).padStart(2, "0")} ${scheduledTeam.length === 1 ? "response" : "responses"}`}</span>{scheduledTeam.length > 0 && <button className="subtle-button" onClick={download}>Export CSV ↗</button>}</div></div>
        {scheduledTeam.length > 0 ? <div className="timeline-wrap" role="region" aria-label="Team days away; scroll horizontally on smaller screens" tabIndex={0}><div className="timeline" role="table" aria-label="Shared holiday schedules">
          <div className="timeline-row month-row" role="row"><span className="micro" role="columnheader">Team member</span><span className="month-label" style={{ gridColumn: "2 / span 8" }} role="columnheader">NOV / 2026</span><span className="month-label" style={{ gridColumn: "10 / span 31" }} role="columnheader">DEC / 2026</span><span className="month-label" style={{ gridColumn: "41 / span 10" }} role="columnheader">JAN / 2027</span></div>
          <div className="timeline-row days-row" role="row"><span role="cell"/>{DAYS.map(day => <span role="columnheader" aria-label={readable(day, { month: "long", day: "numeric", year: "numeric" })} title={readable(day, { weekday: "short", month: "short", day: "numeric" })} className={`timeline-day ${weekend(day) ? "weekend" : ""}`} key={day}>{Number(day.slice(8))}</span>)}</div>
          {scheduledTeam.map(row => <div className={`timeline-row person ${row.id === identity?.id ? "mine" : ""}`} key={row.id} role="row"><div className="person-label" role="rowheader" title={`${row.name}: ${row.days.length ? ranges(row.days).join(", ") : "No days away"}`}><strong>{row.name}{row.id === identity?.id ? " (you)" : ""}</strong><span>{row.days.length}d</span></div>{DAYS.map(day => <span key={day} role="cell" className={`timeline-cell ${row.days.includes(day) ? "away" : ""} ${weekend(day) ? "weekend" : ""}`} aria-label={`${row.name}, ${readable(day)}: ${row.days.includes(day) ? "away" : "not marked away"}`} title={`${row.name} · ${readable(day)} · ${row.days.includes(day) ? "Away" : "Not marked away"}`}/>)}</div>)}
        </div></div> : <div className="empty-team"><div><h3>{loading ? "Loading responses…" : loadError ? "The team calendar is temporarily unavailable." : "No days away saved."}</h3><p>{loading ? "" : loadError ? "Use Retry above to load the latest responses." : "Saved days away appear here."}</p></div><div className="empty-symbol" aria-hidden="true">{Array.from({ length: 21 }, (_, i) => <span key={i}/>)}</div></div>}
        <div className="team-footer"><div className="team-legend"><span className="legend"><i className="swatch" aria-hidden="true"/>Away</span><span className="legend"><i className="swatch selected" aria-hidden="true"/>Your saved days</span></div><p className="tiny"><span className="live-dot" aria-hidden="true"/>{loadError ? "Updates paused · Retry above" : "Shared calendar · Refreshes every 30 seconds"}</p></div>
      </section>
    </main>
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}
